from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from app.api.v1.router import api_v1_router
from app.schemas.common import ApiResponse, HealthResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
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

# Mount API v1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
