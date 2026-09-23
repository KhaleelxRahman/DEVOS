"""Phase 2A execution foundation tests (AC-2A-01..2A-16 coverage)."""
import os
import uuid
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


async def _register(client, email="exec2a@example.com", name="Exec2A"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="exec2a-project"):
    res = await client.post(
        "/api/v1/projects", json={"name": name}, headers=headers
    )
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _exec_base(project_id: str) -> str:
    return f"/api/v1/projects/{project_id}/executions"



@pytest.mark.asyncio
async def test_create_execution_rejects_unknown_type(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "FUTURE_TYPE",
            "command": "echo DEVOS_PHASE2_TEST",
            "arguments": [],
            "working_directory": ".",
            "workspace_id": project_id,
        },
    )
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "INVALID_EXECUTION_TYPE"


@pytest.mark.asyncio
async def test_error_response_uses_typed_error_detail(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "BUILD",
            "command": "rm -rf /",
            "arguments": [],
            "working_directory": ".",
            "workspace_id": project_id,
        },
    )
    body = res.json()
    assert "error" in body
    assert "code" in body["error"]
    assert "message" in body["error"]
    assert body["success"] is False


@pytest.mark.asyncio
async def test_create_execution_honors_caller_execution_id(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    fixed_id = str(uuid.uuid4())

    first = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "TYPECHECK",
            "command": "echo DEVOS_PHASE2_TEST",
            "arguments": [],
            "working_directory": ".",
            "workspace_id": project_id,
            "execution_id": fixed_id,
        },
    )
    assert first.status_code == 200, first.text
    assert first.json()["data"]["execution_id"] == fixed_id

    second = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "TYPECHECK",
            "command": "echo DEVOS_PHASE2_TEST",
            "arguments": [],
            "working_directory": ".",
            "workspace_id": project_id,
            "execution_id": fixed_id,
        },
    )
    assert second.status_code == 200, second.text
    assert second.json()["data"]["execution_id"] == fixed_id


@pytest.mark.asyncio
async def test_get_execution_rejects_cross_user_read(client):
    headers_a = await _register(client, email="ra@example.com", name="RA")
    headers_b = await _register(client, email="rb@example.com", name="RB")
    project_a = await _create_project(client, headers_a, name="ra-project")

    created = await client.post(
        _exec_base(project_a),
        headers=headers_a,
        json={
            "execution_type": "TYPECHECK",
            "command": "echo DEVOS_PHASE2_TEST",
            "arguments": [],
            "working_directory": ".",
            "workspace_id": project_a,
        },
    )
    execution_id = created.json()["data"]["execution_id"]

    res = await client.get(
        f"{_exec_base(project_a)}/{execution_id}",
        headers=headers_b,
    )
    assert res.status_code == 403, res.text


@pytest.mark.asyncio
async def test_create_execution_accepts_subdirectory(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "BUILD",
            "command": "echo DEVOS_PHASE2_TEST",
            "arguments": [],
            "working_directory": "src/components",
            "workspace_id": project_id,
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "QUEUED"
    assert "src" + os.path.sep + "components" in data["working_directory"]


@pytest.mark.asyncio
async def test_create_execution_accepts_all_defined_types(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    types = [
        "DEPENDENCY_INSTALL", "BUILD", "TEST", "LINT",
        "TYPECHECK", "DEV_SERVER", "PREVIEW", "CUSTOM_SAFE_COMMAND",
    ]
    for i, et in enumerate(types):
        res = await client.post(
            _exec_base(project_id),
            headers=headers,
            json={
                "execution_type": et,
                "command": "echo DEVOS_PHASE2_TEST",
                "arguments": [],
                "working_directory": ".",
                "workspace_id": project_id,
                "execution_id": str(uuid.uuid4()),
            },
        )
        assert res.status_code == 200, f"{et}: {res.text}"
        assert res.json()["data"]["execution_type"] == et
        assert res.json()["data"]["status"] == "QUEUED"



@pytest.mark.asyncio
async def test_create_execution_rejects_drive_path(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "BUILD",
            "command": "echo DEVOS_PHASE2_TEST",
            "arguments": [],
            "working_directory": "C:\\Windows\\System32",
            "workspace_id": project_id,
        },
    )
    assert res.status_code in (403, 422), res.text
    assert res.json()["success"] is False


@pytest.mark.asyncio
async def test_create_execution_rejects_unc_path(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "BUILD",
            "command": "echo DEVOS_PHASE2_TEST",
            "arguments": [],
            "working_directory": "\\\\server\\share",
            "workspace_id": project_id,
        },
    )
    assert res.status_code in (403, 422), res.text
    assert res.json()["success"] is False


@pytest.mark.asyncio
async def test_create_execution_blocks_rm_rf(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "CUSTOM_SAFE_COMMAND",
            "command": "rm -rf /",
            "arguments": [],
            "working_directory": ".",
            "workspace_id": project_id,
        },
    )
    assert res.status_code == 403, res.text
    assert res.json()["success"] is False
    assert res.json()["error"]["code"] == "BLOCKED_COMMAND"


@pytest.mark.asyncio
async def test_create_execution_blocks_shutdown(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "CUSTOM_SAFE_COMMAND",
            "command": "shutdown now",
            "arguments": [],
            "working_directory": ".",
            "workspace_id": project_id,
        },
    )
    assert res.status_code == 403, res.text
    assert res.json()["error"]["code"] == "BLOCKED_COMMAND"
