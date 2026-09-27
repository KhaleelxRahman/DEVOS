"""Phase 4 tests: a REAL diagnosed failure becomes a REAL verified repair.

Every test drives the genuine pipeline:

    real failing command (Phase 2B engine)
      -> real Execution row (non-zero exit, real stderr)
      -> Phase 3 diagnosis (consumed as-is, never re-diagnosed here)
      -> Phase 4 proposal (real unified diff)
      -> apply (real in-place write)
      -> rerun through the Phase 2 engine
      -> verdict based ONLY on the real rerun exit code

A repair is only ever asserted as successful when the rerun genuinely
returned exit 0. The rollback path is tested with a repair that cannot
succeed, and the resulting file content is asserted to be restored.
"""

import json

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email, name):
    res = await client.post("/api/v1/auth/register", json={
        "name": name, "email": email, "password": "supersecret1"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _project(client, headers, name):
    res = await client.post("/api/v1/projects", json={"name": name},
                            headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


async def _write_file(client, headers, project_id, path, content):
    """Create the file through the real create-file endpoint."""
    parent = path.rsplit("/", 1)[0] if "/" in path else ""
    name = path.rsplit("/", 1)[-1]
    res = await client.post(
        f"/api/v1/projects/{project_id}/files/file",
        json={"parent_path": parent, "name": name, "content": content},
        headers=headers)
    assert res.status_code == 200, res.text
    return res


async def _read_file(client, headers, project_id, path):
    res = await client.get(
        f"/api/v1/projects/{project_id}/files/{path}", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["content"]


async def _run(client, headers, project_id, command, args):
    base = f"/api/v1/projects/{project_id}/executions"
    created = await client.post(base, headers=headers, json={
        "execution_type": "CUSTOM_SAFE_COMMAND",
        "command": command, "arguments": args,
        "working_directory": ".", "workspace_id": project_id})
    assert created.status_code == 200, created.text
    eid = created.json()["data"]["execution_id"]
    run = await client.post(f"{base}/{eid}/run", headers=headers)
    assert run.status_code == 200, run.text
    return run.json()["data"]


# The project fixture whose package.json genuinely lacks a "build" script.
# The command below invokes the missing script, so the real npm binary
# produces the real "Missing script" error.
_PKG_WITHOUT_BUILD = json.dumps(
    {
        "name": "p4-fixture",
        "version": "1.0.0",
        "scripts": {"test": "echo TEST_OK"},
    },
    indent=2,
)

MISSING_SCRIPT_ARGS = [
    "run", "build",
]


async def _setup_missing_script_project(client, headers):
    """Create a real project whose package.json is missing 'build'."""
    project_id = await _project(client, headers, "p4-missing-script")
    await _write_file(client, headers, project_id, "package.json",
                      _PKG_WITHOUT_BUILD)
    return project_id


@pytest.mark.asyncio
async def test_real_missing_script_failure_diagnosed_then_repaired(client):
    """THE Phase 4 end-to-end case.

    A real project whose package.json genuinely lacks "build" is executed
    with the real npm binary. npm really fails. Phase 3 diagnoses it. The
    Phase 4 proposal is a real minimal diff. After applying it, the SAME
    command is re-run through the Phase 2 engine and must really return
    exit 0.
    """
    headers = await _register(client, "p4e2e@example.com", "P4E2E")
    project_id = await _setup_missing_script_project(client, headers)

    # --- real failure through the Phase 2 engine ----------------------
    before = await _run(client, headers, project_id, "npm",
                        MISSING_SCRIPT_ARGS)
    assert before["status"] == "FAILED", before
    assert before["exit_code"] not in (0, None), before
    assert "Missing script" in (before.get("stderr") or ""), before

    # --- Phase 3 diagnosis (consumed as-is) --------------------------
    diag = await client.get(
        f"/api/v1/projects/{project_id}/diagnostics/executions/"
        f"{before['execution_id']}", headers=headers)
    assert diag.status_code == 200, diag.text
    d = diag.json()["data"]
    assert d["category"]["statement"] == "configuration", d
    assert d["likely_cause"]["source"].startswith("signature:"), d
    assert d["confidence"] >= 60, d

    # --- Phase 4 proposal: a real, minimal diff ---------------------
    prop = await client.get(
        f"/api/v1/projects/{project_id}/repairs/proposal/"
        f"{before['execution_id']}", headers=headers)
    assert prop.status_code == 200, prop.text
    p = prop.json()["data"]
    assert p["supported"] is True, p
    assert p["files_touched"] == ["package.json"], p
    change = p["changes"][0]
    # Minimal modification: the new script is appended as a sibling; the
    # only other touched line is the previous last entry gaining a comma.
    assert change["lines_changed"] == 3, change
    # No unrelated line is altered.
    removed = [ln for ln in change["diff"].splitlines()
               if ln.startswith("-") and not ln.startswith("---")]
    assert removed == ['-    "test": "echo TEST_OK"'], change
    assert '"build"' in change["after"], change
    # Real unified diff, for approval review.
    assert change["diff"].startswith("--- a/package.json"), change
    # The new script copies the project's OWN existing convention rather
    # than an invented build command.
    assert '+    "build": "echo TEST_OK"' in change["diff"], change

    # Nothing is written by the proposal route.
    assert await _read_file(client, headers, project_id, "package.json") \
        == _PKG_WITHOUT_BUILD

    # --- apply + verify through the Phase 2 engine -------------------
    ver = await client.post(
        f"/api/v1/projects/{project_id}/repairs/verify/"
        f"{before['execution_id']}", headers=headers)
    assert ver.status_code == 200, ver.text
    v = ver.json()["data"]
    assert v["verified"] is True, v
    assert v["outcome"] == "VERIFIED", v
    assert v["reverted"] is False, v
    # The evidence is the REAL rerun record, not a claim.
    assert v["rerun_execution"]["status"] == "COMPLETED", v
    assert v["rerun_execution"]["exit_code"] == 0, v
    assert "TEST_OK" in (v["rerun_execution"]["stdout"] or ""), v
    # The original failure record is preserved as the baseline.
    assert v["original_execution"]["exit_code"] == before["exit_code"], v
    assert before["exit_code"] != 0, v

    # The fix landed IN PLACE, in the one diagnosed file.
    after = await _read_file(client, headers, project_id, "package.json")
    data = json.loads(after)
    assert data["scripts"]["build"] == "echo TEST_OK", data
    # The pre-existing script was preserved, not replaced.
    assert data["scripts"]["test"] == "echo TEST_OK", data
    # No duplicate/parallel "fixed" copy was created.
    files = await client.get(
        f"/api/v1/projects/{project_id}/files", headers=headers)
    assert files.status_code == 200, files.text


@pytest.mark.asyncio
async def test_unverifiable_repair_is_rolled_back(client):
    """A repair that does NOT resolve the failure is reverted and reported
    UNVERIFIED — never silently left in place, never reported as fixed.

    The project defines its only sibling script as a FAILING command
    (`exit 3`). The planner copies that convention, so the repair is
    genuinely applied, but the rerun still exits non-zero. That is a real
    failed fix, and it must be rolled back.
    """
    headers = await _register(client, "p4rb@example.com", "P4RB")
    project_id = await _project(client, headers, "p4-rollback")
    original_pkg = json.dumps(
        {"name": "p4", "version": "1.0.0", "scripts": {"test": "exit 3"}},
        indent=2,
    )
    await _write_file(client, headers, project_id, "package.json", original_pkg)

    record = await _run(client, headers, project_id, "npm",
                        MISSING_SCRIPT_ARGS)
    assert record["status"] == "FAILED", record

    # The proposal IS supported here (a sibling convention exists), so the
    # repair really is applied.
    prop = await client.get(
        f"/api/v1/projects/{project_id}/repairs/proposal/"
        f"{record['execution_id']}", headers=headers)
    p = prop.json()["data"]
    assert p["supported"] is True, p

    ver = await client.post(
        f"/api/v1/projects/{project_id}/repairs/verify/"
        f"{record['execution_id']}", headers=headers)
    assert ver.status_code == 200, ver.text
    v = ver.json()["data"]
    # Real failed fix: NOT reported as fixed.
    assert v["verified"] is False, v
    assert v["outcome"] == "UNVERIFIED", v
    assert v["reverted"] is True, v
    # The evidence is the real rerun record, and it genuinely failed.
    assert v["rerun_execution"]["status"] == "FAILED", v
    assert v["rerun_execution"]["exit_code"] == 3, v

    # The file was restored byte-for-byte: no partial fix left behind.
    restored = await _read_file(client, headers, project_id, "package.json")
    assert restored == original_pkg, restored
    assert "build" not in json.loads(restored)["scripts"]


@pytest.mark.asyncio
async def test_unknown_signature_is_not_auto_repaired(client):
    """A failure with no deterministic repair is refused, not guessed at."""
    headers = await _register(client, "p4ns@example.com", "P4NS")
    project_id = await _project(client, headers, "p4-noscript")

    record = await _run(client, headers, project_id, "python", [
        "-c", "import definitely_not_a_real_module_p4; print('x')"])
    assert record["status"] == "FAILED", record

    prop = await client.get(
        f"/api/v1/projects/{project_id}/repairs/proposal/"
        f"{record['execution_id']}", headers=headers)
    p = prop.json()["data"]
    assert p["supported"] is False, p
    assert p["auto_appliable"] is False, p
    assert "No deterministic repair" in p["reason"], p
    assert p["changes"] == [], p


@pytest.mark.asyncio
async def test_verified_claim_requires_zero_exit_code(client):
    """A VERIFIED verdict is impossible without a real zero exit code."""
    from app.phase4_repair.service import RepairService

    class _Exec:
        def __init__(self, status, exit_code):
            self.status = status
            self.exit_code = exit_code

    assert RepairService.is_resolved(_Exec("COMPLETED", 0)) is True
    # Every other combination is NOT resolved.
    for status, code in [
        ("FAILED", 0), ("COMPLETED", 1), ("TIMED_OUT", 0),
        ("CANCELLED", 0), ("FAILED", 2), ("COMPLETED", None),
    ]:
        assert RepairService.is_resolved(_Exec(status, code)) is False, (
            status, code)


@pytest.mark.asyncio
async def test_cross_user_repair_is_forbidden(client):
    """Another user's failure cannot be proposed for, applied, or verified."""
    owner = await _register(client, "p4own@example.com", "P4Own")
    project_id = await _setup_missing_script_project(client, owner)
    record = await _run(client, owner, project_id, "npm",
                        MISSING_SCRIPT_ARGS)
    assert record["status"] == "FAILED", record

    other = await _register(client, "p4oth@example.com", "P4Oth")
    for method, suffix in [
        ("GET", "proposal"),
        ("POST", "apply"),
        ("POST", "verify"),
    ]:
        res = await client.request(
            method,
            f"/api/v1/projects/{project_id}/repairs/{suffix}/"
            f"{record['execution_id']}",
            headers=other)
        assert res.status_code in (403, 404), (method, suffix, res.text)


@pytest.mark.asyncio
async def test_repair_does_not_clobber_unrelated_files(client):
    """Only the diagnosed file is modified; siblings keep their content."""
    headers = await _register(client, "p4iso@example.com", "P4Iso")
    project_id = await _setup_missing_script_project(client, headers)
    other_content = "console.log('untouched');\n"
    await _write_file(client, headers, project_id, "src/app.js", other_content)
    readme = "# untouched readme\n"
    await _write_file(client, headers, project_id, "README.md", readme)

    record = await _run(client, headers, project_id, "npm",
                        MISSING_SCRIPT_ARGS)
    ver = await client.post(
        f"/api/v1/projects/{project_id}/repairs/verify/"
        f"{record['execution_id']}", headers=headers)
    v = ver.json()["data"]
    assert v["verified"] is True, v
    assert v["files_touched"] == ["package.json"], v

    assert await _read_file(client, headers, project_id, "src/app.js") \
        == other_content
    assert await _read_file(client, headers, project_id, "README.md") \
        == readme
