"""Phase 2A/2B execution policy + record service.

Phase 2A: validate + persist QUEUED records (no process spawned).
Phase 2B: run_queued_execution takes a QUEUED record, spawns a real process,
captures stdout/stderr, streams SSE events, and updates the record with the
authoritative terminal state.
Phase 2D: start_dev_server runs the SAME engine for long-lived dev-server
previews (non-blocking, registered for cancel/cleanup, READY only after a
real reachability check).
"""
from __future__ import annotations

import asyncio
import ntpath
import os
import shutil
import sys
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.app_logging import logger
from app.core.config import settings
from app.core.errors import (
    ExecutionBlockedCommandException,
    ExecutionForbiddenException,
    ExecutionInvalidProjectException,
    ExecutionInvalidRequestException,
    ExecutionInvalidTypeException,
    ExecutionInvalidWorkspaceException,
    ExecutionInvalidWorkingDirectoryException,
    ExecutionRetryExhaustedException,
    ProjectAccessDeniedException,
    ProjectNotFoundException,
    QualityOperationNotSupportedException,
    QualityToolUnavailableException,
)
from app.models.execution import Execution
from app.models.user import User
from app.schemas.execution import (
    ExecutionCreateRequest,
    ExecutionResponse,
)
from app.services.project_service import ProjectService

# Active Phase 2B processes keyed by execution_id. Used for cancellation and
# cleanup. Each entry holds the asyncio.subprocess.Process handle.
_PROCESSES: dict[str, asyncio.subprocess.Process] = {}

# Phase 2E: execution_ids cancelled via cancel_execution while a /run task may
# still hold a live handle. run_queued_execution checks this set before
# finalizing so a concurrent cancel wins deterministically (no FAILED
# overwrite of a committed CANCELLED).
_CANCELLED_IDS: set[str] = set()

# Phase 2D preview registry keyed by project_id -> live DEV_SERVER execution
# row. Mirrors _PROCESSES (one live server max per project); entries are
# removed on stop/crash/session-end so no orphan survives.
_PREVIEW_EXECUTIONS: dict[str, "Execution"] = {}

MAX_EXECUTION_DURATION_SECONDS = settings.EXECUTION_MAX_DURATION_SECONDS
MAX_OUTPUT_CHARS = settings.EXECUTION_MAX_OUTPUT_CHARS
MAX_CONCURRENT_EXECUTIONS = settings.EXECUTION_MAX_CONCURRENT
MAX_RETRY_COUNT = settings.EXECUTION_MAX_RETRIES
MAX_PROCESS_COUNT = settings.EXECUTION_MAX_PROCESSES
RESOURCE_POLICY_ENFORCED = False

REDACTED_ENV_KEYS = frozenset({
    "AUTH_SECRET", "DATABASE_URL", "JWT", "TOKEN", "SECRET",
    "PASSWORD", "API_KEY", "PRIVATE_KEY", "OAUTH", "SESSION",
})
SAFE_COMMANDS = frozenset({
    "echo DEVOS_PHASE2_TEST", "node --version", "npm --version",
    "python --version", "git --version",
})
CONTROLLED_PREFIXES = (
    "npm install", "npm run build", "npm test", "pytest", "npm run lint",
    "python -c", "python3 -c",
    # Phase 2C quality commands (exact, policy-approved vocabulary only):
    "npm run type-check", "npm run typecheck", "npm run test",
    "npx --yes tsc --noemit", "npx tsc --noemit",
    "python -m pytest", "python3 -m pytest",
    # Phase 2D dev-server preview commands (exact, policy-approved vocabulary):
    "npm run dev", "npm run start", "npm start",
    "python -m http.server", "python3 -m http.server",
)
BLOCKED_SUBSTRINGS = (
    "shutdown", "reboot", "halt", "poweroff", "rm -rf /", "rm -rf /*",
    ":(){ :|:& };:", "mkfs", "dd if=", "chmod 777 /", "chown root",
    "sudo su", "sudo -i", "passwd ", "/etc/passwd", "/etc/shadow",
)


def validate_execution_type(execution_type: str) -> None:
    from app.schemas.execution import EXECUTION_TYPES
    if execution_type not in EXECUTION_TYPES:
        raise ExecutionInvalidTypeException(
            f"Unsupported execution type: {execution_type}")

def classify_command(command: str, arguments: list[str] | None) -> str:
    full = f"{command.strip()} {' '.join(arguments or [])}".strip()
    lowered = full.lower()
    for blocked in BLOCKED_SUBSTRINGS:
        if blocked in lowered:
            return "BLOCKED"
    if full in SAFE_COMMANDS:
        return "SAFE"
    for prefix in CONTROLLED_PREFIXES:
        if lowered == prefix or lowered.startswith(prefix + " "):
            return "CONTROLLED"
    return "BLOCKED"

def require_allowed_command(command: str, arguments: list[str] | None) -> str:
    classification = classify_command(command, arguments)
    if classification == "BLOCKED":
        raise ExecutionBlockedCommandException(
            "Command is blocked by the execution policy")
    return classification

def resolve_working_directory(project_id: str, working_directory: str) -> str:
    project_root = os.path.realpath(
        ProjectService.get_project_storage_path(project_id))
    candidate = (working_directory or "").strip()
    if not candidate or candidate == "/":
        return project_root
    normalized = ntpath.normpath(candidate)
    parts = normalized.split("/")
    if (ntpath.isabs(working_directory) or candidate.startswith("/")
            or (len(candidate) >= 2 and candidate[1] == ":")
            or candidate.startswith("\\") or ".." in parts):
        raise ExecutionInvalidWorkingDirectoryException(
            "Working directory must stay within the project workspace")
    target = os.path.realpath(os.path.join(project_root, normalized))
    if os.path.commonpath((project_root, target)) != project_root:
        raise ExecutionInvalidWorkingDirectoryException(
            "Working directory escapes the project workspace")
    return target

def redact_for_log(data: str) -> str:
    redacted = data
    for key in REDACTED_ENV_KEYS:
        if key in redacted:
            redacted = redacted.replace(key, "[REDACTED]")
    return redacted[:500]

def validate_workspace_identity(project_id: str, workspace_id: str) -> None:
    if not workspace_id or workspace_id.strip() != project_id:
        raise ExecutionInvalidWorkspaceException(
            "workspace_id must match the authorized project")

def _to_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _build_exec_args(command: str, arguments: list[str] | None) -> list[str]:
    """Build the OS-correct process argument list for a validated command.

    Shared by the blocking runner (Phase 2B) and the long-running preview
    dev-server runner (Phase 2D) so both use the exact same process-spawn
    path. The `command` field may carry the full command line when
    `arguments` is empty (e.g. "echo DEVOS_PHASE2_TEST"), so it is split to
    find the executable. Windows npm/npx shims are run through the shell
    wrapper with the resolved full path, identical to the quality runners.
    """
    cmd_str = (command or "").strip()
    cmd_parts = cmd_str.split()
    cmd_name = cmd_parts[0] if cmd_parts else cmd_str
    cmd_extra = cmd_parts[1:] if len(cmd_parts) > 1 else []
    all_args = cmd_extra + list(arguments or [])

    exec_args = [cmd_name] + all_args
    cmd_lower = cmd_name.lower()
    if os.name == "nt" and cmd_lower in {"echo", "dir"}:
        exec_args = [
            os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c",
            cmd_name,
        ] + all_args
    elif os.name == "nt" and cmd_lower in {"python", "python3"}:
        exec_args = [sys.executable] + all_args
    elif os.name == "nt" and cmd_lower in {"npm", "npx"}:
        resolved = shutil.which(cmd_name) or cmd_name
        exec_args = [
            os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c",
            resolved,
        ] + all_args
    return exec_args


def to_execution_response(execution: Execution) -> ExecutionResponse:
    return ExecutionResponse(
        execution_id=execution.execution_id, request_id=execution.request_id,
        parent_execution_id=execution.parent_execution_id,
        process_id=execution.process_id, user_id=execution.user_id,
        project_id=execution.project_id, workspace_id=execution.workspace_id,
        execution_type=execution.execution_type, command=execution.command,
        arguments=list(execution.arguments or []) or None,
        working_directory=execution.working_directory, status=execution.status,
        exit_code=execution.exit_code, failure_reason=execution.failure_reason,
        timed_out=bool(execution.timed_out), cancelled=bool(execution.cancelled),
        retry_count=int(execution.retry_count),
        stdout=execution.stdout, stderr=execution.stderr,
        preview_port=execution.preview_port,
        preview_url=execution.preview_url,
        created_at=_to_iso(execution.created_at),
        started_at=_to_iso(execution.started_at),
        completed_at=_to_iso(execution.completed_at))


class ExecutionService:
    """Phase 2A record service: validate -> persist QUEUED. Never executes."""

    @staticmethod
    async def create_execution(
        db: AsyncSession,
        user: User,
        project_id: str,
        payload: ExecutionCreateRequest,
    ) -> Execution:
        # 1. Ownership first.
        try:
            project = await ProjectService.get_for_user(db, project_id, user.id)
        except ProjectNotFoundException as exc:
            raise ExecutionInvalidProjectException(
                "Invalid project for execution"
            ) from exc
        except ProjectAccessDeniedException as exc:
            raise ExecutionForbiddenException(
                "Execution is forbidden for this project"
            ) from exc

        # 2. Workspace identity must equal the authorized project.
        validate_workspace_identity(project.id, payload.workspace_id)

        # 3. Execution type must be a defined Phase 2A type.
        validate_execution_type(payload.execution_type)

        # 4. Blocked commands persist a BLOCKED audit record.
        classification = classify_command(payload.command, payload.arguments)
        if classification == "BLOCKED":
            execution = Execution(
                execution_id=payload.execution_id or str(uuid.uuid4()),
                request_id=payload.request_id,
                parent_execution_id=payload.parent_execution_id,
                process_id=None,
                user_id=user.id,
                project_id=project.id,
                workspace_id=payload.workspace_id.strip(),
                execution_type=payload.execution_type,
                command=(payload.command or "").strip(),
                arguments=list(payload.arguments or []) or None,
                working_directory=payload.working_directory.strip(),
                status="BLOCKED",
                exit_code=None,
                failure_reason="Command is blocked by the execution policy",
                timed_out=False,
                cancelled=False,
                created_at=datetime.now(timezone.utc),
                started_at=None,
                completed_at=datetime.now(timezone.utc),
            )
            db.add(execution)
            await db.flush()
            await db.refresh(execution)
            raise ExecutionBlockedCommandException(
                "Command is blocked by the execution policy"
            )

        # 5. Working directory must resolve inside the project root.
        resolved_dir = resolve_working_directory(
            project.id, payload.working_directory
        )

        # 6. Persist the QUEUED record (idempotent identity when supplied).
        execution_id = payload.execution_id or str(uuid.uuid4())
        existing = await db.execute(
            select(Execution).where(Execution.execution_id == execution_id)
        )
        existing_record = existing.scalars().first()
        if existing_record is not None:
            # Idempotent create: a caller that supplies an execution_id gets
            # their own existing record back instead of a duplicate.
            if (
                existing_record.user_id == user.id
                and existing_record.project_id == project.id
            ):
                return existing_record
            raise ExecutionForbiddenException(
                "Execution identity already exists for another context"
            )
        execution = Execution(
            execution_id=execution_id,
            request_id=payload.request_id,
            parent_execution_id=payload.parent_execution_id,
            process_id=None,
            user_id=user.id,
            project_id=project.id,
            workspace_id=payload.workspace_id.strip(),
            execution_type=payload.execution_type,
            command=(payload.command or "").strip(),
            arguments=list(payload.arguments or []) or None,
            working_directory=resolved_dir,
            status="QUEUED",
            exit_code=None,
            failure_reason=None,
            timed_out=False,
            cancelled=False,
            created_at=datetime.now(timezone.utc),
            started_at=None,
            completed_at=None,
        )
        db.add(execution)
        await db.flush()
        await db.refresh(execution)
        await db.commit()
        logger.info(
            "execution queued execution_id=%s request_id=%s user_id=%s "
            "project_id=%s workspace_id=%s execution_type=%s status=%s",
            redact_for_log(execution.execution_id),
            redact_for_log(execution.request_id or "-"),
            redact_for_log(execution.user_id),
            redact_for_log(execution.project_id),
            redact_for_log(execution.workspace_id),
            execution.execution_type,
            execution.status,
        )
        return execution

    @staticmethod
    async def run_quality_operation(
        db: AsyncSession, user: User, project_id: str, operation: str,
    ) -> Execution:
        """Phase 2C: run a project quality operation through the Phase 2B
        engine. Detection -> policy/ownership/path validation (via
        create_execution) -> real process -> authoritative record."""
        from app.schemas.execution import QUALITY_OPERATIONS
        if operation not in QUALITY_OPERATIONS:
            raise ExecutionInvalidTypeException(
                f"Unsupported quality operation: {operation}")
        try:
            await ProjectService.get_for_user(db, project_id, user.id)
        except ProjectNotFoundException as exc:
            raise ExecutionInvalidProjectException(
                "Invalid project for execution") from exc
        except ProjectAccessDeniedException as exc:
            raise ExecutionForbiddenException(
                "Execution is forbidden for this project") from exc

        from app.services.quality_service import QualityService
        info = QualityService.detect_operation(project_id, operation)
        if not info.supported:
            raise QualityOperationNotSupportedException(
                info.reason or (
                    f"Quality operation {operation} is not supported by "
                    "this project"))
        if not info.available:
            raise QualityToolUnavailableException(
                info.reason or "Required tool is not installed on this server")

        payload = ExecutionCreateRequest(
            execution_type=operation,
            command=info.command or "",
            arguments=list(info.arguments or []),
            working_directory=".",
            workspace_id=project_id,
        )
        execution = await ExecutionService.create_execution(
            db, user, project_id, payload)
        return await ExecutionService.run_queued_execution(
            db, user, project_id, execution.execution_id)

    @staticmethod
    async def get_execution(
        db: AsyncSession, user: User, project_id: str, execution_id: str
    ) -> Execution:
        try:
            await ProjectService.get_for_user(db, project_id, user.id)
        except ProjectNotFoundException as exc:
            raise ExecutionInvalidProjectException(
                "Invalid project for execution"
            ) from exc
        except ProjectAccessDeniedException as exc:
            raise ExecutionForbiddenException(
                "Execution is forbidden for this project"
            ) from exc
        result = await db.execute(
            select(Execution).where(
                Execution.execution_id == execution_id,
                Execution.project_id == project_id,
                Execution.user_id == user.id,
            )
        )
        execution = result.scalars().first()
        if execution is None:
            raise ExecutionForbiddenException(
                "Execution not found for this context")
        return execution

    @staticmethod
    async def run_queued_execution(
        db: AsyncSession, user: User, project_id: str, execution_id: str,
    ) -> Execution:
        """Take a QUEUED execution record and run it as a real process."""
        # Verify ownership first.
        try:
            await ProjectService.get_for_user(db, project_id, user.id)
        except ProjectNotFoundException as exc:
            raise ExecutionInvalidProjectException(
                "Invalid project for execution") from exc
        except ProjectAccessDeniedException as exc:
            raise ExecutionForbiddenException(
                "Execution is forbidden for this project") from exc
        result = await db.execute(
            select(Execution).where(
                Execution.execution_id == execution_id,
                Execution.project_id == project_id,
                Execution.user_id == user.id,
            )
        )
        execution = result.scalars().first()
        if execution is None:
            raise ExecutionForbiddenException(
                "Execution not found for this context")
        if execution.status != "QUEUED":
            raise ExecutionInvalidRequestException(
                "Execution must be QUEUED to run (was %s)" % execution.status)

        now = datetime.now(timezone.utc)
        execution.status = "STARTING"
        execution.started_at = now
        await db.flush()

        # Build the process argument list through the shared builder (the
        # exact same path the Phase 2D preview runner uses).
        exec_args = _build_exec_args(execution.command, execution.arguments)

        proc = None
        stdout_chunks = []
        stderr_chunks = []
        max_out = settings.TERMINAL_MAX_OUTPUT_CHARS
        timeout = settings.TERMINAL_TIMEOUT_SECONDS

        try:
            proc = await asyncio.create_subprocess_exec(
                *exec_args,
                cwd=execution.working_directory,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            execution.process_id = str(proc.pid)
            execution.status = "RUNNING"
            _PROCESSES[execution.execution_id] = proc
            await db.flush()
            await db.commit()

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout)
            except asyncio.TimeoutError:
                try:
                    await db.refresh(execution)
                except Exception:
                    pass
                if (execution.execution_id in _CANCELLED_IDS
                        or execution.status == "CANCELLED"):
                    _CANCELLED_IDS.discard(execution.execution_id)
                    try:
                        await db.refresh(execution)
                    except Exception:
                        pass
                    return execution
                try:
                    proc.kill()
                except Exception:
                    pass
                await proc.wait()
                execution.status = "TIMED_OUT"
                execution.timed_out = True
                execution.failure_reason = (
                    "Execution timed out after %ds" % timeout)
                execution.completed_at = datetime.now(timezone.utc)
                execution.stdout = ""
                execution.stderr = ""
                execution.exit_code = -1
                await db.flush()
                await db.commit()
                return execution

            stdout_text = _bounded_decode(
                stdout_bytes, stdout_chunks, max_out)
            stderr_text = _bounded_decode(
                stderr_bytes, stderr_chunks, max_out)

            try:
                await db.refresh(execution)
            except Exception:
                pass
            if (execution.execution_id in _CANCELLED_IDS
                    or execution.status == "CANCELLED"):
                _CANCELLED_IDS.discard(execution.execution_id)
                try:
                    await db.refresh(execution)
                except Exception:
                    pass
                return execution
            execution.stdout = stdout_text
            execution.stderr = stderr_text
            execution.exit_code = (
                proc.returncode if proc.returncode is not None else -1)
            execution.completed_at = datetime.now(timezone.utc)
            if execution.exit_code == 0:
                execution.status = "COMPLETED"
            else:
                execution.status = "FAILED"
                execution.failure_reason = (
                    "Process exited with code %d" % execution.exit_code)
            await db.flush()
            await db.commit()

        except ExecutionInvalidRequestException:
            raise
        except Exception as exc:
            try:
                await db.refresh(execution)
            except Exception:
                pass
            if (execution.execution_id in _CANCELLED_IDS
                    or execution.status == "CANCELLED"):
                _CANCELLED_IDS.discard(execution.execution_id)
                try:
                    await db.refresh(execution)
                except Exception:
                    pass
                return execution
            execution.status = "FAILED"
            execution.failure_reason = "Failed to execute: %s" % str(exc)
            execution.exit_code = -1
            execution.completed_at = datetime.now(timezone.utc)
            await db.flush()
            await db.commit()
            raise
        finally:
            _PROCESSES.pop(execution.execution_id, None)
            if proc is not None and proc.returncode is None:
                try:
                    proc.kill()
                except Exception:
                    pass
                try:
                    await proc.wait()
                except Exception:
                    pass

        return execution

    @staticmethod
    async def start_dev_server(
        db: AsyncSession, user: User, project_id: str,
        public_base_url: str | None = None,
    ) -> Execution:
        """Phase 2D: start a project dev server as a long-lived process.

        Reuses the canonical engine: ownership (get_for_user), policy
        (create_execution -> BLOCKED/contained working directory), and the
        shared process-spawn builder. Unlike the blocking quality runner the
        process is NOT awaited to exit — it is registered in ``_PROCESSES``
        so stop/cancel/session-end can kill it, then polled with a real
        connection check until the port is reachable (READY).

        Lifecycle: QUEUED -> STARTING -> RUNNING -> READY (reachable),
        or FAILED / TIMED_OUT when the server exits early or never binds.
        """
        # 1. Cancel any existing preview execution for this project first so a
        #    project never owns two live server processes.
        existing = await ExecutionService.get_active_preview(db, user, project_id)
        if existing is not None and _PROCESSES.get(existing.execution_id) is not None:
            await ExecutionService.cancel_execution(
                db, user, project_id, existing.execution_id)

        from app.services.preview_service import PreviewService
        info = PreviewService.detect_start(project_id)
        if not info.supported:
            from app.core.errors import PreviewNotSupportedException
            raise PreviewNotSupportedException(info.reason)
        if not info.available:
            from app.core.errors import QualityToolUnavailableException
            raise QualityToolUnavailableException(
                info.reason or "Required tool is not installed on this server")

        payload = ExecutionCreateRequest(
            execution_type="DEV_SERVER",
            command=info.command or "",
            arguments=list(info.arguments or []),
            working_directory=".",
            workspace_id=project_id,
        )
        execution = await ExecutionService.create_execution(
            db, user, project_id, payload)
        if execution.status == "BLOCKED":
            return execution

        # 2. Resolve the real bound port: prefer the detected/configured
        #    port, otherwise allocate a free one from the preview range.
        expected_port = info.port
        if expected_port is None:
            expected_port = PreviewService.allocate_port()
        # Port injection is command-specific: npm scripts take the `--port`
        # flag; Python's http.server takes the port positionally. Passing
        # the wrong shape makes the dev server exit before it can bind.
        if info.command and info.command.strip().lower().startswith("npm"):
            execution.arguments = list(execution.arguments or []) + [
                "--port", str(expected_port),
            ]
        else:
            execution.arguments = list(execution.arguments or []) + [
                str(expected_port),
            ]

        from app.core.errors import PreviewLaunchFailedException
        proc = None
        stdout_chunks: list[bytes] = []
        stderr_chunks: list[bytes] = []
        max_out = settings.TERMINAL_MAX_OUTPUT_CHARS
        drain_tasks: list[asyncio.Task] = []

        async def _drain(stream) -> None:
            try:
                while True:
                    chunk = await stream.read(1024)
                    if not chunk:
                        break
                    stdout_chunks.append(chunk)
                    if len(stdout_chunks) > 1024:
                        stdout_chunks.pop(0)
            except Exception:
                pass

        try:
            execution.status = "STARTING"
            execution.started_at = datetime.now(timezone.utc)
            await db.flush()

            proc = await asyncio.create_subprocess_exec(
                *_build_exec_args(execution.command, execution.arguments),
                cwd=execution.working_directory,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            execution.process_id = str(proc.pid)
            execution.status = "RUNNING"
            _PROCESSES[execution.execution_id] = proc
            _PREVIEW_EXECUTIONS[project_id] = execution
            await db.flush()
            await db.commit()

            # Drain stdout/stderr continuously so the pipe never fills.
            drain_tasks = [
                asyncio.create_task(_drain(proc.stdout)),
                asyncio.create_task(_drain(proc.stderr)),
            ]
        except Exception as exc:
            execution.status = "FAILED"
            execution.failure_reason = "Failed to start dev server: %s" % str(exc)
            execution.exit_code = -1
            execution.completed_at = datetime.now(timezone.utc)
            await db.flush()
            await db.commit()
            raise PreviewLaunchFailedException(execution.failure_reason)

        # 3. Real reachability check: poll until the port accepts a TCP
        #    connection, the process exits, or the grace period elapses.
        deadline = time.monotonic() + settings.PREVIEW_READY_TIMEOUT_SECONDS
        last_error: str = ""
        while time.monotonic() < deadline:
            if proc.returncode is not None:
                await asyncio.gather(*drain_tasks)
                stdout_text = _bounded_decode(
                    b"".join(stdout_chunks), None, max_out)
                stderr_text = _bounded_decode(
                    b"".join(stderr_chunks), None, max_out)
                last_error = (
                    "dev server exited (code %s) before becoming reachable"
                    % proc.returncode)
                execution.status = "FAILED"
                execution.failure_reason = last_error
                execution.exit_code = proc.returncode
                execution.completed_at = datetime.now(timezone.utc)
                execution.stdout = stdout_text
                execution.stderr = stderr_text
                await db.flush()
                await db.commit()
                raise PreviewLaunchFailedException(
                    f"{last_error} | stdout={stdout_text!r} stderr={stderr_text!r}")
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection("127.0.0.1", expected_port),
                    timeout=2.0)
                writer.close()
                try:
                    await writer.wait_closed()
                except Exception:
                    pass
                # Small settle so the dev server's connection handler fully
                # resets after the probe's immediate close before we declare
                # READY (otherwise the very next request can be dropped).
                await asyncio.sleep(0.3)
                # Reachable: mark READY with the real bound port and the
                # backend proxy URL the browser iframe will load.
                execution.status = "READY"
                execution.preview_port = expected_port
                base = (public_base_url or settings.PUBLIC_BACKEND_URL).rstrip("/")
                execution.preview_url = (
                    f"{base}/api/v1/projects/{project_id}"
                    f"/executions/{execution.execution_id}/preview/")
                execution.stdout = _bounded_decode(
                    b"".join(stdout_chunks), None, max_out)
                execution.stderr = _bounded_decode(
                    b"".join(stderr_chunks), None, max_out)
                await db.flush()
                await db.commit()
                return execution
            except Exception as exc:
                last_error = str(exc)
            await asyncio.sleep(0.5)

        # 4. Never became reachable: kill, mark failed, no orphan.
        if proc is not None:
            try:
                proc.kill()
            except Exception:
                pass
            try:
                await proc.wait()
            except Exception:
                pass
        await asyncio.gather(*drain_tasks) if drain_tasks else None
        _PROCESSES.pop(execution.execution_id, None)
        _PREVIEW_EXECUTIONS.pop(project_id, None)
        execution.status = "FAILED"
        execution.failure_reason = (
            "Dev server did not become reachable on port %d within %ds (%s)"
            % (expected_port, settings.PREVIEW_READY_TIMEOUT_SECONDS, last_error))
        execution.exit_code = -1
        execution.completed_at = datetime.now(timezone.utc)
        execution.stdout = _bounded_decode(b"".join(stdout_chunks), None, max_out)
        execution.stderr = _bounded_decode(b"".join(stderr_chunks), None, max_out)
        await db.flush()
        await db.commit()
        raise PreviewLaunchFailedException(execution.failure_reason)

    @staticmethod
    async def get_active_preview(
        db: AsyncSession, user: User, project_id: str,
    ) -> Execution | None:
        """Return the most recent STARTING/RUNNING/READY DEV_SERVER execution
        for a project, or None. Ownership is enforced by the project lookup."""
        from app.core.errors import (
            ProjectAccessDeniedException,
            ProjectNotFoundException,
        )
        try:
            await ProjectService.get_for_user(db, project_id, user.id)
        except (ProjectNotFoundException, ProjectAccessDeniedException):
            return None
        result = await db.execute(
            select(Execution)
            .where(
                Execution.project_id == project_id,
                Execution.user_id == user.id,
                Execution.execution_type == "DEV_SERVER",
                Execution.status.in_(["STARTING", "RUNNING", "READY"]),
            )
            .order_by(Execution.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    @staticmethod
    async def retry_execution(
        db: AsyncSession, user: User, project_id: str, execution_id: str,
    ) -> Execution:
        """Retry a terminal execution (FAILED / CANCELLED / TIMED_OUT / COMPLETED).

        Creates a NEW execution row with:
        - parent_execution_id set to the original execution_id
        - retry_count starting at 1 for the first retry of this parent
        - a fresh process (new PID) via run_queued_execution
        - copied command/arguments/working_directory from the parent

        The original row is untouched; its retry_count = total retries it has
        spawned (for observability). Each retry child records its own attempt
        count via retry_count.

        Raises ExecutionRetryExhaustedException when the parent has already
        been retried MAX_RETRY_COUNT times.
        """
        try:
            await ProjectService.get_for_user(db, project_id, user.id)
        except (ProjectNotFoundException, ProjectAccessDeniedException):
            raise ExecutionForbiddenException(
                "Execution is forbidden for this project"
            )

        result = await db.execute(
            select(Execution).where(
                Execution.execution_id == execution_id,
                Execution.project_id == project_id,
                Execution.user_id == user.id,
            )
        )
        parent = result.scalars().first()
        if parent is None:
            raise ExecutionForbiddenException(
                "Execution not found for this context"
            )

        # Only terminal states may be retried.
        if parent.status not in (
            "FAILED", "CANCELLED", "TIMED_OUT", "COMPLETED",
        ):
            raise ExecutionInvalidRequestException(
                "Cannot retry execution in %s state" % parent.status
            )

        # Count existing retry children to enforce the cap.
        child_rows = await db.execute(
            select(Execution).where(
                Execution.parent_execution_id == execution_id,
            )
        )
        existing_children = child_rows.scalars().all()
        if len(existing_children) >= MAX_RETRY_COUNT:
            raise ExecutionRetryExhaustedException(
                "Retry limit exhausted (%d retries already performed)"
                % MAX_RETRY_COUNT
            )

        # Compute the new retry_count: 1..MAX_RETRY_COUNT.
        new_retry_count = len(existing_children) + 1

        # Build a new queued execution that mirrors the parent's command.
        retry_execution_id = str(uuid.uuid4())
        child = Execution(
            execution_id=retry_execution_id,
            request_id=parent.request_id,
            parent_execution_id=execution_id,
            retry_count=new_retry_count,
            user_id=user.id,
            project_id=project_id,
            workspace_id=parent.workspace_id,
            execution_type=parent.execution_type,
            command=parent.command,
            arguments=parent.arguments,
            working_directory=parent.working_directory,
            status="QUEUED",
            exit_code=None,
            failure_reason=None,
            timed_out=False,
            cancelled=False,
            stdout=None,
            stderr=None,
            preview_port=None,
            preview_url=None,
            created_at=datetime.now(timezone.utc),
        )
        db.add(child)
        await db.flush()
        await db.refresh(child)

        # Increment the parent's retry_count to reflect total retries spawned.
        parent.retry_count = len(existing_children) + 1
        await db.flush()

        # Now run the queued retry child via the canonical Phase 2B engine.
        # This spawns a fresh process (new PID) and updates the child to a
        # terminal state.
        try:
            return await ExecutionService.run_queued_execution(
                db=db,
                user=user,
                project_id=project_id,
                execution_id=retry_execution_id,
            )
        except Exception:
            # If the run itself fails for any reason, mark the child as FAILED
            # so we don't leave it stuck QUEUED.
            child.status = "FAILED"
            child.failure_reason = "Retry run failed: %s" % (
                child.failure_reason or "unknown"
            )
            child.completed_at = datetime.now(timezone.utc)
            await db.flush()
            await db.commit()
            await db.refresh(child)
            raise

    @staticmethod
    async def cleanup_active_previews() -> int:
        """Session-end safety net: kill every live preview process so no
        dev server survives the backend process (no orphans)."""
        killed = 0
        for _exec_id, proc in list(_PROCESSES.items()):
            if proc is None:
                continue
            try:
                if proc.returncode is None:
                    proc.kill()
                    killed += 1
                await asyncio.wait_for(proc.wait(), timeout=3.0)
            except Exception:
                pass
        _PROCESSES.clear()
        _PREVIEW_EXECUTIONS.clear()
        return killed

    @staticmethod
    async def cancel_execution(
        db: AsyncSession, user: User, project_id: str, execution_id: str,
    ) -> Execution:
        """Cancel a running or queued execution."""
        try:
            await ProjectService.get_for_user(db, project_id, user.id)
        except ProjectNotFoundException as exc:
            raise ExecutionInvalidProjectException(
                "Invalid project for execution") from exc
        except ProjectAccessDeniedException as exc:
            raise ExecutionForbiddenException(
                "Execution is forbidden for this project") from exc
        result = await db.execute(
            select(Execution).where(
                Execution.execution_id == execution_id,
                Execution.project_id == project_id,
                Execution.user_id == user.id,
            )
        )
        execution = result.scalars().first()
        if execution is None:
            raise ExecutionForbiddenException(
                "Execution not found for this context")
        if execution.status in ("COMPLETED", "FAILED", "BLOCKED",
                                "CANCELLED", "TIMED_OUT"):
            raise ExecutionInvalidRequestException(
                "Cannot cancel execution in %s state" % execution.status)

        proc = _PROCESSES.get(execution.execution_id)
        if proc is not None and proc.returncode is None:
            try:
                proc.kill()
            except Exception:
                pass
            try:
                await proc.wait()
            except Exception:
                pass
        _PROCESSES.pop(execution.execution_id, None)
        _PREVIEW_EXECUTIONS.pop(project_id, None)
        _CANCELLED_IDS.add(execution.execution_id)

        execution.status = "CANCELLED"
        execution.cancelled = True
        execution.completed_at = datetime.now(timezone.utc)
        await db.flush()
        await db.commit()
        await db.refresh(execution)
        return execution


def _bounded_decode(data, _chunks, max_out):
    """Decode process output to text, bounded to max_out characters."""
    text = data.decode("utf-8", errors="replace")
    if len(text) > max_out:
        return text[:max_out]
    return text
