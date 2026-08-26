from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.git import (
    GitStatusResponse,
    GitDiffResponse,
    GitCommitRequest,
    GitBranchListResponse,
    GitLogResponse,
    GitStageRequest,
    GitCheckoutRequest,
    GitOperationResponse,
)
from app.services.project_service import ProjectService
from app.services.git_service import GitService
from app.services.activity_service import ActivityService

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
    await ProjectService.get_for_user(db, project_id, current_user.id)
    await GitService.commit(project_id, data.message)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="git.commit",
        metadata={"message": data.message},
    )
    return ApiResponse(
        success=True,
        data={"message": "Committed successfully"},
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
    limit: int = 20,
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
    return ApiResponse(success=True, data=GitOperationResponse(message="Files unstaged"))


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
        db, user_id=current_user.id, project_id=project_id,
        activity_type="git.checkout", metadata={"branch": data.branch, "create": data.create},
    )
    return ApiResponse(success=True, data=GitOperationResponse(message=f"Checked out {data.branch}"))


@router.post("/pull", response_model=ApiResponse[GitOperationResponse])
async def pull(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    output = await GitService.pull(project_id)
    await ActivityService.record(
        db, user_id=current_user.id, project_id=project_id, activity_type="git.pull",
    )
    return ApiResponse(success=True, data=GitOperationResponse(message=output or "Pulled"))


@router.post("/push", response_model=ApiResponse[GitOperationResponse])
async def push(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    output = await GitService.push(project_id)
    await ActivityService.record(
        db, user_id=current_user.id, project_id=project_id, activity_type="git.push",
    )
    return ApiResponse(success=True, data=GitOperationResponse(message=output or "Pushed"))
