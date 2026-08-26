from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services.github_service import GitHubService

router = APIRouter(prefix="/github", tags=["github"])

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
            "username": conn.github_username if conn else ("server-token" if token else None),
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
