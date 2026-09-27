"""Phase 1 builder API tests (D-03..D-17 surface).

Covers: classify, plan, start, status, stream, summary, apply, cancel â€”
including invalid prompts, unsupported requests, generation state rules,
error responses, idempotent retry identity, and safe path handling.

Failure invariant under test: FAILURE MUST NOT LOOK LIKE SUCCESS â€” a failed
operation is always asserted through its real error code or terminal state,
never through HTTP 200 alone.
"""
import asyncio
import os
import sys
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Ensure an isolated SQLite database is configured BEFORE importing the app.
_BACKEND_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "backend")
)
if _BACKEND_PATH not in sys.path:
    sys.path.insert(0, _BACKEND_PATH)

from app.main import app  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.services.builder_service import BACKGROUND_STORE  # noqa: E402


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def _clean_builder_store():
    """Keep the process-local generation store isolated between tests."""
    BACKGROUND_STORE.clear()
    yield
    BACKGROUND_STORE.clear()


PROMPT = "Create a task tracker with a REST API and PostgreSQL persistence"


async def _register(client, email="builder@example.com", name="Builder"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="builder-project"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _base(project_id: str) -> str:
    return f"/api/v1/projects/{project_id}/builder"


def _stub_record(project_id: str, status: str) -> dict:
    """A minimal deterministic generation record for state-rule tests."""
    return {
        "status": status,
        "task": None,
        "prompt": PROMPT,
        "mode": "build",
        "user_id": "someone",
        "project_id": project_id,
        "started_at": "2026-01-01T00:00:00+00:00",
        "completed_at": None,
        "files": [],
        "failed_operations": [],
    }


async def _wait_terminal(client, headers, project_id, gen_id, max_seconds=15.0):
    """Poll /status until a terminal state; returns the final status string."""
    waited = 0.0
    status = None
    while waited < max_seconds:
        res = await client.get(f"{_base(project_id)}/status/{gen_id}", headers=headers)
        assert res.status_code == 200, res.text
        status = res.json()["data"]["status"]
        if status in {"COMPLETED", "PARTIAL", "FAILED", "CANCELLED", "BLOCKED"}:
            return status
        await asyncio.sleep(0.1)
        waited += 0.1
    raise AssertionError(f"generation did not reach a terminal state (last={status})")


# ---------------------------------------------------------------------------
# classify
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_classify_valid_prompt(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        f"{_base(project_id)}/classify", json={"prompt": PROMPT}, headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["prompt"] == PROMPT
    assert data["stack"] == {
        "frontend": "React",
        "backend": "Express",
        "database": "PostgreSQL",
    }
    assert data["unsupported"] == []
    classifications = {r["classification"] for r in data["requirements"]}
    assert "EXPLICIT" in classifications
    assert any(r["key"] == "rest_api" for r in data["requirements"])
    assert data["plan"].startswith("# Build Plan:")


@pytest.mark.asyncio
async def test_classify_rejects_invalid_and_oversized_prompts(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    for payload in ({}, {"prompt": ""}, {"prompt": "   "}):
        res = await client.post(
            f"{_base(project_id)}/classify", json=payload, headers=headers
        )
        body = res.json()
        if res.status_code == 422:
            # Rejected by the request schema before reaching the endpoint.
            continue
        assert res.status_code == 200
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"

    oversized = {"prompt": "x" * 2001}
    res = await client.post(
        f"{_base(project_id)}/classify", json=oversized, headers=headers
    )
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "2000" in body["error"]["message"]


@pytest.mark.asyncio
async def test_classify_flags_unsupported_request_without_substitution(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        f"{_base(project_id)}/classify",
        json={"prompt": f"{PROMPT} and run it on a quantum computer"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["unsupported"], "unsupported tech must be reported, not substituted"
    assert any(r["classification"] == "UNSUPPORTED" for r in data["requirements"])


# ---------------------------------------------------------------------------
# plan
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_plan_returns_normalized_spec_with_string_paths(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        f"{_base(project_id)}/plan", json={"prompt": PROMPT}, headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    spec = data["spec"]
    assert spec["app_name"]
    assert isinstance(spec["files"], list) and len(spec["files"]) > 0
    # File manifest entries are plain path strings (no fabricated contents).
    for path in spec["files"]:
        assert isinstance(path, str) and path
    assert data["files"] == spec["files"]
    assert data["plan"]


# ---------------------------------------------------------------------------
# start / status
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_start_returns_idle_and_rejects_invalid_prompt(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.post(
        f"{_base(project_id)}/start", json={"prompt": PROMPT}, headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "IDLE"
    assert data["generation_request_id"]
    assert data["project_id"] == project_id

    for payload in ({"prompt": ""}, {"prompt": "x" * 2001}):
        bad = await client.post(
            f"{_base(project_id)}/start", json=payload, headers=headers
        )
        if bad.status_code == 422:
            # Rejected by the request schema before reaching the endpoint.
            continue
        assert bad.status_code == 200
        body = bad.json()
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_start_reuses_generation_identity_on_retry(client):
    """Idempotent retry: an explicit id is either still running (rejected) or
    replaced in place â€” never duplicated into an unrelated generation record."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    gen_id = str(uuid.uuid4())

    first = await client.post(
        f"{_base(project_id)}/start",
        json={"prompt": PROMPT, "generation_request_id": gen_id},
        headers=headers,
    )
    assert first.status_code == 200, first.text
    assert first.json()["data"]["generation_request_id"] == gen_id

    second = await client.post(
        f"{_base(project_id)}/start",
        json={"prompt": PROMPT, "generation_request_id": gen_id},
        headers=headers,
    )
    assert second.status_code == 200, second.text
    body = second.json()
    if body["success"]:
        # Terminal transaction replaced in place under the SAME identity.
        assert body["data"]["generation_request_id"] == gen_id
        assert body["data"]["status"] == "IDLE"
    else:
        # Still running: explicit duplicate must be refused, not queued twice.
        assert body["error"]["code"] == "GENERATION_IN_PROGRESS"

@pytest.mark.asyncio
async def test_generation_is_scoped_to_project_owner(client):
    headers = await _register(client)
    other = await _register(client, email="intruder@example.com", name="Intruder")
    project_id = await _create_project(client, headers)

    gen_id = str(uuid.uuid4())
    BACKGROUND_STORE[gen_id] = _stub_record(project_id, "PLANNING")
    try:
        for path in (f"/status/{gen_id}", f"/summary/{gen_id}"):
            res = await client.get(f"{_base(project_id)}{path}", headers=other)
            assert res.status_code == 403
        for path in (f"/apply/{gen_id}", f"/cancel/{gen_id}"):
            res = await client.post(f"{_base(project_id)}{path}", headers=other)
            assert res.status_code == 403
    finally:
        BACKGROUND_STORE.pop(gen_id, None)


@pytest.mark.asyncio
async def test_unknown_generation_ids_return_not_found(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    missing = str(uuid.uuid4())

    status = await client.get(f"{_base(project_id)}/status/{missing}", headers=headers)
    assert status.status_code == 200
    assert status.json()["error"]["code"] == "GENERATION_NOT_FOUND"

    summary = await client.get(f"{_base(project_id)}/summary/{missing}", headers=headers)
    assert summary.json()["error"]["code"] == "GENERATION_NOT_FOUND"

    applied = await client.post(f"{_base(project_id)}/apply/{missing}", headers=headers)
    assert applied.json()["error"]["code"] == "GENERATION_NOT_FOUND"

    cancelled = await client.post(f"{_base(project_id)}/cancel/{missing}", headers=headers)
    assert cancelled.json()["error"]["code"] == "GENERATION_NOT_FOUND"

# ---------------------------------------------------------------------------
# stream
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_stream_delivers_real_events_to_terminal_state(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    started = await client.post(
        f"{_base(project_id)}/start", json={"prompt": PROMPT}, headers=headers
    )
    gen_id = started.json()["data"]["generation_request_id"]

    stream = await client.get(f"{_base(project_id)}/stream/{gen_id}", headers=headers)
    assert stream.status_code == 200, stream.text
    assert "text/x-event-stream" in stream.headers.get("content-type", "")

    # Real SSE frames only â€” no fabricated progress beyond backend events.
    assert '"event":"status"' in stream.text
    assert '"event":"finished"' in stream.text
    assert '"event":"error"' not in stream.text

    # The finished frame must carry a real terminal status.
    assert '"status":"COMPLETED"' in stream.text or '"status":"PARTIAL"' in stream.text

# ---------------------------------------------------------------------------
# summary / apply
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_summary_reports_real_files_after_terminal(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    plan_res = await client.post(
        f"{_base(project_id)}/plan", json={"prompt": PROMPT}, headers=headers
    )
    manifest = plan_res.json()["data"]["files"]

    started = await client.post(
        f"{_base(project_id)}/start", json={"prompt": PROMPT}, headers=headers
    )
    gen_id = started.json()["data"]["generation_request_id"]
    final = await _wait_terminal(client, headers, project_id, gen_id)
    assert final in {"COMPLETED", "PARTIAL"}

    res = await client.get(f"{_base(project_id)}/summary/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["generation_request_id"] == gen_id
    if final == "COMPLETED":
        assert data["created_files"] == manifest
        assert data["modified_files"] == []
        assert data["deleted_files"] == []
        assert data["diff"]  # real A/M/D lines, never invented counts
        assert all(line.startswith("A  ") for line in data["diff"].splitlines())

@pytest.mark.asyncio
async def test_apply_writes_real_files_and_requires_terminal_state(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    started = await client.post(
        f"{_base(project_id)}/start", json={"prompt": PROMPT}, headers=headers
    )
    gen_id = started.json()["data"]["generation_request_id"]
    final = await _wait_terminal(client, headers, project_id, gen_id)
    assert final in {"COMPLETED", "PARTIAL"}

    summary = await client.get(f"{_base(project_id)}/summary/{gen_id}", headers=headers)
    created = summary.json()["data"]["created_files"]

    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "SYNCING"
    assert data["generation_request_id"] == gen_id
    if final == "COMPLETED":
        # Apply is the SOLE writer to the workspace: generation only records the
        # generated file set, so a first apply creates every planned file and
        # nothing is written twice.
        assert sorted(data["applied_files"]) == sorted(created)
        assert data["failed_operations"] == []
        assert data["modified_files"] == []

        # Every planned file is present on disk at its full relative path and
        # readable through the existing files API.
        for rel in created:
            fetched = await client.get(
                f"/api/v1/projects/{project_id}/files/{rel}", headers=headers
            )
            assert fetched.status_code == 200, (rel, fetched.text)

    # Apply consumed the transaction: a second apply must be refused.
    again = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert again.status_code == 200
    body = again.json()
    assert body["success"] is False
    assert body["error"]["code"] == "GENERATION_NOT_READY"

@pytest.mark.asyncio
async def test_apply_refused_for_non_terminal_generation(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    gen_id = str(uuid.uuid4())
    BACKGROUND_STORE[gen_id] = _stub_record(project_id, "GENERATING")
    try:
        res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
        assert res.status_code == 200
        body = res.json()
        assert body["success"] is False
        assert body["error"]["code"] == "GENERATION_NOT_READY"
    finally:
        BACKGROUND_STORE.pop(gen_id, None)


# ---------------------------------------------------------------------------
# cancel
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_cancel_moves_running_generation_to_cancelled(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    gen_id = str(uuid.uuid4())
    BACKGROUND_STORE[gen_id] = _stub_record(project_id, "PLANNING")
    try:
        res = await client.post(f"{_base(project_id)}/cancel/{gen_id}", headers=headers)
        assert res.status_code == 200, res.text
        data = res.json()["data"]
        assert data["status"] == "CANCELLED"
        assert data["completed_at"]

        # Terminal transactions are not cancellable â€” failure stays distinct.
        again = await client.post(f"{_base(project_id)}/cancel/{gen_id}", headers=headers)
        assert again.json()["success"] is False
        assert again.json()["error"]["code"] == "GENERATION_NOT_CANCELLABLE"

        # Cancelled state is observable through /status and never COMPLETED.
        status = await client.get(f"{_base(project_id)}/status/{gen_id}", headers=headers)
        assert status.json()["data"]["status"] == "CANCELLED"
    finally:
        BACKGROUND_STORE.pop(gen_id, None)


# ---------------------------------------------------------------------------
# Directory-structure regression (builder apply flattening)
# ---------------------------------------------------------------------------
# Original defect: the apply step called
#   FileService.create_file(project_id, "", path.split("/")[-1], content)
# which discarded every directory component, so the planned layout
# (server/index.js, client/App.jsx, server/routes/tasks.js, ...) was written
# flat into the project root. Same-named files in different directories then
# silently overwrote each other and the generated app was unrunnable.

NESTED_FILES = [
    {"operation": "create", "path": "server/index.js", "content": "SERVER_INDEX"},
    {"operation": "create", "path": "server/db.js", "content": "SERVER_DB"},
    {"operation": "create", "path": "server/routes/tasks.js", "content": "SERVER_ROUTES"},
    {"operation": "create", "path": "server/package.json", "content": "SERVER_PKG"},
    {"operation": "create", "path": "client/App.jsx", "content": "CLIENT_APP"},
    {"operation": "create", "path": "client/api.js", "content": "CLIENT_API"},
    {"operation": "create", "path": "package.json", "content": "ROOT_PKG"},
    {"operation": "create", "path": "README.md", "content": "ROOT_README"},
]


def _project_root(project_id: str) -> str:
    from app.core.config import settings

    return os.path.abspath(os.path.join(settings.PROJECTS_STORAGE_PATH, project_id))


def _read(path: str):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return None


@pytest.mark.asyncio
async def test_apply_preserves_generated_directory_structure(client):
    """Apply must write each generated file at its full planned relative path.

    This is the direct regression for the flattening bug.
    """
    headers = await _register(client, email="nest@example.com", name="Nest")
    project_id = await _create_project(client, headers, name="nested-apply")
    gen_id = str(uuid.uuid4())

    record = _stub_record(project_id, "COMPLETED")
    record["files"] = [dict(f) for f in NESTED_FILES]
    BACKGROUND_STORE[gen_id] = record

    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]

    assert data["failed_operations"] == []
    assert sorted(data["applied_files"]) == sorted(f["path"] for f in NESTED_FILES)

    root = _project_root(project_id)

    # Directories exist and files live at their planned nested paths.
    assert os.path.isdir(os.path.join(root, "server"))
    assert os.path.isdir(os.path.join(root, "client"))
    assert os.path.isdir(os.path.join(root, "server", "routes"))
    for rel in (f["path"] for f in NESTED_FILES):
        assert os.path.isfile(os.path.join(root, *rel.split("/"))), rel

    # Nothing was flattened into the project root.
    assert not os.path.isfile(os.path.join(root, "index.js"))
    assert not os.path.isfile(os.path.join(root, "App.jsx"))
    assert not os.path.isfile(os.path.join(root, "api.js"))
    assert not os.path.isfile(os.path.join(root, "db.js"))
    assert not os.path.isfile(os.path.join(root, "tasks.js"))


@pytest.mark.asyncio
async def test_apply_does_not_overwrite_same_named_files_across_directories(client):
    """`server/package.json` and root `package.json` must both survive.

    Before the fix both collapsed to `./package.json`, so one silently
    overwrote the other.
    """
    headers = await _register(client, email="collide@example.com", name="Collide")
    project_id = await _create_project(client, headers, name="collision")
    gen_id = str(uuid.uuid4())

    record = _stub_record(project_id, "COMPLETED")
    record["files"] = [dict(f) for f in NESTED_FILES]
    BACKGROUND_STORE[gen_id] = record

    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["failed_operations"] == []

    root = _project_root(project_id)
    assert _read(os.path.join(root, "server", "package.json")) == "SERVER_PKG"
    assert _read(os.path.join(root, "package.json")) == "ROOT_PKG"
    assert _read(os.path.join(root, "server", "index.js")) == "SERVER_INDEX"
    assert _read(os.path.join(root, "client", "App.jsx")) == "CLIENT_APP"


@pytest.mark.asyncio
async def test_generation_stores_nested_structure_without_writing_to_disk(client):
    """Generation records the nested file set; only Apply writes to disk.

    Generation is side-effect free: it stores the planned paths and their
    contents in the transaction, and the workspace stays untouched until Apply.
    This is the regression for the original flattening (`path.split("/")[-1]`)
    AND for generation silently writing files before the user applied them.
    """
    from app.core.config import settings
    from app.services.builder_service import BACKGROUND_STORE as STORE

    headers = await _register(client, email="gen@example.com", name="Gen")
    project_id = await _create_project(client, headers, name="gen-nested")

    started = await client.post(
        f"{_base(project_id)}/start", json={"prompt": PROMPT}, headers=headers
    )
    gen_id = started.json()["data"]["generation_request_id"]
    final = await _wait_terminal(client, headers, project_id, gen_id)
    assert final in {"COMPLETED", "PARTIAL"}

    # The generated set keeps the nested structure in the transaction...
    stored = {f["path"] for f in STORE[gen_id]["files"]}
    assert "server/index.js" in stored
    assert "server/routes/tasks.js" in stored
    assert "client/App.jsx" in stored
    # ...with no flattened basenames recorded.
    assert "index.js" not in stored
    assert "App.jsx" not in stored

    # ...and nothing has been written to the workspace yet.
    root = os.path.abspath(os.path.join(settings.PROJECTS_STORAGE_PATH, project_id))
    assert not os.path.isfile(os.path.join(root, "server", "index.js"))
    assert not os.path.isfile(os.path.join(root, "client", "App.jsx"))

    # Apply is the sole writer, and it produces the nested layout on disk.
    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert os.path.isdir(os.path.join(root, "server"))
    assert os.path.isdir(os.path.join(root, "client"))
    assert os.path.isfile(os.path.join(root, "server", "index.js"))
    assert os.path.isfile(os.path.join(root, "server", "routes", "tasks.js"))
    assert os.path.isfile(os.path.join(root, "client", "App.jsx"))
    # Flattened artefacts must not exist.
    assert not os.path.isfile(os.path.join(root, "index.js"))
    assert not os.path.isfile(os.path.join(root, "App.jsx"))


@pytest.mark.asyncio
async def test_split_generated_path_preserves_structure_and_rejects_escape():
    """Unit-level guard for the path-splitting helper."""
    from app.api.v1.builder import split_generated_path

    assert split_generated_path("server/index.js") == ("server", "index.js")
    assert split_generated_path("server/routes/tasks.js") == (
        "server/routes", "tasks.js",
    )
    assert split_generated_path("README.md") == ("", "README.md")
    assert split_generated_path("server\\index.js") == ("server", "index.js")

    for bad in ("../escape.js", "server/../../escape.js", "", "/"):
        with pytest.raises(ValueError):
            split_generated_path(bad)



# ---------------------------------------------------------------------------
# .env.example generation regression
# ---------------------------------------------------------------------------
# The plan always includes `.env.example`, but `FileService` rejected it as a
# hidden file, so every generation ended PARTIAL and the generated project's
# documented `cp ../.env.example .env` setup step had no file to copy.


@pytest.mark.asyncio
async def test_generation_stores_env_example_and_completes(client):
    """Generation must COMPLETE and record a real .env.example with content."""
    from app.services.builder_service import BACKGROUND_STORE as STORE

    headers = await _register(client, email="envok@example.com", name="EnvOk")
    project_id = await _create_project(client, headers, name="env-generation")

    started = await client.post(
        f"{_base(project_id)}/start", json={"prompt": PROMPT}, headers=headers
    )
    gen_id = started.json()["data"]["generation_request_id"]
    final = await _wait_terminal(client, headers, project_id, gen_id)

    assert final == "COMPLETED", f"expected COMPLETED, got {final}"

    # Generation recorded it with real content (it does not touch the disk).
    stored = {f["path"]: f.get("content", "") for f in STORE[gen_id]["files"]}
    assert ".env.example" in stored
    assert "DATABASE_URL=" in stored[".env.example"]
    assert "PORT=" in stored[".env.example"]
    assert "NODE_ENV=" in stored[".env.example"]
    assert stored[".env.example"].strip(), ".env.example must not be empty"

    # Apply (the sole writer) puts it on disk with that content.
    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    env_path = os.path.join(_project_root(project_id), ".env.example")
    assert os.path.isfile(env_path)
    with open(env_path, encoding="utf-8") as fh:
        content = fh.read()
    assert "DATABASE_URL=" in content
    assert "PORT=" in content
    assert "NODE_ENV=" in content


@pytest.mark.asyncio
async def test_generated_files_have_real_content_not_empty_placeholders(client):
    """Every generated file must carry real content, not an empty string.

    `_run_generation` previously hardcoded `content: ""` for every planned
    path, so applying a generation produced a correct file tree of entirely
    EMPTY files.
    """
    from app.services.builder_service import BACKGROUND_STORE as STORE

    headers = await _register(client, email="content@example.com", name="Content")
    project_id = await _create_project(client, headers, name="content-generation")

    started = await client.post(
        f"{_base(project_id)}/start", json={"prompt": PROMPT}, headers=headers
    )
    gen_id = started.json()["data"]["generation_request_id"]
    await _wait_terminal(client, headers, project_id, gen_id)

    expected = (
        "server/index.js",
        "server/db.js",
        "server/routes/tasks.js",
        "client/App.jsx",
        "client/api.js",
        "client/index.html",
        "client/index.js",
        "client/App.css",
        "package.json",
        "server/package.json",
        "README.md",
        ".env.example",
    )
    stored = {f["path"]: f.get("content", "") for f in STORE[gen_id]["files"]}

    # Every planned path is recorded with non-empty content.
    for rel in expected:
        assert rel in stored, rel
        assert stored[rel].strip(), f"{rel} was generated empty"

    # Apply is the sole writer, and it lands that content on disk.
    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["failed_operations"] == []

    root = _project_root(project_id)
    for rel in expected:
        path = os.path.join(root, *rel.split("/"))
        assert os.path.isfile(path), rel
        with open(path, encoding="utf-8") as fh:
            body = fh.read()
        assert body.strip(), f"{rel} was written empty"
        assert body == stored[rel], f"{rel} content differs from generated"


@pytest.mark.asyncio
async def test_env_example_is_visible_and_readable_but_real_env_is_blocked(client):
    """The allowed template is a normal project file; real .env stays denied."""
    headers = await _register(client, email="envsec@example.com", name="EnvSec")
    project_id = await _create_project(client, headers, name="env-security")

    # Create the template through the normal file API: it must be allowed.
    res = await client.post(
        "/api/v1/projects/{}/files/file".format(project_id),
        json={"parent_path": "", "name": ".env.example", "content": "PORT=4000\n"},
        headers=headers,
    )
    assert res.status_code == 200, res.text

    # It is visible in the tree and readable.
    tree = await client.get(f"/api/v1/projects/{project_id}/files", headers=headers)
    assert ".env.example" in [f["name"] for f in tree.json()["data"]["files"]]
    read_res = await client.get(
        f"/api/v1/projects/{project_id}/files/.env.example", headers=headers
    )
    assert read_res.status_code == 200, read_res.text

    # Real credential files remain blocked through the API.
    for name in (".env", ".env.local", ".env.production", ".env.development"):
        blocked = await client.post(
            "/api/v1/projects/{}/files/file".format(project_id),
            json={"parent_path": "", "name": name, "content": "SECRET=1"},
            headers=headers,
        )
        assert blocked.status_code in (403, 400), (name, blocked.status_code)

    # Other hidden files are still rejected too (the allowlist is exact-match).
    for name in (".gitignore", ".secret", ".envrc"):
        blocked = await client.post(
            "/api/v1/projects/{}/files/file".format(project_id),
            json={"parent_path": "", "name": name, "content": "x"},
            headers=headers,
        )
        assert blocked.status_code in (403, 400), (name, blocked.status_code)





# ---------------------------------------------------------------------------
# Apply idempotency regression
# ---------------------------------------------------------------------------
# Apply is the sole writer, but the same project can be generated and applied
# more than once. A plain create failed for every file with "A file or folder
# with this name already exists". Apply is now an upsert: identical content is a
# no-op, differing content is converged back to the generated snapshot.


@pytest.mark.asyncio
async def test_apply_creates_every_planned_file_and_reports_no_failures(client):
    """A first apply against an empty workspace creates the whole file set."""
    headers = await _register(client, email="idem@example.com", name="Idem")
    project_id = await _create_project(client, headers, name="idempotent-apply")
    gen_id = str(uuid.uuid4())

    record = _stub_record(project_id, "COMPLETED")
    record["files"] = [dict(f) for f in NESTED_FILES]
    BACKGROUND_STORE[gen_id] = record

    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["failed_operations"] == []
    assert sorted(data["applied_files"]) == sorted(f["path"] for f in NESTED_FILES)
    assert data["modified_files"] == []

    root = _project_root(project_id)
    assert _read(os.path.join(root, "server", "index.js")) == "SERVER_INDEX"
    assert _read(os.path.join(root, "package.json")) == "ROOT_PKG"


@pytest.mark.asyncio
async def test_apply_twice_is_a_clean_noop(client):
    """Re-applying the same content must not report failures or change files.

    The endpoint-level guard already refuses a repeat apply of one generation
    (GENERATION_NOT_READY), so the record status is reset here to exercise the
    write path itself.
    """
    headers = await _register(client, email="idem2@example.com", name="Idem2")
    project_id = await _create_project(client, headers, name="idempotent-twice")
    gen_id = str(uuid.uuid4())

    record = _stub_record(project_id, "COMPLETED")
    record["files"] = [dict(f) for f in NESTED_FILES]
    BACKGROUND_STORE[gen_id] = record

    first = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert first.json()["data"]["failed_operations"] == []

    BACKGROUND_STORE[gen_id]["status"] = "COMPLETED"
    second = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert second.status_code == 200, second.text
    data = second.json()["data"]
    assert data["failed_operations"] == [], data["failed_operations"]
    # Nothing changed the second time.
    assert data["applied_files"] == []
    assert data["modified_files"] == []

    root = _project_root(project_id)
    assert _read(os.path.join(root, "server", "index.js")) == "SERVER_INDEX"
    assert _read(os.path.join(root, "client", "App.jsx")) == "CLIENT_APP"


@pytest.mark.asyncio
async def test_apply_restores_edited_file_to_generated_content(client):
    """Upsert semantics: a user-edited file is converged back on re-apply."""
    headers = await _register(client, email="idem3@example.com", name="Idem3")
    project_id = await _create_project(client, headers, name="idempotent-edit")
    gen_id = str(uuid.uuid4())

    record = _stub_record(project_id, "COMPLETED")
    record["files"] = [dict(f) for f in NESTED_FILES]
    BACKGROUND_STORE[gen_id] = record

    await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)

    root = _project_root(project_id)
    target = os.path.join(root, "server", "index.js")
    with open(target, "w", encoding="utf-8") as fh:
        fh.write("USER EDIT")

    BACKGROUND_STORE[gen_id]["status"] = "COMPLETED"
    res = await client.post(f"{_base(project_id)}/apply/{gen_id}", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["failed_operations"] == []
    assert "server/index.js" in data["modified_files"]
    assert _read(target) == "SERVER_INDEX"

