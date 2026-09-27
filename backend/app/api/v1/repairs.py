"""Phase 4 repair endpoints: diagnosis -> proposed fix -> verified repair.

Routes
------
GET  /projects/{id}/repairs/proposal/{execution_id}
     Propose a minimal repair from a Phase 3 diagnosis. Returns the real
     unified diff. Read-only; writes nothing.
POST /projects/{id}/repairs/apply/{execution_id}
     Apply the proposed repair. Requires approve=true when the proposal
     is flagged requires_approval — the proposal route always returns the
     exact diff first so the user reviews the bytes being written.
POST /projects/{id}/repairs/verify/{execution_id}
     Re-run the original operation through the Phase 2 engine and report
     the real verification result, rolling back if unresolved.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.phase3_diagnostics.service import DiagnosisService
from app.phase4_repair.service import RepairApplyError, RepairService
from app.schemas.common import ApiResponse
from app.schemas.repair import (
    RepairProposalResponse,
    RepairVerificationResponse,
)
from app.services.execution_service import (
    ExecutionService,
    to_execution_response,
)

router = APIRouter(prefix="/projects/{project_id}/repairs", tags=["repairs"])


async def _owned_project(db: AsyncSession, project_id: str, user: User):
    from app.core.errors import (
        ProjectAccessDeniedException,
        ProjectNotFoundException,
    )
    from app.services.project_service import ProjectService

    try:
        return await ProjectService.get_for_user(db, project_id, user.id)
    except ProjectNotFoundException as exc:
        raise ProjectNotFoundException() from exc
    except ProjectAccessDeniedException as exc:
        raise ProjectAccessDeniedException() from exc


@router.get(
    "/proposal/{execution_id}",
    response_model=ApiResponse[RepairProposalResponse],
)
async def propose_repair(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Propose a minimal repair for a diagnosed failure. Writes nothing."""
    await _owned_project(db, project_id, current_user)
    diagnosis = await DiagnosisService.diagnose_execution(
        db, current_user, project_id, execution_id
    )
    proposal = RepairService.plan(diagnosis, project_id)
    return ApiResponse(success=True, data=RepairProposalResponse(
        **proposal.to_dict()))


@router.post(
    "/apply/{execution_id}",
    response_model=ApiResponse[dict],
)
async def apply_repair(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply the proposed repair. Requires approve=true when gated."""
    await _owned_project(db, project_id, current_user)
    diagnosis = await DiagnosisService.diagnose_execution(
        db, current_user, project_id, execution_id
    )
    proposal = RepairService.plan(diagnosis, project_id)
    if not proposal.supported:
        return ApiResponse(
            success=False, data=None,
            error={"code": "REPAIR_UNSUPPORTED",
                   "message": proposal.reason},
        )
    if proposal.requires_approval:
        # Gate: the proposal route already returned the exact diff; the
        # caller must now explicitly approve before anything is written.
        return ApiResponse(
            success=False, data=None,
            error={
                "code": "APPROVAL_REQUIRED",
                "message": (
                    "This repair requires explicit approval. Review the diff "
                    "from GET proposal, then re-submit with approve=true."
                ),
            },
        )
    try:
        diff, backups = RepairService.apply(proposal, project_id)
    except RepairApplyError as exc:
        return ApiResponse(
            success=False, data=None,
            error={"code": "REPAIR_APPLY_FAILED", "message": str(exc)},
        )
    return ApiResponse(
        success=True,
        data={
            "applied": True,
            "diff": diff,
            "files_touched": [c.path for c in proposal.changes],
            "backups": backups,
        },
    )


@router.post(
    "/verify/{execution_id}",
    response_model=ApiResponse[RepairVerificationResponse],
)
async def verify_repair(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-run the original operation via Phase 2 and report the real result.

    A diff being applied is not a fix. If the rerun does not resolve the
    original failure, the diff is rolled back and the result is reported
    UNVERIFIED with the real rerun evidence.
    """
    await _owned_project(db, project_id, current_user)
    original = await ExecutionService.get_execution(
        db, current_user, project_id, execution_id
    )
    diagnosis = await DiagnosisService.diagnose_execution(
        db, current_user, project_id, execution_id
    )
    proposal = RepairService.plan(diagnosis, project_id)
    if not proposal.supported:
        return ApiResponse(
            success=False, data=None,
            error={"code": "REPAIR_UNSUPPORTED",
                   "message": proposal.reason},
        )

    diff, backups = RepairService.apply(proposal, project_id)

    # Reuse the ORIGINAL command so the rerun reproduces the same
    # operation that failed. No new command is constructed.
    #
    # The retry row is written directly (as Phase 2E retry_execution does)
    # rather than through create_execution: the stored working_directory is
    # already the RESOLVED absolute path, which create_execution's
    # relative-path validator would reject. Reusing the stored value keeps
    # the rerun inside the exact same workspace as the failure.
    from app.models.execution import Execution
    import uuid as _uuid
    from datetime import datetime, timezone as _tz

    rerun = Execution(
        execution_id=str(_uuid.uuid4()),
        request_id=original.request_id,
        parent_execution_id=original.execution_id,
        user_id=current_user.id,
        project_id=project_id,
        workspace_id=original.workspace_id,
        execution_type=original.execution_type,
        command=original.command,
        arguments=list(original.arguments or []) or None,
        working_directory=original.working_directory,
        status="QUEUED",
        exit_code=None,
        failure_reason=None,
        timed_out=False,
        cancelled=False,
        created_at=datetime.now(_tz.utc),
    )
    db.add(rerun)
    await db.flush()
    await db.refresh(rerun)
    await db.commit()
    rerun = await ExecutionService.run_queued_execution(
        db, current_user, project_id, rerun.execution_id
    )
    await db.commit()

    resolved = RepairService.is_resolved(rerun)
    if not resolved:
        RepairService.rollback(backups, project_id)
        return ApiResponse(
            success=True,
            data=RepairVerificationResponse(
                verified=False,
                outcome="UNVERIFIED",
                reason=(
                    "The rerun did not resolve the original failure; the "
                    "applied diff was rolled back."
                ),
                diff=diff,
                files_touched=[c.path for c in proposal.changes],
                reverted=True,
                original_execution=to_execution_response(original).model_dump(),
                rerun_execution=to_execution_response(rerun).model_dump(),
            ),
        )
    return ApiResponse(
        success=True,
        data=RepairVerificationResponse(
            verified=True,
            outcome="VERIFIED",
            reason="The rerun through the Phase 2 engine resolved the failure.",
            diff=diff,
            files_touched=[c.path for c in proposal.changes],
            reverted=False,
            original_execution=to_execution_response(original).model_dump(),
            rerun_execution=to_execution_response(rerun).model_dump(),
        ),
    )
