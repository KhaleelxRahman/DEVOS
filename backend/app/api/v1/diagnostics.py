"""Phase 3 diagnosis endpoints.

These routes only READ Phase 2 execution records. They never run a
command, never spawn a process, and never write an execution row.
Ownership is inherited from ExecutionService.get_execution, the same
enforcement the 2E/2F endpoints rely on.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.phase3_diagnostics.reporter import render_diagnosis, render_summary
from app.phase3_diagnostics.service import (
    DiagnosisNotDiagnosableError,
    DiagnosisService,
)
from app.schemas.common import ApiResponse, ErrorDetail
from app.schemas.diagnosis import DiagnosisResponse

router = APIRouter(prefix="/projects/{project_id}/diagnostics", tags=["diagnostics"])


def _to_response(diagnosis, summary: bool = False) -> DiagnosisResponse:
    payload = diagnosis.to_dict()
    report = render_summary(diagnosis) if summary else render_diagnosis(diagnosis)
    return DiagnosisResponse(
        diagnosable=True,
        execution_id=diagnosis.execution_id,
        problem=payload["problem"],
        category=payload["category"],
        evidence=payload["evidence"],
        likely_cause=payload["likely_cause"],
        affected_files=payload["affected_files"],
        affected_lines=payload["affected_lines"],
        suggested_fix=payload["suggested_fix"],
        confidence=payload["confidence"],
        confidence_basis=payload["confidence_basis"],
        report=report,
    )


@router.get(
    "/executions/{execution_id}",
    response_model=ApiResponse[DiagnosisResponse],
)
async def diagnose_execution(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Diagnose one real failed execution.

    Reads the Phase 2 record (exit code, stdout, stderr, failure reason,
    status) and returns a grounded diagnosis. Every statement is tagged
    OBSERVED / INFERRED / UNKNOWN and names its source.
    """
    try:
        diagnosis = await DiagnosisService.diagnose_execution(
            db, current_user, project_id, execution_id
        )
    except DiagnosisNotDiagnosableError as exc:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_DIAGNOSABLE", message=str(exc)),
        )
    return ApiResponse(success=True, data=_to_response(diagnosis))


@router.get(
    "/latest",
    response_model=ApiResponse[DiagnosisResponse],
)
async def diagnose_latest_failure(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Diagnose the most recent failed execution in the project history."""
    try:
        diagnosis = await DiagnosisService.diagnose_latest_failure(
            db, current_user, project_id
        )
    except DiagnosisNotDiagnosableError as exc:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_DIAGNOSABLE", message=str(exc)),
        )
    return ApiResponse(success=True, data=_to_response(diagnosis))
