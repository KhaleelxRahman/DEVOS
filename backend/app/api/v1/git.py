from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, ErrorDetail
from app.schemas.git import (
    GitBranchListResponse,
    GitCheckoutRequest,
    GitCommitRequest,
    GitDiffResponse,
    GitLogResponse,
    GitOperationResponse,
    GitStageRequest,
    GitStatusResponse,
)
from app.schemas.git_workflow import (
    CommitProvenanceResponse,
    MergeRequest,
    ProvenanceCommitRequest,
    PushRequest,
)
from app.phase5_git.commit_provenance import (
    NotCommittableError,
    build_commit_message,
    build_provenance,
)
from app.services.activity_service import ActivityService
from app.services.git_service import GitService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/git", tags=["git"])


@router.get("/status", response_model=ApiResponse[GitStatusResponse])
async def get_git_status(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    status = await GitService.get_status(project_id)
    return ApiResponse(
        success=True,
        data=status,
    )


@router.get("/diff", response_model=ApiResponse[GitDiffResponse])
async def get_git_diff(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    diff = await GitService.get_diff(project_id)
    return ApiResponse(
        success=True,
        data=diff,
    )


@router.post("/commit", response_model=ApiResponse[dict])
async def commit_changes(
    project_id: str,
    data: GitCommitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Commit the already-staged set (or an explicit file allow-list).

    Never ``git add .``. Returns the real commit SHA.
    """
    await ProjectService.get_for_user(db, project_id, current_user.id)
    sha = await GitService.commit(
        project_id, data.message,
        files=data.files or None, commit_all=data.commit_all,
    )
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="git.commit",
        metadata={"message": data.message, "commit_sha": sha},
    )
    return ApiResponse(
        success=True,
        data={"commit_sha": sha, "message": "Committed successfully"},
    )


@router.get("/branches", response_model=ApiResponse[GitBranchListResponse])
async def get_branches(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    return ApiResponse(success=True, data=await GitService.get_branches(project_id))


@router.get("/log", response_model=ApiResponse[GitLogResponse])
async def get_log(
    project_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    return ApiResponse(success=True, data=await GitService.get_log(project_id, limit))


@router.post("/stage", response_model=ApiResponse[GitOperationResponse])
async def stage_files(
    project_id: str,
    data: GitStageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    await GitService.stage(project_id, data.files)
    return ApiResponse(success=True, data=GitOperationResponse(message="Files staged"))


@router.post("/unstage", response_model=ApiResponse[GitOperationResponse])
async def unstage_files(
    project_id: str,
    data: GitStageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    await GitService.unstage(project_id, data.files)
    return ApiResponse(
        success=True, data=GitOperationResponse(message="Files unstaged")
    )


@router.post("/checkout", response_model=ApiResponse[GitOperationResponse])
async def checkout_branch(
    project_id: str,
    data: GitCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    await GitService.checkout(project_id, data.branch, create=data.create)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="git.checkout",
        metadata={"branch": data.branch, "create": data.create},
    )
    return ApiResponse(
        success=True, data=GitOperationResponse(message=f"Checked out {data.branch}")
    )


@router.post("/merge", response_model=ApiResponse[dict])
async def merge_branch(
    project_id: str,
    data: MergeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fast-forward-only merge. Refuses to merge into main."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    output = await GitService.merge(project_id, data.source, data.target)
    await ActivityService.record(
        db, user_id=current_user.id, project_id=project_id,
        activity_type="git.merge",
        metadata={"source": data.source, "target": data.target},
    )
    return ApiResponse(
        success=True, data={"merged": True, "output": output}
    )


@router.post("/push", response_model=ApiResponse[dict])
async def push(
    project_id: str,
    data: PushRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Push, refusing protected branches. Returns confirmed remote SHA."""
    await ProjectService.get_for_user(db, project_id, current_user.id)
    payload = data or PushRequest()
    result = await GitService.push(
        project_id,
        branch=payload.branch,
        set_upstream=payload.set_upstream,
        confirm_protected=payload.confirm_protected,
    )
    await ActivityService.record(
        db, user_id=current_user.id, project_id=project_id,
        activity_type="git.push",
        metadata={"branch": result["branch"],
                  "remote_confirmed": result["remote_confirmed"]},
    )
    return ApiResponse(success=True, data=result)


@router.post(
    "/commit-verified",
    response_model=ApiResponse[CommitProvenanceResponse],
)
async def commit_verified_change(
    project_id: str,
    data: ProvenanceCommitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Commit a Phase 4-VERIFIED change, citing its real provenance.

    Only the files Phase 4 reported in files_touched are staged — this
    layer never runs ``git add .``. An UNVERIFIED or reverted result is
    refused outright.
    """
    await ProjectService.get_for_user(db, project_id, current_user.id)
    try:
        provenance = build_provenance(
            outcome=data.phase4_outcome,
            reverted=data.phase4_reverted,
            files_touched=data.files_touched,
            diagnosis_category=data.diagnosis_category,
            diagnosis_signature=data.diagnosis_signature,
            rerun_exit_code=data.phase4_rerun_exit_code,
            execution_id=data.phase4_execution_id,
        )
    except NotCommittableError as exc:
        return ApiResponse(
            success=False, data=None,
            error=ErrorDetail(code="NOT_COMMITTABLE", message=str(exc)),
        )
    message = build_commit_message(provenance, data.message)
    branch = await GitService.current_branch(project_id)
    sha = await GitService.commit(
        project_id, message, files=provenance.files_touched
    )
    await ActivityService.record(
        db, user_id=current_user.id, project_id=project_id,
        activity_type="git.commit_verified",
        metadata=provenance.to_dict(),
    )
    return ApiResponse(
        success=True,
        data=CommitProvenanceResponse(
            committed=True,
            commit_sha=sha,
            branch=branch,
            files_committed=provenance.files_touched,
            message=message,
            provenance=provenance.to_dict(),
        ),
    )


@router.post("/pull", response_model=ApiResponse[GitOperationResponse])
async def pull(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    output = await GitService.pull(project_id)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="git.pull",
    )
    return ApiResponse(
        success=True, data=GitOperationResponse(message=output or "Pulled")
    )

