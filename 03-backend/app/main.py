from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

# Rate limiting imports
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import app.models
from app.api.v1.router import api_v1_router
from app.core.app_logging import logger
from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    validation_exception_handler,
)
from app.db.base import Base
from app.db.session import engine
from app.schemas.common import ApiResponse, HealthResponse


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
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
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
