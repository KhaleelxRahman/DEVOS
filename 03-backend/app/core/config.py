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
from typing import Any

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

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

    # --- CORS ---
    # Accepts a JSON array ("[\"https://a.com\", \"https://b.com\"]") or a
    # comma-separated string from a hosting-provider dashboard.
    BACKEND_CORS_ORIGINS: list[str] = []

    # --- Project workspace storage ---
    PROJECTS_STORAGE_PATH: str = "./data/projects"

    # --- Terminal sandbox ---
    TERMINAL_TIMEOUT_SECONDS: int = 30
    TERMINAL_MAX_OUTPUT_CHARS: int = 20000

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


def _validate_production_safety(s: Settings) -> Settings:
    """Fail fast when a production deployment is missing required settings."""
    if s.ENVIRONMENT != "production":
        return s
    problems: list[str] = []
    if not s.AUTH_SECRET or len(s.AUTH_SECRET) < 32:
        problems.append("AUTH_SECRET must be at least 32 characters in production")
    if not s.BACKEND_CORS_ORIGINS:
        problems.append("BACKEND_CORS_ORIGINS must list the allowed frontend origins")
    if s.DATABASE_URL.startswith("sqlite"):
        problems.append("DATABASE_URL must not use SQLite in production")
    if problems:
        raise ValueError("Insecure production configuration: " + "; ".join(problems))
    return s


settings = Settings()
_validate_production_safety(settings)

# Backward-compatible module-level alias used by app.db.session.
DATABASE_URL = settings.DATABASE_URL
