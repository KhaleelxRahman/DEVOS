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


# ---------------------------------------------------------------------------
# Scoped preview-proxy tokens (Phase 2G hardening)
# ---------------------------------------------------------------------------
# The preview iframe cannot set an Authorization header, so the proxy URL used
# to carry the caller's SESSION JWT as a query param -- a credential in a URL,
# which leaks through browser history, server/proxy access logs and Referer
# headers. Preview access now uses a dedicated token instead:
#   * signed with a key DERIVED from AUTH_SECRET + salt, so a session JWT can
#     never be accepted as a preview token, and a preview token can never
#     authenticate an API request (decode_access_token will not verify it);
#   * scoped to one (user, project, execution) triple;
#   * short TTL (15 minutes) rather than the session TTL;
#   * tagged `typ="preview"` so it can never be confused with an access token.

_PREVIEW_TOKEN_SALT = "devos-preview-proxy-v1"
PREVIEW_TOKEN_EXPIRE_SECONDS = 900


def _preview_token_key() -> str:
    return f"{settings.AUTH_SECRET}:{_PREVIEW_TOKEN_SALT}"


def create_preview_token(
    execution_id: str,
    user_id: str,
    project_id: str,
    expires_seconds: int = PREVIEW_TOKEN_EXPIRE_SECONDS,
) -> str:
    """Mint a short-lived token authorizing ONLY the preview proxy for one
    execution. It is never usable as a session/API credential."""
    now = datetime.now(timezone.utc)
    payload = {
        "typ": "preview",
        "sub": user_id,
        "exec": execution_id,
        "prj": project_id,
        "iat": now,
        "exp": now + timedelta(seconds=expires_seconds),
    }
    return jwt.encode(
        payload, _preview_token_key(), algorithm=settings.JWT_ALGORITHM)


def decode_preview_token(token: str) -> dict | None:
    """Validate a preview token; return its scope or None when invalid.

    Returns ``{"user_id", "execution_id", "project_id"}`` for a valid token.
    A session JWT (different signing key, no ``typ``) never validates here.
    """
    try:
        payload = jwt.decode(
            token, _preview_token_key(), algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        return None
    if payload.get("typ") != "preview":
        return None
    user_id = payload.get("sub")
    execution_id = payload.get("exec")
    project_id = payload.get("prj")
    if not user_id or not execution_id or not project_id:
        return None
    return {
        "user_id": str(user_id),
        "execution_id": str(execution_id),
        "project_id": str(project_id),
    }


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
