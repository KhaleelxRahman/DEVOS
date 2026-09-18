"""Phase 2F tests: execution history (list / details / logs) with ownership.

The history endpoints read the SAME Execution rows the 2A-2E engine records —
these tests verify real recorded data surfaces truthfully, never fixtures.
"""
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


async def _register(client, email="hist2f@example.com", name="Hist2F"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="hist2f-project"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _exec_base(project_id):
    return f"/api/v1/projects/{project_id}/executions"


async def _create_queued(client, headers, project_id,
                         command="python",
                         args=None):
    if args is None:
        args = ["-c", "print('DEVOS_PHASE2F_OK')"]
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
async def test_history_lists_real_executions_newest_first(client):
    """The list endpoint returns the real records the engine wrote, newest
    first, with the full per-entry contract."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    e1 = await _create_queued(
        client, headers, project_id, args=["-c", "print('FIRST')"])
    e2 = await _create_queued(
        client, headers, project_id, args=["-c", "print('SECOND')"])

    res = await client.get(_exec_base(project_id), headers=headers)
    assert res.status_code == 200, res.text
    rows = res.json()["data"]
    assert isinstance(rows, list) and len(rows) == 2
    assert [r["execution_id"] for r in rows] == [e2, e1], rows

    row = rows[0]
    assert row["execution_type"] == "CUSTOM_SAFE_COMMAND"
    assert row["command"] == "python"
    assert row["arguments"] == ["-c", "print('SECOND')"]
    assert row["status"] == "QUEUED"
    assert row["exit_code"] is None
    assert row["created_at"] is not None
    assert row["retry_count"] == 0
    assert row["project_id"] == project_id


@pytest.mark.asyncio
async def test_history_entry_reflects_real_run_with_logs(client):
    """After a real run, the history entry and its detail drill-in carry the
    real exit code, real stdout/stderr, and real timestamps."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    ok_id = await _create_queued(client, headers, project_id)
    bad_id = await _create_queued(
        client, headers, project_id, command="python",
        args=["-c", "import sys; print('BOOM', file=sys.stderr); sys.exit(42)"])

    for eid in (ok_id, bad_id):
        res = await client.post(
            f"{_exec_base(project_id)}/{eid}/run", headers=headers)
        assert res.status_code == 200, res.text

    res = await client.get(_exec_base(project_id), headers=headers)
    assert res.status_code == 200, res.text
    rows = {r["execution_id"]: r for r in res.json()["data"]}

    ok = rows[ok_id]
    assert ok["status"] == "COMPLETED"
    assert ok["exit_code"] == 0
    assert ok["started_at"] is not None and ok["completed_at"] is not None
    # Duration is computable from the real recorded timestamps.
    from datetime import datetime
    started = datetime.fromisoformat(ok["started_at"])
    completed = datetime.fromisoformat(ok["completed_at"])
    assert (completed - started).total_seconds() >= 0

    bad = rows[bad_id]
    assert bad["status"] == "FAILED"
    assert bad["exit_code"] == 42
    assert bad["failure_reason"] is not None

    # Drill-in (detail endpoint) exposes the full captured logs.
    detail = await client.get(
        f"{_exec_base(project_id)}/{ok_id}", headers=headers)
    assert detail.status_code == 200, detail.text
    ddata = detail.json()["data"]
    assert "DEVOS_PHASE2F_OK" in (ddata["stdout"] or "")
    failed_detail = await client.get(
        f"{_exec_base(project_id)}/{bad_id}", headers=headers)
    fdata = failed_detail.json()["data"]
    assert fdata["stderr"] is not None and fdata["stderr"] != ""


@pytest.mark.asyncio
async def test_history_surfaces_attempt_tracking(client):
    """Retry children appear in history with their attempt number and parent
    link; the original's retry_count is incremented and preserved."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    orig = await _create_queued(
        client, headers, project_id, command="python",
        args=["-c", "import sys; sys.exit(3)"])
    run = await client.post(
        f"{_exec_base(project_id)}/{orig}/run", headers=headers)
    assert run.status_code == 200, run.text

    retry = await client.post(
        f"{_exec_base(project_id)}/{orig}/retry", headers=headers)
    assert retry.status_code == 200, retry.text
    child = retry.json()["data"]
    assert child["retry_count"] == 1
    assert child["parent_execution_id"] == orig

    res = await client.get(_exec_base(project_id), headers=headers)
    rows = {r["execution_id"]: r for r in res.json()["data"]}
    assert rows[orig]["retry_count"] == 1  # original preserved + incremented
    assert rows[child["execution_id"]]["retry_count"] == 1
    assert rows[child["execution_id"]]["parent_execution_id"] == orig
    assert rows[orig]["status"] == "FAILED"  # original record untouched


@pytest.mark.asyncio
async def test_history_ownership_enforced(client):
    """User B cannot list or read User A's execution history."""
    user_a = await _register(client, email="hist-a@example.com", name="A")
    user_b = await _register(client, email="hist-b@example.com", name="B")
    project_a = await _create_project(client, user_a, name="a-project")
    eid = await _create_queued(client, user_a, project_a)

    # Cross-user history list is forbidden.
    res = await client.get(_exec_base(project_a), headers=user_b)
    assert res.status_code in (403, 404), res.text

    # Cross-user detail drill-in is forbidden.
    res = await client.get(
        f"{_exec_base(project_a)}/{eid}", headers=user_b)
    assert res.status_code in (403, 404), res.text

    # B's own history contains only B's records (no leakage).
    project_b = await _create_project(client, user_b, name="b-project")
    res = await client.get(_exec_base(project_b), headers=user_b)
    assert res.status_code == 200, res.text
    assert res.json()["data"] == []


@pytest.mark.asyncio
async def test_history_limit_and_pagination(client):
    """limit bounds the response size; newest entries win; invalid limits 422."""
    headers = await _register(client, email="hist-limit@example.com")
    project_id = await _create_project(client, headers)
    ids = [await _create_queued(client, headers, project_id) for _ in range(3)]

    res = await client.get(
        f"{_exec_base(project_id)}?limit=2", headers=headers)
    assert res.status_code == 200, res.text
    rows = res.json()["data"]
    assert len(rows) == 2
    assert [r["execution_id"] for r in rows] == [ids[2], ids[1]]

    res = await client.get(
        f"{_exec_base(project_id)}?limit=0", headers=headers)
    assert res.status_code == 422, res.text
    res = await client.get(
        f"{_exec_base(project_id)}?limit=101", headers=headers)
    assert res.status_code == 422, res.text

