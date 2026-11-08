from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.rate_limit import rate_limit, rate_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister, UserResponse
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=ApiResponse[dict],
    dependencies=[Depends(rate_limit(15, 60, "register"))],
)
async def register(
    request: Request,
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check(f"register:{client_ip}:{data.email.strip().lower()}", 5, 60)
    user, token = await AuthService.register(db, data)
    await db.commit()
    return ApiResponse(
        success=True,
        data={"user": UserResponse.model_validate(user), "token": token},
    )


@router.post(
    "/login",
    response_model=ApiResponse[dict],
    dependencies=[Depends(rate_limit(60, 60, "login_ip"))],
)
async def login(
    request: Request,
    data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check(f"login:{client_ip}:{data.email.strip().lower()}", 10, 60)
    user, token = await AuthService.login(db, data)
    return ApiResponse(
        success=True,
        data={"user": UserResponse.model_validate(user), "token": token},
    )


@router.post("/logout", response_model=ApiResponse[dict])
async def logout(current_user: User = Depends(get_current_user)):
    # JWTs are stateless: the client simply discards the token.
    return ApiResponse(success=True, data={"message": "Logged out successfully"})


@router.get("/me", response_model=ApiResponse[dict])
async def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data={"user": UserResponse.model_validate(current_user)},
    )
