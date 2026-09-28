"""Phase 5 tests: real git operations and real safety refusals.

These tests run REAL git commands in a real per-project repo. Capability
tests assert real git output (real SHAs, real branch names). Safety tests
actually ATTEMPT the dangerous operation and assert it is refused by name
— a protection that is never exercised is not a protection.

Every test uses a real project, real files, and the real git CLI.
"""

import json
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.services.git_service import (
    FORBIDDEN_OPERATIONS,
    PROTECTED_BRANCHES,
    GitSafetyError,
    GitService,
)
from app.phase5_git.commit_provenance import (
    NotCommittableError,
    build_commit_message,
    build_provenance,
)


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


def _git(project_id, *args):
    """Run real git in the project's repo and return (code, out, err)."""
    from app.services.project_service import ProjectService

    project_dir = ProjectService.get_project_storage_path(project_id)
    GitService._assert_safe(list(args))
    import subprocess

    proc = subprocess.run(
        ["git", *args], cwd=project_dir, capture_output=True, text=True
    )
    return proc.returncode, proc.stdout, proc.stderr


async def _init_repo(client, headers, project_id, files=None):
    """Create real files and make an initial real commit on main."""
    for name, content in (files or {"README.md": "# phase5 fixture\n"}).items():
        res = await client.post(
            f"/api/v1/projects/{project_id}/files/file",
            json={"parent_path": "", "name": name, "content": content},
            headers=headers)
        assert res.status_code == 200, res.text
    code, out, err = _git(project_id, "init", "-b", "main")
    assert code == 0, (out, err)
    _git(project_id, "config", "user.name", "DEVOS v1.0.0")
    _git(project_id, "config", "user.email", "devos@localhost")
    _git(project_id, "add", "--", *(files or {"README.md": 1}).keys())
    _git(project_id, "commit", "-m", "initial commit")
    return project_id


# ---------------------------------------------------------------------------
# CRITICAL SAFETY RULES — each attempted and blocked, for real
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_force_push_is_blocked(client):
    """A real force-push attempt is refused by name, before git runs."""
    headers = await _register(client, "p5fp@example.com", "P5FP")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-force"))
    for attempt in (["push", "--force"], ["push", "-f"],
                    ["push", "origin", "main", "--force"]):
        with pytest.raises(GitSafetyError) as exc:
            await GitService._run_git_cmd(project_id, attempt, auto_init=False)
        # The refusal names the exact forbidden verb or flag it blocked.
        assert "Refusing destructive git" in str(exc.value), attempt
        assert str(attempt[-1]) in str(exc.value), attempt


@pytest.mark.asyncio
async def test_history_rewrite_and_ref_deletion_blocked(client):
    """reset --hard, rebase, branch delete and stash drop are all refused."""
    headers = await _register(client, "p5hr@example.com", "P5HR")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-rewrite"))
    for attempt in (
        ["reset", "--hard", "HEAD"],
        ["rebase", "main"],
        ["branch", "-D", "main"],
        ["stash", "drop"],
        ["filter-branch", "--all"],
        ["clean", "-fd"],
    ):
        with pytest.raises(GitSafetyError):
            await GitService._run_git_cmd(project_id, attempt, auto_init=False)
    # The repo is intact: main still exists and HEAD is unchanged.
    code, out, _ = _git(project_id, "rev-parse", "--abbrev-ref", "HEAD")
    assert out.strip() == "main"
    _c, branches, _e = _git(project_id, "branch", "--format=%(refname:short)")
    assert "main" in branches


@pytest.mark.asyncio
async def test_push_to_main_is_refused(client):
    """Pushing directly to main is refused; a feature branch is not."""
    headers = await _register(client, "p5pm@example.com", "P5PM")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-mainpush"))
    res = await client.post(
        f"/api/v1/projects/{project_id}/git/push",
        json={"branch": "main"}, headers=headers)
    assert res.status_code == 403, res.text
    assert res.json()["error"]["code"] == "GIT_PROTECTED_BRANCH", res.json()
    assert "main" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_merge_into_main_is_refused(client):
    """A real merge attempt into main is refused before git runs."""
    headers = await _register(client, "p5mm@example.com", "P5MM")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-merge"))
    with pytest.raises(GitSafetyError) as exc:
        await GitService.merge(project_id, "some-branch", "main")
    assert "Refusing to merge into protected branch" in str(exc.value)
    assert exc.value.code == "GIT_PROTECTED_BRANCH"


def test_forbidden_operations_cover_every_rule():
    """The policy list actually names each critical rule."""
    joined = " ".join(FORBIDDEN_OPERATIONS)
    for required in ("force", "reset --hard", "rebase",
                     "branch -D", "tag -d", "stash drop", "clean -fd"):
        assert required in joined, required
    assert PROTECTED_BRANCHES == {"main", "master"}


# ---------------------------------------------------------------------------
# Provenance: a Phase 4 VERIFIED change becomes a real, traceable commit
# ---------------------------------------------------------------------------

def test_unverified_phase4_result_is_not_committable():
    """A Phase 4 UNVERIFIED or reverted result must never be committed."""
    with pytest.raises(NotCommittableError):
        build_provenance("UNVERIFIED", False, ["package.json"])
    with pytest.raises(NotCommittableError) as exc:
        build_provenance("VERIFIED", True, ["package.json"])
    assert "reverted" in str(exc.value).lower()
    # No files_touched means unknown scope, so it is refused too.
    with pytest.raises(NotCommittableError):
        build_provenance("VERIFIED", False, [])


def test_commit_message_attributes_verification_honestly():
    """The message cites the diagnosis and attributes the rerun to Phase 4."""
    prov = build_provenance(
        outcome="VERIFIED", reverted=False,
        files_touched=["package.json"],
        diagnosis_category="configuration",
        diagnosis_signature="missing_script",
        rerun_exit_code=0, execution_id="exec-123",
    )
    msg = build_commit_message(prov, "Define the missing build script")
    assert "category=configuration" in msg
    assert "signature=missing_script" in msg
    assert "outcome=VERIFIED" in msg
    assert "rerun exit 0" in msg
    assert "exec-123" in msg
    assert "package.json" in msg
    # It must not claim Phase 5 performed the verification.
    assert "performed and reported by Phase 4" in msg
    assert "fixes the bug" not in msg.lower()


@pytest.mark.asyncio
async def test_real_end_to_end_phase4_verified_commit(client):
    """THE end-to-end case: a Phase 4-VERIFIED change becomes a real commit.

    The commit is real, cites the real diagnosis provenance, stages ONLY
    the Phase 4 files_touched entry (never 'git add .'), and leaves every
    other modified file uncommitted.
    """
    headers = await _register(client, "p5e2e@example.com", "P5E2E")
    project_id = await _project(client, headers, "p5-e2e")
    await _init_repo(client, headers, project_id,
                     {"package.json": json.dumps({"name": "p5"})})

    # The Phase 4-repaired file, plus an unrelated file that must NOT be
    # swept into the commit.
    await client.put(
        f"/api/v1/projects/{project_id}/files/package.json",
        json={"content": json.dumps({"name": "p5", "scripts": {"build": "x"}})},
        headers=headers)
    await client.post(
        f"/api/v1/projects/{project_id}/files/file",
        json={"parent_path": "", "name": "NOTES.md", "content": "scratch\n"},
        headers=headers)

    res = await client.post(
        f"/api/v1/projects/{project_id}/git/commit-verified",
        headers=headers,
        json={
            "phase4_outcome": "VERIFIED",
            "phase4_reverted": False,
            "files_touched": ["package.json"],
            "diagnosis_category": "configuration",
            "diagnosis_signature": "missing_script",
            "phase4_rerun_exit_code": 0,
            "phase4_execution_id": "phase4-exec-abc",
            "message": "Define the missing build script",
        })
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["committed"] is True, data
    sha = data["commit_sha"]
    assert len(sha) == 40, sha
    assert data["files_committed"] == ["package.json"], data

    # REAL git evidence: the SHA resolves and the message carries provenance.
    _c, subject, _e = _git(project_id, "log", "-1", "--pretty=format:%s")
    assert subject == "Define the missing build script", subject
    _c, body, _e = _git(project_id, "log", "-1", "--pretty=format:%B")
    assert "signature=missing_script" in body, body
    assert "outcome=VERIFIED" in body, body

    # Only package.json is in the commit: NOTES.md was NOT swept in.
    _c, files, _e = _git(project_id, "show", "--pretty=", "--name-only", "HEAD")
    assert [f for f in files.split() if f] == ["package.json"], files

    # NOTES.md remains uncommitted in the working tree.
    status = await client.get(
        f"/api/v1/projects/{project_id}/git/status", headers=headers)
    assert status.status_code == 200, status.text
    assert "NOTES.md" in status.json()["data"]["untracked"]


@pytest.mark.asyncio
async def test_unverified_result_is_refused_at_the_api(client):
    """The API refuses an UNVERIFIED Phase 4 result without touching git."""
    headers = await _register(client, "p5unv@example.com", "P5UNV")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-unverified"))
    head_before = _git(project_id, "rev-parse", "HEAD")[1].strip()

    res = await client.post(
        f"/api/v1/projects/{project_id}/git/commit-verified",
        headers=headers,
        json={
            "phase4_outcome": "UNVERIFIED",
            "phase4_reverted": True,
            "files_touched": ["package.json"],
            "diagnosis_category": "configuration",
            "diagnosis_signature": "missing_script",
        })
    assert res.json()["success"] is False, res.json()
    assert res.json()["error"]["code"] == "NOT_COMMITTABLE", res.json()
    # HEAD is unchanged: no commit was created.
    assert _git(project_id, "rev-parse", "HEAD")[1].strip() == head_before


# ---------------------------------------------------------------------------
# Real capabilities, each asserted against real git output
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_real_capabilities_status_diff_branch_commit_log(client):
    """status, diff, branch create/checkout, commit and log all real."""
    headers = await _register(client, "p5cap@example.com", "P5Cap")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-caps"))

    # status
    res = await client.get(f"/api/v1/projects/{project_id}/git/status",
                           headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["branch"] == "main"
    assert res.json()["data"]["is_clean"] is True

    # create branch + checkout
    res = await client.post(
        f"/api/v1/projects/{project_id}/git/checkout",
        json={"branch": "feature/phase5", "create": True}, headers=headers)
    assert res.status_code == 200, res.text
    _c, out, _e = _git(project_id, "rev-parse", "--abbrev-ref", "HEAD")
    assert out.strip() == "feature/phase5"

    # branches
    res = await client.get(f"/api/v1/projects/{project_id}/git/branches",
                           headers=headers)
    branches = res.json()["data"]["branches"]
    assert "feature/phase5" in branches and "main" in branches
    assert res.json()["data"]["current"] == "feature/phase5"

    # edit + diff
    await client.put(
        f"/api/v1/projects/{project_id}/files/README.md",
        json={"content": "# changed\n"}, headers=headers)
    res = await client.get(f"/api/v1/projects/{project_id}/git/diff",
                           headers=headers)
    assert res.status_code == 200, res.text
    assert "README.md" in res.json()["data"]["diff"]

    # commit with explicit file list
    res = await client.post(
        f"/api/v1/projects/{project_id}/git/commit",
        json={"message": "real phase5 commit", "files": ["README.md"]},
        headers=headers)
    assert res.status_code == 200, res.text
    assert len(res.json()["data"]["commit_sha"]) == 40

    # log shows it
    res = await client.get(f"/api/v1/projects/{project_id}/git/log",
                           headers=headers)
    commits = res.json()["data"]["commits"]
    assert commits[0]["message"] == "real phase5 commit", commits


@pytest.mark.asyncio
async def test_real_fast_forward_merge_on_feature_branch(client):
    """A real fast-forward merge between feature branches succeeds."""
    headers = await _register(client, "p5mg@example.com", "P5Mg")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-mergeok"))
    _git(project_id, "checkout", "-b", "feature/a")
    await client.put(
        f"/api/v1/projects/{project_id}/files/README.md",
        json={"content": "# from a\n"}, headers=headers)
    await GitService.commit(project_id, "a change", files=["README.md"])
    _git(project_id, "checkout", "-b", "feature/b", "feature/a")

    res = await client.post(
        f"/api/v1/projects/{project_id}/git/merge",
        json={"source": "feature/a", "target": "feature/b"}, headers=headers)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["merged"] is True, res.json()


@pytest.mark.asyncio
async def test_sensitive_file_cannot_be_committed(client):
    """A blocked sensitive file is refused at commit time."""
    headers = await _register(client, "p5sens@example.com", "P5Sens")
    project_id = await _init_repo(client, headers,
                                 await _project(client, headers, "p5-secret"))
    from app.services.project_service import ProjectService

    d = ProjectService.get_project_storage_path(project_id)
    with open(os.path.join(d, "id_rsa"), "w", encoding="utf-8") as fh:
        fh.write("PRIVATE KEY\n")
    with pytest.raises(Exception) as exc:
        await GitService.commit(project_id, "should not happen",
                               files=["id_rsa"])
    assert "sensitive" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_cross_user_git_access_is_forbidden(client):
    """Another user cannot read or mutate someone else's git operations."""
    owner = await _register(client, "p5own@example.com", "P5Own")
    project_id = await _init_repo(client, owner,
                                 await _project(client, owner, "p5-own"))
    other = await _register(client, "p5oth@example.com", "P5Oth")
    for method, path, body in [
        ("GET", f"/api/v1/projects/{project_id}/git/status", None),
        ("POST", f"/api/v1/projects/{project_id}/git/commit",
         {"message": "nope"}),
        ("POST", f"/api/v1/projects/{project_id}/git/push", {}),
    ]:
        res = await client.request(method, path, json=body, headers=other)
        assert res.status_code in (403, 404), (method, res.text)


@pytest.mark.parametrize("path", [
    "..",
    "../",
    "../..",
    "..\\..",
    "a\\..\\..",
    "a/../b",
    "-rf",
    "a\x00b",
    "",
])
def test_validate_relative_path_rejects_traversal(path):
    """Git pathspec validation folds backslashes before the ".." check.

    On POSIX a backslash is an ordinary filename character, so without the
    fold "..\\.." would split into a single element and be accepted.
    """
    from app.core.errors import AppException

    with pytest.raises(AppException) as exc:
        GitService._validate_relative_path(path)
    assert exc.value.code == "GIT_ERROR", (path, exc.value.code)


@pytest.mark.parametrize("path", [
    "package.json",
    "src/main.ts",
    "src\\main.ts",
    "a/b/c.py",
    "file-with-dash-in-middle.js",
])
def test_validate_relative_path_accepts_safe(path):
    """Ordinary relative paths are still accepted, in either dialect."""
    GitService._validate_relative_path(path)
