import os
import urllib.parse

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.base import Base
from app.db.session import engine
from app.services.project_service import ProjectService


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _setup(client):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": "Dev", "email": "dev@example.com", "password": "supersecret1"},
    )
    headers = {"Authorization": f"Bearer {res.json()['data']['token']}"}
    proj = await client.post("/api/v1/projects", json={"name": "files-demo"}, headers=headers)
    project_id = proj.json()["data"]["id"]

    root = ProjectService.get_project_storage_path(project_id)
    os.makedirs(os.path.join(root, "src"), exist_ok=True)
    os.makedirs(os.path.join(root, "node_modules"), exist_ok=True)
    with open(os.path.join(root, "README.md"), "w") as f:
        f.write("# Files Demo\n")
    with open(os.path.join(root, "src", "app.py"), "w") as f:
        f.write("print('hello devos')\n")
    with open(os.path.join(root, ".env"), "w") as f:
        f.write("SECRET_KEY=should-never-be-readable\n")
    with open(os.path.join(root, "node_modules", "junk.js"), "w") as f:
        f.write("module.exports = {}\n")

    return headers, project_id


@pytest.mark.asyncio
async def test_file_tree_excludes_sensitive_and_heavy_dirs(client):
    headers, project_id = await _setup(client)
    res = await client.get(f"/api/v1/projects/{project_id}/files", headers=headers)
    assert res.status_code == 200
    names = [n["name"] for n in res.json()["data"]["files"]]
    assert "src" in names and "README.md" in names
    assert ".env" not in names
    assert "node_modules" not in names


@pytest.mark.asyncio
async def test_file_read_and_search(client):
    headers, project_id = await _setup(client)
    res = await client.get(
        f"/api/v1/projects/{project_id}/files/src/app.py", headers=headers
    )
    assert res.status_code == 200
    assert "hello devos" in res.json()["data"]["content"]

    search = await client.get(
        f"/api/v1/projects/{project_id}/files/search?q=app", headers=headers
    )
    assert search.status_code == 200
    assert "src/app.py" in search.json()["data"]["results"]


@pytest.mark.asyncio
async def test_file_traversal_and_sensitive_blocked(client):
    headers, project_id = await _setup(client)

    for raw in ["../outside.txt", "..%2F..%2Fetc%2Fpasswd", ".env"]:
        encoded = urllib.parse.quote(raw, safe="")
        res = await client.get(
            f"/api/v1/projects/{project_id}/files/{encoded}", headers=headers
        )
        assert res.status_code in (403, 404), f"{raw} returned {res.status_code}"

    assert (
        await client.get(f"/api/v1/projects/{project_id}/files/src/missing.py", headers=headers)
    ).status_code == 404
    assert (
        await client.get(f"/api/v1/projects/{project_id}/files", headers={})
    ).status_code == 401


@pytest.mark.asyncio
async def test_terminal_success_failure_blocked_and_history(client):
    headers, project_id = await _setup(client)

    ok = await client.post(
        f"/api/v1/projects/{project_id}/terminal/execute",
        json={"command": "echo", "args": ["hello"]},
        headers=headers,
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["data"]["exit_code"] == 0
    assert "hello" in ok.json()["data"]["stdout"]

    fail = await client.post(
        f"/api/v1/projects/{project_id}/terminal/execute",
        json={"command": "python3", "args": ["-c", "import sys; sys.exit(3)"]},
        headers=headers,
    )
    assert fail.status_code == 200
    assert fail.json()["data"]["exit_code"] == 3

    blocked = await client.post(
        f"/api/v1/projects/{project_id}/terminal/execute",
        json={"command": "curl", "args": ["https://example.com"]},
        headers=headers,
    )
    assert blocked.status_code == 403
    assert blocked.json()["error"]["code"] == "TERMINAL_BLOCKED"

    history = await client.get(
        f"/api/v1/projects/{project_id}/terminal/history", headers=headers
    )
    assert history.status_code == 200
    commands = [h["command"] for h in history.json()["data"]["history"]]
    assert "echo" in commands

    # Unauthenticated terminal access
    assert (
        await client.post(
            f"/api/v1/projects/{project_id}/terminal/execute", json={"command": "echo"}
        )
    ).status_code == 401

    # Unknown project
    assert (
        await client.post(
            "/api/v1/projects/nope/terminal/execute",
            json={"command": "echo"},
            headers=headers,
        )
    ).status_code == 404
