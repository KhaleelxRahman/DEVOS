"""Phase 2B real process execution tests."""
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


async def _register(client, email="exec2b@example.com", name="Exec2B"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="exec2b-project"):
    res = await client.post(
        "/api/v1/projects", json={"name": name}, headers=headers
    )
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


@pytest.mark.asyncio
async def test_run_execution_completes_with_stdout(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(client, headers, project_id)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["execution_id"] == eid
    assert data["status"] == "COMPLETED"
    assert data["exit_code"] == 0
    assert data["stdout"] is not None
    assert "DEVOS_PHASE2_TEST" in data["stdout"]
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_run_execution_returns_exit_code_on_failure(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id, command="python",
        args=["-c", "import sys; sys.exit(42)"])
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "FAILED"
    assert data["exit_code"] == 42
    assert data["failure_reason"] is not None


@pytest.mark.asyncio

@pytest.mark.asyncio
async def test_run_non_queued_execution_is_rejected(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(client, headers, project_id)
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "INVALID_REQUEST"


@pytest.mark.asyncio
async def test_blocked_command_never_reaches_runner(client):
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
    assert res.json()["error"]["code"] == "BLOCKED_COMMAND"
    assert res.json().get("data") is None


@pytest.mark.asyncio
async def test_cancel_queued_execution(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id, command="python",
        args=["-c", "import time; time.sleep(60)"])
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["execution_id"] == eid
    assert data["status"] == "CANCELLED"
    assert data["cancelled"] is True


@pytest.mark.asyncio
async def test_run_execution_requires_ownership(client):
    headers_a = await _register(client, email="a2b@example.com", name="A2B")
    headers_b = await _register(client, email="b2b@example.com", name="B2B")
    project_a = await _create_project(client, headers_a, name="a2b-project")
    eid = await _create_queued(client, headers_a, project_a)
    res = await client.post(
        f"{_exec_base(project_a)}/{eid}/run", headers=headers_b)
    assert res.status_code == 403, res.text

async def test_run_execution_captures_stderr(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id, command="python",
        args=["-c", "import sys; sys.stderr.write('error output\\n')"])
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "COMPLETED"
    assert data["stderr"] is not None
    assert "error output" in data["stderr"]


@pytest.mark.asyncio
async def test_run_execution_updates_process_id(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(client, headers, project_id)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["process_id"] is not None


def _exec_base(project_id: str) -> str:
    return f"/api/v1/projects/{project_id}/executions"


async def _create_queued(client, headers, project_id, command="echo DEVOS_PHASE2_TEST", args=None):
    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "CUSTOM_SAFE_COMMAND",
            "command": command,
            "arguments": args or [],
            "working_directory": ".",
            "workspace_id": project_id,
        },
    )
    assert res.status_code == 200, f"create_queued failed: {res.text}"
    return res.json()["data"]["execution_id"]
