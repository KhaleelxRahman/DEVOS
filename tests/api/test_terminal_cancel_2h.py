"""Phase 2H — terminal cancellation via the execution lifecycle.

TerminalPanel.tsx no longer calls the legacy blocking
``POST /projects/{id}/terminal/execute``. It drives
``create -> run -> poll -> cancel`` instead, because the blocking endpoint
returns no ``execution_id`` and therefore offers nothing to cancel.

These tests cover that path end to end against the real subprocess engine,
plus the audit trail (STEP 2B) that the panel's switch would otherwise have
silently dropped.
"""
import asyncio

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.base import Base
from app.db.session import engine
from app.core.config import settings

import app.services.execution_service as svc_mod


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email="cancel2h@example.com", name="Cancel2H"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="cancel2h-project"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _exec_base(project_id):
    return f"/api/v1/projects/{project_id}/executions"


async def _create_queued(client, headers, project_id, command, args):
    """Mirror exactly what TerminalPanel.run() sends."""
    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "CUSTOM_SAFE_COMMAND",
            "command": command,
            "arguments": args,
            "working_directory": ".",
            "workspace_id": project_id,
        },
    )
    assert res.status_code == 200, f"create failed: {res.text}"
    return res.json()["data"]


async def _wait_for_status(client, headers, project_id, eid, wanted, timeout=20.0):
    """Stand in for the panel's poll loop: GET the record until it matches.

    Mirrors TerminalPanel.pollUntilTerminal, which reads
    executionApi.get(projectId, executionId) every POLL_INTERVAL_MS and stops
    on any of COMPLETED / FAILED / BLOCKED / CANCELLED / TIMED_OUT.

    Raises AssertionError if no record was ever read (deadline hit before the
    first poll returned), so callers never subscript None.
    """
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    last: dict | None = None
    while loop.time() < deadline:
        res = await client.get(f"{_exec_base(project_id)}/{eid}", headers=headers)
        assert res.status_code == 200, res.text
        last = res.json()["data"]
        if wanted and last["status"] == wanted:
            return last
        if last["status"] in ("COMPLETED", "FAILED", "BLOCKED", "CANCELLED", "TIMED_OUT"):
            return last
        await asyncio.sleep(0.2)
    assert last is not None, (
        "no execution record was readable for %s within %ss" % (eid, timeout))
    return last


@pytest.mark.asyncio
async def test_terminal_lifecycle_poll_reaches_completed(client):
    """A normal command reaches COMPLETED through create->run->poll.

    Guards the poll loop's normal-completion branch. The cancel path is
    covered separately; without this, a loop that only ever breaks on
    CANCELLED would still pass the cancel test.
    """
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    created = await _create_queued(
        client, headers, project_id, "echo DEVOS_PHASE2_TEST", [])
    assert created["status"] == "QUEUED", created

    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{created['execution_id']}/run",
                    headers=headers))
    record = await _wait_for_status(
        client, headers, project_id, created["execution_id"], "COMPLETED")
    assert record["status"] == "COMPLETED", record
    assert record["exit_code"] == 0
    assert "DEVOS_PHASE2_TEST" in (record["stdout"] or "")

    res = await run_task
    assert res.status_code == 200, res.text
    assert created["execution_id"] not in svc_mod._PROCESSES


@pytest.mark.asyncio
async def test_terminal_lifecycle_cancel_reaches_cancelled(client):
    """Stop a genuinely RUNNING execution: RUNNING -> CANCELLED, no orphan."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    created = await _create_queued(
        client, headers, project_id, "python",
        ["-c", "import time; time.sleep(60)"])
    eid = created["execution_id"]

    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers))

    running = await _wait_for_status(client, headers, project_id, eid, "RUNNING")
    assert running["status"] == "RUNNING", running
    assert running["process_id"] is not None, running

    cancel_res = await client.post(
        f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    assert cancel_res.status_code == 200, cancel_res.text
    cancelled = cancel_res.json()["data"]
    assert cancelled["status"] == "CANCELLED", cancelled
    assert cancelled["cancelled"] is True
    assert cancelled["completed_at"] is not None

    after = await client.get(f"{_exec_base(project_id)}/{eid}", headers=headers)
    assert after.status_code == 200, after.text
    assert after.json()["data"]["status"] == "CANCELLED"

    res = await run_task
    assert res.status_code == 200, res.text
    assert eid not in svc_mod._PROCESSES


@pytest.mark.asyncio
async def test_cancelled_execution_is_not_reported_as_failed(client):
    """CANCELLED must be distinguishable from FAILED for the UI.

    TerminalPanel renders a distinct cancelled badge and gates the
    'exit code' failure badge off when status === 'CANCELLED'.
    """
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    created = await _create_queued(
        client, headers, project_id, "python",
        ["-c", "import time; time.sleep(60)"])
    eid = created["execution_id"]
    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers))
    await _wait_for_status(client, headers, project_id, eid, "RUNNING")
    await client.post(f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    await run_task

    res = await client.get(f"{_exec_base(project_id)}/{eid}", headers=headers)
    record = res.json()["data"]
    assert record["status"] == "CANCELLED", record
    assert record["status"] != "FAILED", record
    assert record["cancelled"] is True
    assert record["timed_out"] is False


@pytest.mark.asyncio
async def test_execution_lifecycle_writes_audit_entries(client):
    """STEP 2B: create/run each write an ActivityService record.

    The terminal panel used to audit via 'terminal.executed' on the legacy
    endpoint. After the switch to the execution lifecycle, nothing recorded
    these commands, so audit parity is asserted here explicitly.
    """
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    created = await _create_queued(
        client, headers, project_id, "echo DEVOS_PHASE2_TEST", [])
    eid = created["execution_id"]
    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers))
    await _wait_for_status(client, headers, project_id, eid, "COMPLETED")
    await run_task

    res = await client.get(f"/api/v1/projects/{project_id}/activity", headers=headers)
    assert res.status_code == 200, res.text
    entries = res.json()["data"]["activities"]
    types = [entry["activity_type"] for entry in entries]
    assert "execution.created" in types, types
    assert "execution.executed" in types, types

    created_entry = next(
        e for e in entries if e["activity_type"] == "execution.created")
    assert created_entry["metadata"]["execution_id"] == eid
    assert created_entry["metadata"]["command"] == "echo DEVOS_PHASE2_TEST"


@pytest.mark.asyncio
async def test_cancel_writes_audit_entry(client):
    """A user-initiated stop is audited with its own activity_type."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    created = await _create_queued(
        client, headers, project_id, "python",
        ["-c", "import time; time.sleep(60)"])
    eid = created["execution_id"]
    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers))
    await _wait_for_status(client, headers, project_id, eid, "RUNNING")
    await client.post(f"{_exec_base(project_id)}/{eid}/cancel", headers=headers)
    await run_task

    res = await client.get(f"/api/v1/projects/{project_id}/activity", headers=headers)
    assert res.status_code == 200, res.text
    entries = res.json()["data"]["activities"]
    cancelled = next(
        (e for e in entries if e["activity_type"] == "execution.cancelled"), None)
    assert cancelled is not None, [e["activity_type"] for e in entries]
    assert cancelled["metadata"]["execution_id"] == eid
    assert cancelled["metadata"]["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_poll_stops_on_failed_terminal_state(client):
    """The poll loop's terminal set also covers FAILED, not just CANCELLED."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    created = await _create_queued(
        client, headers, project_id, "python", ["-c", "import sys; sys.exit(7)"])
    eid = created["execution_id"]
    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers))
    record = await _wait_for_status(client, headers, project_id, eid, "FAILED")
    await run_task
    assert record["status"] == "FAILED", record
    assert record["exit_code"] == 7, record


@pytest.mark.asyncio
async def test_terminal_timeout_is_observed_by_poll(client):
    """TIMED_OUT is in the poll loop's terminal set."""
    original = settings.TERMINAL_TIMEOUT_SECONDS
    settings.TERMINAL_TIMEOUT_SECONDS = 1
    try:
        headers = await _register(client)
        project_id = await _create_project(client, headers)
        created = await _create_queued(
            client, headers, project_id, "python",
            ["-c", "import time; time.sleep(30)"])
        eid = created["execution_id"]
        run_task = asyncio.create_task(
            client.post(f"{_exec_base(project_id)}/{eid}/run", headers=headers))
        record = await _wait_for_status(
            client, headers, project_id, eid, "TIMED_OUT")
        await run_task
        assert record["status"] == "TIMED_OUT", record
        assert record["timed_out"] is True
    finally:
        settings.TERMINAL_TIMEOUT_SECONDS = original
