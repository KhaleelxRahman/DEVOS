from fastapi import APIRouter, Depends, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.auth import UserRegister, UserLogin, UserResponse, AuthResponseData
from app.services.auth_service import AuthService
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=ApiResponse[AuthResponseData], dependencies=[Depends(rate_limit(5, 60, "register"))])
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user, token = await AuthService.register(db, data)
    await ActivityService.record(db, user_id=user.id, activity_type="user.registered")
    return ApiResponse(
        success=True,
        data=AuthResponseData(
            user=UserResponse.model_validate(user),
            token=token,
        ),
    )

@router.post("/login", response_model=ApiResponse[AuthResponseData], dependencies=[Depends(rate_limit(10, 60, "login"))])
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user, token = await AuthService.login(db, data)
    await ActivityService.record(db, user_id=user.id, activity_type="user.logged_in")
    return ApiResponse(
        success=True,
        data=AuthResponseData(
            user=UserResponse.model_validate(user),
            token=token,
        ),
    )

@router.post("/logout", response_model=ApiResponse[dict])
async def logout(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data={"message": "Logged out successfully"},
    )

@router.get("/me", response_model=ApiResponse[dict])
async def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data={"user": UserResponse.model_validate(current_user)},
    )
