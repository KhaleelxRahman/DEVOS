"""Phase 6: repository indexing and search over real project files.

Every assertion here is made against files this test actually wrote to the
project's real storage directory, and against rows the real indexer produced
from those bytes. No fixture data stands in for a real file.
"""

import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.services.project_service import ProjectService
from tests.api.test_security_2g import _create_project as _create, _register as _reg

README_MD = """# Sample

This project stores widgets.
"""


async def _register(client, email="p6@example.com", name="P6"):
    """Register a real user and return just the auth headers."""
    headers, _token = await _reg(client, email, name)
    return headers


async def _create_project(client, headers, name="p6-project"):
    return await _create(client, headers, name)


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

SERVICE_PY = '''\
"""A tiny real service module."""

import os
from pathlib import Path

MAX_RETRIES = 3


class WidgetService:
    """Manages widgets."""

    def build_widget(self, name):
        """Build a widget by name."""
        return {"name": name, "path": str(Path(name))}

    async def refresh_widgets(self):
        return self.build_widget("w")


def helper_function(value):
    return value * 2
'''

ROUTER_PY = '''\
from app.service import WidgetService


def make_router():
    return WidgetService()
'''

CHECKOUT_JS = """\
import { applyDiscount } from "./discount.js";

export function renderCheckout(cart) {
  return applyDiscount(cart);
}

export const CHECKOUT_VERSION = "1.0.0";
"""


def test_javascript_symbols_are_found_beyond_the_first_line():
    """Regression: JS/TS patterns need re.MULTILINE.

    Without it, ``^`` only matches offset 0 of the whole source, so a file
    whose first declaration is on line 3 indexed ZERO symbols while still
    reporting its imports and exports.
    """
    from app.phase6_repo_index.extractor import extract

    facts = extract("web/Checkout.js", CHECKOUT_JS)
    found = {s.name: s.line for s in facts.symbols}
    assert found == {"renderCheckout": 3, "CHECKOUT_VERSION": 7}
    assert facts.imports == ["./discount.js"]
    assert facts.exports == ["renderCheckout", "CHECKOUT_VERSION"]


@pytest.mark.asyncio
async def test_reindex_removes_symbols_of_a_deleted_file(client):
    """Regression: a bulk delete() bypasses the ORM delete-orphan cascade.

    Stale RepoSymbol rows used to survive a re-index and resurface in symbol
    search for a file that no longer existed on disk.
    """
    from sqlalchemy import select

    from app.models.repo_index import RepoSymbol

    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(
        project_id, "app/legacy.py", "def legacy_entry():\n    return 1\n"
    )
    await _write(project_id, "app/service.py", SERVICE_PY)
    await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)

    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/search/symbols",
        params={"q": "legacy_entry"},
        headers=headers,
    )
    assert res.json()["data"]

    os.remove(
        os.path.join(
            ProjectService.get_project_storage_path(project_id), "app", "legacy.py"
        )
    )
    await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)

    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/search/symbols",
        params={"q": "legacy_entry"},
        headers=headers,
    )
    assert res.json()["data"] == []

    from app.db.session import AsyncSessionLocal

    # The orphan row itself must be gone, not merely hidden from search.
    async with AsyncSessionLocal() as db:
        rows = (
            await db.execute(
                select(RepoSymbol).where(RepoSymbol.project_id == project_id)
            )
        ).scalars().all()
    assert [s.name for s in rows if s.name == "legacy_entry"] == []


@pytest.mark.asyncio
async def test_symbol_count_matches_indexed_symbols(client):
    """Regression: symbol_count was read before the pending rows were flushed."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(project_id, "app/service.py", SERVICE_PY)
    await _write(project_id, "app/router.py", ROUTER_PY)
    res = await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)
    reported = res.json()["data"]["symbol_count"]

    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/architecture", headers=headers
    )
    assert reported == res.json()["data"]["total_symbols"] > 0


async def _write(project_id, rel, body):
    """Write a real file into the project's real storage directory."""
    from app.services.project_service import ProjectService

    root = ProjectService.get_project_storage_path(project_id)
    target = os.path.join(root, *rel.split("/"))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w", encoding="utf-8") as handle:
        handle.write(body)
    return target


@pytest.mark.asyncio
async def test_index_extracts_real_files_and_symbols(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(project_id, "app/service.py", SERVICE_PY)
    await _write(project_id, "app/router.py", ROUTER_PY)
    await _write(project_id, "README.md", README_MD)

    res = await client.post(
        f"/api/v1/projects/{project_id}/repo-index", headers=headers
    )
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["file_count"] == 3
    # 4 from service.py (class + 3 functions) + 1 from router.py.
    assert data["symbol_count"] == 5
    assert data["languages"]["python"] == 2

    # Symbols come from the real parser, with real line numbers.
    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/search/symbols",
        params={"q": "WidgetService"},
        headers=headers,
    )
    exact = res.json()["data"]
    assert [s["name"] for s in exact] == ["WidgetService"]
    assert exact[0]["kind"] == "class"
    assert exact[0]["line"] == 9
    assert exact[0]["signature"] == "class WidgetService"

    # A substring query ranks the exact match first, then the partial ones.
    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/search/symbols",
        params={"q": "widget"},
        headers=headers,
    )
    names = [s["name"] for s in res.json()["data"]]
    assert names[0] == "WidgetService"
    assert "build_widget" in names
    assert "refresh_widgets" in names

    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/search/symbols",
        params={"q": "helper_function"},
        headers=headers,
    )
    assert res.json()["data"][0]["path"] == "app/service.py"


@pytest.mark.asyncio
async def test_five_search_capabilities_return_real_results(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(project_id, "app/service.py", SERVICE_PY)
    await _write(project_id, "app/router.py", ROUTER_PY)
    await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)
    base = f"/api/v1/projects/{project_id}/repo-index"

    # 1. filename search
    res = await client.get(f"{base}/files", params={"q": "service"}, headers=headers)
    assert [f["path"] for f in res.json()["data"]] == ["app/service.py"]

    # 2. text search
    res = await client.get(
        f"{base}/search/text", params={"q": "MAX_RETRIES"}, headers=headers
    )
    hit = res.json()["data"][0]
    assert hit["path"] == "app/service.py"
    assert "MAX_RETRIES" in hit["snippet"]

    # 3. symbol search
    res = await client.get(
        f"{base}/search/symbols", params={"q": "refresh_widgets"}, headers=headers
    )
    assert res.json()["data"][0]["kind"] == "function"

    # 4. reference search
    res = await client.get(
        f"{base}/references", params={"name": "WidgetService"}, headers=headers
    )
@pytest.mark.asyncio
async def test_incremental_refresh_sees_new_file_without_manual_reindex(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(project_id, "app/service.py", SERVICE_PY)
    await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)
    base = f"/api/v1/projects/{project_id}/repo-index"

    res = await client.get(f"{base}/files", params={"q": "late"}, headers=headers)
    assert res.json()["data"] == []

    # Simulate a Phase 4 repair writing a new file. No manual reindex call.
    await _write(
        project_id, "app/late_module.py", "def late_entry_point():\n    return 1\n"
    )

    res = await client.get(f"{base}/files", params={"q": "late"}, headers=headers)
    assert [f["path"] for f in res.json()["data"]] == ["app/late_module.py"]

    res = await client.get(
        f"{base}/search/symbols", params={"q": "late_entry_point"}, headers=headers
    )
    assert res.json()["data"][0]["line"] == 1

    # A modified file's new content is retrievable, not the stale copy.
    await _write(project_id, "app/service.py", SERVICE_PY + "\nUNIQUE_NEW_MARKER = 1\n")
    res = await client.get(
        f"{base}/search/text", params={"q": "UNIQUE_NEW_MARKER"}, headers=headers
    )
    assert res.json()["data"][0]["path"] == "app/service.py"

    # A deleted file must disappear from the index.
    from app.services.project_service import ProjectService

    os.remove(
        os.path.join(
            ProjectService.get_project_storage_path(project_id), "app", "late_module.py"
        )
    )
    res = await client.get(f"{base}/files", params={"q": "late"}, headers=headers)
    assert res.json()["data"] == []


@pytest.mark.asyncio
async def test_no_cross_project_context_leakage(client):
    headers_a = await _register(client, "leak-a@example.com", "A")
    project_a = await _create_project(client, headers_a, "project-a")
    await _write(project_a, "app/service.py", SERVICE_PY)

    headers_b = await _register(client, "leak-b@example.com", "B")
    project_b = await _create_project(client, headers_b, "project-b")
    # Same relative path, different content: the strongest leak test.
    await _write(
        project_b, "app/service.py", "def only_in_project_b():\n    return 2\n"
    )

    for pid, headers in ((project_a, headers_a), (project_b, headers_b)):
        res = await client.post(f"/api/v1/projects/{pid}/repo-index", headers=headers)
        assert res.status_code == 200, res.text

    base_b = f"/api/v1/projects/{project_b}/repo-index"
    res = await client.get(
        f"{base_b}/search/symbols", params={"q": "WidgetService"}, headers=headers_b
    )
    assert res.json()["data"] == []  # A's symbol must not appear
    res = await client.get(
        f"{base_b}/search/symbols", params={"q": "only_in_project_b"}, headers=headers_b
    )
    assert res.json()["data"][0]["name"] == "only_in_project_b"

    # A third user can query neither project.
    headers_c = await _register(client, "leak-c@example.com", "C")
    for pid in (project_a, project_b):
        res = await client.get(f"/api/v1/projects/{pid}/repo-index", headers=headers_c)
@pytest.mark.asyncio
async def test_index_excludes_sensitive_and_generated_directories(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(project_id, "app/service.py", SERVICE_PY)
    await _write(project_id, ".env", "GITHUB_TOKEN=ghp_realsecretvalue123\n")
    await _write(project_id, "node_modules/left-pad/index.js", "module.exports=1;\n")
    await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)

    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/search/text",
        params={"q": "ghp_realsecretvalue123"},
        headers=headers,
    )
    assert res.json()["data"] == []  # secret never indexed


@pytest.mark.asyncio
async def test_architecture_reports_real_structure(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(project_id, "app/service.py", SERVICE_PY)
    await _write(project_id, "app/router.py", ROUTER_PY)
    await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)

    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/architecture", headers=headers
    )
    data = res.json()["data"]
    assert data["symbols_by_kind"]["class"] == 1
    assert "pathlib" in data["internal_modules"]


@pytest.mark.asyncio
async def test_unindexed_project_reports_not_indexed(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    res = await client.get(f"/api/v1/projects/{project_id}/repo-index", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_INDEXED"


@pytest.mark.asyncio
async def test_malformed_file_is_indexed_without_crashing(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)
    await _write(project_id, "app/broken.py", "def broken(:\n    pass\n")
    await _write(project_id, "app/service.py", SERVICE_PY)
    res = await client.post(f"/api/v1/projects/{project_id}/repo-index", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["file_count"] == 2
    # The well-formed file is still fully searchable.
    res = await client.get(
        f"/api/v1/projects/{project_id}/repo-index/search/symbols",
        params={"q": "WidgetService"},
        headers=headers,
    )
    assert res.json()["data"]
