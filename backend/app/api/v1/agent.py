"""Phase 9 agent API.

Thin HTTP surface over AgentService. The user controls the loop requires are
all here and all real: stop (cancel, read by the orchestrator), inspect (the
run row is the truth), approve/reject the commit batch (Phase 5 is only called
after approval), and retry (a fresh run, nothing rewritten).
"""

from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import AsyncSessionLocal, get_db
from app.models.agent_run import AgentRun
from app.models.user import User
from app.schemas.agent import AgentCommitApproval, AgentRunCreate
from app.schemas.common import ApiResponse, ErrorDetail
from app.services.agent_service import FORBIDDEN_AUTONOMOUS_ACTIONS, AgentService
from app.services.git_service import GitService
from app.services.project_service import ProjectService

# Run-scoped routes are addressable by run id alone, so this router uses a
# flat /agent prefix rather than the project-scoped prefix its sibling routers
# use; the run row already carries its project_id.
router = APIRouter(prefix="/agent", tags=["agent"])


def _to_dict(run: AgentRun) -> dict[str, Any]:
    """Serialise the run.

    Token figures are returned as an explicit bundle rather than a single
    number, because a single number cannot honestly distinguish "the provider
    told us" from "we guessed". ``usage_source`` is the discriminator and the
    UI must render it.
    """
    charged = AgentService.tokens_charged(run)
    return {
        "id": run.id,
        "project_id": run.project_id,
        "task": run.task,
        "state": run.state,
        "terminal_reason": run.terminal_reason,
        "iteration": run.iteration,
        "max_iterations": run.max_iterations,
        "repair_attempts": run.repair_attempts,
        "max_repair_attempts": run.max_repair_attempts,
        "ai_calls": run.ai_calls,
        "max_ai_calls": run.max_ai_calls,
        "repeated_failure_count": run.repeated_failure_count,
        "max_repeated_failures": run.max_repeated_failures,
        "tokens": {
            "charged": charged,
            "max": run.max_tokens,
            "usage_source": run.token_usage_source,
            "estimated": run.estimated_tokens,
            "provider_input": run.provider_input_tokens,
            "provider_output": run.provider_output_tokens,
            "provider_total": run.provider_total_tokens,
            "is_provider_reported": run.token_usage_source == "provider_reported",
        },
        "max_runtime_seconds": run.max_runtime_seconds,
        "cancel_requested": run.cancel_requested,
        "steps": run.steps or [],
        "plan": run.plan,
        "files_changed": run.files_changed or [],
        "diagnosis": run.diagnosis,
        "commit_proposals": run.commit_proposals or [],
        "approval_state": run.approval_state,
        "summary": run.summary,
        "created_at": run.created_at,
        "updated_at": run.updated_at,
        "never_automatic": sorted(FORBIDDEN_AUTONOMOUS_ACTIONS),
    }


async def _owned_run(db: AsyncSession, run_id: str, user: User) -> AgentRun:
    try:
        return await AgentService.get_owned_run(db, run_id, user)
    except ValueError as exc:
        raise KeyError(str(exc)) from exc


def _spawn(run_id: str) -> None:
    """Run the loop in the background on its own session."""

    async def _runner() -> None:
        async with AsyncSessionLocal() as session:
            try:
                await AgentService.execute(session, run_id)
            except Exception:  # noqa: BLE001 - execute() already records failures
                pass

    asyncio.create_task(_runner())


@router.post("/runs", response_model=ApiResponse[dict])
async def create_run(
    payload: AgentRunCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a bounded run over exactly one project (locked Decision 3 A)."""
    project_id = payload.project_id
    task = payload.task
    await ProjectService.get_for_user(db, project_id, current_user.id)
    if not task.strip():
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="EMPTY_TASK", message="task is required"),
        )
    run = AgentRun(
        project_id=project_id,
        user_id=current_user.id,
        task=task.strip(),
        state="PLANNING",
        max_iterations=payload.max_iterations,
        max_repair_attempts=payload.max_repair_attempts,
        max_runtime_seconds=payload.max_runtime_seconds,
        max_tokens=payload.max_tokens,
        max_ai_calls=payload.max_ai_calls,
        max_repeated_failures=payload.max_repeated_failures,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    AgentService._record(run, "PLANNING", "run created", {"limits": {
        "max_iterations": payload.max_iterations,
        "max_repair_attempts": payload.max_repair_attempts,
        "max_runtime_seconds": payload.max_runtime_seconds,
        "max_tokens": payload.max_tokens,
        "max_ai_calls": payload.max_ai_calls,
        "max_repeated_failures": payload.max_repeated_failures,
    }})
    await db.commit()
    if payload.start:
        _spawn(run.id)
    return ApiResponse(success=True, data=_to_dict(run))


@router.get("/runs", response_model=ApiResponse[list])
async def list_runs(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    runs = (
        await db.execute(
            select(AgentRun)
            .where(AgentRun.project_id == project_id, AgentRun.user_id == current_user.id)
            .order_by(AgentRun.created_at.desc())
        )
    ).scalars().all()
    return ApiResponse(success=True, data=[_to_dict(r) for r in runs])


@router.get("/runs/{run_id}", response_model=ApiResponse[dict])
async def inspect_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Inspect: the run row is the real state the orchestrator acted on."""
    try:
        run = await _owned_run(db, run_id, current_user)
    except KeyError:
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="AGENT_RUN_NOT_FOUND", message="run not found"),
        )
    return ApiResponse(success=True, data=_to_dict(run))


@router.post("/runs/{run_id}/cancel", response_model=ApiResponse[dict])
async def cancel_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stop. This sets a column the orchestrator reads at every step boundary,
    so it actually halts the loop rather than only changing what the UI shows."""
    try:
        run = await _owned_run(db, run_id, current_user)
    except KeyError:
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="AGENT_RUN_NOT_FOUND", message="run not found"),
        )
    run.cancel_requested = True
    await db.commit()
    return ApiResponse(success=True, data={"cancel_requested": True, "run": _to_dict(run)})


@router.post("/runs/{run_id}/commits/approve", response_model=ApiResponse[dict])
async def approve_commits(
    run_id: str,
    payload: AgentCommitApproval,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve the commit batch (locked Decision 4 B).

    Only here is Phase 5's commit called, only with a message the user
    supplied, and only for the exact paths the run proposed.
    """
    try:
        run = await _owned_run(db, run_id, current_user)
    except KeyError:
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="AGENT_RUN_NOT_FOUND", message="run not found"),
        )
    if run.state != "COMPLETED":
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(
                code="RUN_NOT_COMPLETED",
                message=f"only a COMPLETED run can be approved (state={run.state})",
            ),
        )
    if run.approval_state != "PENDING":
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="NOT_PENDING", message="no commit batch awaiting approval"),
        )
    message = payload.message
    if not message.strip():
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="EMPTY_MESSAGE", message="a commit message is required"),
        )
    paths = [p["path"] for p in (run.commit_proposals or []) if p.get("path")]
    try:
        sha = await GitService.commit(run.project_id, message.strip(), files=paths)
    except Exception as exc:  # noqa: BLE001
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="COMMIT_FAILED", message=str(exc)),
        )
    run.approval_state = "APPROVED"
    run.summary = (run.summary or "") + f" Committed as {sha} after approval."
    await db.commit()
    return ApiResponse(success=True, data={"commit_sha": sha, "paths": paths})


@router.post("/runs/{run_id}/commits/reject", response_model=ApiResponse[dict])
async def reject_commits(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        run = await _owned_run(db, run_id, current_user)
    except KeyError:
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="AGENT_RUN_NOT_FOUND", message="run not found"),
        )
    run.approval_state = "REJECTED"
    await db.commit()
    return ApiResponse(success=True, data={"approval_state": "REJECTED"})


@router.post("/runs/{run_id}/retry", response_model=ApiResponse[dict])
async def retry_run(
    run_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retry: a NEW run with the same task and limits. The old run is never
    rewritten."""
    try:
        previous = await _owned_run(db, run_id, current_user)
    except KeyError:
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="AGENT_RUN_NOT_FOUND", message="run not found"),
        )
    return await create_run(
        AgentRunCreate(
            project_id=previous.project_id,
            task=previous.task,
            max_iterations=previous.max_iterations,
            max_repair_attempts=previous.max_repair_attempts,
            max_runtime_seconds=previous.max_runtime_seconds,
            max_tokens=previous.max_tokens,
            max_ai_calls=previous.max_ai_calls,
            max_repeated_failures=previous.max_repeated_failures,
            start=True,
        ),
        current_user=current_user,
        db=db,
    )
