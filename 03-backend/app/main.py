from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from typing import cast

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

# Rate limiting imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import app.models
from app.api.v1.router import api_v1_router
from app.core.app_logging import logger
from app.core.config import _validate_production_safety, settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    validation_exception_handler,
)
from app.db.base import Base
from app.db.session import engine
from app.schemas.common import ApiResponse, HealthResponse

# Starlette's `add_exception_handler` expects a handler whose second parameter
# is the base `Exception` type. slowapi's and our custom handlers declare
# narrower exception types (e.g. `RateLimitExceeded`, `AppException`), which is
# correct at runtime but rejected by the type checker for contravariance
# reasons. Casting to the exact handler contract satisfies the type checker
# without changing runtime behaviour: handlers are still only ever invoked
# with the exception type they were registered for.
ExceptionHandlerT = Callable[[Request, Exception], Response | Awaitable[Response]]

# Fail fast at startup when a production deployment is missing the minimum
# security requirements (strong AUTH_SECRET, allow-listed CORS origins, DB).
_validate_production_safety(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist. Idempotent; Alembic remains the tool of
    # record for schema evolution on existing deployments.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("DEVOS v1.0.0 database schema verified/created")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    cast(ExceptionHandlerT, _rate_limit_exceeded_handler),
)

# CORS Configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Exception Handlers
app.add_exception_handler(
    AppException,
    cast(ExceptionHandlerT, app_exception_handler),
)
app.add_exception_handler(
    RequestValidationError,
    cast(ExceptionHandlerT, validation_exception_handler),
)
app.add_exception_handler(Exception, generic_exception_handler)


# Health Check Endpoint
@app.get("/health", response_model=ApiResponse[HealthResponse], tags=["health"])
async def health_check():
    return ApiResponse(
        success=True,
        data=HealthResponse(
            status="online",
            service=f"{settings.PROJECT_NAME} API",
            environment=settings.ENVIRONMENT,
        ),
    )


@app.get("/api/v1/health", response_model=ApiResponse[HealthResponse], tags=["health"])
async def health_check_v1():
    return await health_check()


# Mount API v1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
