import os
import sys
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Ensure an isolated SQLite database is configured BEFORE importing the app.
_BACKEND_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "03-backend")
)
if _BACKEND_PATH not in sys.path:
    sys.path.insert(0, _BACKEND_PATH)

_TEST_DB = os.path.join(os.path.dirname(__file__), f"test_auth_{uuid.uuid4().hex}.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB}"
os.environ.setdefault(
    "PROJECTS_STORAGE_PATH",
    os.path.join(os.path.dirname(__file__), "test_projects_storage"),
)
os.environ.setdefault(
    "BACKEND_CORS_ORIGINS",
    '["https://devos-ebon.vercel.app"]',
)

from app.main import app  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


REGISTER_PAYLOAD = {
    "name": "Dev User",
    "email": "dev@example.com",
    "password": "supersecret1",
}
LOGIN_PAYLOAD = {"email": "dev@example.com", "password": "supersecret1"}


@pytest.mark.asyncio
async def test_login_preflight_allows_configured_origin(client):
    res = await client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "https://devos-ebon.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "https://devos-ebon.vercel.app"
    assert res.headers["access-control-allow-credentials"] == "true"


@pytest.mark.asyncio
async def test_register_success(client):
    res = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "dev@example.com"
    assert data["data"]["token"]
    # Sensitive fields must never be exposed
    assert "password" not in res.text
    assert "password_hash" not in res.text


@pytest.mark.asyncio
async def test_register_duplicate_email_rejected(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    res = await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "DUPLICATE_EMAIL"


@pytest.mark.asyncio
async def test_register_invalid_email_rejected(client):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": "Bad Email", "email": "not-an-email", "password": "supersecret1"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_login_success_and_me_and_logout(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)

    res = await client.post("/api/v1/auth/login", json=LOGIN_PAYLOAD)
    assert res.status_code == 200, res.text
    token = res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["data"]["user"]["email"] == "dev@example.com"

    logout = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout.status_code == 200

    # JWT is stateless: token still authenticates, but login again must work
    res2 = await client.post("/api/v1/auth/login", json=LOGIN_PAYLOAD)
    assert res2.status_code == 200
    assert res2.json()["data"]["token"]


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev@example.com", "password": "wrong-password"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@example.com", "password": "whatever1"},
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_requires_auth(client):
    res = await client.get("/api/v1/projects")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_protected_route_rejects_bad_token(client):
    res = await client.get(
        "/api/v1/projects", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert res.status_code == 401
