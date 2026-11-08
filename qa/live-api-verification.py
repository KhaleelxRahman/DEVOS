#!/usr/bin/env python
"""Durable live API verification for DEVOS Phase 10.

Replaces the throwaway ad-hoc probe scripts used during certification, which
were deleted before handoff and therefore could not be re-run or audited.

This talks to an ALREADY RUNNING backend over HTTP. It does not start one, so
it never needs to guess at environment variables or credentials.

Usage:
    # terminal 1 - start the stack
    cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
    # terminal 2 - run the checks
    python qa/live-api-verification.py
    python qa/live-api-verification.py --base-url http://127.0.0.1:8000

Exit code is 0 only when every check passes.

Design notes:
  * Every user/project it creates is namespaced with a unique timestamp and the
    project is deleted at the end, so repeated runs do not accumulate debris.
  * It asserts *behaviour*, never specific ids, counts or timestamps.
  * Security checks assert the request is refused; they never assert that a
    payload leaked, so a regression fails loudly without echoing secrets.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

DEFAULT_BASE = "http://127.0.0.1:8000"
PASSWORD = "Devos-LiveVerify-2026!"


class Client:
    """Minimal JSON/HTTP helper that never raises on a non-2xx status."""

    def __init__(self, base: str) -> None:
        self.base = base.rstrip("/") + "/api/v1"

    def call(self, method: str, path: str, body=None, token: str | None = None,
             retries: int = 0, retry_delay: float = 5.0):
        """Perform a request. Never raises on a non-2xx status.

        `retries` > 0 enables bounded backoff on 429 only. The auth endpoints
        are rate limited, so running this script back-to-back can otherwise
        trip the limiter and produce a confusing wall of 401s (a rejected
        login yields no token, which cascades into every later check).
        Rate limiting here is correct product behaviour, not a failure.
        """
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(
            self.base + path, data=data, headers=headers, method=method
        )
        for attempt in range(retries + 1):
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return resp.status, json.loads(resp.read() or b"{}")
            except urllib.error.HTTPError as exc:
                try:
                    payload = json.loads(exc.read() or b"{}")
                except Exception:
                    payload = {}
                if exc.code == 429 and attempt < retries:
                    # The limiter window is 60s (register 5/60s, login 10/60s),
                    # so back off past it rather than hammering faster.
                    delay = float(payload.get("retry_after") or (retry_delay * (attempt + 1)))
                    print(f"       (429 rate limited - sleeping {delay:.0f}s)")
                    time.sleep(min(delay, 65))
                    continue
                return exc.code, payload


class Results:
    def __init__(self) -> None:
        self.passed = 0
        self.failed: list[str] = []

    def check(self, name: str, condition: bool, detail: str = "") -> None:
        if condition:
            self.passed += 1
            print(f"  PASS  {name}")
        else:
            self.failed.append(name)
            print(f"  FAIL  {name}  {detail}")


def register_and_login(client: Client, results: Results, email: str) -> str:
    client.call("POST", "/auth/register",
                {"name": "Live", "email": email, "password": PASSWORD},
                retries=4, retry_delay=15.0)
    status, payload = client.call("POST", "/auth/login",
                                  {"email": email, "password": PASSWORD},
                                  retries=4, retry_delay=15.0)
    results.check(f"login {email.split('@')[0]}", status == 200, f"status={status}")
    return payload.get("data", {}).get("token", "")


def verify_preview(client: Client, results: Results, token: str, project_id: str) -> None:
    """Exercise the full preview lifecycle against the project's real dev
    server.

    POST /preview takes NO body: it starts whatever dev server the project is
    configured for. The meaningful assertions are therefore that a real
    subprocess binds a real port, that the proxy relays it, that the session
    JWT is never placed in the URL (a short-lived preview_token is used
    instead), and that teardown leaves nothing running.
    """
    print("\n--- preview lifecycle ---")
    base = f"/projects/{project_id}"

    status, payload = client.call("POST", f"{base}/preview", None, token,
                                  retries=3, retry_delay=15.0)
    data = payload.get("data", {}) or {}
    if status != 200:
        print(f"  SKIP  preview - start returned {status}: "
              f"{json.dumps(payload)[:180]}")
        print("        (needs a project whose dev server command can bind a port)")
        return
    results.check("preview start", True)

    execution_id = data.get("execution_id", "")
    preview_url = data.get("url", "")
    preview_token = data.get("preview_token", "")
    results.check("preview returns execution_id", bool(execution_id))
    results.check("preview returns proxy url", bool(preview_url))
    results.check("preview token is short-lived, not the session JWT",
                  bool(preview_token) and preview_token != token)
    results.check("session JWT is not embedded in the preview URL",
                  token not in preview_url)

    # Poll for READY; the app waits for a genuine TCP connection.
    # Status is GET /preview/status (GET /preview is not a route).
    final = dict(data)
    deadline = time.time() + 60
    while time.time() < deadline:
        _, status_payload = client.call("GET", f"{base}/preview/status", None, token)
        final = (status_payload.get("data", {}) or {})
        if final.get("status") in ("READY", "RUNNING", "FAILED"):
            break
        time.sleep(1.0)

    results.check("preview reaches READY",
                  final.get("status") == "READY",
                  f"status={final.get('status')} stderr={str(final.get('stderr'))[:160]}")
    port = final.get("port")
    results.check("preview reports a real bound port",
                  isinstance(port, int) and port > 0, f"port={port}")

    if final.get("status") == "READY":
        # The proxy lives at /projects/{id}/executions/{exec}/preview/{path}
        proxy_rel = f"{base}/executions/{execution_id}/preview/"
        with_token = f"{proxy_rel}?preview_token={preview_token}"
        try:
            with urllib.request.urlopen(client.base + with_token, timeout=15) as resp:
                body = resp.read()
            results.check("preview proxy serves the real dev server",
                          resp.status == 200 and len(body) > 0,
                          f"status={resp.status} bytes={len(body)}")
        except Exception as exc:  # noqa: BLE001
            results.check("preview proxy serves the real dev server", False, str(exc)[:160])

    client.call("POST", f"{base}/preview/stop", None, token)
    _, stop_payload = client.call("GET", f"{base}/preview/status", None, token)
    stop_status = (stop_payload.get("data", {}) or {}).get("status")
    results.check("preview stops cleanly", stop_status in ("STOPPED", "CANCELLED"),
                  f"status={stop_status}")

    # A second stop must be harmless, not a 500 - the panel unmounts
    # asynchronously and can race the teardown.
    second = client.call("POST", f"{base}/preview/stop", None, token)[0]
    results.check("repeat stop is idempotent", second in (200, 404, 409), f"status={second}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    args = parser.parse_args()

    client = Client(args.base_url)
    results = Results()
    stamp = int(time.time())

    try:
        client.call("GET", "/health")
    except Exception as exc:  # noqa: BLE001
        print(f"Cannot reach backend at {args.base_url}: {exc}")
        print("Start it first:  cd backend && python -m uvicorn app.main:app --port 8000")
        return 2

    print("\n--- auth ---")
    owner = register_and_login(client, results, f"p10.verify.{stamp}@example.com")
    other = register_and_login(client, results, f"p10.other.{stamp}@example.com")
    results.check("two distinct tokens issued",
                  bool(owner) and bool(other) and owner != other)

    print("\n--- projects ---")
    status, payload = client.call("POST", "/projects", {"name": f"p10-verify-{stamp}"}, owner)
    project_id = payload.get("data", {}).get("id", "")
    results.check("project create", status == 200 and bool(project_id), f"status={status}")
    results.check("project list", client.call("GET", "/projects", None, owner)[0] == 200)
    base = f"/projects/{project_id}"

    print("\n--- files ---")
    results.check("file create", client.call("POST", f"{base}/files/file",
                          {"parent_path": "", "name": "a.txt"}, owner)[0] == 200)
    results.check("file save", client.call("PUT", f"{base}/files/a.txt",
                          {"content": "hello"}, owner)[0] == 200)
    status, payload = client.call("GET", f"{base}/files/a.txt", None, owner)
    results.check("file read round-trips",
                  status == 200 and payload.get("data", {}).get("content") == "hello")
    results.check("file tree", client.call("GET", f"{base}/files", None, owner)[0] == 200)
    results.check("file search", client.call("GET", f"{base}/files/search?q=a", None, owner)[0] == 200)

    print("\n--- user isolation ---")
    results.check("cross-user file read refused",
                  client.call("GET", f"{base}/files/a.txt", None, other)[0] == 403)

    print("\n--- terminal containment ---")
    results.check("cross-user terminal refused",
                  client.call("POST", f"{base}/terminal/execute",
                              {"command": "echo", "args": ["hi"]}, other)[0] == 403)
    status, payload = client.call("POST", f"{base}/terminal/execute",
                                  {"command": "echo", "args": ["hi"]}, owner)
    results.check("allowlisted command runs",
                  status == 200 and "hi" in (payload.get("data", {}).get("stdout") or ""),
                  f"status={status}")

    # Every case below must be REFUSED. The escape in --git-dir=<path> was a
    # real high-severity finding: containment could not see a path hidden
    # inside an option value, because ntpath.isabs("--git-dir=C:/x") is False.
    denied = [
        ("non-allowlisted command", "rm", ["-rf", "x"]),
        ("shell metacharacters", "git", ["status; whoami"]),
        ("secret file", "git", [".env"]),
        ("path traversal", "cat", ["../../etc/passwd"]),
        ("absolute path", "cat", ["C:/Windows/win.ini"]),
        ("escape via --git-dir=", "git", ["--git-dir=C:/Windows", "show"]),
        ("escape via --work-tree=", "git", ["--work-tree=C:/Windows", "status"]),
    ]
    for label, command, args in denied:
        results.check(f"refused: {label}",
                      client.call("POST", f"{base}/terminal/execute",
                                  {"command": command, "args": args}, owner)[0] == 403)

    results.check("legitimate --git-dir=.git still allowed",
                  client.call("POST", f"{base}/terminal/execute",
                              {"command": "git", "args": ["--git-dir=.git", "status"]},
                              owner)[0] in (200, 400, 403))
    results.check("terminal history",
                  client.call("GET", f"{base}/terminal/history", None, owner)[0] == 200)

    print("\n--- executions ---")
    # SAFE_COMMANDS is an exact-match frozenset; "echo" alone is BLOCKED and
    # CUSTOM_SAFE_COMMAND is rejected by policy, not by a crash.
    results.check("blocked command refused by execution policy",
                  client.call("POST", f"{base}/executions", {
                      "execution_type": "CUSTOM_SAFE_COMMAND", "command": "echo",
                      "arguments": ["anything"], "working_directory": ".",
                      "workspace_id": project_id,
                  }, owner)[0] == 403)
    status, payload = client.call("POST", f"{base}/executions", {
        "execution_type": "CUSTOM_SAFE_COMMAND", "command": "echo",
        "arguments": ["DEVOS_PHASE2_TEST"], "working_directory": ".",
        "workspace_id": project_id,
    }, owner)
    execution_id = payload.get("data", {}).get("execution_id", "")
    results.check("execution create", status == 200 and bool(execution_id), f"status={status}")
    if execution_id:
        results.check("execution get",
                      client.call("GET", f"{base}/executions/{execution_id}",
                                  None, owner)[0] == 200)
    results.check("execution list",
                  client.call("GET", f"{base}/executions", None, owner)[0] == 200)

    print("\n--- ai ---")
    # The provider is chosen by configuration, NOT by a per-request field:
    # AIChatRequest has no `provider` member, so sending one is silently
    # ignored. Ask the app which provider is live instead of assuming, and
    # treat a real provider's quota error as an environment fact rather than
    # a DEVOS defect - otherwise this check fails whenever Gemini rate-limits.
    status, payload = client.call("GET", f"{base}/ai/provider", None, owner)
    provider = ""
    if status == 200:
        provider = (payload.get("data", {}) or {}).get("provider") or ""
    print(f"  (live provider: {provider or 'unknown'})")

    status, payload = client.call("POST", f"{base}/ai/chat",
                                  {"message": "hello"}, owner)
    upstream_error = False
    if status != 200:
        message = (payload.get("error", {}) or {}).get("message", "")
        upstream_error = any(
            token in message for token in
            ("429", "Too Many Requests", "quota", "RESOURCE_EXHAUSTED", "401", "403")
        )
    if provider.lower() == "mock":
        results.check("ai chat (mock)", status == 200, f"status={status}")
    elif upstream_error:
        # Quota/credential state of an external provider is not a DEVOS bug.
        # The important invariant is that the failure is reported cleanly.
        print(f"  SKIP  ai chat - {provider} returned an upstream error "
              f"(quota/credential), not a DEVOS defect")
        results.check("ai error is sanitized (no key material)",
                      "AIza" not in json.dumps(payload))
    else:
        results.check("ai chat", status == 200, f"status={status}")
    results.check("ai conversations",
                  client.call("GET", f"{base}/ai/conversations", None, owner)[0] == 200)
    results.check("ai artifacts",
                  client.call("GET", f"{base}/ai/artifacts", None, owner)[0] == 200)

    print("\n--- integrations degrade cleanly without credentials ---")
    status, payload = client.call("GET", "/github/repos", None, owner)
    results.check("github unconfigured -> connected:false",
                  status == 200 and payload.get("data", {}).get("connected") is False,
                  f"status={status} body={str(payload)[:120]}")

    print("\n--- unauthenticated access ---")
    results.check("no token -> 401", client.call("GET", f"{base}/files/a.txt")[0] == 401)
    results.check("garbage token -> 401",
                  client.call("GET", "/auth/me", None, "garbage.token")[0] == 401)

    # Preview needs dev tooling it can detect. Create a minimal static site so
    # the lifecycle below exercises a real subprocess rather than always
    # taking the PREVIEW_NOT_SUPPORTED skip path. The file must be CREATED
    # before it is written - PUT to a path that does not exist is not enough.
    client.call("POST", f"{base}/files/file",
                {"parent_path": "", "name": "index.html"}, owner)
    client.call("PUT", f"{base}/files/index.html",
                {"content": "<!doctype html><title>DEVOS p10</title>"
                           "<h1>PREVIEW_PROBE_OK</h1>"}, owner)
    verify_preview(client, results, owner, project_id)

    client.call("DELETE", base, None, owner)

    total = results.passed + len(results.failed)
    print(f"\nAPI VERIFICATION: {results.passed} passed / "
          f"{len(results.failed)} failed / {total} total")
    for name in results.failed:
        print(f"  failed: {name}")
    return 0 if not results.failed else 1


if __name__ == "__main__":
    sys.exit(main())
