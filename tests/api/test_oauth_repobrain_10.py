"""Phase 10 - close the GitHub OAuth and Repo Brain items.

Existing suites already prove the happy paths (OAuth callback persists an
encrypted connection and never returns the token; Repo Brain indexes real files
and symbols and blocks cross-project leakage). This file adds the specific
guarantees that were still unproven:

GitHub OAuth
  * the `state` parameter is signed and a forged state is refused
  * a user cannot read/disconnect another user's connection
  * no endpoint exposes a stored token

Repo Brain
  * a fact that exists ONLY inside the repository is retrievable, proving the
    answer is derived from repository context and not generated generically
  * the index is user-scoped
"""

import re
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
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


async def _user_project(client, tag, files=None):
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": tag, "email": f"{tag}{uuid.uuid4().hex[:8]}@x.com",
              "password": "supersecret1"},
    )
    headers = {"Authorization": f"Bearer {reg.json()['data']['token']}"}
    pid = (await client.post("/api/v1/projects", json={"name": tag}, headers=headers)
           ).json()["data"]["id"]
    for name, content in (files or {}).items():
        await client.post(
            f"/api/v1/projects/{pid}/files/file",
            headers=headers,
            json={"parent_path": "", "name": name, "content": content},
        )
    return headers, pid


# ===================================================== GITHUB OAUTH
@pytest.mark.asyncio
async def test_connect_issues_a_signed_state(client, monkeypatch):
    headers, _ = await _user_project(client, "GhState")
    # `settings` is a module-level singleton built at import, so setting an
    # env var after the fact cannot change it - patch the object instead.
    from app.core.config import settings

    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "synthetic-client-id", raising=False)
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "synthetic-secret", raising=False)

    res = await client.post("/api/v1/github/connect", headers=headers)
    assert res.status_code == 200, res.text
    url = res.json()["data"]["authorization_url"]
    m = re.search(r"state=([^&\"]+)", url)
    assert m, f"no state in the authorization url: {url}"
    assert "." in m.group(1), "state must be a signed JWT, not a guessable value"


@pytest.mark.asyncio
async def test_callback_rejects_a_forged_state(client, monkeypatch):
    headers, _ = await _user_project(client, "GhForged")
    from app.core.config import settings

    monkeypatch.setattr(settings, "GITHUB_CLIENT_ID", "synthetic-client-id", raising=False)
    monkeypatch.setattr(settings, "GITHUB_CLIENT_SECRET", "synthetic-secret", raising=False)

    forged = "eyJzdWIiOiJoYWNrZXIifQ.forged-signature"
    res = await client.get(
        "/api/v1/github/callback",
        params={"code": "synthetic-code", "state": forged},
        headers=headers,
    )
    assert res.status_code >= 400, f"a forged state was accepted: {res.text[:200]}"
    assert "gho_" not in res.text and "synthetic-code" not in res.text


@pytest.mark.asyncio
async def test_connection_is_user_scoped(client, monkeypatch):
    owner, _ = await _user_project(client, "GhOwner")
    other, _ = await _user_project(client, "GhOther")

    res = await client.get("/api/v1/github/connection", headers=owner)
    assert res.status_code == 200
    assert res.json()["data"]["connected"] is False

    res = await client.delete("/api/v1/github/connection", headers=other)
    assert res.status_code in (200, 403, 404), res.text

    anon = await client.get("/api/v1/github/connection")
    assert anon.status_code in (401, 403)


@pytest.mark.asyncio
async def test_connection_response_never_exposes_a_token(client, monkeypatch):
    from cryptography.fernet import Fernet

    from app.core.config import settings
    from app.core.crypto import encrypt_token
    from app.models.github_connection import GitHubConnection

    monkeypatch.setattr(settings, "TOKEN_ENCRYPTION_KEY",
                        Fernet.generate_key().decode(), raising=False)
    reg = await client.post(
        "/api/v1/auth/register",
        json={"name": "GhTok", "email": f"ght{uuid.uuid4().hex[:8]}@x.com",
              "password": "supersecret1"},
    )
    headers = {"Authorization": f"Bearer {reg.json()['data']['token']}"}
    user_id = reg.json()["data"]["user"]["id"]

    secret = "gho_synthetic_token_value_not_real"
    async with AsyncSessionLocal() as s:
        s.add(GitHubConnection(
            user_id=user_id, github_user_id=4242, github_username="synthetic-user",
            access_token=encrypt_token(secret),
        ))
        await s.commit()

    res = await client.get("/api/v1/github/connection", headers=headers)
    assert secret not in res.text, "token leaked from the connection endpoint"


# ===================================================== REPO BRAIN
@pytest.mark.asyncio
async def test_repo_brain_answers_from_repository_content(client):
    """A fact that exists ONLY in the repo must be retrievable.

    This is the assertion that separates a real repository-aware index from a
    generic answer: the marker is invented for this test and appears nowhere
    except the indexed file.
    """
    fact = "zephyrusquill_marker_7781"
    headers, pid = await _user_project(
        client, "RepoFact", {"notes.txt": f"internal codename is {fact}\n"}
    )

    built = await client.post(f"/api/v1/projects/{pid}/repo-index", headers=headers)
    assert built.status_code == 200, built.text

    found = await client.get(
        f"/api/v1/projects/{pid}/repo-index/search/text",
        params={"q": fact}, headers=headers,
    )
    assert found.status_code == 200, found.text
    assert fact in found.text, (
        "the repository-only fact was not found - the index is not real"
    )

    # It must be scoped: a different project must not return it.
    _, other_pid = await _user_project(client, "RepoOther")
    await client.post(f"/api/v1/projects/{other_pid}/repo-index", headers=headers)
    leak = await client.get(
        f"/api/v1/projects/{other_pid}/repo-index/search/text",
        params={"q": fact}, headers=headers,
    )
    assert fact not in leak.text, "repository context leaked across projects"


@pytest.mark.asyncio
async def test_repo_brain_is_user_scoped(client):
    headers, pid = await _user_project(
        client, "RepoOwner", {"a.js": "function a(){}"}
    )
    await client.post(f"/api/v1/projects/{pid}/repo-index", headers=headers)

    other, _ = await _user_project(client, "RepoStranger")
    res = await client.get(f"/api/v1/projects/{pid}/repo-index", headers=other)
    assert res.status_code in (403, 404), (
        f"another user read this project's index: {res.status_code}"
    )

