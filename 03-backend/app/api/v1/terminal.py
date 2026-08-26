from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.terminal import TerminalExecuteRequest, TerminalResultResponse
from app.services.project_service import ProjectService
from app.services.terminal_service import TerminalService
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/projects/{project_id}/terminal", tags=["terminal"])

@router.get("/history", response_model=ApiResponse[dict])
async def get_history(
    project_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    activities = await ActivityService.list_for_project(db, project_id, limit=limit)
    history = [
        {
            "command": (a.metadata_json or {}).get("command"),
            "exit_code": (a.metadata_json or {}).get("exit_code"),
            "executed_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in activities
        if a.activity_type == "terminal.executed"
    ]
    return ApiResponse(success=True, data={"history": history})


@router.post("/execute", response_model=ApiResponse[TerminalResultResponse])
async def execute_command(
    project_id: str,
    data: TerminalExecuteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    result = await TerminalService.execute(project_id, data.command, data.args)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="terminal.executed",
        metadata={"command": data.command, "exit_code": result.exit_code},
    )
    return ApiResponse(
        success=True,
        data=result,
    )
