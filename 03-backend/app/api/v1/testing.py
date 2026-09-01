from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services.activity_service import ActivityService
from app.services.project_service import ProjectService
from app.services.testing_service import TestingService

router = APIRouter(prefix="/projects/{project_id}/testing", tags=["testing"])


@router.get("/jobs", response_model=ApiResponse[dict])
async def list_jobs(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    return ApiResponse(success=True, data={"jobs": TestingService.list_jobs()})


@router.post("/run/{job_id}", response_model=ApiResponse[dict])
async def run_job(
    project_id: str,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    result = await TestingService.run_job(project_id, job_id)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="tests.executed",
        metadata={
            "job": job_id,
            "status": result["status"],
            "duration_ms": result["duration_ms"],
        },
    )
    return ApiResponse(success=True, data=result)
