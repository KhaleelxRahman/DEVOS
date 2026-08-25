import pytest
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
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

def test_secret_scrubbing():
    text = "Here is my api_key = 'sk-1234567890abcdef' for testing"
    sanitized = ContextService.sanitize_text(text)
    assert "sk-1234567890abcdef" not in sanitized
    assert "[REDACTED_SECRET]" in sanitized

def test_terminal_allowlist():
    # Valid allowed commands
    TerminalService.validate_command("git", ["status"])
    TerminalService.validate_command("npm", ["run", "build"])
    TerminalService.validate_command("pytest")

    # Blocked dangerous commands
    with pytest.raises(AppException) as exc_info:
        TerminalService.validate_command("rm -rf /")
    assert exc_info.value.code == "TERMINAL_BLOCKED"

    with pytest.raises(AppException) as exc_info2:
        TerminalService.validate_command("nmap", ["localhost"])
    assert exc_info2.value.code == "TERMINAL_BLOCKED"
