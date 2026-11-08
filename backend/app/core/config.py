"""DEVOS v1.0.0 application settings.

Settings are loaded from environment variables and an optional local `.env`
file via pydantic-settings. Everything the app needs is read off the `settings`
object; `DATABASE_URL` is kept as a module-level alias for backward
compatibility (used by `app.db.session`).

Production safety: `_validate_production_safety` raises on import when a
production deployment is missing the minimum security requirements
(strong AUTH_SECRET, explicitly allow-listed CORS origins, non-SQLite DB).
"""

import json
import os
from typing import Annotated, Any

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Imported directly rather than via app.core.crypto: crypto imports settings,
# so importing it here would be circular. Fernet is an external dependency.
from cryptography.fernet import Fernet

load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Core ---
    PROJECT_NAME: str = "DEVOS v1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    AUTH_SECRET: str = "CHANGE_ME_IN_ENV"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    FRONTEND_APP_URL: str = "http://localhost:5173"

    # --- Database ---
    # Async drivers only: `sqlite+aiosqlite` locally, `postgresql+asyncpg`
    # in production (test suite and Alembic rely on async engines).
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/devos.db"

    @field_validator("DATABASE_URL")
    @classmethod
    def _validate_database_url(cls, v: str) -> str:
        """Reject a DATABASE_URL that SQLAlchemy cannot parse, and say why.

        An ambient OS-level `DATABASE_URL` (a User/Machine environment
        variable) takes precedence over `backend/.env`, because real
        environment variables outrank the dotenv file for pydantic-settings.
        A stale value such as `file:./dev.db` therefore silently replaced the
        real database and surfaced much later as an opaque
        `sqlalchemy.exc.ArgumentError: Could not parse SQLAlchemy URL from
        given URL string` raised from deep inside engine creation, which gave
        no hint that an unrelated ambient variable was the cause.

        Validating the scheme here turns that into an actionable startup
        error naming the supported forms. This deliberately does NOT work
        around the precedence: the repository keeps the documented behaviour
        and instead refuses to start on a URL it cannot use.
        """
        value = (v or "").strip()
        if not value:
            raise ValueError(
                "DATABASE_URL must not be empty. Use "
                "'sqlite+aiosqlite:///./data/devos.db' locally or "
                "'postgresql+asyncpg://...' in production."
            )
        # Accept both the bare SQLAlchemy form and the URL-embedded form.
        scheme = value.split("://", 1)[0].lower() if "://" in value else ""
        if not scheme:
            raise ValueError(
                f"DATABASE_URL {value!r} is not a valid SQLAlchemy URL "
                f"(missing '://'). This often means an ambient OS-level "
                f"DATABASE_URL is overriding backend/.env - clear it and "
                f"retry. Expected 'sqlite+aiosqlite:///...' or "
                f"'postgresql+asyncpg://...'."
            )
        if scheme.startswith("sqlite") and not scheme.startswith("sqlite+aiosqlite"):
            raise ValueError(
                f"DATABASE_URL must use an async driver, got {scheme!r}. "
                f"Use 'sqlite+aiosqlite:///...'."
            )
        if scheme.startswith("postgresql") and not scheme.startswith(
            "postgresql+asyncpg"
        ):
            raise ValueError(
                f"DATABASE_URL must use an async driver, got {scheme!r}. "
                f"Use 'postgresql+asyncpg://...'."
            )
        return value

    # --- CORS ---
    # Accepts a JSON array ("[\"https://a.com\", \"https://b.com\"]") or a
    # comma-separated string from a hosting-provider dashboard.
    # NoDecode is load-bearing, not cosmetic. `BACKEND_CORS_ORIGINS` is a
    # complex (list) field, so pydantic-settings' env/dotenv source tries
    # json.loads() on the raw value while BUILDING settings - which runs
    # BEFORE any `mode="before"` field validator. A perfectly reasonable
    # `BACKEND_CORS_ORIGINS=http://localhost:5173` therefore aborted startup
    # with SettingsError and the validator below never got a chance to run.
    # NoDecode hands the raw string to the validator, which then accepts both
    # a bare/comma-separated string and a JSON list.
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = []

    # --- Project workspace storage ---
    PROJECTS_STORAGE_PATH: str = "./data/projects"

    # --- Phase 2D dev-server previews ---
    # Public origin of THIS backend as reachable from the browser (used to
    # build the preview proxy URL returned to the iframe). Set per deployment
    # (Render URL in production), defaults to localhost for local dev.
    PUBLIC_BACKEND_URL: str = "http://localhost:8000"
    # How long a started dev server may take to become reachable before the
    # preview is marked FAILED (real port probe, in seconds).
    PREVIEW_READY_TIMEOUT_SECONDS: int = 60

    # --- Terminal sandbox ---
    TERMINAL_TIMEOUT_SECONDS: int = 30
    # --- Auth / password hashing ---
    # bcrypt work factor. Default 12 (~0.08–0.2s on modern hardware); very high
    # values (e.g. 16384 = 2^14) make login unusably slow (~1.2s per call).
    # Capped at 14 as a safety valve — any higher value is silently reduced.
    BCRYPT_ROUNDS: int = int(os.getenv("BCRYPT_ROUNDS", "12"))
    if BCRYPT_ROUNDS > 14:
        BCRYPT_ROUNDS = 14

    # --- Terminal sandbox ---
    TERMINAL_MAX_OUTPUT_CHARS: int = 20000

    # --- Phase 2A execution foundation (contract only; DEFINED, not ENFORCED) ---
    # Resource ceilings are documented here for Phase 2B+ enforcement. Phase 2A
    # persists validation records only — nothing executes, so nothing is capped.
    EXECUTION_MAX_DURATION_SECONDS: int = 300
    EXECUTION_MAX_OUTPUT_CHARS: int = 20000
    EXECUTION_MAX_CONCURRENT: int = 4
    EXECUTION_MAX_RETRIES: int = 3
    EXECUTION_MAX_PROCESSES: int = 8

    # --- AI providers ("mock" | "gemini" | "openai") ---
    AI_PROVIDER: str = "mock"
    AI_MODEL: str = ""
    AI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # --- GitHub OAuth ---
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/github/callback"
    GITHUB_TOKEN: str = ""

    # --- Secret encryption at rest ---
    # Fernet key used to encrypt github_connections.access_token. Never
    # hardcoded and never derived from another secret: a dedicated key means
    # rotating it does not invalidate JWT sessions. Generate with:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # When empty, encryption is unavailable and callers get a clear
    # TOKEN_ENCRYPTION_UNAVAILABLE error rather than silently storing plaintext.
    TOKEN_ENCRYPTION_KEY: str = ""

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v: Any) -> Any:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    return []
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v or []


def is_production_environment(value: Any) -> bool:
    """True when a configured ENVIRONMENT value means production.

    Environment names are case-insensitive on load (``case_sensitive=False``),
    so the comparison is normalized here and used by every production
    safety check. ``Production`` and ``PRODUCTION`` must behave exactly like
    ``production``; the raw stored value is left untouched.
    """
    return str(value or "").strip().lower() == "production"


def normalize_environment(value: Any) -> Any:
    """Normalize an ENVIRONMENT value for storage on the settings object.

    Keeps the human-entered spelling for display (``/health`` reports the raw
    value) while all production decisions go through
    :func:`is_production_environment`.
    """
    if isinstance(value, str):
        return value.strip()
    return value


def _validate_production_safety(s: Settings) -> Settings:
    """Fail fast when a production deployment is missing required settings."""
    if s.AUTH_SECRET in {"", "CHANGE_ME_IN_ENV"} or s.AUTH_SECRET.startswith("PASTE_"):
        if is_production_environment(s.ENVIRONMENT):
            raise ValueError("Insecure production configuration: AUTH_SECRET must be set")
        return s
    if not is_production_environment(s.ENVIRONMENT):
        return s
    problems: list[str] = []
    if not s.AUTH_SECRET or len(s.AUTH_SECRET) < 32:
        problems.append("AUTH_SECRET must be at least 32 characters in production")
    if not s.BACKEND_CORS_ORIGINS:
        problems.append("BACKEND_CORS_ORIGINS must list the allowed frontend origins")
    if s.DATABASE_URL.startswith("sqlite"):
        problems.append("DATABASE_URL must not use SQLite in production")
    # A GitHub access token is a live bearer credential. Encryption already
    # fails loudly at save time when the key is missing, but a production boot
    # that SUCCEEDS and only breaks later means the misconfiguration is
    # discovered by a user, not by the deploy. Require it up front.
    key = (s.TOKEN_ENCRYPTION_KEY or "").strip()
    if not key:
        problems.append(
            "TOKEN_ENCRYPTION_KEY must be set in production so GitHub tokens "
            "are never stored in plaintext"
        )
    else:
        try:
            Fernet(key.encode("utf-8"))
        except (ValueError, TypeError):
            problems.append(
                "TOKEN_ENCRYPTION_KEY must be a valid Fernet key; generate one "
                'with: python -c "from cryptography.fernet import Fernet; '
                'print(Fernet.generate_key().decode())"'
            )
    if problems:
        raise ValueError("Insecure production configuration: " + "; ".join(problems))
    return s


settings = Settings()
_validate_production_safety(settings)

# Backward-compatible module-level alias used by app.db.session.
DATABASE_URL = settings.DATABASE_URL
