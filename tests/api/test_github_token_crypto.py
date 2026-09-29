"""Hardening: the GitHub access token must not be stored in plaintext.

Before this, `github_connections.access_token` held the live bearer token, so
anyone able to read the row could impersonate the user against GitHub. These
tests assert three separate things:

1. the raw database column is ciphertext, not the token;
2. the API still works end to end, because the token is decrypted exactly once,
   on the read path;
3. encryption fails loudly when no key is configured, rather than silently
   falling back to plaintext.

The GitHub HTTP calls are mocked, so no network access or real credentials are
involved. A per-test Fernet key is generated and injected into settings.
"""

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.crypto import (
    TokenDecryptionError,
    TokenEncryptionUnavailableError,
    decrypt_token,
    encrypt_token,
    is_encrypted,
)
from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.main import app
from app.models.github_connection import GitHubConnection

PLAIN = "gho_plaintexttokenvalue1234567890"


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def encryption_key(monkeypatch):
    """A real Fernet key for the duration of each test."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY",
                        Fernet.generate_key().decode(), raising=False)
    return settings.TOKEN_ENCRYPTION_KEY


async def _register(client, email="crypt@example.com"):
    res = await client.post("/api/v1/auth/register", json={
        "name": "Crypt", "email": email, "password": "supersecret1"})
    assert res.status_code == 200, res.text
    return res.json()["data"]["token"]


async def _user_id_for(client, token):
    res = await client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    return res.json()["data"]["user"]["id"]


async def _mock_github(monkeypatch):
    async def fake_exchange_code(code: str):
        return {"access_token": PLAIN, "scope": "repo,read:user"}

    async def fake_get_github_user(_t):
        return {"id": 99, "login": "crypto-user"}

    from app.services import github_service

    monkeypatch.setattr(github_service.GitHubService, "exchange_code",
                        staticmethod(fake_exchange_code))
    monkeypatch.setattr(github_service.GitHubService, "get_github_user",
                        staticmethod(fake_get_github_user))


def _state_for(user_id: str) -> str:
    from datetime import datetime, timedelta, timezone
    from jose import jwt
    from app.core.config import settings

    return jwt.encode(
        {"sub": user_id, "purpose": "github_oauth",
         "exp": datetime.now(timezone.utc) + timedelta(minutes=10)},
        settings.AUTH_SECRET, algorithm=settings.JWT_ALGORITHM)


def test_round_trip_is_not_plaintext(encryption_key):
    blob = encrypt_token(PLAIN)
    assert PLAIN not in blob
    assert is_encrypted(blob)
    assert decrypt_token(blob) == PLAIN


def test_ciphertext_differs_each_time(encryption_key):
    # Fernet embeds a timestamp and a fresh IV, so the same token must never
    # produce the same stored value twice.
    assert encrypt_token(PLAIN) != encrypt_token(PLAIN)


def test_missing_key_fails_loudly(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY", "", raising=False)
    with pytest.raises(TokenEncryptionUnavailableError):
        encrypt_token(PLAIN)


def test_wrong_key_cannot_decrypt(monkeypatch):
    from app.core.config import settings

    blob = encrypt_token(PLAIN)
    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY",
                        Fernet.generate_key().decode(), raising=False)
    with pytest.raises(TokenDecryptionError):
        decrypt_token(blob)


def test_legacy_plaintext_is_still_readable(encryption_key):
    # An un-migrated row must not lock the user out.
    assert decrypt_token(PLAIN) == PLAIN
    assert is_encrypted(PLAIN) is False


@pytest.mark.asyncio
async def test_database_column_is_ciphertext_not_plaintext(client, monkeypatch):
    """The real requirement: the stored bytes must not be the token."""
    await _mock_github(monkeypatch)
    token = await _register(client)
    user_id = await _user_id_for(client, token)

    res = await client.get(
        "/api/v1/github/callback",
        params={"code": "c", "state": _state_for(user_id)},
        follow_redirects=False,
    )
    assert res.status_code == 303, res.text

    async with AsyncSessionLocal() as db:
        row = (await db.execute(
            select(GitHubConnection).where(GitHubConnection.user_id == user_id)
        )).scalar_one()
        stored = row.access_token

    assert stored != PLAIN, "access_token is still stored in plaintext"
    assert PLAIN not in stored
    assert is_encrypted(stored)
    assert decrypt_token(stored) == PLAIN


@pytest.mark.asyncio
async def test_api_still_works_with_encrypted_token(client, monkeypatch):
    """Encryption must not break the flow that depends on a live token."""
    await _mock_github(monkeypatch)
    token = await _register(client)
    user_id = await _user_id_for(client, token)

    await client.get("/api/v1/github/callback",
                     params={"code": "c", "state": _state_for(user_id)},
                     follow_redirects=False)

    # The read path decrypts, so the API is unaffected.
    res = await client.get("/api/v1/github/connection", headers={
        "Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    assert res.json()["data"]["connected"] is True
    assert res.json()["data"]["username"] == "crypto-user"

    # A GitHub API call made with the resolved token uses the PLAINTEXT.
    async with AsyncSessionLocal() as db:
        row = (await db.execute(
            select(GitHubConnection).where(GitHubConnection.user_id == user_id)
        )).scalar_one()
        from app.services.github_service import GitHubService
        assert GitHubService.resolve_token(row) == PLAIN

    assert PLAIN not in res.text


@pytest.mark.asyncio
async def test_connection_endpoint_never_returns_the_token(client, monkeypatch):
    await _mock_github(monkeypatch)
    token = await _register(client, "crypt2@example.com")
    user_id = await _user_id_for(client, token)
    await client.get("/api/v1/github/callback",
                     params={"code": "c", "state": _state_for(user_id)},
                     follow_redirects=False)

    for path in ("/api/v1/github/connection", "/api/v1/github/repos"):
        res = await client.get(path, headers={"Authorization": f"Bearer {token}"})
        assert PLAIN not in res.text

