"""Phase 2D — dev-server preview detection and lifecycle helpers.

Detection reads the project's REAL configuration (package.json dev/start
scripts, vite.config.ts server.port) and maps it to the exact command the
canonical Phase 2B operation executor will run. Commands are drawn only from
the execution policy's approved vocabulary — project files never inject
arbitrary commands. Port allocation scans a fixed range to avoid collisions
between concurrently running previews (dev servers bind 127.0.0.1, keeping
the port private; no public exposure is required to reach it through the
backend preview proxy).

All subprocess spawning stays in ExecutionService.start_dev_server — this
module is detection + bookkeeping only.
"""
from __future__ import annotations

import json
import os
import re
import socket
from dataclasses import dataclass

from app.schemas.execution import PreviewInfo
from app.services.project_service import ProjectService


@dataclass
class PreviewStartInfo:
    """Detection result for a dev-server preview.

    supported — a real start/dev command exists in the project config.
    available — the required tool binary exists on the execution server.
    command   — policy-approved command (npm run dev / npm start / python
                -m http.server).
    arguments — extra args the engine will append (e.g. --port <p>).
    port      — configured port read from the project's real config, or None
                when the engine should allocate one from the preview range.
    reason    — human-readable explanation when not supported/available.
    """

    supported: bool
    available: bool = False
    command: str | None = None
    arguments: list[str] | None = None
    port: int | None = None
    source: str | None = None
    reason: str | None = None


def _read_text(project_root: str, name: str) -> str | None:
    path = os.path.join(project_root, name)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except Exception:
        return None


def _which(tool: str) -> bool:
    import shutil
    return shutil.which(tool) is not None


def _port_from_vite_config(project_root: str) -> int | None:
    raw = (
        _read_text(project_root, "vite.config.ts")
        or _read_text(project_root, "vite.config.js")
        or _read_text(project_root, "vite.config.mts")
    )
    if not raw:
        return None
    match = re.search(r"port\s*:\s*(\d+)", raw)
    if not match:
        return None
    port = int(match.group(1))
    return port if 0 < port < 65536 else None


class PreviewService:
    """Phase 2D preview detection + port bookkeeping."""

    PORT_RANGE_START = 5180
    PORT_RANGE_END = 5299

    @staticmethod
    def detect_start(project_id: str) -> PreviewStartInfo:
        """Detect the dev-server start command from the project's real
        configuration. Only policy-approved commands are ever produced."""
        project_root = ProjectService.get_project_storage_path(project_id)
        pkg_raw = _read_text(project_root, "package.json")
        if pkg_raw is not None:
            try:
                pkg = json.loads(pkg_raw)
                if not isinstance(pkg, dict):
                    pkg = {}
            except json.JSONDecodeError:
                pkg = {}
            scripts = pkg.get("scripts")
            scripts = scripts if isinstance(scripts, dict) else {}
            if not scripts:
                return PreviewStartInfo(
                    supported=False,
                    reason="package.json has no scripts section (no start/dev command)")
            script_key = None
            for key in ("dev", "start"):
                if key in scripts and str(scripts[key]).strip():
                    script_key = key
                    break
            if script_key is None:
                return PreviewStartInfo(
                    supported=False,
                    reason="package.json defines no 'dev' or 'start' script")
            command = "npm run dev" if script_key == "dev" else "npm run start"
            if not _which("npm"):
                return PreviewStartInfo(
                    supported=True, available=False, command=command,
                    port=_port_from_vite_config(project_root),
                    source="package.json",
                    reason="'npm' is not installed on this server")
            return PreviewStartInfo(
                supported=True, available=True, command=command,
                port=_port_from_vite_config(project_root),
                source="package.json", reason=None)

        # Python static file server fallback.
        if _read_text(project_root, "index.html") is not None:
            if not (_which("python") or _which("python3")):
                return PreviewStartInfo(
                    supported=True, available=False,
                    command="python -m http.server", source="index.html",
                    reason="'python' is not installed on this server")
            return PreviewStartInfo(
                supported=True, available=True,
                command="python -m http.server", source="index.html",
                reason=None)

        return PreviewStartInfo(
            supported=False,
            reason="No dev tooling detected (no package.json start/dev script, "
                   "no index.html for a static file server)")

    @staticmethod
    def allocate_port() -> int:
        """Return the first free TCP port in the preview range. Ports held by
        live preview processes on this instance are skipped. The scan binds a
        temporary socket so a port in use by ANY local process is skipped."""
        from app.services.execution_service import _PROCESSES
        used = set()
        for proc in _PROCESSES.values():
            if proc is not None:
                p = getattr(proc, "_devos_preview_port", None)
                if p is not None:
                    used.add(int(p))
        for port in range(PreviewService.PORT_RANGE_START,
                           PreviewService.PORT_RANGE_END + 1):
            if port in used:
                continue
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                try:
                    sock.bind(("127.0.0.1", port))
                    return port
                except OSError:
                    continue
        raise RuntimeError("No free port available in the preview range")

    @staticmethod
    def build_preview_info(execution, project_id: str) -> PreviewInfo:
        """Build a PreviewInfo payload from a DEV_SERVER execution record."""
        return PreviewInfo(
            execution_id=execution.execution_id,
            project_id=project_id,
            url=execution.preview_url,
            port=execution.preview_port,
            status=execution.status,
            exit_code=execution.exit_code,
            failure_reason=execution.failure_reason,
            stdout=execution.stdout,
            stderr=execution.stderr,
        )