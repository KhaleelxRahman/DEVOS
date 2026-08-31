from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.activity import ActivityListResponse, ActivityResponse
from app.schemas.common import ApiResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.services.activity_service import ActivityService
from app.services.context_service import ContextService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=ApiResponse[ProjectResponse])
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await ProjectService.create(db, current_user.id, data)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project.id,
        activity_type="project.created",
        metadata={"name": project.name},
    )
    return ApiResponse(
        success=True,
        data=ProjectResponse.model_validate(project),
    )

@router.get("", response_model=ApiResponse[ProjectListResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    projects = await ProjectService.list_for_user(db, current_user.id)
    return ApiResponse(
        success=True,
        data=ProjectListResponse(
            projects=[ProjectResponse.model_validate(p) for p in projects]
        ),
    )

@router.get("/{project_id}", response_model=ApiResponse[ProjectResponse])
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await ProjectService.get_for_user(db, project_id, current_user.id)
    return ApiResponse(
        success=True,
        data=ProjectResponse.model_validate(project),
    )

@router.patch("/{project_id}", response_model=ApiResponse[ProjectResponse])
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await ProjectService.update(db, project_id, current_user.id, data)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project.id,
        activity_type="project.updated",
        metadata={"name": project.name},
    )
    return ApiResponse(
        success=True,
        data=ProjectResponse.model_validate(project),
    )

@router.delete("/{project_id}", response_model=ApiResponse[dict])
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.delete(db, project_id, current_user.id)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        activity_type="project.deleted",
        metadata={"project_id": project_id},
    )
    return ApiResponse(
        success=True,
        data={"message": "Project deleted successfully"},
    )

@router.get("/{project_id}/context", response_model=ApiResponse[dict])
async def get_project_context(
    project_id: str,
    current_file: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await ContextService.build_project_context(
        db, project_id, current_user.id, current_file=current_file
    )
    return ApiResponse(
        success=True,
        data=context,
    )

@router.get("/{project_id}/activity", response_model=ApiResponse[ActivityListResponse])
async def get_project_activity(
    project_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    activities = await ActivityService.list_for_project(db, project_id, limit=limit)
    return ApiResponse(
        success=True,
        data=ActivityListResponse(
            activities=[ActivityResponse.model_validate(a) for a in activities]
        ),
    )

