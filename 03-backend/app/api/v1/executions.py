"""Phase 2A/2B execution endpoints.

POST /projects/{project_id}/executions — validate + persist a QUEUED record.
POST /projects/{project_id}/executions/{execution_id}/run — run a QUEUED record.
POST /projects/{project_id}/executions/{execution_id}/cancel — cancel an execution.
GET  /projects/{project_id}/executions/{execution_id} — read an owned record.
GET  /projects/{project_id}/executions/{execution_id}/result — fetch final result.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.execution import ExecutionCreateRequest, ExecutionResponse
from app.services.execution_service import (
    ExecutionService,
    to_execution_response,
)

router = APIRouter(prefix="/projects/{project_id}/executions", tags=["executions"])


@router.post(
    "",
    response_model=ApiResponse[ExecutionResponse],
    dependencies=[Depends(rate_limit(30, 60, "executions"))],
)
async def create_execution(
    project_id: str,
    payload: ExecutionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    execution = await ExecutionService.create_execution(
        db, current_user, project_id, payload
    )
    return ApiResponse(success=True, data=to_execution_response(execution))


@router.post(
    "/{execution_id}/run",
    response_model=ApiResponse[ExecutionResponse],
    dependencies=[Depends(rate_limit(30, 60, "executions_run"))],
)
async def run_execution(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run a QUEUED execution as a real process. Updates the record with
    authoritative state (STARTING -> RUNNING -> COMPLETED/FAILED/TIMED_OUT)
    and captures stdout/stderr."""
    execution = await ExecutionService.run_queued_execution(
        db, current_user, project_id, execution_id)
    return ApiResponse(success=True, data=to_execution_response(execution))


@router.post(
    "/{execution_id}/cancel",
    response_model=ApiResponse[ExecutionResponse],
)
async def cancel_execution(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    execution = await ExecutionService.cancel_execution(
        db, current_user, project_id, execution_id)
    return ApiResponse(success=True, data=to_execution_response(execution))


@router.get(
    "/{execution_id}",
    response_model=ApiResponse[ExecutionResponse],
)
async def get_execution(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    execution = await ExecutionService.get_execution(
        db, current_user, project_id, execution_id
    )
    return ApiResponse(success=True, data=to_execution_response(execution))
