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
from app.schemas.common import ApiResponse, HealthResponse, VersionResponse
from app import bootstrap_migrate

# The deployed commit SHA is baked in at build/deploy time into a
# `COMMIT_SHA` file (see config/render.yaml buildCommand, plus
# `RENDER_GIT_COMMIT` at runtime when available). This endpoint is a
# standing deployment-identity tool — never a temporary debug shim.

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
    # Apply the Alembic migration chain first (idempotent, works on legacy
    # create_all-provisioned databases and on fresh databases alike). This is
    # independent of the hosting start command so migrations always run on
    # deploy. create_all afterwards fills any residual missing objects.
    try:
        bootstrap_migrate.run_migrations_in_subprocess()
    except Exception:
        logger.exception("Database migration bootstrap failed; continuing with create_all")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("DEVOS v1.0.0 database schema verified/created")
    yield
    # Phase 2D: kill any live dev-server preview processes so no orphan
    # survives the backend process (session-end safety net).
    try:
        from app.services.execution_service import ExecutionService
        killed = await ExecutionService.cleanup_active_previews()
        if killed:
            logger.info("preview cleanup: killed %d live dev-server process(es)", killed)
    except Exception:
        logger.exception("preview cleanup failed")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Apply CORS before registering routes so browser preflight requests are handled
# consistently for every API endpoint, including authentication.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    cast(ExceptionHandlerT, _rate_limit_exceeded_handler),
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
    )
    if settings.ENVIRONMENT == "production":
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response

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


def _resolve_commit_sha() -> tuple[str, str]:
    """Return (commit_sha, source) for the running deployment."""
    import os

    for key in ("RENDER_GIT_COMMIT", "GIT_COMMIT_SHA", "DEPLOY_GIT_COMMIT"):
        value = os.environ.get(key, "").strip()
        if value:
            return value, key
    here = os.path.dirname(os.path.abspath(__file__))
    for candidate in (
        os.path.join(os.path.dirname(here), "COMMIT_SHA"),
        os.path.join(os.getcwd(), "COMMIT_SHA"),
    ):
        try:
            with open(candidate, encoding="utf-8") as f:
                value = f.read().strip()
            if value:
                return value, "COMMIT_SHA file"
        except OSError:
            continue
    return "unknown", "unavailable"


@app.get(
    "/version", response_model=ApiResponse[VersionResponse], tags=["health"]
)
@app.get(
    "/api/v1/version", response_model=ApiResponse[VersionResponse], tags=["health"]
)
async def version_check():
    sha, source = _resolve_commit_sha()
    return ApiResponse(success=True, data=VersionResponse(commit_sha=sha, source=source))


# Mount API v1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
