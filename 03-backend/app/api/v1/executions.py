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
from app.schemas.execution import (
    ExecutionCreateRequest,
    ExecutionResponse,
    QualityOperationsResponse,
)
from app.services.activity_service import ActivityService
from app.services.execution_service import (
    ExecutionService,
    to_execution_response,
)
from app.services.quality_service import QualityService

router = APIRouter(prefix="/projects/{project_id}/executions", tags=["executions"])


@router.get(
    "/quality/operations",
    response_model=ApiResponse[QualityOperationsResponse],
)
async def list_quality_operations(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Phase 2C: detect BUILD/TEST/LINT/TYPECHECK from the project's real
    configuration. Reports supported/command/availability per operation."""
    project = await _owned_project(db, project_id, current_user)
    operations = QualityService.detect(project.id)
    return ApiResponse(
        success=True,
        data=QualityOperationsResponse(
            project_id=project.id, operations=operations),
    )


@router.post(
    "/quality/{operation}",
    response_model=ApiResponse[ExecutionResponse],
    dependencies=[Depends(rate_limit(30, 60, "executions_quality"))],
)
async def run_quality_operation(
    project_id: str,
    operation: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Phase 2C: detect the operation's real command, validate it through
    the Phase 2A policy, and run it as a real Phase 2B process. The returned
    execution record IS the quality result (stdout/stderr/exit code)."""
    execution = await ExecutionService.run_quality_operation(
        db, current_user, project_id, operation.upper())
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=execution.project_id,
        activity_type="quality.executed",
        metadata={
            "operation": execution.execution_type,
            "status": execution.status,
            "exit_code": execution.exit_code,
            "execution_id": execution.execution_id,
        },
    )
    return ApiResponse(success=True, data=to_execution_response(execution))


async def _owned_project(db: AsyncSession, project_id: str, user: User):
    from app.core.errors import (
        ExecutionForbiddenException,
        ExecutionInvalidProjectException,
        ProjectAccessDeniedException,
        ProjectNotFoundException,
    )
    from app.services.project_service import ProjectService
    try:
        return await ProjectService.get_for_user(db, project_id, user.id)
    except ProjectNotFoundException as exc:
        raise ExecutionInvalidProjectException(
            "Invalid project for execution") from exc
    except ProjectAccessDeniedException as exc:
        raise ExecutionForbiddenException(
            "Execution is forbidden for this project") from exc


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
