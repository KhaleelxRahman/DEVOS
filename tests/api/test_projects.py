import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.base import Base
from app.db.session import engine


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email="owner@example.com", name="Owner"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="demo-project"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


@pytest.mark.asyncio
async def test_project_crud_and_ownership(client):
    owner = await _register(client)
    other = await _register(client, email="other@example.com", name="Other")

    project_id = await _create_project(client, owner)

    listed = await client.get("/api/v1/projects", headers=owner)
    assert listed.status_code == 200
    assert any(p["id"] == project_id for p in listed.json()["data"]["projects"])

    got = await client.get(f"/api/v1/projects/{project_id}", headers=owner)
    assert got.status_code == 200
    assert got.json()["data"]["name"] == "demo-project"

    updated = await client.patch(
        f"/api/v1/projects/{project_id}", json={"description": "updated"}, headers=owner
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["description"] == "updated"

    # Other user must not read, update, or delete this project
    assert (
        await client.get(f"/api/v1/projects/{project_id}", headers=other)
    ).status_code == 403
    assert (
        await client.patch(
            f"/api/v1/projects/{project_id}", json={"name": "hijack"}, headers=other
        )
    ).status_code == 403
    assert (
        await client.delete(f"/api/v1/projects/{project_id}", headers=other)
    ).status_code == 403

    # Unknown project id
    assert (
        await client.get("/api/v1/projects/does-not-exist", headers=owner)
    ).status_code == 404

    # A deleted project id stays a clean 404 (stale client caches must fail
    # gracefully), and malformed ids never 500.
    deleted = await client.delete(f"/api/v1/projects/{project_id}", headers=owner)
    assert deleted.status_code == 200
    gone = await client.get(f"/api/v1/projects/{project_id}", headers=owner)
    assert gone.status_code == 404
    assert gone.json()["error"]["code"] == "PROJECT_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_project_handles_stale_and_malformed_ids(client):
    """BUG-001 regression: stale/unknown project references return a clean 404."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    # Sanity: an existing project is reachable for its owner.
    got = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert got.status_code == 200

    # Malformed (non-UUID) ids must be a deterministic 404, never a 500.
    for bad_id in ("not-a-uuid", "e0e5b2c8-a13b-4742-af40-1eb7daf19ad6"):
        res = await client.get(f"/api/v1/projects/{bad_id}", headers=headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "PROJECT_NOT_FOUND"

    # A deleted project keeps returning 404 PROJECT_NOT_FOUND.
    assert (
        await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    ).status_code == 200
    res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "PROJECT_NOT_FOUND"


@pytest.mark.asyncio
async def test_project_activity_recorded(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.get(f"/api/v1/projects/{project_id}/activity", headers=headers)
    assert res.status_code == 200
    types = [a["activity_type"] for a in res.json()["data"]["activities"]]
    assert "project.created" in types

    user_activity = await client.get("/api/v1/activity", headers=headers)
    assert user_activity.status_code == 200
    assert "project.created" in [
        a["activity_type"] for a in user_activity.json()["data"]["activities"]
    ]
