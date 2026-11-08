#!/usr/bin/env python
"""Is there a preview teardown process leak?

Run with the backend already listening. Starts a preview, stops it, and
counts how many `python -m http.server` processes remain. A correct stop
must leave zero.
"""
import importlib.util
import subprocess
import time

spec = importlib.util.spec_from_file_location(
    "m", "qa/live-api-verification.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

PS = (
    "Get-CimInstance Win32_Process | "
    "Where-Object { $_.CommandLine -like '*http.server*' -and "
    "$_.CommandLine -notlike '*leakcheck*' } | "
    "Select-Object -ExpandProperty ProcessId"
)


def http_servers():
    out = subprocess.run(["powershell", "-NoProfile", "-Command", PS],
                         capture_output=True, text=True).stdout.split()
    return [p for p in out if p.strip().isdigit()]


client = m.Client("http://127.0.0.1:8000")
res = m.Results()
token = m.register_and_login(client, res, f"p10.leak.{int(time.time())}@example.com")
_, payload = client.call("POST", "/projects", {"name": "leak"}, token)
pid = payload["data"]["id"]
client.call("POST", f"/projects/{pid}/files/file",
            {"parent_path": "", "name": "index.html"}, token)
client.call("PUT", f"/projects/{pid}/files/index.html",
            {"content": "<h1>LEAKCHECK</h1>"}, token)

print("http.server procs BEFORE:", http_servers())
status, data = client.call("POST", f"/projects/{pid}/preview", None, token)
print("start:", status)
for _ in range(40):
    _, sp = client.call("GET", f"/projects/{pid}/preview/status", None, token)
    info = sp.get("data", {}) or {}
    if info.get("status") == "READY":
        break
    time.sleep(1)
print("status:", info.get("status"), "port:", info.get("port"))
print("http.server procs DURING:", http_servers())

stop_status, stop_payload = client.call("POST", f"/projects/{pid}/preview/stop", None, token)
print("stop:", stop_status, (stop_payload.get("data", {}) or {}).get("status"))
time.sleep(5)
print("http.server procs AFTER:", http_servers())
client.call("DELETE", f"/projects/{pid}", None, token)
