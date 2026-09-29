"""Encryption for secrets stored in the database.

`github_connections.access_token` is a bearer credential: anyone who can read
the row can impersonate the user against GitHub. It is therefore stored as
Fernet ciphertext, keyed by ``TOKEN_ENCRYPTION_KEY`` from the environment.

Design rules:

* The key is never hardcoded and never derived from another secret.
* Encryption is explicit. A value is decrypted only on the single read path
  that needs a live token, so the plaintext never sits in a model attribute
  or a log line.
* Failure is loud. A missing key, a wrong key, or a value that is not valid
  ciphertext raises a specific error instead of falling back to returning the
  raw column, because a silent plaintext fallback would defeat the purpose.
"""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

# Fernet ciphertext is url-safe base64 and always carries this prefix once
# encoded. It is used to tell an already-encrypted value from a legacy
# plaintext one so the migration can be idempotent and re-runnable.
_PREFIX = b"gAAAAA"


class TokenEncryptionUnavailableError(Exception):
    """Raised when encryption/decryption is required but not configured."""


class TokenDecryptionError(Exception):
    """Raised when a stored value cannot be decrypted with the current key."""


def is_encrypted(value: str | None) -> bool:
    """True when the value looks like Fernet ciphertext rather than plaintext.

    Used by the migration to decide whether a row still needs encrypting, so
    running it twice is harmless.
    """
    if not value:
        return False
    try:
        raw = value.encode("utf-8")
    except UnicodeEncodeError:
        return False
    if not raw.startswith(_PREFIX):
        return False
    # Fernet output is version(1) + 8-byte timestamp + IV(16) + ciphertext + HMAC.
    # A 4-byte timestamp inside a 32-byte payload cannot be valid, so this
    # rejects anything that merely happens to share the prefix.
    return len(raw) >= 57


def _fernet() -> Fernet:
    key = (settings.TOKEN_ENCRYPTION_KEY or "").strip()
    if not key:
        raise TokenEncryptionUnavailableError(
            "TOKEN_ENCRYPTION_KEY is not set; refusing to store or read the "
            "GitHub access token in plaintext."
        )
    try:
        return Fernet(key.encode("utf-8"))
    except (ValueError, TypeError) as exc:
        raise TokenEncryptionUnavailableError(
            "TOKEN_ENCRYPTION_KEY is not a valid Fernet key."
        ) from exc


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token for storage."""
    if not plaintext:
        raise ValueError("Refusing to encrypt an empty token.")
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a stored token.

    Accepts a legacy plaintext value so an un-migrated row keeps working
    rather than locking a user out; callers should still run the migration.
    """
    if not ciphertext:
        raise TokenDecryptionError("Stored token is empty.")
    if not is_encrypted(ciphertext):
        # Legacy row written before encryption existed.
        return ciphertext
    try:
        return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise TokenDecryptionError(
            "Stored token could not be decrypted; the encryption key may have "
            "changed since this connection was saved."
        ) from exc
