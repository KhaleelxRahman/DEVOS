from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.core.config import settings
from app.core.errors import AuthRequiredException
from app.services.github_service import GitHubService

router = APIRouter(prefix="/github", tags=["github"])


@router.post("/connect", response_model=ApiResponse[dict])
async def connect(current_user: User = Depends(get_current_user)):
    state = jwt.encode(
        {
            "sub": current_user.id,
            "purpose": "github_oauth",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
        },
        settings.AUTH_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    return ApiResponse(
        success=True, data={"authorization_url": GitHubService.authorization_url(state)}
    )


@router.get("/callback")
async def callback(
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(
            state, settings.AUTH_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("purpose") != "github_oauth" or not payload.get("sub"):
            raise ValueError("invalid OAuth state")
    except Exception as exc:
        raise AuthRequiredException("Invalid or expired GitHub OAuth state") from exc
    token_payload = await GitHubService.exchange_code(code)
    github_user = await GitHubService.get_github_user(token_payload["access_token"])
    await GitHubService.save_connection(
        db, payload["sub"], github_user, token_payload["access_token"]
    )
    return RedirectResponse(
        url=f"{settings.FRONTEND_APP_URL.rstrip('/')}/app/settings", status_code=303
    )


@router.get("/connection", response_model=ApiResponse[dict])
async def get_connection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conn = await GitHubService.get_connection(db, current_user.id)
    token = GitHubService.resolve_token(conn)
    return ApiResponse(
        success=True,
        data={
            "connected": token is not None,
            "username": (
                conn.github_username if conn else ("server-token" if token else None)
            ),
        },
    )


@router.delete("/connection", response_model=ApiResponse[dict])
async def disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    disconnected = await GitHubService.disconnect(db, current_user.id)
    return ApiResponse(
        success=True,
        data={"disconnected": disconnected},
    )


@router.get("/repos", response_model=ApiResponse[dict])
@router.get("/repositories", response_model=ApiResponse[dict])
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conn = await GitHubService.get_connection(db, current_user.id)
    token = GitHubService.resolve_token(conn)
    if not token:
        return ApiResponse(success=True, data={"connected": False, "repositories": []})
    repos = await GitHubService.list_repositories(token)
    return ApiResponse(success=True, data={"connected": True, "repositories": repos})
