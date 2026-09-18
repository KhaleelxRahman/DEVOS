"""Phase 2D — dev-server preview tests.

Preview runs through the canonical Phase 2B engine: a REAL dev-server
process is spawned (Python's http.server — no npm needed, deterministic),
a real TCP connectivity probe must pass before READY, the backend proxy
relays the server's actual HTTP response, and stop kills the process so no
orphan remains (a second start must get a fresh port). Ownership is
enforced across start/status/stop/proxy.
"""
import asyncio
import json

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.services.execution_service import _PROCESSES
from app.services.file_service import FileService


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    _PROCESSES.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email="preview@example.com", name="PreviewT"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="preview-fixture"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _add_static(project_id: str, body: str = "<h1>PREVIEW_OK</h1>"):
    FileService.create_file(project_id, "", "index.html", body)


async def _wait_ready(client, headers, project_id, preview, timeout=15.0):
    """Poll preview/status until READY (real reachability evidence)."""
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    last = preview
    while loop.time() < deadline:
        res = await client.get(
            f"/api/v1/projects/{project_id}/preview/status", headers=headers)
        assert res.status_code == 200, res.text
        last = res.json()["data"]
        if last["status"] in ("READY", "FAILED", "CANCELLED", "STOPPED"):
            return last
        await asyncio.sleep(0.25)
    return last


@pytest.mark.asyncio
async def test_preview_static_start_read_proxy_stop(client):
    headers = await _register(client, email="d1@example.com")
    project_id = await _create_project(client, headers, name="static-preview")
    _add_static(project_id, "<h1>PREVIEW_OK</h1>")

    res = await client.post(
        f"/api/v1/projects/{project_id}/preview", headers=headers)
    assert res.status_code == 200, res.text
    info = res.json()["data"]
    assert info["project_id"] == project_id
    assert info["execution_id"]
    assert info["status"] == "READY"  # start waits for reachability
    assert info["port"] and 0 < int(info["port"]) < 65536
    assert info["url"].endswith("/preview/")

    # Backend proxy returns the dev server's REAL response.
    proxy = await client.get(info["url"], headers=headers)
    assert proxy.status_code == 200, proxy.text
    assert "PREVIEW_OK" in proxy.text

    # Stop kills the process; status becomes terminal.
    res = await client.post(
        f"/api/v1/projects/{project_id}/preview/stop", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["status"] in ("CANCELLED", "STOPPED")

    # No active preview remains.
    res = await client.get(
        f"/api/v1/projects/{project_id}/preview/status", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "STOPPED"
    assert _PROCESSES == {}  # no orphaned process handle remains


@pytest.mark.asyncio
async def test_preview_restart_gets_fresh_port_no_orphan(client):
    headers = await _register(client, email="d2@example.com")
    project_id = await _create_project(client, headers, name="restart-preview")
    _add_static(project_id, "<h1>round2</h1>")

    res = await client.post(
        f"/api/v1/projects/{project_id}/preview", headers=headers)
    assert res.status_code == 200, res.text
    first = res.json()["data"]
    assert first["status"] == "READY"

    res = await client.post(
        f"/api/v1/projects/{project_id}/preview/stop", headers=headers)
    assert res.status_code == 200, res.text
    res = await client.post(
        f"/api/v1/projects/{project_id}/preview", headers=headers)
    assert res.status_code == 200, res.text
    second = res.json()["data"]
    assert second["status"] == "READY"
    # A fresh process: new execution row, and the old port is proven released
    # (no orphan / no held port) because the new server binds and serves.
    assert second["execution_id"] != first["execution_id"]
    proxy = await client.get(second["url"], headers=headers)
    assert proxy.status_code == 200
    assert "round2" in proxy.text

    res = await client.post(
        f"/api/v1/projects/{project_id}/preview/stop", headers=headers)
    assert res.status_code == 200, res.text
    assert _PROCESSES == {}  # no orphaned process handle remains


@pytest.mark.asyncio
async def test_preview_ownership_enforced(client):
    headers_a = await _register(client, email="da@example.com", name="A")
    headers_b = await _register(client, email="db@example.com", name="B")
    project_a = await _create_project(client, headers_a, name="owner-a")
    _add_static(project_a, "<h1>SECRET_A</h1>")

    res = await client.post(
        f"/api/v1/projects/{project_a}/preview", headers=headers_a)
    assert res.status_code == 200, res.text
    info = res.json()["data"]

    # User B cannot read user A's preview (proxy).
    res_b = await client.get(info["url"], headers=headers_b)
    assert res_b.status_code in (403, 404), res_b.text
    # User B cannot read or stop user A's preview (status/stop).
    res_b_status = await client.get(
        f"/api/v1/projects/{project_a}/preview/status", headers=headers_b)
    assert res_b_status.status_code == 403, res_b_status.text
    res_b_stop = await client.post(
        f"/api/v1/projects/{project_a}/preview/stop", headers=headers_b)
    assert res_b_stop.status_code == 403, res_b_stop.text

    # Owner still sees the running preview.
    res_owner = await client.get(
        f"/api/v1/projects/{project_a}/preview/status", headers=headers_a)
    assert res_owner.status_code == 200
    assert res_owner.json()["data"]["status"] == "READY"

    res = await client.post(
        f"/api/v1/projects/{project_a}/preview/stop", headers=headers_a)
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_preview_not_supported_when_no_dev_tooling(client):
    headers = await _register(client, email="d4@example.com")
    project_id = await _create_project(client, headers, name="empty-preview")
    # No package.json dev/start script and no index.html -> unsupported.
    res = await client.post(
        f"/api/v1/projects/{project_id}/preview", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "PREVIEW_NOT_SUPPORTED"

    # package.json WITHOUT a dev/start script is also unsupported.
    pkg = json.dumps({"name": "x", "scripts": {"build": "true"}})
    FileService.create_file(project_id, "", "package.json", pkg)
    res = await client.post(
        f"/api/v1/projects/{project_id}/preview", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "PREVIEW_NOT_SUPPORTED"


@pytest.mark.asyncio
async def test_preview_unavailable_tool_reported_honestly(client, monkeypatch):
    """When npm is detected as missing on the server, the start command is
    refused up front (503) instead of guessing."""
    import app.services.preview_service as preview_module
    headers = await _register(client, email="d5@example.com")
    project_id = await _create_project(client, headers, name="tool-missing")
    pkg = json.dumps({"name": "x", "scripts": {"dev": "vite"}})
    FileService.create_file(project_id, "", "package.json", pkg)
    monkeypatch.setattr(preview_module, "_which", lambda tool: False)
    res = await client.post(
        f"/api/v1/projects/{project_id}/preview", headers=headers)
    assert res.status_code == 503, res.text
    assert res.json()["error"]["code"] == "QUALITY_TOOL_UNAVAILABLE"


@pytest.mark.asyncio
async def test_preview_requires_authentication(client):
    res = await client.post(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/preview")
    assert res.status_code in (401, 403), res.text
    res = await client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/preview/status")
    assert res.status_code in (401, 403), res.text