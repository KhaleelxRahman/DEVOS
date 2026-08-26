import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "DEVOS"
    API_V1_STR: str = "/api/v1"

    # Database — SQLite is the zero-dependency development default.
    # Set DATABASE_URL to a postgresql+asyncpg:// URL for production.
    DATABASE_URL: str = "sqlite+aiosqlite:///./devos.db"

    # Security & JWT
    AUTH_SECRET: str = "devos-development-insecure-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Workspace & Storage
    PROJECTS_STORAGE_PATH: str = "./projects_storage"

    # AI Provider Configuration. When no API key is configured for the
    # selected provider, DEVOS transparently falls back to the clearly
    # labelled local mock provider.
    AI_PROVIDER: str = "mock"  # mock | gemini | openai
    AI_API_KEY: str = ""
    AI_MODEL: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # GitHub OAuth (server-side only)
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/github/callback"
    # Optional server-side token enabling read-only repository access.
    GITHUB_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


def _validate_production_safety(s: "Settings") -> "Settings":
    """Fail fast on insecure defaults when ENVIRONMENT is production.

    This refuses to boot a production instance with the development JWT
    secret or wildcard CORS rather than silently deploying an unsafe API.
    """
    if s.ENVIRONMENT.lower() != "production":
        return s
    problems: list[str] = []
    if "insecure" in s.AUTH_SECRET or "change-in-production" in s.AUTH_SECRET or len(s.AUTH_SECRET) < 32:
        problems.append("AUTH_SECRET must be a unique random value of at least 32 characters")
    if "*" in s.BACKEND_CORS_ORIGINS:
        problems.append("BACKEND_CORS_ORIGINS must not contain '*' in production")
    if not s.DATABASE_URL.startswith("postgresql"):
        problems.append("DATABASE_URL must be a PostgreSQL DSN in production (postgresql+asyncpg://...)")
    if problems:
        raise ValueError("Insecure production configuration: " + "; ".join(problems))
    return s


settings = _validate_production_safety(Settings())
