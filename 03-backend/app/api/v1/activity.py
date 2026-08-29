from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.activity import ActivityListResponse, ActivityResponse
from app.schemas.common import ApiResponse
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activity", tags=["activity"])

@router.get("", response_model=ApiResponse[ActivityListResponse])
async def list_user_activity(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    activities = await ActivityService.list_for_user(db, current_user.id, limit=limit)
    return ApiResponse(
        success=True,
        data=ActivityListResponse(
            activities=[ActivityResponse.model_validate(a) for a in activities]
        ),
    )

