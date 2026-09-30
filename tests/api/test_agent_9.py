"""Phase 9 — the autonomous development agent loop.

These tests assert behaviour, not shape. A field existing proves nothing; each
test here drives the real loop and asserts that it actually stopped, actually
cancelled, or actually refused to commit without the user.

The happy path runs REAL subprocesses through the Phase 2 engine (npm scripts
that echo a marker), so BUILDING/TESTING/VERIFYING are backed by real exit
codes rather than mocks.
"""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.main import app
from app.models.agent_run import AgentRun

AGENT = "/api/v1/agent"


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email, name="Agent Tester"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    token = res.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}, token


async def _init_repo(client, headers, project_id, files=None):
    """Give the project a real git repo, mirroring the Phase 5 test fixture.

    Without this, the approval path cannot be exercised: the agent's commits
    are real git commits, and a project with no repo is (correctly) refused.
    """
    import shutil
    import subprocess

    from app.services.project_service import ProjectService

    if not shutil.which("git"):
        return project_id
    root = ProjectService.get_project_storage_path(project_id)

    def _git(*args):
        return subprocess.run(
            ["git", *args], cwd=root, capture_output=True, text=True
        )

    names = list((files or {"README.md": "# agent fixture\n"}).keys())
    _git("init", "-b", "main")
    _git("config", "user.name", "DEVOS v1.0.0")
    _git("config", "user.email", "devos@localhost")
    _git("add", "--", *names)
    _git("commit", "-m", "initial commit")
    return project_id


async def _project_with_quality(client, headers, name):
    """A project whose build/test really run (echo markers), like a real repo."""
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    pid = res.json()["data"]["id"]
    package = (
        '{"name":"agent-fixture","version":"1.0.0","scripts":'
        '{"build":"echo AGENT_BUILD_OK","test":"echo AGENT_TEST_OK",'
        '"lint":"echo AGENT_LINT_OK","typecheck":"echo AGENT_TC_OK"}}'
    )
    for name_, content in (("package.json", package), ("README.md", "# agent fixture\n")):
        res = await client.post(
            f"/api/v1/projects/{pid}/files/file",
            headers=headers,
            json={"parent_path": "", "name": name_, "content": content},
        )
        assert res.status_code in (200, 201), res.text
    await _init_repo(client, headers, pid, {"package.json": package, "README.md": "# agent fixture\n"})
    return pid


async def _run_row(run_id):
    async with AsyncSessionLocal() as session:
        from sqlalchemy import select

        from app.models.agent_run import AgentRun

        return (
            await session.execute(select(AgentRun).where(AgentRun.id == run_id))
        ).scalar_one()


async def _execute(run_id):
    """Drive the loop to a terminal state, exactly as the API background task does."""
    async with AsyncSessionLocal() as session:
        from app.services.agent_service import AgentService

        return await AgentService.execute(session, run_id)


# ---------------------------------------------------------------------------
# 1. The happy path, with real subprocess evidence at every transition.
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_run_completes_with_real_evidence_per_state(client):
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    pid = await _project_with_quality(client, headers, "Agent Completion")

    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "verify the project builds and tests", "start": False},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    run_id = res.json()["data"]["id"]
    assert res.json()["data"]["state"] == "PLANNING"

    run = await _execute(run_id)

    assert run.state == "COMPLETED", f"terminal_reason={run.terminal_reason}"
    states = [s["state"] for s in (run.steps or [])]
    for expected in ("PLANNING", "EDITING", "BUILDING", "TESTING", "VERIFYING", "COMPLETED"):
        assert expected in states, f"{expected} missing from {states}"

    # Every real operation must carry real proof, not just a state name.
    by_state = {s["state"]: s["evidence"] for s in run.steps}
    assert by_state["BUILDING"]["exit_code"] == 0
    assert "AGENT_BUILD_OK" in by_state["BUILDING"]["stdout_tail"]
    assert by_state["TESTING"]["exit_code"] == 0
    assert "AGENT_TEST_OK" in by_state["TESTING"]["stdout_tail"]
    assert by_state["VERIFYING"]["ok"] is True
    # COMPLETED only with evidence attached.
    assert by_state["COMPLETED"].get("commits") is not None


# ---------------------------------------------------------------------------
# 2. Safety limits must actually stop the loop.
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_loop_stops_within_its_limits(client):
    """The loop must terminate, and never run past its own caps."""
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    res = await client.post("/api/v1/projects", json={"name": "NoOps"}, headers=headers)
    pid = res.json()["data"]["id"]

    res = await client.post(
        f"{AGENT}/runs",
        json={
            "project_id": pid, "task": "loop until a limit stops it",
            "max_iterations": 1, "max_repair_attempts": 1, "start": False,
        },
        headers=headers,
    )
    run_id = res.json()["data"]["id"]
    run = await _execute(run_id)

    assert run.state in ("FAILED", "CANCELLED"), f"state={run.state}"
    assert run.terminal_reason, "a terminal run must carry a real reason"
    # It stopped, rather than spinning to some unrelated conclusion.
    assert run.iteration <= 2
    assert run.repair_attempts <= 1


@pytest.mark.asyncio
async def test_safety_guards_raise_at_their_thresholds():
    """Each cap is enforced by the guard the loop calls at every step boundary.

    Proven directly as well as end-to-end, because a cap that only trips in
    one specific loop shape is not a cap.
    """
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select, update

    from app.models.project import Project
    from app.models.user import User
    from app.services.agent_service import (
        AgentCancelled,
        AgentLimitExceeded,
        AgentService,
    )

    # This test drives the guard directly rather than through the API, so it
    # provisions its own schema instead of relying on the `client` fixture.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # The run row has real NOT NULL foreign keys, so stand up a real user and
    # project rather than faking the constraints away.
    async with AsyncSessionLocal() as s:
        owner = User(name="Guard", email=f"guard{uuid.uuid4().hex[:8]}@x.com")
        s.add(owner)
        await s.flush()
        proj = Project(name="Guard", user_id=owner.id)
        s.add(proj)
        await s.flush()
        owner_id, project_id = owner.id, proj.id
        await s.commit()

    def _now_naive():
        return datetime.now(timezone.utc).replace(tzinfo=None)

    async with AsyncSessionLocal() as s:
        # MAX_ITERATIONS: at the cap is still allowed; past it must trip.
        r = AgentRun(task="t", state="PLANNING", project_id=project_id,
                     user_id=owner_id, max_iterations=2, iteration=2)
        s.add(r)
        await s.commit()
        await AgentService._check_limits(s, r)  # at the cap, still allowed
        r.iteration = 3
        await s.commit()
        with pytest.raises(AgentLimitExceeded) as e:
            await AgentService._check_limits(s, r)
        assert e.value.limit == "MAX_ITERATIONS"

        # MAX_REPAIR_ATTEMPTS
        r2 = AgentRun(task="t", state="PLANNING", project_id=project_id,
                      user_id=owner_id, max_repair_attempts=2, repair_attempts=3)
        s.add(r2)
        await s.commit()
        with pytest.raises(AgentLimitExceeded) as e:
            await AgentService._check_limits(s, r2)
        assert e.value.limit == "MAX_REPAIR_ATTEMPTS"

        # MAX_RUNTIME — created_at is naive (SQLite round-trip), so this also
        # proves the UTC fix; a naive-vs-epoch comparison tripped this on the
        # very first check.
        r3 = AgentRun(task="t", state="PLANNING", project_id=project_id,
                      user_id=owner_id, max_runtime_seconds=60,
                      created_at=_now_naive() - timedelta(seconds=120))
        s.add(r3)
        await s.commit()
        with pytest.raises(AgentLimitExceeded) as e:
            await AgentService._check_limits(s, r3)
        assert e.value.limit == "MAX_RUNTIME"

        # ...and a fresh run is NOT considered expired.
        fresh = AgentRun(task="t", state="PLANNING", project_id=project_id,
                         user_id=owner_id, max_runtime_seconds=3600,
                         created_at=_now_naive())
        s.add(fresh)
        await s.commit()
        await AgentService._check_limits(s, fresh)  # must not raise

        # The guard RE-READS the row, so a cancel written by another session is
        # honoured. Without the refresh, "stop" was a column the loop ignored
        # and the live probe showed the run carrying on to FAILED.
        watched = AgentRun(task="t", state="PLANNING", project_id=project_id,
                           user_id=owner_id, max_iterations=5)
        s.add(watched)
        await s.commit()
        watched_id = watched.id

    async with AsyncSessionLocal() as other:
        await other.execute(
            update(AgentRun).where(AgentRun.id == watched_id).values(cancel_requested=True)
        )
        await other.commit()

    async with AsyncSessionLocal() as s2:
        stale = (
            await s2.execute(select(AgentRun).where(AgentRun.id == watched_id))
        ).scalar_one()
        with pytest.raises(AgentCancelled):
            await AgentService._check_limits(s2, stale)


@pytest.mark.asyncio
async def test_max_tokens_halts_and_is_not_success(client):
    """Locked Decision 5 C: a hard ceiling halts the run, and halting is not
    reported as COMPLETED."""
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    pid = await _project_with_quality(client, headers, "Token Ceiling")

    res = await client.post(
        f"{AGENT}/runs",
        json={
            "project_id": pid, "task": "x" * 200,
            "max_tokens": 1,  # the plan step alone exceeds this
            "start": False,
        },
        headers=headers,
    )
    run_id = res.json()["data"]["id"]
    run = await _execute(run_id)

    assert run.state == "FAILED"
    assert run.terminal_reason.startswith("MAX_TOKENS")
    assert run.state != "COMPLETED"
    assert "Completed on iteration" not in (run.summary or "")


@pytest.mark.asyncio
async def test_max_repair_attempts_stops_the_loop(client):
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    res = await client.post("/api/v1/projects", json={"name": "RepairCap"}, headers=headers)
    pid = res.json()["data"]["id"]

    res = await client.post(
        f"{AGENT}/runs",
        json={
            "project_id": pid, "task": "fail and try to repair",
            "max_iterations": 10, "max_repair_attempts": 0, "start": False,
        },
        headers=headers,
    )
    run_id = res.json()["data"]["id"]
    run = await _execute(run_id)

    assert run.state in ("FAILED", "CANCELLED")
    assert run.repair_attempts <= 1


# ---------------------------------------------------------------------------
# 3. Real cancellation: the loop must actually stop, not just show a flag.
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_cancel_request_stops_the_loop(client):
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    pid = await _project_with_quality(client, headers, "Cancel Me")

    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "a long running task", "start": False},
        headers=headers,
    )
    run_id = res.json()["data"]["id"]

    # Ask the run to stop before the loop ever starts.
    res = await client.post(f"{AGENT}/runs/{run_id}/cancel", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["cancel_requested"] is True

    run = await _execute(run_id)

    assert run.state == "CANCELLED", f"state={run.state} reason={run.terminal_reason}"
    assert "stopped by user" in (run.terminal_reason or "")
    # It really halted at the first boundary: no build/test ever ran.
    states = [s["state"] for s in (run.steps or [])]
    assert "BUILDING" not in states, states



# ---------------------------------------------------------------------------
# 4. "Never silently": no commit without the user, and the batch is explicit.
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_completed_run_does_not_commit_without_approval(client):
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    pid = await _project_with_quality(client, headers, "No Silent Commit")

    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "edit something", "start": False},
        headers=headers,
    )
    run_id = res.json()["data"]["id"]

    # Baseline: the fixture's own initial commit, before the agent runs.
    res = await client.get(f"/api/v1/projects/{pid}/git/log", headers=headers)
    before = len(res.json()["data"].get("commits", []))

    run = await _execute(run_id)
    assert run.state == "COMPLETED", run.terminal_reason

    # The edits are real, and the run is waiting on a human.
    res = await client.get(
        f"/api/v1/projects/{pid}/files/AGENT_NOTES.md", headers=headers
    )
    assert res.status_code == 200, res.text
    assert "Agent run notes" in res.json()["data"]["content"]

    fresh = await _run_row(run_id)
    assert fresh.approval_state == "PENDING"
    assert fresh.commit_proposals, "expected a proposed commit batch"

    # Nothing new reached git: the run proposed, it did not commit.
    res = await client.get(f"/api/v1/projects/{pid}/git/log", headers=headers)
    after = len(res.json()["data"].get("commits", []))
    assert after == before, f"agent committed without approval: {before} -> {after}"


@pytest.mark.asyncio
async def test_approve_commits_commits_exact_proposed_paths(client):
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    pid = await _project_with_quality(client, headers, "Approve Me")

    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "write notes", "start": False},
        headers=headers,
    )
    run_id = res.json()["data"]["id"]
    run = await _execute(run_id)
    assert run.state == "COMPLETED", run.terminal_reason

    # An empty message is refused: the user must supply the message (H4).
    res = await client.post(
        f"{AGENT}/runs/{run_id}/commits/approve",
        json={"message": "  "}, headers=headers,
    )
    assert res.json()["error"]["code"] == "EMPTY_MESSAGE"

    res = await client.post(
        f"{AGENT}/runs/{run_id}/commits/approve",
        json={"message": "agent: record run notes"}, headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()["data"]
    assert body["commit_sha"], "approval must produce a real commit sha"
    assert body["paths"] == ["AGENT_NOTES.md"]

    res = await client.get(f"/api/v1/projects/{pid}/git/log", headers=headers)
    commits = res.json()["data"].get("commits", [])
    assert commits, "approved commit is missing from the real git log"

    fresh = await _run_row(run_id)
    assert fresh.approval_state == "APPROVED"


@pytest.mark.asyncio
async def test_cannot_approve_a_failed_run(client):
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    res = await client.post("/api/v1/projects", json={"name": "FailFirst"}, headers=headers)
    pid = res.json()["data"]["id"]

    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "x", "max_iterations": 0, "start": False},
        headers=headers,
    )
    run_id = res.json()["data"]["id"]
    run = await _execute(run_id)
    assert run.state == "FAILED"

    res = await client.post(
        f"{AGENT}/runs/{run_id}/commits/approve",
        json={"message": "should not be allowed"}, headers=headers,
    )
    assert res.json()["error"]["code"] == "RUN_NOT_COMPLETED"


# ---------------------------------------------------------------------------
# 5. Isolation + ownership (Decision 3 A: one project, owned by one user).
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_run_is_scoped_to_one_project_and_owner(client):
    headers_a, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com", "A")
    headers_b, _ = await _register(client, f"b{uuid.uuid4().hex[:8]}@x.com", "B")
    pid = await _project_with_quality(client, headers_a, "Owned By A")

    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "mine", "start": False},
        headers=headers_a,
    )
    run_id = res.json()["data"]["id"]

    # B cannot even start a run against A's project.
    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "not mine", "start": False},
        headers=headers_b,
    )
    assert res.status_code in (403, 404), res.text

    # B cannot inspect, cancel, or approve A's run. Each of these must be
    # refused — either the API envelope or a bare 403/404 is acceptable, what
    # matters is that B never sees or changes A's run.
    def _refused(res):
        if res.status_code in (403, 404, 405):
            return True
        body = res.json()
        return body.get("success") is False

    assert _refused(
        await client.get(f"{AGENT}/runs/{run_id}", headers=headers_b)
    ), "inspect leaked to another user"
    assert _refused(
        await client.post(f"{AGENT}/runs/{run_id}/cancel", headers=headers_b)
    ), "cancel leaked to another user"
    assert _refused(
        await client.post(
            f"{AGENT}/runs/{run_id}/commits/approve",
            json={"message": "hi"}, headers=headers_b,
        )
    ), "approve leaked to another user"


@pytest.mark.asyncio
async def test_forbidden_actions_are_declared_not_performed(client):
    """The 'never silently' list is part of the run's public record, and the
    loop never calls commit itself."""
    headers, _ = await _register(client, f"a{uuid.uuid4().hex[:8]}@x.com")
    pid = await _project_with_quality(client, headers, "Forbidden List")

    res = await client.post(
        f"{AGENT}/runs",
        json={"project_id": pid, "task": "inspect the policy", "start": False},
        headers=headers,
    )
    data = res.json()["data"]
    for action in ("deploy", "force-push", "merge-main", "commit", "push"):
        assert action in data["never_automatic"]
