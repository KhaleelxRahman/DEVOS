import pytest
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.services.file_service import FileService
from app.services.context_service import ContextService
from app.services.terminal_service import TerminalService
from app.core.errors import AppException


def test_password_hashing():
    password = "secret-developer-password"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_jwt_token_cycle():
    user_id = "user-123-uuid"
    token = create_access_token(subject=user_id)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded == user_id


def test_sensitive_file_detection():
    assert FileService.is_sensitive(".env") is True
    assert FileService.is_sensitive(".env.local") is True
    assert FileService.is_sensitive("private.key") is True
    assert FileService.is_sensitive("server.pem") is True
    assert FileService.is_sensitive("credentials.json") is True
    assert FileService.is_sensitive("App.tsx") is False
    assert FileService.is_sensitive("main.py") is False


def test_env_example_template_is_allowed_but_real_env_files_are_not():
    """`.env.example` is a secret-free template; real credential files are not.

    The allowlist is an EXACT filename match, never a prefix rule, so every other
    `.env.*` variant must remain blocked.
    """
    # The one allowed template.
    assert FileService.is_allowed_template(".env.example") is True
    assert FileService.is_sensitive(".env.example") is False

    # Every real credential variant stays blocked.
    for name in (
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        ".env.staging",
        ".env.secret",
        ".env.example.local",
    ):
        assert FileService.is_allowed_template(name) is False, name
        assert FileService.is_sensitive(name) is True, name

    # Other secret-bearing names are unaffected.
    for name in ("id_rsa", "id_ed25519", "secrets.json", "app.pem", "certs.p12"):
        assert FileService.is_sensitive(name) is True, name


def test_secret_scrubbing():
    text = "Here is my api_key = 'sk-1234567890abcdef' for testing"
    sanitized = ContextService.sanitize_text(text)
    assert "sk-1234567890abcdef" not in sanitized
    assert "[REDACTED_SECRET]" in sanitized


def test_terminal_allowlist():
    # Valid allowed commands
    TerminalService.validate_command("git", ["status"])
    TerminalService.validate_command("npm", ["--version"])

    # Blocked dangerous commands
    with pytest.raises(AppException) as exc_info:
        TerminalService.validate_command("rm -rf /")
    assert exc_info.value.code == "TERMINAL_BLOCKED"

    with pytest.raises(AppException) as exc_info2:
        TerminalService.validate_command("nmap", ["localhost"])
    assert exc_info2.value.code == "TERMINAL_BLOCKED"

    with pytest.raises(AppException) as exc_info3:
        TerminalService.validate_command("npm", ["run", "build"])
    assert exc_info3.value.code == "TERMINAL_BLOCKED"


def test_terminal_blocks_cmd_exe_metacharacters():
    """Phase 12.1 hardening: % (cmd.exe variable expansion) and ^ (cmd.exe
    escape char) must be rejected. Before the fix, `echo %PATH%` passed
    validation and cmd.exe live-expanded the child's full PATH into stdout
    (confirmed exploit: env-value disclosure through the terminal echo)."""
    for args in (["%PATH%"], ["%AUTH_SECRET%"], ["^^&whoami"], ["a^b"]):
        with pytest.raises(AppException) as exc_info:
            TerminalService.validate_command("echo", args)
        assert exc_info.value.code == "TERMINAL_BLOCKED"
        with pytest.raises(AppException) as exc_info_dir:
            TerminalService.validate_command("dir", args)
        assert exc_info_dir.value.code == "TERMINAL_BLOCKED"


def test_production_guard_rejects_insecure_defaults(monkeypatch):
    from app.core.config import Settings, _validate_production_safety

    s = Settings(ENVIRONMENT="production")
    try:
        _validate_production_safety(s)
        raised = False
    except ValueError:
        raised = True
    assert raised, "production guard must reject insecure defaults"


def test_production_guard_accepts_secure_config():
    from app.core.config import Settings, _validate_production_safety

    s = Settings(
        ENVIRONMENT="production",
        AUTH_SECRET="x" * 48,
        BACKEND_CORS_ORIGINS=["https://app.example.com"],
        DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/db",
    )
    assert _validate_production_safety(s) is s


def test_production_guard_treats_all_capitalizations_as_production():
    from app.core.config import (
        Settings,
        _validate_production_safety,
        is_production_environment,
    )

    for spelling in ("production", "Production", "PRODUCTION"):
        assert is_production_environment(spelling) is True
        s = Settings(
            ENVIRONMENT=spelling,
            AUTH_SECRET="x" * 48,
            BACKEND_CORS_ORIGINS=["https://app.example.com"],
            DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/db",
        )
        assert _validate_production_safety(s) is s
        # Insecure defaults must raise for every production capitalization.
        bad = Settings(ENVIRONMENT=spelling)
        try:
            _validate_production_safety(bad)
            raised = False
        except ValueError:
            raised = True
        assert raised, "production guard bypassed for ENVIRONMENT=%r" % spelling

    assert is_production_environment("development") is False
    assert is_production_environment("staging") is False
    assert is_production_environment("") is False
    assert is_production_environment(None) is False
