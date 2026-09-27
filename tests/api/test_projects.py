"""Project API tests, including deletion of a real Git workspace.

The original defect: `ProjectService.delete` called `db.delete()` + `db.flush()`
BEFORE `shutil.rmtree()`. Every project workspace is a real Git repository, and
Git marks its object files read-only on disk, so on Windows `rmtree` raised
`PermissionError: [WinError 5]`. The request returned 500 and the project was
silently NOT deleted.

The deletion tests below pin the fixed contract: the workspace (including a
read-only `.git/objects/...` tree) is removed, the row is deleted only after the
filesystem step succeeds, and a failed filesystem step leaves the row intact.
"""

import os
import shutil
import stat
import subprocess

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
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


async def _register(client, email="owner@example.com", name="Owner"):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['data']['token']}"}


async def _create_project(client, headers, name="demo-project"):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _workspace(project_id: str) -> str:
    return os.path.abspath(os.path.join(settings.PROJECTS_STORAGE_PATH, project_id))


def _seed_git_objects(path: str) -> int:
    """Create a REAL read-only `.git/objects` tree, like `git init` + commit.

    This reproduces the exact on-disk state that broke deletion: loose object
    files whose mode has no write bit. Returns the number of object files.
    """
    subprocess.run(["git", "init", "-b", "main"], cwd=path, capture_output=True, check=False)
    subprocess.run(
        ["git", "config", "user.name", "DEVOS v1.0.0"],
        cwd=path, capture_output=True, check=False,
    )
    subprocess.run(
        ["git", "config", "user.email", "devos@localhost"],
        cwd=path, capture_output=True, check=False,
    )
    with open(os.path.join(path, "seed.txt"), "w", encoding="utf-8") as fh:
        fh.write("seed\n")
    subprocess.run(["git", "add", "-A"], cwd=path, capture_output=True, check=False)
    subprocess.run(
        ["git", "commit", "-m", "seed"], cwd=path, capture_output=True, check=False
    )

    objects_root = os.path.join(path, ".git", "objects")
    count = 0
    for root, _dirs, files in os.walk(objects_root):
        for name in files:
            os.chmod(os.path.join(root, name), stat.S_IREAD)  # read-only
            count += 1
    return count



@pytest.mark.asyncio
async def test_project_crud_and_ownership(client):
    owner = await _register(client)
    other = await _register(client, email="other@example.com", name="Other")

    project_id = await _create_project(client, owner)

    listed = await client.get("/api/v1/projects", headers=owner)
    assert listed.status_code == 200
    assert any(p["id"] == project_id for p in listed.json()["data"]["projects"])

    got = await client.get(f"/api/v1/projects/{project_id}", headers=owner)
    assert got.status_code == 200
    assert got.json()["data"]["name"] == "demo-project"

    updated = await client.patch(
        f"/api/v1/projects/{project_id}", json={"description": "updated"}, headers=owner
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["description"] == "updated"

    # Other user must not read, update, or delete this project
    assert (
        await client.get(f"/api/v1/projects/{project_id}", headers=other)
    ).status_code == 403
    assert (
        await client.patch(
            f"/api/v1/projects/{project_id}", json={"name": "hijack"}, headers=other
        )
    ).status_code == 403
    assert (
        await client.delete(f"/api/v1/projects/{project_id}", headers=other)
    ).status_code == 403

    # Unknown project id
    assert (
        await client.get("/api/v1/projects/does-not-exist", headers=owner)
    ).status_code == 404

    # A deleted project id stays a clean 404 (stale client caches must fail
    # gracefully), and malformed ids never 500.
    deleted = await client.delete(f"/api/v1/projects/{project_id}", headers=owner)
    assert deleted.status_code == 200
    gone = await client.get(f"/api/v1/projects/{project_id}", headers=owner)
    assert gone.status_code == 404
    assert gone.json()["error"]["code"] == "PROJECT_NOT_FOUND"


@pytest.mark.asyncio
async def test_get_project_handles_stale_and_malformed_ids(client):
    """BUG-001 regression: stale/unknown project references return a clean 404."""
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    # Sanity: an existing project is reachable for its owner.
    got = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert got.status_code == 200

    # Malformed (non-UUID) ids must be a deterministic 404, never a 500.
    for bad_id in ("not-a-uuid", "e0e5b2c8-a13b-4742-af40-1eb7daf19ad6"):
        res = await client.get(f"/api/v1/projects/{bad_id}", headers=headers)
        assert res.status_code == 404
        assert res.json()["error"]["code"] == "PROJECT_NOT_FOUND"

    # A deleted project keeps returning 404 PROJECT_NOT_FOUND.
    assert (
        await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    ).status_code == 200
    res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "PROJECT_NOT_FOUND"


@pytest.mark.asyncio
async def test_project_activity_recorded(client):
    headers = await _register(client)
    project_id = await _create_project(client, headers)

    res = await client.get(f"/api/v1/projects/{project_id}/activity", headers=headers)
    assert res.status_code == 200
    types = [a["activity_type"] for a in res.json()["data"]["activities"]]
    assert "project.created" in types

    user_activity = await client.get("/api/v1/activity", headers=headers)
    assert user_activity.status_code == 200
    assert "project.created" in [
        a["activity_type"] for a in user_activity.json()["data"]["activities"]
    ]


@pytest.mark.asyncio
async def test_delete_project_removes_readonly_git_workspace(client):
    """A project whose workspace holds a real, read-only `.git` tree deletes
    cleanly: HTTP 200, directory gone, row gone.

    This is the direct regression for the `[WinError 5]` deletion failure.
    """
    headers = await _register(client, email="gitdel@example.com", name="GitDel")
    project_id = await _create_project(client, headers, name="has-git")

    path = _workspace(project_id)
    assert os.path.isdir(path)
    object_count = _seed_git_objects(path)
    assert object_count > 0, "expected real git objects to seed the regression"
    assert os.path.isdir(os.path.join(path, ".git"))

    res = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["message"] == "Project deleted successfully"

    # Filesystem really gone, including the read-only .git tree.
    assert not os.path.exists(path)
    assert not os.path.exists(os.path.join(path, ".git"))

    # Row really gone.
    listed = await client.get("/api/v1/projects", headers=headers)
    assert not any(
        p["id"] == project_id for p in listed.json()["data"]["projects"]
    )
    assert (
        await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    ).status_code == 404


@pytest.mark.asyncio
async def test_delete_project_keeps_row_when_workspace_removal_fails(client, monkeypatch):
    """If the filesystem step fails, the DB row must survive (clean rollback).

    Previously `db.delete()` + `flush()` ran first, so a filesystem failure
    produced a 500 with the project still present but the session left dirty and
    uncommitted. The row must now be untouched.
    """
    from app.services import project_service

    headers = await _register(client, email="gitfail@example.com", name="GitFail")
    project_id = await _create_project(client, headers, name="locked-workspace")
    path = _workspace(project_id)
    assert os.path.isdir(path)

    def boom(_storage_path):
        raise OSError("simulated locked workspace")

    monkeypatch.setattr(project_service, "remove_project_directory", boom)

    res = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert res.status_code == 500, res.text
    assert res.json()["error"]["code"] == "PROJECT_DELETE_FAILED"

    # The project still exists and its workspace is untouched.
    listed = await client.get("/api/v1/projects", headers=headers)
    assert any(p["id"] == project_id for p in listed.json()["data"]["projects"])
    assert os.path.isdir(path)

    shutil.rmtree(path, ignore_errors=True)


@pytest.mark.asyncio
async def test_delete_project_without_git_workspace_still_works(client):
    """Guard: the ordinary no-`.git` project path is unchanged by the fix."""
    headers = await _register(client, email="plaindel@example.com", name="PlainDel")
    project_id = await _create_project(client, headers, name="plain")
    path = _workspace(project_id)
    assert os.path.isdir(path)
    assert not os.path.exists(os.path.join(path, ".git"))

    res = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert res.status_code == 200, res.text
    assert not os.path.exists(path)

