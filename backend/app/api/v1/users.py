from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.errors import ValidationException
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai import AIProviderStatusResponse
from app.schemas.auth import UserResponse, UserUpdateRequest
from app.schemas.common import ApiResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_profile(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
    )


@router.patch("/me", response_model=ApiResponse[UserResponse])
async def update_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cleaned_name = payload.name.strip()
    if not cleaned_name:
        raise ValidationException("Name must not be empty")
    current_user.name = cleaned_name
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return ApiResponse(
        success=True,
        data=UserResponse.model_validate(current_user),
    )


@router.get("/ai-provider", response_model=ApiResponse[AIProviderStatusResponse])
async def get_ai_provider_status(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data=AIProviderStatusResponse.model_validate(
            AIService.from_settings().status()
        ),
    )
