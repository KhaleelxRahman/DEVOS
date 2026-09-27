"""Phase 4 repair request/response schemas."""

from pydantic import BaseModel, Field


class RepairChangeResponse(BaseModel):
    path: str
    diff: str
    lines_changed: int
    before: str
    after: str


class RepairProposalResponse(BaseModel):
    """A proposed repair, including the real diff the user approves."""

    supported: bool
    execution_id: str
    signature: str
    reason: str
    risk: str = "low"
    requires_approval: bool = False
    auto_appliable: bool = False
    files_touched: list[str] = []
    changes: list[RepairChangeResponse] = []


class RepairApplyRequest(BaseModel):
    """Apply a proposed repair.

    ``approve`` is the explicit user consent gate. A proposal marked
    requires_approval cannot be applied without approve=true, and the
    caller must supply the exact new content it reviewed.
    """

    project_id: str
    execution_id: str
    approve: bool = Field(
        default=False,
        description="Must be true to apply a proposal that requires approval.",
    )


class RepairVerifyRequest(BaseModel):
    """Re-run the original operation and verify the repair."""

    project_id: str
    execution_id: str
    approve: bool = False


class RepairVerificationResponse(BaseModel):
    """Real rerun outcome. 'fixed' is only ever true on real evidence."""

    verified: bool
    outcome: str
    reason: str
    diff: str = ""
    files_touched: list[str] = []
    reverted: bool = False
    original_execution: dict | None = None
    rerun_execution: dict | None = None
