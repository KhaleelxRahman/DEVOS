"""Phase 10 configuration-hardening regression tests.

Three real defects were found during certification, each of which is locked
down here:

1. `BACKEND_CORS_ORIGINS` as a bare/comma-separated string aborted startup.
   The `mode="before"` validator looked correct but never ran, because
   pydantic-settings JSON-parses COMPLEX fields while building settings -
   before any field validator. Fixed with `NoDecode`.
2. `TOKEN_ENCRYPTION_KEY` was not validated for production, so a production
   deploy booted successfully and only failed later, at token-save time.
3. An empty `AI_MODEL` silently fell back to a retired model id, turning a
   configuration gap into an opaque provider HTTP 404.

No real credentials appear here; every key used is synthetic.
"""

import pytest
from cryptography.fernet import Fernet

from app.core.config import Settings, _validate_production_safety
from app.core.errors import ValidationException


# ---------------------------------------------------------------- CORS
@pytest.mark.parametrize("raw", [
    "http://localhost:5173",
    "http://a.com,http://b.com",
    '["http://localhost:5173"]',
    '["http://a.com","http://b.com"]',
])
def test_cors_accepts_bare_comma_and_json_forms(monkeypatch, raw):
    """The REAL load path, not the validator called directly.

    Calling `_parse_cors_origins` proves nothing: the bug was that the env
    source never got as far as invoking it.
    """
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", raw)
    monkeypatch.setenv("AUTH_SECRET", "x" * 40)
    monkeypatch.setenv("ENVIRONMENT", "development")
    parsed = Settings().BACKEND_CORS_ORIGINS
    assert isinstance(parsed, list)
    assert all(isinstance(o, str) and o for o in parsed)


def test_cors_empty_is_empty_list(monkeypatch):
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "")
    assert Settings().BACKEND_CORS_ORIGINS == []


# --------------------------------------------- TOKEN_ENCRYPTION_KEY (prod)
def _prod_settings(**over):
    base = dict(
        AUTH_SECRET="x" * 40,
        BACKEND_CORS_ORIGINS=["https://app.example.com"],
        DATABASE_URL="postgresql+asyncpg://u:p@host:5432/db",
        TOKEN_ENCRYPTION_KEY=Fernet.generate_key().decode(),
    )
    base.update(over)
    return Settings(ENVIRONMENT="production", **base)


def test_production_requires_token_encryption_key():
    with pytest.raises(ValueError) as exc:
        _validate_production_safety(_prod_settings(TOKEN_ENCRYPTION_KEY=""))
    assert "TOKEN_ENCRYPTION_KEY" in str(exc.value)


def test_production_rejects_a_malformed_token_encryption_key():
    with pytest.raises(ValueError) as exc:
        _validate_production_safety(_prod_settings(TOKEN_ENCRYPTION_KEY="not-a-fernet-key"))
    assert "valid Fernet key" in str(exc.value)


def test_production_boots_with_a_valid_token_encryption_key():
    out = _validate_production_safety(_prod_settings())
    assert out.TOKEN_ENCRYPTION_KEY


def test_production_error_never_echoes_the_key_value():
    """A config error must name the variable, never print the secret."""
    secret = "super-secret-not-a-real-key"
    with pytest.raises(ValueError) as exc:
        _validate_production_safety(_prod_settings(TOKEN_ENCRYPTION_KEY=secret))
    assert secret not in str(exc.value)


def test_development_is_not_blocked_by_missing_encryption_key():
    """Non-production keeps working so local dev is not forced to configure it."""
    s = Settings(
        ENVIRONMENT="development",
        AUTH_SECRET="x" * 40,
        TOKEN_ENCRYPTION_KEY="",
    )
    assert s.TOKEN_ENCRYPTION_KEY == ""


# ------------------------------------------------------- AI_MODEL fail-fast
def test_real_provider_without_ai_model_fails_fast(monkeypatch):
    from app.core.config import settings
    from app.services.ai_service import AIService

    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "AI_API_KEY", "synthetic-key-not-real")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "AI_MODEL", "")

    with pytest.raises(ValidationException) as exc:
        AIService.from_settings()
    assert "AI_MODEL" in str(exc.value)
    # The message must not echo the key.
    assert "synthetic-key-not-real" not in str(exc.value)


def test_real_provider_with_ai_model_is_constructed(monkeypatch):
    from app.core.config import settings
    from app.services.ai_service import AIService, GeminiProvider

    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "AI_API_KEY", "synthetic-key-not-real")
    monkeypatch.setattr(settings, "AI_MODEL", "some-current-model-id")
    ai = AIService.from_settings()
    assert isinstance(ai.provider, GeminiProvider)
    assert ai.provider.model == "some-current-model-id"
    assert ai.status()["is_mock"] is False


def test_no_retired_model_default_remains_in_source():
    """The retired ids must not survive as a callable fallback.

    The decisive check: no `or "<retired-id>"` expression anywhere in the
    module, which is exactly what silently produced the provider 404.
    """
    import inspect

    from app.services import ai_service

    src = inspect.getsource(ai_service)
    assert 'or "gemini-1.5-flash"' not in src
    assert 'or "gpt-4o-mini"' not in src
    # The constructors must require a model rather than defaulting one.
    assert 'model: str = "gemini-1.5-flash"' not in src
    assert 'model: str = "gpt-4o-mini"' not in src
    assert "def __init__(self, api_key: str, model: str):" in src
