"""Phase 2A execution policy + record service (contract only, no execution)."""
from __future__ import annotations

import ntpath
import os
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
    ProjectAccessDeniedException,
    ProjectNotFoundException,
)
from app.models.execution import Execution
from app.models.user import User
from app.schemas.execution import (
    ExecutionCreateRequest,
    ExecutionResponse,
)
from app.services.project_service import ProjectService

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
        if existing.scalars().first() is not None:
            raise ExecutionInvalidRequestException(
                "An execution with this execution_id already exists"
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
            )
        )
        execution = result.scalars().first()
        if execution is None or execution.user_id != user.id:
            raise ExecutionForbiddenException(
                "Execution is forbidden for this context"
            )
        return execution

