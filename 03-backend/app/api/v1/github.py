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
    return ApiResponse(
        success=True,
        data={
            "connected": conn is not None,
            "username": conn.github_username if conn else None,
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
