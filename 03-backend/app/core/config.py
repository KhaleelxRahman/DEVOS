from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "DEVOS v1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database - SQLite is the zero-dependency development default.
    # Set DATABASE_URL to a postgresql+asyncpg:// URL for production.
    DATABASE_URL: str = "sqlite+aiosqlite:///./devos.db"

    # Security & JWT
    AUTH_SECRET: str = "devos-development-insecure-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://devos-ebon.vercel.app",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> str | list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Workspace & Storage
    PROJECTS_STORAGE_PATH: str = "./projects_storage"
    TERMINAL_TIMEOUT_SECONDS: int = 30
    TERMINAL_MAX_OUTPUT_CHARS: int = 20000

    # AI Provider Configuration. When no API key is configured for the
    # selected provider, DEVOS v1.0.0 transparently falls back to the clearly
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
    FRONTEND_APP_URL: str = "http://localhost:5173"
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
    if "https://devos-ebon.vercel.app" not in s.BACKEND_CORS_ORIGINS:
        s.BACKEND_CORS_ORIGINS.append("https://devos-ebon.vercel.app")
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

