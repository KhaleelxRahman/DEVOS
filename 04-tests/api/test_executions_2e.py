"""Phase 2E tests."""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.base import Base
from app.db.session import engine
from app.core.config import settings


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email="exec2e@example.com", name="Exec2E"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="exec2e-project"):
    res = await client.post(
        "/api/v1/projects", json={"name": name}, headers=headers
    )
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _exec_base(project_id):
    return f"/api/v1/projects/{project_id}/executions"


async def _create_queued(client, headers, project_id,
                         command="echo DEVOS_PHASE2_TEST", args=None):
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


@pytest.mark.asyncio
async def test_success_execution_completes_with_stdout(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(client, headers, project_id)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "COMPLETED", data
    assert data["exit_code"] == 0
    assert data["stdout"] is not None
    assert "DEVOS_PHASE2_TEST" in data["stdout"]
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_failure_execution_records_exit_code(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id, command="python",
        args=["-c", "import sys; sys.exit(42)"])
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "FAILED", data
    assert data["exit_code"] == 42
    assert data["failure_reason"] is not None
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_timeout_enforced_real_kill(client):
    """A process that exceeds TERMINAL_TIMEOUT_SECONDS is killed and marked
    TIMED_OUT. We patch the timeout down to 1 s so the test runs fast."""
    original = settings.TERMINAL_TIMEOUT_SECONDS
    settings.TERMINAL_TIMEOUT_SECONDS = 1
    try:
        headers = await _register(client)
        project_id = await _create_project(client, headers)
        eid = await _create_queued(
            client, headers, project_id,
            command="python",
            args=["-c", "import time; time.sleep(100)"],
        )
        res = await client.post(
            f"{_exec_base(project_id)}/{eid}/run", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert data["status"] == "TIMED_OUT", data
        assert data["timed_out"] is True
        assert data["process_id"] is not None
        assert data["exit_code"] == -1
        assert data["completed_at"] is not None
    finally:
        settings.TERMINAL_TIMEOUT_SECONDS = original


@pytest.mark.asyncio
async def test_cancel_running_execution_real_kill(client):
    """Cancel a SLEEPing process: the backend must kill the real subprocess,
    commit CANCELLED to the DB, and clear the in-memory handle.
    /run blocks until terminal state, so run it in background and cancel
    while genuinely RUNNING."""
    import asyncio
    import app.services.execution_service as svc_mod

    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python",
        args=["-c", "import time; time.sleep(60)"],
    )
    # Start the run in the background — do NOT await it directly,
    # since /run blocks until the process reaches a terminal state.
    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    )

    # Give the process a moment to actually start (real process spawn).
    await asyncio.sleep(1.0)

    # Now cancel it while it's genuinely running.
    cancel_res = await client.post(
        f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    assert cancel_res.status_code == 200, cancel_res.text
    cdata = cancel_res.json()["data"]
    assert cdata["execution_id"] == eid
    assert cdata["status"] == "CANCELLED"
    assert cdata["cancelled"] is True
    assert cdata["process_id"] is not None
    assert cdata["completed_at"] is not None

    # The background run task should now resolve (the process was killed).
    run_res = await run_task
    assert run_res.status_code == 200, run_res.text
    assert eid not in svc_mod._PROCESSES

    # Re-read from DB to confirm committed state.
    get_res = await client.get(
        f"{_exec_base(project_id)}/{eid}", headers=headers)
    assert get_res.status_code == 200, get_res.text
    assert get_res.json()["data"]["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_cancel_after_completion_is_rejected(client):
    """Cancel a COMPLETED execution returns 422 INVALID_REQUEST."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(client, headers, project_id)
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "INVALID_REQUEST"


@pytest.mark.asyncio
async def test_double_cancel_is_rejected(client):
    """A second cancel on an already CANCELLED execution is rejected."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python", args=["-c", "import time; time.sleep(60)"])
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    await client.post(f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "INVALID_REQUEST"

@pytest.mark.asyncio
async def test_retry_produces_new_process_new_pid(client):
    """Retrying a FAILED execution creates a *new* execution row with a fresh
    PID. The original row is untouched."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python",
        args=["-c", "import sys; sys.exit(7)"],
    )
    run_res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert run_res.status_code == 200, run_res.text
    original = run_res.json()["data"]
    assert original["status"] == "FAILED"
    original_pid = original["process_id"]

    retry_res = await client.post(
        f"{_exec_base(project_id)}/{eid}/retry", headers=headers)
    assert retry_res.status_code == 200, retry_res.text
    retry_data = retry_res.json()["data"]
    assert retry_data["status"] == "FAILED"
    assert retry_data["process_id"] != original_pid
    assert retry_data["parent_execution_id"] == eid
    assert retry_data["retry_count"] == 1


@pytest.mark.asyncio
async def test_retry_preserves_original_execution(client):
    """The original execution row is untouched after a retry."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python", args=["-c", "import sys; sys.exit(3)"])
    run_res = await client.post(
        f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    original = run_res.json()["data"]
    await client.post(f"{_exec_base(project_id)}/{eid}/retry", headers=headers)
    get_res = await client.get(
        f"{_exec_base(project_id)}/{eid}", headers=headers)
    preserved = get_res.json()["data"]
    assert preserved["status"] == original["status"]
    assert preserved["exit_code"] == original["exit_code"]
    assert preserved["process_id"] == original["process_id"]



@pytest.mark.asyncio
async def test_retry_invalid_state_queued_rejected(client):
    """Retrying a QUEUED execution returns 422 (only terminal states are
    retryable)."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(client, headers, project_id)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/retry", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "INVALID_REQUEST"


@pytest.mark.asyncio
async def test_retry_invalid_state_running_rejected(client):
    """Retrying a live RUNNING execution returns 422 (run started in
    background so it is still genuinely RUNNING when retry is attempted)."""
    import asyncio
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python", args=["-c", "import time; time.sleep(30)"])
    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers))
    await asyncio.sleep(1.0)
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/retry", headers=headers)
    assert res.status_code == 422, res.text
    await client.post(f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    await run_task
    assert res.json()["error"]["code"] == "INVALID_REQUEST"


@pytest.mark.asyncio
async def test_retry_max_limit_enforced(client):
    """After MAX_RETRY_COUNT retries of the same parent, the next retry is
    rejected with 422 RETRY_EXHAUSTED."""
    from app.services.execution_service import MAX_RETRY_COUNT
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python", args=["-c", "import sys; sys.exit(11)"])
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    for i in range(MAX_RETRY_COUNT):
        res = await client.post(
            f"{_exec_base(project_id)}/{eid}/retry", headers=headers)
        assert res.status_code == 200, f"retry {i} failed: {res.text}"
    res = await client.post(
        f"{_exec_base(project_id)}/{eid}/retry", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "RETRY_EXHAUSTED"



@pytest.mark.asyncio
async def test_retry_unauthorized_user_rejected(client):
    """User B cannot retry User A's execution."""
    headers_a = await _register(client, email="a2e@example.com", name="A2E")
    headers_b = await _register(client, email="b2e@example.com", name="B2E")
    project_a = await _create_project(client, headers_a, name="a2e-project")
    eid = await _create_queued(
        client, headers_a, project_a,
        command="python", args=["-c", "import sys; sys.exit(1)"])
    await client.post(f"{_exec_base(project_a)}/{eid}/run", headers=headers_a)
    res = await client.post(
        f"{_exec_base(project_a)}/{eid}/retry", headers=headers_b)
    assert res.status_code == 403, res.text
    assert res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_cancel_unauthorized_user_rejected(client):
    """User B cannot cancel User A's running execution."""
    headers_a = await _register(client, email="a2c@example.com", name="A2C")
    headers_b = await _register(client, email="b2c@example.com", name="B2C")
    project_a = await _create_project(client, headers_a, name="a2c-project")
    eid = await _create_queued(
        client, headers_a, project_a,
        command="python", args=["-c", "import time; time.sleep(30)"])
    await client.post(f"{_exec_base(project_a)}/{eid}/run", headers=headers_a)
    res = await client.post(
        f"{_exec_base(project_a)}/{eid}/cancel", headers=headers_b)
    assert res.status_code == 403, res.text
    assert res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.asyncio
async def test_no_orphan_after_completion(client):
    """After COMPLETED, _PROCESSES must be empty."""
    import app.services.execution_service as svc_mod
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(client, headers, project_id)
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert svc_mod._PROCESSES == {}, svc_mod._PROCESSES


@pytest.mark.asyncio
async def test_no_orphan_after_failure(client):
    """After FAILED, _PROCESSES must be empty."""
    import app.services.execution_service as svc_mod
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python", args=["-c", "import sys; sys.exit(1)"])
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    assert svc_mod._PROCESSES == {}, svc_mod._PROCESSES


@pytest.mark.asyncio
async def test_no_orphan_after_cancel(client):
    """After CANCELLED, _PROCESSES must be empty."""
    import app.services.execution_service as svc_mod
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python", args=["-c", "import time; time.sleep(30)"])
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    await client.post(f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    assert svc_mod._PROCESSES == {}, svc_mod._PROCESSES


@pytest.mark.asyncio
async def test_no_orphan_after_timeout(client):
    """After TIMED_OUT, _PROCESSES must be empty."""
    import app.services.execution_service as svc_mod
    original = settings.TERMINAL_TIMEOUT_SECONDS
    settings.TERMINAL_TIMEOUT_SECONDS = 1
    try:
        headers = await _register(client)
        project_id = await _create_project(client, headers)
        eid = await _create_queued(
            client, headers, project_id,
            command="python", args=["-c", "import time; time.sleep(100)"])
        await client.post(
            f"{_exec_base(project_id)}/{eid}/run", headers=headers)
        assert svc_mod._PROCESSES == {}, svc_mod._PROCESSES
    finally:
        settings.TERMINAL_TIMEOUT_SECONDS = original


@pytest.mark.asyncio
async def test_no_orphan_after_retry(client):
    """After a retry child completes, _PROCESSES must be empty."""
    import app.services.execution_service as svc_mod
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    eid = await _create_queued(
        client, headers, project_id,
        command="python", args=["-c", "import sys; sys.exit(5)"])
    await client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers)
    await client.post(f"{_exec_base(project_id)}/{eid}/retry", headers=headers)
    assert svc_mod._PROCESSES == {}, svc_mod._PROCESSES
