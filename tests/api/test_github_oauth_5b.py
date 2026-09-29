"""Phase 5b regression: the GitHub OAuth callback must PERSIST the connection.

Defect: the callback exchanged a real code, fetched a real user and
returned 303, but never committed. `get_db` yields a bare AsyncSession with
no autocommit, so the row was rolled back when the request ended and
`/github/connection` reported connected:false forever.

The GitHub HTTP calls are mocked, so this test performs no real network
access and needs no real credentials. It reads the row back in a NEW
session, which is exactly what a later request would see.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.main import app
from app.models.github_connection import GitHubConnection
from sqlalchemy import func, select


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
def _encryption_key(monkeypatch):
    """Tokens are stored encrypted, so saving a connection needs a Fernet key.

    Injected per test rather than set in the environment, so the suite never
    depends on a real TOKEN_ENCRYPTION_KEY being configured.
    """
    from cryptography.fernet import Fernet

    from app.core.config import settings

    monkeypatch.setattr(
        settings, "TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode(),
        raising=False,
    )


async def _register(client):
    res = await client.post("/api/v1/auth/register", json={
        "name": "P5bOAuth", "email": "p5b-oauth-cb@example.com",
        "password": "supersecret1"})
    assert res.status_code == 200, res.text
    return res.json()["data"]["token"]


def _state_for(user_id: str) -> str:
    """Mint a valid OAuth state JWT for this user, exactly as /connect does."""
    from datetime import datetime, timedelta, timezone
    from jose import jwt
    from app.core.config import settings

    return jwt.encode(
        {
            "sub": user_id,
            "purpose": "github_oauth",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        settings.AUTH_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


async def _user_id_for(client, token: str) -> str:
    res = await client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    return res.json()["data"]["user"]["id"]


@pytest.mark.asyncio
async def test_oauth_callback_persists_connection(client, monkeypatch):
    """The callback must leave a durable github_connections row.

    Fails without the fix: the row exists only in the request's session and
    is rolled back, so a NEW session sees zero rows.
    """
    token = await _register(client)
    user_id = await _user_id_for(client, token)

    # --- mock the GitHub HTTP calls: no real network, no real credentials ---
    async def fake_exchange_code(code: str):
        return {"access_token": "gho_mocked_not_a_real_token", "scope": "repo,read:user"}

    async def fake_get_github_user(_t):
        return {"id": 424242, "login": "mocked-user"}

    from app.services import github_service

    monkeypatch.setattr(github_service.GitHubService, "exchange_code",
                        staticmethod(fake_exchange_code))
    monkeypatch.setattr(github_service.GitHubService, "get_github_user",
                        staticmethod(fake_get_github_user))

    # --- run the real callback ---
    res = await client.get(
        "/api/v1/github/callback",
        params={"code": "mock_code", "state": _state_for(user_id)},
        follow_redirects=False,
    )
    assert res.status_code == 303, res.text

    # --- read back in a NEW session (what a later request would see) ---
    async with AsyncSessionLocal() as verify_db:
        rows = (await verify_db.execute(
            select(func.count()).select_from(GitHubConnection)
            .where(GitHubConnection.user_id == user_id)
        )).scalar_one()
        assert rows == 1, (
            "OAuth connection was not persisted. save_connection only "
            f"flushes; without a commit the row is rolled back. rows={rows}"
        )

    # --- and the API now honestly reports connected ---
    res = await client.get("/api/v1/github/connection", headers={
        "Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    assert res.json()["data"]["connected"] is True, res.text
    assert res.json()["data"]["username"] == "mocked-user", res.text

    # The token must never be echoed back to the client.
    assert "gho_mocked_not_a_real_token" not in res.text
