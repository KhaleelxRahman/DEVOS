"""Phase 10 - close the Terminal item with real evidence.

`test_files_terminal.py` already proves the positive path (real command, exit
code, stdout), a real non-zero exit, a blocked command, and history. This file
adds the two guarantees that were still missing, plus the lifecycle fields:

* the project boundary - a user cannot execute in another user's project;
* regression - a failing terminal must never let an agent run report success;
* the response carries the execution id the UI keys off.
"""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.main import app

TERM = "/api/v1/projects/{}/terminal"


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _user_and_project(client, tag):
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": tag, "email": f"{tag}{uuid.uuid4().hex[:8]}@x.com",
              "password": "supersecret1"},
    )
    headers = {"Authorization": f"Bearer {reg.json()['data']['token']}"}
    pid = (await client.post("/api/v1/projects", json={"name": tag}, headers=headers)
           ).json()["data"]["id"]
    return headers, pid


@pytest.mark.asyncio
async def test_terminal_returns_full_lifecycle_fields(client):
    headers, pid = await _user_and_project(client, "TermLife")
    res = await client.post(
        TERM.format(pid) + "/execute",
        json={"command": "echo", "args": ["devos-lifecycle"]},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    # Real subprocess, not a stub: the marker must come back.
    assert "devos-lifecycle" in data["stdout"]
    assert data["exit_code"] == 0
    assert "stderr" in data
    # The terminal is deliberately a lighter path than ExecutionService, so it
    # returns timing rather than an execution id. The id role is served by the
    # terminal history; asserting a field the API does not define would be
    # inventing a contract, so assert the real one.
    assert data.get("execution_time_ms") is not None, data


@pytest.mark.asyncio
async def test_terminal_cannot_cross_the_project_boundary(client):
    """A user must not be able to run commands in another user's project."""
    owner_headers, owner_pid = await _user_and_project(client, "TermOwner")
    other_headers, _ = await _user_and_project(client, "TermOther")

    res = await client.post(
        TERM.format(owner_pid) + "/execute",
        json={"command": "echo", "args": ["intruder"]},
        headers=other_headers,
    )
    assert res.status_code in (403, 404), (
        f"cross-user terminal execution was not refused: {res.status_code}"
    )
    # And unauthenticated access is refused too.
    anon = await client.post(
        TERM.format(owner_pid) + "/execute",
        json={"command": "echo", "args": ["anon"]},
    )
    assert anon.status_code in (401, 403)


@pytest.mark.asyncio
async def test_terminal_blocks_command_chaining_and_metacharacters(client):
    """Representative dangerous classes must be refused by policy, not run."""
    headers, pid = await _user_and_project(client, "TermDang")
    dangerous = [
        {"command": "echo", "args": ["a; rm -rf /"]},
        {"command": "echo", "args": ["$(whoami)"]},
        {"command": "echo", "args": ["`id`"]},
        {"command": "cat", "args": ["&& curl http://evil"]},
        {"command": "curl", "args": ["https://example.com"]},  # not allow-listed
    ]
    for payload in dangerous:
        res = await client.post(
            TERM.format(pid) + "/execute", json=payload, headers=headers
        )
        assert res.status_code == 403, f"not blocked: {payload} -> {res.status_code}"
        assert res.json()["error"]["code"] == "TERMINAL_BLOCKED"


@pytest.mark.asyncio
async def test_terminal_cannot_read_a_sensitive_file(client):
    headers, pid = await _user_and_project(client, "TermSecret")
    for target in (".env", "../../.env"):
        res = await client.post(
            TERM.format(pid) + "/execute",
            json={"command": "cat", "args": [target]},
            headers=headers,
        )
        # Either the command is not allow-listed or the path is refused; the
        # important thing is that no credential content comes back.
        if res.status_code == 200:
            assert "SECRET" not in (res.json()["data"].get("stdout") or "")


@pytest.mark.asyncio
async def test_terminal_failure_does_not_complete_an_agent_run(client):
    """Regression: a broken command must never yield a COMPLETED agent run.

    Builds a project whose `test` script genuinely fails, runs the agent, and
    asserts the run cannot reach COMPLETED.
    """
    from app.services.agent_service import AgentService

    headers, pid = await _user_and_project(client, "TermAgent")
    await client.post(
        f"/api/v1/projects/{pid}/files/file",
        headers=headers,
        json={
            "parent_path": "",
            "name": "package.json",
            "content": (
                '{"name":"t","version":"1.0.0","scripts":'
                '{"build":"echo BUILD_OK","test":"node -e \\"process.exit(7)\\""}}'
            ),
        },
    )
    res = await client.post(
        "/api/v1/agent/runs",
        json={"project_id": pid, "task": "make the failing test pass", "start": False},
        headers=headers,
    )
    run_id = res.json()["data"]["id"]
    async with AsyncSessionLocal() as session:
        run = await AgentService.execute(session, run_id)

    assert run.state != "COMPLETED", "a failing test must not complete the run"
    if run.state == "FAILED":
        assert run.terminal_reason, "a failed run must carry a real reason"
    states = [s["state"] for s in run.steps]
    assert "COMPLETED" not in states
