"""Password hashing and JWT helpers for DEVOS v1.0.0.

Keys and algorithms are read from application settings so they are identical
for authentication routes, GitHub OAuth state, and the API dependency layer.
"""

from datetime import datetime, timedelta, timezone
import os

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password (kept for backward compatibility)."""
    return pwd_context.hash(password)


def get_password_hash(password: str) -> str:
    """Hash a plaintext password (canonical name used by AuthService)."""
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Return True when the plaintext matches the stored hash."""
    return pwd_context.verify(password, hashed)


def create_access_token(
    subject: str | None = None,
    data: dict | None = None,
    expires_delta: timedelta | None = None,
    **extra: object,
) -> str:
    """Create a signed JWT access token.

    Accepts either an explicit `subject` (string user id, the canonical
    usage) or a legacy `data` dict. The token always carries `sub`, `iat`
    and `exp`.
    """
    payload: dict = dict(data) if data else {}
    if subject is not None:
        payload["sub"] = subject
    payload.update(extra)
    now = datetime.now(timezone.utc)
    payload["iat"] = now
    payload["exp"] = now + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return jwt.encode(payload, settings.AUTH_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Validate a JWT and return the subject (user id), or None when invalid."""
    try:
        payload = jwt.decode(
            token, settings.AUTH_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None
    sub = payload.get("sub")
    if not sub:
        return None
    return str(sub)


# Substrings that mark an environment variable as sensitive. Any variable
# whose upper-cased name contains one of these markers must NOT reach a
# spawned process (Phase 2G adversarial hardening).
_CHILD_ENV_SECRET_MARKERS = (
    "SECRET", "TOKEN", "PASSWORD", "PASSWD", "PRIVATE_KEY", "API_KEY",
    "_KEY", "CREDENTIAL", "DATABASE_URL", "DSN", "OAUTH", "SESSION",
)


def build_child_env() -> dict[str, str]:
    """Environment for spawned processes: the server environment MINUS
    sensitive variables.

    Without this, a CONTROLLED command such as ``python -c
    "import os; print(os.environ)"`` inherits the backend's full environment
    (AUTH_SECRET, DATABASE_URL, ...) and exfiltrates it into stdout — which
    is persisted in the execution record and served back through the
    history/detail API. PATH and OS essentials are preserved so approved
    toolchains (python, npm, git) keep working.
    """
    env: dict[str, str] = {}
    for key, value in os.environ.items():
        upper = key.upper()
        if any(marker in upper for marker in _CHILD_ENV_SECRET_MARKERS):
            continue
        env[key] = value
    return env
