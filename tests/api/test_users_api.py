"""API tests for user profile update, AI provider status, and authenticated logout."""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register_user(client: AsyncClient, name: str = "Initial User"):
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "StrongPassword123!"},
    )
    assert res.status_code in (200, 201), res.text
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}, email


@pytest.mark.asyncio
async def test_update_current_user_profile_persists(client: AsyncClient):
    headers, email = await _register_user(client, "Original Name")

    patch_res = await client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"name": "Updated Developer Name"},
    )
    assert patch_res.status_code == 200, patch_res.text
    body = patch_res.json()
    assert body["success"] is True
    assert body["data"]["name"] == "Updated Developer Name"
    assert body["data"]["email"] == email

    me_res = await client.get("/api/v1/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["data"]["name"] == "Updated Developer Name"


@pytest.mark.asyncio
async def test_update_current_user_rejects_blank_name(client: AsyncClient):
    headers, _ = await _register_user(client, "Valid Name")

    patch_res = await client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"name": "   "},
    )
    assert patch_res.status_code == 422


@pytest.mark.asyncio
async def test_get_ai_provider_status_never_exposes_secrets(client: AsyncClient, monkeypatch):
    headers, _ = await _register_user(client, "AI Check User")

    res = await client.get("/api/v1/users/ai-provider", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert "provider" in data
    assert "is_mock" in data
    assert data["is_mock"] is True
    assert "api_key" not in str(data).lower()


@pytest.mark.asyncio
async def test_authenticated_logout_succeeds(client: AsyncClient):
    headers, _ = await _register_user(client, "Logout User")

    res = await client.post("/api/v1/auth/logout", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["success"] is True


@pytest.mark.asyncio
async def test_async_bcrypt_helpers_and_legacy_round12_compatibility():
    from passlib.context import CryptContext
    from app.core.security import async_get_password_hash, async_verify_password

    hashed = await async_get_password_hash("FastLoginPass123!")
    assert hashed.startswith("$2b$10$")
    assert await async_verify_password("FastLoginPass123!", hashed) is True
    assert await async_verify_password("WrongPass!", hashed) is False

    # Verify backward compatibility with existing round-12 hashes in production DBs
    legacy_ctx = CryptContext(schemes=["bcrypt"], bcrypt__rounds=12)
    legacy_hash = legacy_ctx.hash("LegacyRound12Pass!")
    assert legacy_hash.startswith("$2b$12$")
    assert await async_verify_password("LegacyRound12Pass!", legacy_hash) is True
    assert await async_verify_password("WrongLegacyPass!", legacy_hash) is False

