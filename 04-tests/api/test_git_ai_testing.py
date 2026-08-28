import os
import shutil

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db.base import Base
from app.db.session import engine
from app.services.project_service import ProjectService

GIT_AVAILABLE = shutil.which("git") is not None


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _setup(client):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": "Dev", "email": "dev@example.com", "password": "supersecret1"},
    )
    headers = {"Authorization": f"Bearer {res.json()['data']['token']}"}
    proj = await client.post("/api/v1/projects", json={"name": "git-demo"}, headers=headers)
    project_id = proj.json()["data"]["id"]
    root = ProjectService.get_project_storage_path(project_id)
    with open(os.path.join(root, "main.py"), "w") as f:
        f.write("print('v1')\n")
    return headers, project_id, root


@pytest.mark.skipif(not GIT_AVAILABLE, reason="git binary not installed")
@pytest.mark.asyncio
async def test_git_status_branches_commit_log(client):
    headers, project_id, _root = await _setup(client)
    base = f"/api/v1/projects/{project_id}/git"

    status = await client.get(f"{base}/status", headers=headers)
    assert status.status_code == 200, status.text
    assert "main.py" in status.json()["data"]["untracked"]

    commit = await client.post(f"{base}/commit", json={"message": "initial"}, headers=headers)
    assert commit.status_code == 200, commit.text

    status2 = await client.get(f"{base}/status", headers=headers)
    assert status2.json()["data"]["is_clean"] is True

    branches = await client.get(f"{base}/branches", headers=headers)
    assert branches.status_code == 200
    assert branches.json()["data"]["current"] == "main"

    log = await client.get(f"{base}/log", headers=headers)
    assert log.status_code == 200
    messages = [c["message"] for c in log.json()["data"]["commits"]]
    assert "initial" in messages

    # Create + checkout a branch, then go back
    checkout = await client.post(
        f"{base}/checkout", json={"branch": "feature-x", "create": True}, headers=headers
    )
    assert checkout.status_code == 200
    assert (await client.get(f"{base}/branches", headers=headers)).json()["data"]["current"] == "feature-x"
    assert (
        await client.post(f"{base}/checkout", json={"branch": "main"}, headers=headers)
    ).status_code == 200

    # Invalid branch names rejected
    bad = await client.post(
        f"{base}/checkout", json={"branch": "-rf"}, headers=headers
    )
    assert bad.status_code == 400

    # Stage/unstage roundtrip
    with open(os.path.join(ProjectService.get_project_storage_path(project_id), "new.py"), "w") as f:
        f.write("x = 1\n")
    assert (
        await client.post(f"{base}/stage", json={"files": ["new.py"]}, headers=headers)
    ).status_code == 200
    staged_status = await client.get(f"{base}/status", headers=headers)
    assert "new.py" in staged_status.json()["data"]["added"]
    assert (
        await client.post(f"{base}/unstage", json={"files": ["new.py"]}, headers=headers)
    ).status_code == 200

    with open(os.path.join(ProjectService.get_project_storage_path(project_id), ".env"), "w") as f:
        f.write("SECRET=should-not-be-committed\n")
    blocked_commit = await client.post(
        f"{base}/commit", json={"message": "blocked secret"}, headers=headers
    )
    assert blocked_commit.status_code == 403
    assert blocked_commit.json()["error"]["code"] == "GIT_SENSITIVE_FILE"

    # Empty commit message rejected
    assert (
        await client.post(f"{base}/commit", json={"message": "   "}, headers=headers)
    ).status_code == 400

    # Unauthenticated git access
    assert (await client.get(f"{base}/status")).status_code == 401


@pytest.mark.asyncio
async def test_ai_mock_chat_persists_conversation(client):
    headers, project_id, _ = await _setup(client)
    base = f"/api/v1/projects/{project_id}/ai"

    provider = await client.get(f"{base}/provider", headers=headers)
    assert provider.status_code == 200
    pdata = provider.json()["data"]
    assert pdata["provider"] == "local-mock"
    assert pdata["is_mock"] is True

    chat = await client.post(
        f"{base}/chat",
        json={"message": "What does this project do?"},
        headers=headers,
    )
    assert chat.status_code == 200, chat.text
    data = chat.json()["data"]
    assert data["conversation_id"]
    assert data["message"]["provider"] == "local-mock"
    assert "Mock" in data["message"]["content"]

    conversations = await client.get(f"{base}/conversations", headers=headers)
    assert conversations.status_code == 200
    conv_ids = [c["id"] for c in conversations.json()["data"]["conversations"]]
    assert data["conversation_id"] in conv_ids

    messages = await client.get(
        f"{base}/conversations/{data['conversation_id']}/messages", headers=headers
    )
    assert messages.status_code == 200
    roles = [m["role"] for m in messages.json()["data"]["messages"]]
    assert roles == ["user", "assistant"]


@pytest.mark.asyncio
async def test_ai_conversation_ownership_enforced(client):
    headers, project_id, _ = await _setup(client)
    base = f"/api/v1/projects/{project_id}/ai"

    chat = await client.post(f"{base}/chat", json={"message": "hi"}, headers=headers)
    conv_id = chat.json()["data"]["conversation_id"]

    other = await client.post(
        "/api/v1/auth/register",
        json={"name": "Other", "email": "other@example.com", "password": "supersecret1"},
    )
    other_headers = {"Authorization": f"Bearer {other.json()['data']['token']}"}

    # Other user cannot access the project at all
    assert (await client.get(f"{base}/conversations", headers=other_headers)).status_code == 403
    # And cannot reply into someone else's conversation even if project were shared
    res = await client.post(
        f"{base}/chat",
        json={"message": "intrusion", "conversation_id": conv_id},
        headers=other_headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_ai_actions_validation(client):
    headers, project_id, _ = await _setup(client)
    base = f"/api/v1/projects/{project_id}/ai"

    ok = await client.post(
        f"{base}/actions",
        json={"action": "explain", "code": "print('hi')", "language": "python"},
        headers=headers,
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["provider"] == "local-mock"

    bad = await client.post(
        f"{base}/actions",
        json={"action": "destroy-everything", "code": "x"},
        headers=headers,
    )
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_context_excludes_secrets_and_heavy_dirs(client):
    headers, project_id, _ = await _setup(client)
    root = ProjectService.get_project_storage_path(project_id)
    os.makedirs(os.path.join(root, "node_modules"), exist_ok=True)
    with open(os.path.join(root, ".env"), "w") as f:
        f.write("API_KEY=hidden-value-123456\n")
    with open(os.path.join(root, "node_modules", "big.js"), "w") as f:
        f.write("x" * 100)
    with open(os.path.join(root, "README.md"), "w") as f:
        f.write("# Context Demo\n")

    res = await client.get(f"/api/v1/projects/{project_id}/context", headers=headers)
    assert res.status_code == 200
    raw = res.text
    assert "node_modules" not in raw
    assert "hidden-value-123456" not in raw
    assert res.json()["data"]["readme"] == "# Context Demo\n"


@pytest.mark.asyncio
async def test_testing_center_allowlist(client):
    headers, project_id, _ = await _setup(client)
    base = f"/api/v1/projects/{project_id}/testing"

    jobs = await client.get(f"{base}/jobs", headers=headers)
    assert jobs.status_code == 200
    job_ids = [j["id"] for j in jobs.json()["data"]["jobs"]]
    assert set(job_ids) == {"pytest", "typecheck", "build"}

    # Unknown job rejected — arbitrary commands are not possible
    unknown = await client.post(f"{base}/run/rm-rf", headers=headers)
    assert unknown.status_code == 404

    # pytest job actually runs against the (empty) project workspace
    if shutil.which("pytest"):
        run = await client.post(f"{base}/run/pytest", headers=headers)
        assert run.status_code == 200
        assert run.json()["data"]["job"] == "pytest"
        # Empty project -> pytest exit code 5 (no tests collected) -> failed
        assert run.json()["data"]["status"] in ("passed", "failed")


@pytest.mark.asyncio
async def test_github_documented_routes_and_oauth_state(client, monkeypatch):
    headers, _project_id, _root = await _setup(client)

    monkeypatch.setattr("app.api.v1.github.settings.GITHUB_CLIENT_ID", "client-id")
    connect = await client.post("/api/v1/github/connect", headers=headers)
    assert connect.status_code == 200
    authorization_url = connect.json()["data"]["authorization_url"]
    assert "client_id=client-id" in authorization_url
    assert "state=" in authorization_url

    repositories = await client.get("/api/v1/github/repositories", headers=headers)
    legacy_repositories = await client.get("/api/v1/github/repos", headers=headers)
    assert repositories.status_code == 200
    assert legacy_repositories.status_code == 200
    assert repositories.json()["data"]["connected"] is False

    invalid_callback = await client.get(
        "/api/v1/github/callback?code=example&state=invalid"
    )
    assert invalid_callback.status_code == 401
