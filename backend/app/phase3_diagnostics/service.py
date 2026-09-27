"""Phase 3 service: read Phase 2 execution records and diagnose them.

This is the only integration point with Phase 2. It reuses
``ExecutionService.get_execution`` — the same ownership-enforcing read the
2E/2F endpoints use — so a diagnosis can never surface another user's
execution. No second failure-capture store is created.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.phase3_diagnostics.diagnosis import (
    DIAGNOSABLE_STATUSES,
    DiagnosisEngine,
)
from app.phase3_diagnostics.evidence import Diagnosis
from app.services.execution_service import ExecutionService


class DiagnosisNotDiagnosableError(Exception):
    """Raised when the execution is not in a failed state."""


class DiagnosisService:
    """Diagnoses real Phase 2 executions. Read-only over Phase 2 data."""

    @staticmethod
    async def diagnose_execution(
        db: AsyncSession,
        user: User,
        project_id: str,
        execution_id: str,
    ) -> Diagnosis:
        """Return a grounded diagnosis for one owned execution.

        Reuses the Phase 2 ownership-enforcing read, then reasons only over
        the fields the Phase 2 engine already captured.
        """
        execution = await ExecutionService.get_execution(
            db, user, project_id, execution_id
        )
        if execution.status not in DIAGNOSABLE_STATUSES:
            raise DiagnosisNotDiagnosableError(
                f"Execution is in state {execution.status}; only failed "
                "executions can be diagnosed."
            )
        return DiagnosisEngine().diagnose(execution)

    @staticmethod
    async def diagnose_latest_failure(
        db: AsyncSession,
        user: User,
        project_id: str,
    ) -> Diagnosis:
        """Diagnose the most recent diagnosable execution for a project.

        Reads the Phase 2 history list and picks the newest failed row, so
        no additional query surface or store is introduced.
        """
        executions = await ExecutionService.list_executions(
            db, user, project_id, limit=100
        )
        for execution in executions:  # already newest-first
            if execution.status in DIAGNOSABLE_STATUSES:
                return DiagnosisEngine().diagnose(execution)
        raise DiagnosisNotDiagnosableError(
            "No failed execution found in this project's history."
        )
