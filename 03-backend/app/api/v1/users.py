from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_profile(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
    )
