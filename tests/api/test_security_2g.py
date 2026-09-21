# Phase 2G — Adversarial Security + Regression Toolbox (reusable)
"""Phase 2G — adversarial security tests.

Every attack below is ATTEMPTED for real against the running app and the
observed result is asserted (blocked = non-200 with the right error shape).
No attack is reasoned about without being executed.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.services.execution_service import _PROCESSES


@pytest_asyncio.fixture
async def client():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    _PROCESSES.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _register(client, email, name):
    res = await client.post(
        "/api/v1/auth/register",
        json={"name": name, "email": email, "password": "supersecret1"},
    )
    assert res.status_code == 200, res.text
    body = res.json()["data"]
    return {"Authorization": f"Bearer {body['token']}"}, body["token"]


async def _create_project(client, headers, name):
    res = await client.post("/api/v1/projects", json={"name": name}, headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["data"]["id"]


def _exec_base(project_id):
    return f"/api/v1/projects/{project_id}/executions"


async def _create_queued(client, headers, project_id, command="python", args=None):
    res = await client.post(
        _exec_base(project_id),
        headers=headers,
        json={
            "execution_type": "CUSTOM_SAFE_COMMAND",
            "command": command,
            "arguments": args or ["-c", "print('SEC2G_OK')"],
            "working_directory": ".",
            "workspace_id": project_id,
        },
    )
    assert res.status_code == 200, f"create_queued failed: {res.text}"
    return res.json()["data"]["execution_id"]


@pytest.mark.asyncio
async def test_unauthenticated_access_blocked(client):
    """No token -> protected resources are unreachable (401/403)."""
    endpoints = [
        ("GET", "/api/v1/projects", None),
        ("POST", "/api/v1/projects", {"name": "x"}),
        ("GET", "/api/v1/projects/some-id/executions", None),
        ("POST", "/api/v1/projects/some-id/executions", {}),
        ("GET", "/api/v1/projects/some-id/preview/status", None),
        ("GET", "/api/v1/activity", None),
    ]
    for method, url, payload in endpoints:
        res = await client.request(method, url, json=payload)
        assert res.status_code in (401, 403), (method, url, res.status_code, res.text)


@pytest.mark.asyncio
async def test_garbage_token_rejected(client):
    res = await client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer not.a.jwt"},
    )
    assert res.status_code in (401, 403), res.text


@pytest.mark.asyncio
async def test_cross_user_project_and_history_blocked(client):
    headers_a, _ = await _register(client, "secg-a@example.com", "A")
    headers_b, _ = await _register(client, "secg-b@example.com", "B")
    project_a = await _create_project(client, headers_a, "a-project")
    eid = await _create_queued(client, headers_a, project_a)

    res = await client.get(f"/api/v1/projects/{project_a}", headers=headers_b)
    assert res.status_code in (403, 404), res.text
    res = await client.get(_exec_base(project_a), headers=headers_b)
    assert res.status_code in (403, 404), res.text
    res = await client.get(f"{_exec_base(project_a)}/{eid}", headers=headers_b)
    assert res.status_code in (403, 404), res.text
    for action in ("run", "cancel", "retry"):
        res = await client.post(
            f"{_exec_base(project_a)}/{eid}/{action}", headers=headers_b)
        assert res.status_code in (403, 404, 409), (action, res.status_code, res.text)
    # A's record untouched by B's attempts.
    res = await client.get(f"{_exec_base(project_a)}/{eid}", headers=headers_a)
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "QUEUED"


@pytest.mark.asyncio
async def test_cross_user_cannot_kill_running_process(client):
    """B must not terminate A's live process; A retains full control and
    cleanup leaves no orphan."""
    import asyncio
    headers_a, _ = await _register(client, "secg-kill-a@example.com", "A")
    headers_b, _ = await _register(client, "secg-kill-b@example.com", "B")
    project_a = await _create_project(client, headers_a, "kill-project")
    eid = await _create_queued(
        client, headers_a, project_a,
        command="python", args=["-c", "import time; time.sleep(60)"])

    run_task = asyncio.create_task(
        client.post(f"{_exec_base(project_a)}/{eid}/run", headers=headers_a))
    await asyncio.sleep(1.0)

    res = await client.post(
        f"{_exec_base(project_a)}/{eid}/cancel", headers=headers_b)
    assert res.status_code in (403, 404), res.text

    # A can still cancel the genuinely running process.
    res = await client.post(
        f"{_exec_base(project_a)}/{eid}/cancel", headers=headers_a)
    assert res.status_code == 200, res.text
    assert res.json()["data"]["status"] == "CANCELLED"
    run_res = await run_task
    assert run_res.status_code == 200
    assert eid not in _PROCESSES  # no orphan after A's own cleanup


@pytest.mark.asyncio
async def test_cross_project_url_mismatch_blocked(client):
    """Same user, but an execution addressed under a DIFFERENT project id."""
    headers_a, _ = await _register(client, "secg-p@example.com", "P")
    project_a = await _create_project(client, headers_a, "pa")
    project_b = await _create_project(client, headers_a, "pb")
    eid = await _create_queued(client, headers_a, project_a)

    res = await client.get(f"{_exec_base(project_b)}/{eid}", headers=headers_a)
    assert res.status_code in (403, 404), res.text
    res = await client.post(
        f"{_exec_base(project_b)}/{eid}/run", headers=headers_a)
    assert res.status_code in (403, 404), res.text


@pytest.mark.asyncio
async def test_workspace_id_mismatch_rejected(client):
    headers_a, _ = await _register(client, "secg-w@example.com", "W")
    project_a = await _create_project(client, headers_a, "ws-project")
    res = await client.post(
        _exec_base(project_a),
        headers=headers_a,
        json={
            "execution_type": "CUSTOM_SAFE_COMMAND",
            "command": "python",
            "arguments": ["-c", "print('x')"],
            "working_directory": ".",
            "workspace_id": "not-the-project-id",
        },
    )
    assert res.status_code in (403, 422), res.text


@pytest.mark.asyncio
async def test_path_traversal_working_directory_blocked(client):
    headers_a, _ = await _register(client, "secg-t@example.com", "T")
    project_a = await _create_project(client, headers_a, "trav-project")

    async def try_cwd(cwd):
        return await client.post(
            _exec_base(project_a),
            headers=headers_a,
            json={
                "execution_type": "CUSTOM_SAFE_COMMAND",
                "command": "python",
                "arguments": ["-c", "print('escape')"],
                "working_directory": cwd,
                "workspace_id": project_a,
            },
        )

    for cwd in ("..", "../", "../..", "sub/../../", "a/../b/../../../.."):
        res = await try_cwd(cwd)
        assert res.status_code in (403, 422), (cwd, res.status_code, res.text)


@pytest.mark.asyncio
async def test_absolute_unc_and_drive_paths_blocked(client):
    headers_a, _ = await _register(client, "secg-abs@example.com", "U")
    project_a = await _create_project(client, headers_a, "abs-project")

    async def try_cwd(cwd):
        return await client.post(
            _exec_base(project_a),
            headers=headers_a,
            json={
                "execution_type": "CUSTOM_SAFE_COMMAND",
                "command": "python",
                "arguments": ["-c", "print('escape')"],
                "working_directory": cwd,
                "workspace_id": project_a,
            },
        )

    for cwd in ("C:\\Windows", "/etc", "/var", "\\\\server\\share", "D:\\tmp"):
        res = await try_cwd(cwd)
        assert res.status_code in (403, 422), (cwd, res.status_code, res.text)


@pytest.mark.asyncio
async def test_file_api_traversal_and_sensitive_paths_blocked(client):
    """The files read path must not serve ../ escapes, absolute paths, or
    sensitive credential files."""
    headers_a, _ = await _register(client, "secg-f@example.com", "F")
    project_a = await _create_project(client, headers_a, "files-project")

    for path in ("../../.env", "../backend/.env", "..\\..\\.env",
                 "C:/Windows/win.ini", "/etc/passwd", ".env", ".env.local"):
        res = await client.get(
            f"/api/v1/projects/{project_a}/files/{path}", headers=headers_a)
        assert res.status_code in (403, 404), (path, res.status_code, res.text)


@pytest.mark.asyncio
async def test_blocked_commands_rejected_and_audited(client):
    headers_a, _ = await _register(client, "secg-cmd@example.com", "C")
    project_a = await _create_project(client, headers_a, "cmd-project")

    attacks = [
        ("shutdown", ["/s"]),
        ("python", ["-c", "import os; os.system('shutdown /r')"]),
        ("python", ["-c", "print('do a rm -rf / now')"]),
    ]
    for command, args in attacks:
        res = await client.post(
            _exec_base(project_a),
            headers=headers_a,
            json={
                "execution_type": "CUSTOM_SAFE_COMMAND",
                "command": command,
                "arguments": args,
                "working_directory": ".",
                "workspace_id": project_a,
            },
        )
        assert res.status_code == 403, (command, args, res.status_code)
        assert res.json()["error"]["code"] == "BLOCKED_COMMAND"

    # NOTE (by-design capability, not a fixable gap): `python -c` is
    # CONTROLLED by the 2A policy — the product's core purpose is running
    # the user's own code, so arbitrary Python is allowed and ANY string-
    # level blocklist is bypassable inside it (e.g. subprocess.run([...])
    # instead of a literal substring). The substring layer is defense-in-
    # depth on the command line only. The real boundaries are: ownership,
    # workspace cwd containment, sanitized child env (see the env-leak
    # test below), and output caps.

    # The rejections persisted real BLOCKED audit records (visible in history).
    res = await client.get(_exec_base(project_a), headers=headers_a)
    rows = res.json()["data"]
    blocked = [r for r in rows if r["status"] == "BLOCKED"]
    assert len(blocked) >= 3
    assert all(r["failure_reason"] for r in blocked)


@pytest.mark.asyncio
async def test_unknown_command_default_denied(client):
    """Policy is default-deny: anything not explicitly allowlisted is blocked."""
    headers_a, _ = await _register(client, "secg-dd@example.com", "D")
    project_a = await _create_project(client, headers_a, "deny-project")
    for command in ("curl", "wget", "powershell", "bash", "del"):
        res = await client.post(
            _exec_base(project_a),
            headers=headers_a,
            json={
                "execution_type": "CUSTOM_SAFE_COMMAND",
                "command": command,
                "arguments": [],
                "working_directory": ".",
                "workspace_id": project_a,
            },
        )
        assert res.status_code == 403, (command, res.status_code, res.text)


# ---------------------------------------------------------------------------
# 6. Secret handling: child env, outputs, history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_no_server_secrets_in_child_process_env(client):
    """THE 2G fix: a controlled `python -c` used to inherit the backend's
    full environment (AUTH_SECRET, DATABASE_URL, ...) and could exfiltrate
    them into stdout, which is persisted in the execution record and served
    back via the history API. The child env must be sanitized."""
    headers_a, _ = await _register(client, "secg-env@example.com", "E")
    project_a = await _create_project(client, headers_a, "env-project")
    eid = await _create_queued(
        client, headers_a, project_a,
        command="python",
        args=["-c",
              "import os, json; print(json.dumps(sorted(os.environ.keys())))"])
    res = await client.post(f"{_exec_base(project_a)}/{eid}/run", headers=headers_a)
    assert res.status_code == 200, res.text
    data = res.json()["data"]
    assert data["status"] == "COMPLETED", data
    child_keys = data["stdout"] or ""

    # Attack probe: if any of these appear in the child env, the server's
    # secrets are one `python -c` away from stdout -> history.
    for marker in ("AUTH_SECRET", "DATABASE_URL", "JWT_SECRET", "SECRET",
                   "TOKEN", "PASSWORD", "API_KEY"):
        absent = marker not in child_keys
        assert absent, f"server env leaked into child process: {marker} present"
    # The sanitized env must still allow real toolchains: python ran fine.
    assert "SystemRoot" in child_keys or "PATH" in child_keys


@pytest.mark.asyncio
async def test_no_credentials_in_outputs_or_history(client):
    """Password and session token must never appear in stdout/stderr/
    failure_reason/history rows or server logs echoed to the client."""
    headers_a, token_a = await _register(client, "secg-leak@example.com", "L")
    project_a = await _create_project(client, headers_a, "leak-project")
    eid = await _create_queued(
        client, headers_a, project_a,
        command="python", args=["-c", "import sys; print('OUT'); sys.exit(5)"])
    run = await client.post(f"{_exec_base(project_a)}/{eid}/run", headers=headers_a)
    assert run.status_code == 200
    data = run.json()["data"]

    res = await client.get(_exec_base(project_a), headers=headers_a)
    blob = res.text
    for row in [data] + res.json()["data"]:
        for field in ("stdout", "stderr", "failure_reason"):
            value = row.get(field) or ""
            assert "supersecret1" not in value
            assert token_a not in value
    assert "supersecret1" not in blob
    assert token_a not in blob
    assert "Bearer" not in (data.get("stdout") or "")


# ---------------------------------------------------------------------------
# 7. Preview isolation across users and projects
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preview_isolated_across_users_and_projects(client):
    """A's preview must be unreachable/hijackable by B; B's own preview gets
    its own distinct port; the proxy target is always the stored port."""
    from app.services.file_service import FileService

    headers_a, _ = await _register(client, "secg-pv-a@example.com", "PA")
    headers_b, _ = await _register(client, "secg-pv-b@example.com", "PB")
    project_a = await _create_project(client, headers_a, "pv-a")
    project_b = await _create_project(client, headers_b, "pv-b")
    FileService.create_file(project_a, "", "index.html", "<h1>PV_A</h1>")
    FileService.create_file(project_b, "", "index.html", "<h1>PV_B</h1>")

    start_a = await client.post(
        f"/api/v1/projects/{project_a}/preview", headers=headers_a)
    assert start_a.status_code == 200, start_a.text
    info_a = start_a.json()["data"]
    assert info_a["status"] == "READY", info_a

    start_b = await client.post(
        f"/api/v1/projects/{project_b}/preview", headers=headers_b)
    assert start_b.status_code == 200, start_b.text
    info_b = start_b.json()["data"]
    assert info_b["status"] == "READY", info_b

    # Distinct ports: one project's server cannot serve the other's routes.
    assert int(info_a["port"]) != int(info_b["port"])

    # B cannot read status, proxy, or stop A's preview.
    res = await client.get(
        f"/api/v1/projects/{project_a}/preview/status", headers=headers_b)
    assert res.status_code in (403, 404), res.text
    res = await client.get(info_a["url"], headers=headers_b)
    assert res.status_code in (403, 404), res.text
    res = await client.post(
        f"/api/v1/projects/{project_a}/preview/stop", headers=headers_b)
    assert res.status_code in (403, 404), res.text

    # B's proxy serves B's own content, proving port separation end-to-end.
    proxy_b = await client.get(info_b["url"], headers=headers_b)
    assert proxy_b.status_code == 200
    assert "PV_B" in proxy_b.text and "PV_A" not in proxy_b.text

    # Cleanup: both previews stop cleanly, no orphans.
    for headers, project in ((headers_a, project_a), (headers_b, project_b)):
        res = await client.post(
            f"/api/v1/projects/{project}/preview/stop", headers=headers)
        assert res.status_code == 200, res.text
    assert _PROCESSES == {}


# ---------------------------------------------------------------------------
# 8. Preview proxy URL-token hardening (Phase 2G fix)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_preview_proxy_rejects_session_jwt_in_url(client):
    """Attack: put the SESSION JWT in the iframe URL (?preview_token=<jwt>).

    Before this Phase 2G fix that authenticated the proxy, so a long-lived
    credential rode in a URL (browser history, access logs, Referer). After
    the fix the URL token must be a dedicated execution-scoped preview token:
    a session JWT in the URL is rejected, while the very same JWT still works
    in the Authorization header (API contract preserved).
    """
    from app.services.file_service import FileService

    headers_a, token_a = await _register(client, "secg-pt@example.com", "PT")
    project_a = await _create_project(client, headers_a, "pt-project")
    FileService.create_file(project_a, "", "index.html", "<h1>PT_OK</h1>")

    start = await client.post(
        f"/api/v1/projects/{project_a}/preview", headers=headers_a)
    assert start.status_code == 200, start.text
    info = start.json()["data"]
    assert info["status"] == "READY", info

    # 1. The session JWT in the URL is refused (the old, leaky contract).
    res = await client.get(f"{info['url']}?preview_token={token_a}")
    assert res.status_code in (401, 403), (res.status_code, res.text)

    # 2. The same session JWT still authenticates the proxy via the header.
    res = await client.get(info["url"], headers=headers_a)
    assert res.status_code == 200, res.text
    assert "PT_OK" in res.text

    # 3. A scoped preview token IS issued, differs from the session JWT, and
    #    works from the URL alone (that is what the iframe uses now).
    scoped = info.get("preview_token")
    assert scoped, "backend must issue an execution-scoped preview token"
    assert scoped != token_a
    res = await client.get(f"{info['url']}?preview_token={scoped}")
    assert res.status_code == 200, res.text
    assert "PT_OK" in res.text

    # 4. That URL token is NOT a session credential: it cannot authenticate
    #    any API route, in the header or the query string.
    res = await client.get(
        "/api/v1/projects", headers={"Authorization": f"Bearer {scoped}"})
    assert res.status_code in (401, 403), res.text
    res = await client.get("/api/v1/projects", params={"preview_token": scoped})
    assert res.status_code in (401, 403), res.text

    stop = await client.post(
        f"/api/v1/projects/{project_a}/preview/stop", headers=headers_a)
    assert stop.status_code == 200, stop.text
    assert _PROCESSES == {}


@pytest.mark.asyncio
async def test_preview_token_scoped_to_execution_and_project(client):
    """A preview token minted for one execution must not unlock another
    execution or another project of the same user (scope binding)."""
    from app.services.file_service import FileService

    headers_a, _ = await _register(client, "secg-scope@example.com", "S")
    project_1 = await _create_project(client, headers_a, "scope-1")
    project_2 = await _create_project(client, headers_a, "scope-2")
    FileService.create_file(project_1, "", "index.html", "<h1>SCOPE_1</h1>")
    FileService.create_file(project_2, "", "index.html", "<h1>SCOPE_2</h1>")

    info_1 = (await client.post(
        f"/api/v1/projects/{project_1}/preview", headers=headers_a)).json()["data"]
    info_2 = (await client.post(
        f"/api/v1/projects/{project_2}/preview", headers=headers_a)).json()["data"]
    assert info_1["status"] == "READY" and info_2["status"] == "READY"
    token_1 = info_1["preview_token"]
    assert token_1

    # token_1 on project_2's proxy path -> rejected (different execution id).
    res = await client.get(f"{info_2['url']}?preview_token={token_1}")
    assert res.status_code in (401, 403), (res.status_code, res.text)

    # token_1 on its own execution -> accepted.
    res = await client.get(f"{info_1['url']}?preview_token={token_1}")
    assert res.status_code == 200
    assert "SCOPE_1" in res.text

    # Tampered token -> rejected.
    res = await client.get(f"{info_1['url']}?preview_token={token_1[:-3]}abc")
    assert res.status_code in (401, 403), res.text

    for headers, project in ((headers_a, project_1), (headers_a, project_2)):
        await client.post(
            f"/api/v1/projects/{project}/preview/stop", headers=headers)
    assert _PROCESSES == {}
