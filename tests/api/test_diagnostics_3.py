"""Phase 3 tests: grounded diagnosis of REAL execution failures.

These tests feed REAL failures through the REAL Phase 2 engine: a real
process is spawned, a real non-zero exit code and real stdout/stderr are
captured by the 2B engine into a real Execution row, and only then is
Phase 3 asked to diagnose it. No hand-written execution payloads are used
where a real process can produce the failure.

Categories exercised: build, test, lint, type, dependency, plus the
truthfulness cases (no output / unrecognised output) and ownership.
"""

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
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _project(client, headers, name):
    res = await client.post("/api/v1/projects", json={"name": name},
                            headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


async def _run_real_failure(client, headers, project_id, args):
    """Create + run a REAL failing process through the Phase 2 engine.

    Returns the record as the engine itself reported it, so the diagnosis
    is asserted against genuinely captured output.
    """
    base = f"/api/v1/projects/{project_id}/executions"
    created = await client.post(base, headers=headers, json={
        "execution_type": "CUSTOM_SAFE_COMMAND",
        "command": "python",
        "arguments": args,
        "working_directory": ".",
        "workspace_id": project_id,
    })
    assert created.status_code == 200, created.text
    execution_id = created.json()["data"]["execution_id"]
    run = await client.post(f"{base}/{execution_id}/run", headers=headers)
    assert run.status_code == 200, run.text
    return run.json()["data"]


async def _diagnose(client, headers, project_id, execution_id):
    res = await client.get(
        f"/api/v1/projects/{project_id}/diagnostics/executions/{execution_id}",
        headers=headers,
    )
    assert res.status_code == 200, res.text
    return res.json()["data"]


VALID_TAGS = {"OBSERVED", "INFERRED", "UNKNOWN"}

REQUIRED_KEYS = {
    "problem", "category", "evidence", "likely_cause",
    "affected_files", "affected_lines", "suggested_fix", "confidence",
}


def _assert_structure(diag):
    """Assert the required output structure and the tagging contract."""
    for key in REQUIRED_KEYS:
        assert key in diag, f"missing required output key: {key}"
    assert diag["problem"]["tag"] in VALID_TAGS
    assert diag["category"]["tag"] in VALID_TAGS
    for item in diag["evidence"]:
        assert item["tag"] in VALID_TAGS, item
        assert item["source"], "every claim must name its source"
    for field in ("problem", "category"):
        assert diag[field]["source"], f"{field} must name its source"
    assert 0 <= diag["confidence"] <= 100
    assert diag["confidence_basis"]


@pytest.mark.asyncio
async def test_real_dependency_failure_diagnosed(client):
    """A REAL run importing a missing module yields a dependency diagnosis
    grounded in the engine's actual captured stderr."""
    headers = await _register(client, "p3dep@example.com", "P3Dep")
    project_id = await _project(client, headers, "p3dep")

    record = await _run_real_failure(client, headers, project_id, [
        "-c",
        "import definitely_not_a_real_module_xyz; print('nope')",
    ])
    assert record["status"] == "FAILED", record
    assert record["exit_code"] not in (0, None), record
    assert "ModuleNotFoundError" in (record["stderr"] or ""), record

    diag = await _diagnose(client, headers, project_id,
                           record["execution_id"])
    _assert_structure(diag)
    assert diag["category"]["statement"] == "dependency", diag
    assert diag["likely_cause"]["tag"] == "INFERRED", diag
    assert diag["likely_cause"]["source"].startswith("signature:"), diag
    assert diag["confidence"] >= 85, diag
    # The OBSERVED facts must come from the real record.
    assert f"Exit code recorded as {record['exit_code']}." in [
        e["statement"] for e in diag["evidence"]
    ], diag


@pytest.mark.asyncio
async def test_real_typecheck_failure_diagnosed(client):
    """A REAL run emitting a TypeScript-style diagnostic is categorised as a
    type failure with the reported location extracted."""
    headers = await _register(client, "p3type@example.com", "P3Type")
    project_id = await _project(client, headers, "p3type")

    record = await _run_real_failure(client, headers, project_id, [
        "-c",
        "import sys; sys.stderr.write("
        "'src/app.ts(12,5): error TS2322: Type string is not assignable to "
        "type number.\\n'); sys.exit(2)",
    ])
    assert record["status"] == "FAILED", record
    assert "error TS2322" in (record["stderr"] or ""), record

    diag = await _diagnose(client, headers, project_id,
                           record["execution_id"])
    _assert_structure(diag)
    assert diag["category"]["statement"] == "type", diag
    assert "src/app.ts" in diag["affected_files"], diag
    assert any(entry["line"] == 12 for entry in diag["affected_lines"]), diag


@pytest.mark.asyncio
async def test_real_lint_failure_diagnosed(client):
    """A REAL run emitting ESLint's summary line is categorised as lint."""
    headers = await _register(client, "p3lint@example.com", "P3Lint")
    project_id = await _project(client, headers, "p3lint")

    record = await _run_real_failure(client, headers, project_id, [
        "-c",
        "import sys; sys.stderr.write("
        "'/proj/src/a.ts\\n  1:1  error  Unexpected var  no-var\\n\\n"
        "ESLint found 1 error\\n'); sys.exit(1)",
    ])
    assert record["status"] == "FAILED", record

    diag = await _diagnose(client, headers, project_id,
                           record["execution_id"])
    _assert_structure(diag)
    assert diag["category"]["statement"] == "lint", diag
    assert diag["likely_cause"]["tag"] == "INFERRED", diag
    assert diag["confidence"] >= 85, diag


@pytest.mark.asyncio
async def test_real_test_failure_diagnosed(client):
    """A REAL run exiting non-zero with a pytest-style failure block is
    categorised as a test failure with the failing test location."""
    headers = await _register(client, "p3test@example.com", "P3Test")
    project_id = await _project(client, headers, "p3test")

    record = await _run_real_failure(client, headers, project_id, [
        "-c",
        "import sys; sys.stderr.write("
        "'tests/test_x.py:12: in test_add\\n    assert add(1,1) == 3\\n"
        "AssertionError: assert 2 == 3\\n1 failed, 1 passed in 0.10s\\n'); "
        "sys.exit(1)",
    ])
    assert record["status"] == "FAILED", record

    diag = await _diagnose(client, headers, project_id,
                           record["execution_id"])
    _assert_structure(diag)
    assert diag["category"]["statement"] == "test", diag
    assert "tests/test_x.py" in diag["affected_files"], diag
    assert any(entry["line"] == 12 for entry in diag["affected_lines"]), diag


@pytest.mark.asyncio
async def test_real_build_failure_diagnosed(client):
    """A REAL run emitting a bundler resolution error is categorised as a
    build/dependency failure with the unresolvable module reported."""
    headers = await _register(client, "p3build@example.com", "P3Build")
    project_id = await _project(client, headers, "p3build")

    record = await _run_real_failure(client, headers, project_id, [
        "-c",
        "import sys; sys.stderr.write("
        "'Rollup failed to resolve import missing-pkg from src/main.js\\n'); "
        "sys.exit(1)",
    ])
    assert record["status"] == "FAILED", record

    diag = await _diagnose(client, headers, project_id,
                           record["execution_id"])
    _assert_structure(diag)
    assert diag["category"]["statement"] in {"build", "dependency"}, diag
    assert diag["likely_cause"]["tag"] == "INFERRED", diag


# ---------------------------------------------------------------------------
# Truthfulness: the engine must not invent a root cause
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_unrecognised_failure_reports_unknown_not_a_guess(client):
    """A REAL failure whose output matches no known signature must yield an
    explicit UNKNOWN, never a fabricated cause."""
    headers = await _register(client, "p3unk@example.com", "P3Unk")
    project_id = await _project(client, headers, "p3unk")

    record = await _run_real_failure(client, headers, project_id, [
        "-c",
        "import sys; sys.stderr.write('zzqq unrecognised diagnostic blob "
        "wibble 42\\n'); sys.exit(3)",
    ])
    assert record["status"] == "FAILED", record
    assert record["exit_code"] == 3, record

    diag = await _diagnose(client, headers, project_id,
                           record["execution_id"])
    _assert_structure(diag)
    assert diag["likely_cause"]["tag"] == "UNKNOWN", diag
    assert diag["suggested_fix"]["tag"] == "UNKNOWN", diag
    assert diag["confidence"] <= 20, diag


@pytest.mark.asyncio
async def test_confidence_is_not_uniformly_high(client):
    """Confidence must vary with evidence strength, proving it reflects the
    evidence rather than being a constant."""
    headers = await _register(client, "p3conf@example.com", "P3Conf")
    project_id = await _project(client, headers, "p3conf")

    strong_record = await _run_real_failure(client, headers, project_id, [
        "-c", "import definitely_not_real_abc; print('x')"])
    strong = await _diagnose(client, headers, project_id,
                             strong_record["execution_id"])

    weak_record = await _run_real_failure(client, headers, project_id, [
        "-c", "import sys; sys.stderr.write('qqqq zzzz nothing known\\n'); "
              "sys.exit(4)"])
    weak = await _diagnose(client, headers, project_id,
                           weak_record["execution_id"])

    assert strong["confidence"] > weak["confidence"], (strong, weak)
    assert strong["confidence_basis"] != weak["confidence_basis"]


@pytest.mark.asyncio
async def test_completed_execution_is_not_diagnosable(client):
    """A passing run must not be given a fabricated diagnosis."""
    headers = await _register(client, "p3ok@example.com", "P3Ok")
    project_id = await _project(client, headers, "p3ok")

    record = await _run_real_failure(client, headers, project_id, [
        "-c", "print('DEVOS_PHASE3_OK')"])
    assert record["status"] == "COMPLETED", record
    assert record["exit_code"] == 0, record

    res = await client.get(
        f"/api/v1/projects/{project_id}/diagnostics/executions/"
        f"{record['execution_id']}", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is False, body
    assert body["error"]["code"] == "NOT_DIAGNOSABLE", body
    # Crucially: no fallback success message carrying an invented cause.
    assert body["data"] is None, body


@pytest.mark.asyncio
async def test_report_contains_no_reasoning_chain(client):
    """The rendered report exposes the tagged structure only; it must not
    leak the engine's internal reasoning."""
    headers = await _register(client, "p3cot@example.com", "P3Cot")
    project_id = await _project(client, headers, "p3cot")

    record = await _run_real_failure(client, headers, project_id, [
        "-c", "import definitely_not_real_xyz; print('x')"])
    diag = await _diagnose(client, headers, project_id,
                           record["execution_id"])
    report = diag["report"]

    for heading in ("Problem", "Category", "Evidence", "Likely Cause",
                    "Affected Files", "Affected Lines", "Suggested Fix",
                    "Confidence"):
        assert heading in report, f"missing section: {heading}"
    for leak in ("I think", "reasoning chain", "regex", "re.search",
                 "maybe", "probably", "step 1", "let me"):
        assert leak.lower() not in report.lower(), f"leaked reasoning: {leak}"


# ---------------------------------------------------------------------------
# Ownership — diagnosis must not leak across users
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cross_user_diagnosis_is_forbidden(client):
    """Another user's execution must not be diagnosable."""
    owner = await _register(client, "p3own@example.com", "P3Own")
    project_id = await _project(client, owner, "p3own-proj")
    record = await _run_real_failure(client, owner, project_id, [
        "-c", "import definitely_not_real_qqq; print('x')"])

    other = await _register(client, "p3oth@example.com", "P3Oth")
    res = await client.get(
        f"/api/v1/projects/{project_id}/diagnostics/executions/"
        f"{record['execution_id']}", headers=other)
    assert res.status_code in (403, 404), res.text


@pytest.mark.asyncio
async def test_latest_diagnosis_picks_newest_failure(client):
    """/diagnostics/latest selects the newest FAILED row from real history."""
    headers = await _register(client, "p3last@example.com", "P3Last")
    project_id = await _project(client, headers, "p3last-proj")

    first = await _run_real_failure(client, headers, project_id, [
        "-c", "import definitely_not_real_first; print('x')"])
    second = await _run_real_failure(client, headers, project_id, [
        "-c", "import definitely_not_real_second; print('x')"])

    res = await client.get(
        f"/api/v1/projects/{project_id}/diagnostics/latest", headers=headers)
    assert res.status_code == 200, res.text
    diag = res.json()["data"]
    assert diag["execution_id"] == second["execution_id"], diag
    assert diag["execution_id"] != first["execution_id"], diag
