"""Phase 2C — quality engine tests (BUILD / TEST / LINT / TYPECHECK).

Quality operations run through the real Phase 2B process engine: detection
reads the project's actual configuration, the command passes the Phase 2A
policy, and the returned execution record carries the authoritative
stdout/stderr/exit code. Fixtures are disposable projects with
deterministic scripts — nothing destructive, nothing installed.
"""
import json

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.base import Base
from app.db.session import engine
from app.services.file_service import FileService


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email="quality2c@example.com", name="Quality2C"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="quality-fixture"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _pkg(scripts: dict, extra: dict | None = None) -> str:
    doc = {"name": "quality-fixture", "version": "1.0.0", "scripts": scripts}
    if extra:
        doc.update(extra)
    return json.dumps(doc)


def _add_js_fixture(project_id: str, scripts: dict, extra: dict | None = None):
    FileService.create_file(project_id, "", "package.json", _pkg(scripts, extra))


def _add_py_fixture(project_id: str, failing: bool = False):
    FileService.create_folder(project_id, "", "tests")
    body = (
        "def test_bad():\n    assert False\n"
        if failing else
        "def test_ok():\n    assert True\n"
    )
    FileService.create_file(project_id, "tests", "test_assert.py", body)


def _detect_body(operations):
    return {op["operation"]: op for op in operations}


def _quality_base(project_id: str) -> str:
    return f"/api/v1/projects/{project_id}/executions/quality"


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_detect_js_operations(client):
    headers = await _register(client, email="d1@example.com")
    project_id = await _create_project(client, headers, name="detect-js")
    _add_js_fixture(project_id, {
        "build": "node -e \"process.exit(0)\"",
        "test": "node -e \"process.exit(0)\"",
        "lint": "node -e \"process.exit(0)\"",
        "type-check": "node -e \"process.exit(0)\"",
    })
    res = await client.get(
        f"{_quality_base(project_id)}/operations", headers=headers)
    assert res.status_code == 200, res.text
    ops = _detect_body(res.json()["data"]["operations"])
    assert set(ops) == {"TYPECHECK", "LINT", "TEST", "BUILD"}
    assert ops["BUILD"]["supported"] and ops["BUILD"]["command"] == "npm run build"
    assert ops["LINT"]["command"] == "npm run lint"
    assert ops["TEST"]["command"] == "npm test"
    assert ops["TYPECHECK"]["command"] == "npm run type-check"
    for op in ops.values():
        assert op["source"] == "package.json"
        assert op["available"] is True  # npm/npx exist on the test server


@pytest.mark.asyncio
async def test_detect_typecheck_from_tsconfig(client):
    headers = await _register(client, email="d2@example.com")
    project_id = await _create_project(client, headers, name="detect-ts")
    _add_js_fixture(
        project_id, {}, extra={"devDependencies": {"typescript": "^5.0.0"}})
    FileService.create_file(project_id, "", "tsconfig.json", "{}")
    res = await client.get(
        f"{_quality_base(project_id)}/operations", headers=headers)
    ops = _detect_body(res.json()["data"]["operations"])
    assert ops["TYPECHECK"]["supported"]
    assert ops["TYPECHECK"]["command"] == "npx --yes tsc --noEmit"
    assert ops["BUILD"]["supported"] is False


@pytest.mark.asyncio
async def test_detect_pytest_operations(client):
    headers = await _register(client, email="d3@example.com")
    project_id = await _create_project(client, headers, name="detect-py")
    _add_py_fixture(project_id)
    res = await client.get(
        f"{_quality_base(project_id)}/operations", headers=headers)
    ops = _detect_body(res.json()["data"]["operations"])
    assert ops["TEST"]["supported"] is True
    assert ops["TEST"]["command"] == "pytest"
    assert ops["TEST"]["arguments"] == ["-q"]
    assert ops["TEST"]["available"] is True
    assert ops["BUILD"]["supported"] is False
    assert ops["LINT"]["supported"] is False
    assert ops["TYPECHECK"]["supported"] is False


@pytest.mark.asyncio
async def test_detect_empty_project_reports_unsupported(client):
    headers = await _register(client, email="d4@example.com")
    project_id = await _create_project(client, headers, name="detect-empty")
    res = await client.get(
        f"{_quality_base(project_id)}/operations", headers=headers)
    ops = _detect_body(res.json()["data"]["operations"])
    for op in ops.values():
        assert op["supported"] is False
        assert op["command"] is None
        assert op["reason"]


@pytest.mark.asyncio
async def test_detect_npm_placeholder_test_is_not_a_suite(client):
    headers = await _register(client, email="d5@example.com")
    project_id = await _create_project(client, headers, name="detect-placeholder")
    _add_js_fixture(project_id, {"test": "Error: no test specified && exit 1"})
    res = await client.get(
        f"{_quality_base(project_id)}/operations", headers=headers)
    ops = _detect_body(res.json()["data"]["operations"])
    assert ops["TEST"]["supported"] is False
    assert "placeholder" in ops["TEST"]["reason"]


# ---------------------------------------------------------------------------
# Real execution (through the Phase 2B engine)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_quality_run_build_success(client):
    headers = await _register(client, email="r1@example.com")
    project_id = await _create_project(client, headers, name="run-build")
    _add_js_fixture(project_id, {"build": "node -e \"process.exit(0)\""})
    res = await client.post(
        f"{_quality_base(project_id)}/BUILD", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "COMPLETED"
    assert data["exit_code"] == 0
    assert data["execution_type"] == "BUILD"
    assert data["command"] == "npm run build"
    assert data["process_id"] is not None
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_quality_run_lint_failure_real_exit_code(client):
    headers = await _register(client, email="r2@example.com")
    project_id = await _create_project(client, headers, name="run-lint")
    _add_js_fixture(project_id, {"lint": "node -e \"process.exit(3)\""})
    res = await client.post(
        f"{_quality_base(project_id)}/LINT", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "FAILED"
    assert data["exit_code"] == 3
    assert data["failure_reason"]


@pytest.mark.asyncio
async def test_quality_run_typecheck_success(client):
    headers = await _register(client, email="r3@example.com")
    project_id = await _create_project(client, headers, name="run-typecheck")
    _add_js_fixture(project_id, {"type-check": "node -e \"process.exit(0)\""})
    res = await client.post(
        f"{_quality_base(project_id)}/TYPECHECK", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "COMPLETED"
    assert data["exit_code"] == 0
    assert data["command"] == "npm run type-check"


@pytest.mark.asyncio
async def test_quality_run_npm_test_with_output(client):
    headers = await _register(client, email="r4@example.com")
    project_id = await _create_project(client, headers, name="run-npm-test")
    _add_js_fixture(project_id, {
        "test": "node -e \"console.log('QUALITY_TEST_MARKER'); process.exit(0)\"",
    })
    res = await client.post(
        f"{_quality_base(project_id)}/TEST", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "COMPLETED"
    assert "QUALITY_TEST_MARKER" in (data["stdout"] or "")


@pytest.mark.asyncio
async def test_quality_run_python_tests_pass(client):
    headers = await _register(client, email="r5@example.com")
    project_id = await _create_project(client, headers, name="run-py-ok")
    _add_py_fixture(project_id, failing=False)
    res = await client.post(
        f"{_quality_base(project_id)}/TEST", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "COMPLETED"
    assert data["exit_code"] == 0
    assert data["command"] == "pytest"


@pytest.mark.asyncio
async def test_quality_run_python_tests_fail(client):
    headers = await _register(client, email="r6@example.com")
    project_id = await _create_project(client, headers, name="run-py-bad")
    _add_py_fixture(project_id, failing=True)
    res = await client.post(
        f"{_quality_base(project_id)}/TEST", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "FAILED"
    assert data["exit_code"] == 1
    combined = ((data["stdout"] or "") + (data["stderr"] or "")).lower()
    assert "failed" in combined


# ---------------------------------------------------------------------------
# Negative / security
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_quality_unsupported_operation_rejected(client):
    headers = await _register(client, email="n1@example.com")
    project_id = await _create_project(client, headers, name="neg-empty")
    res = await client.post(
        f"{_quality_base(project_id)}/BUILD", headers=headers)
    assert res.status_code == 422, res.text
    body = res.json()
    assert body["error"]["code"] == "QUALITY_OPERATION_NOT_SUPPORTED"
    assert body.get("data") is None


@pytest.mark.asyncio
async def test_quality_unknown_operation_rejected(client):
    headers = await _register(client, email="n2@example.com")
    project_id = await _create_project(client, headers, name="neg-unknown")
    res = await client.post(
        f"{_quality_base(project_id)}/DEPLOY", headers=headers)
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "INVALID_EXECUTION_TYPE"


@pytest.mark.asyncio
async def test_quality_requires_authentication(client):
    res = await client.get("/api/v1/projects/0000/executions/quality/operations")
    assert res.status_code in (401, 403), res.text
    res = await client.post("/api/v1/projects/0000/executions/quality/BUILD")
    assert res.status_code in (401, 403), res.text


@pytest.mark.asyncio
async def test_quality_unknown_project_rejected(client):
    headers = await _register(client, email="n3@example.com")
    res = await client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000"
        "/executions/quality/operations", headers=headers)
    assert res.status_code == 404, res.text
    assert res.json()["error"]["code"] == "INVALID_PROJECT"


@pytest.mark.asyncio
async def test_quality_cross_user_forbidden(client):
    headers_a = await _register(client, email="na@example.com", name="A")
    headers_b = await _register(client, email="nb@example.com", name="B")
    project_a = await _create_project(client, headers_a, name="a-quality")
    _add_js_fixture(project_a, {"build": "node -e \"process.exit(0)\""})
    res_b = await client.post(
        f"{_quality_base(project_a)}/BUILD", headers=headers_b)
    assert res_b.status_code == 403, res_b.text
    res_b_get = await client.get(
        f"{_quality_base(project_a)}/operations", headers=headers_b)
    assert res_b_get.status_code == 403, res_b_get.text


@pytest.mark.asyncio
async def test_quality_tool_unavailable_reported_honestly(client, monkeypatch):
    headers = await _register(client, email="n4@example.com")
    project_id = await _create_project(client, headers, name="neg-tool")
    _add_js_fixture(project_id, {"build": "node -e \"process.exit(0)\""})
    import app.services.quality_service as quality_module
    monkeypatch.setattr(quality_module, "_which", lambda tool: False)
    res = await client.post(
        f"{_quality_base(project_id)}/BUILD", headers=headers)
    assert res.status_code == 503, res.text
    body = res.json()
    assert body["error"]["code"] == "QUALITY_TOOL_UNAVAILABLE"
    assert body.get("data") is None


@pytest.mark.asyncio
async def test_quality_command_recorded_verbatim(client):
    """The execution record must record the exact detected command — the
    client never supplies the command for a quality run."""
    headers = await _register(client, email="n5@example.com")
    project_id = await _create_project(client, headers, name="neg-record")
    _add_js_fixture(project_id, {"build": "node -e \"process.exit(0)\""})
    res = await client.post(
        f"{_quality_base(project_id)}/BUILD", headers=headers)
    data = res.json()["data"]
    assert data["command"] == "npm run build"
    assert data["working_directory"]  # server-derived, contained
    record = await client.get(
        f"/api/v1/projects/{project_id}/executions/{data['execution_id']}",
        headers=headers)
    assert record.status_code == 200
    assert record.json()["data"]["status"] == data["status"]