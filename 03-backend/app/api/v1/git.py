from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.git import GitStatusResponse, GitDiffResponse, GitCommitRequest
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
