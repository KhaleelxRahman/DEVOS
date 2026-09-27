"""PHASE 4 — turn a Phase 3 diagnosis into a real, verified repair.

Phase 4 does not re-diagnose. It consumes a Phase 3 ``Diagnosis`` as-is
and turns its Suggested Fix into a concrete, minimal file edit, which is
then verified by re-running the ORIGINAL Phase 2 execution.

Truthfulness contract
---------------------
A repair is only reported as successful when a real rerun through the
Phase 2 engine shows the original failure is gone (real exit code, real
output). If the rerun does not resolve the failure, the applied diff is
reverted and the outcome is reported UNVERIFIED with the rerun evidence.

Scope: only diagnoses with a deterministic, mechanical repair are
plannable. Anything else is reported as UNSUPPORTED with a reason. No
speculative code generation, no guessed edits.
"""

from app.phase4_repair.planner import (
    PlannedChange,
    RepairPlanner,
    RepairProposal,
    RiskLevel,
    is_plannable,
)
from app.phase4_repair.service import (
    RepairApplyError,
    RepairService,
    VerificationResult,
)

__all__ = [
    "PlannedChange",
    "RepairApplyError",
    "RepairPlanner",
    "RepairProposal",
    "RepairService",
    "RiskLevel",
    "VerificationResult",
    "is_plannable",
]
