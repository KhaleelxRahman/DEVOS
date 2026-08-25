from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.activity import ActivityResponse, ActivityListResponse
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activity", tags=["activity"])

@router.get("", response_model=ApiResponse[ActivityListResponse])
async def list_user_activity(
    limit: int = 20,
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
