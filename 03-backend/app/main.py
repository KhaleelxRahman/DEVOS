from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.logging import logger
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401  (register all models on the metadata)
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.api.v1.router import api_v1_router
from app.schemas.common import ApiResponse, HealthResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist. Idempotent; Alembic remains the tool of
    # record for schema evolution on existing deployments.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("DEVOS database schema verified/created")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
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
