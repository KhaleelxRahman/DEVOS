"""Phase 5 schemas: provenance-carrying commits and merge requests."""

from pydantic import BaseModel, Field


class ProvenanceCommitRequest(BaseModel):
    """Commit a Phase 4-verified change, with real provenance.

    The caller supplies the Phase 4 verification result verbatim. Nothing
    is re-derived by diffing the working tree, and a result that is not
    VERIFIED is refused.
    """

    phase4_outcome: str = Field(
        description="Phase 4 outcome, e.g. VERIFIED or UNVERIFIED",
    )
    phase4_reverted: bool = False
    files_touched: list[str] = Field(
        default_factory=list,
        description="Exactly the files Phase 4 reports it touched",
    )
    diagnosis_category: str = ""
    diagnosis_signature: str = ""
    phase4_rerun_exit_code: int | None = None
    phase4_execution_id: str | None = None
    message: str = Field(
        default="",
        description="Optional extra subject; provenance is always appended",
    )
    approved: bool = Field(
        default=False,
        description=(
            "Carries forward the Phase 4 approval gate. Required when the "
            "underlying change was flagged requires_approval."
        ),
    )


class CommitProvenanceResponse(BaseModel):
    """The real result of a provenance commit."""

    committed: bool
    commit_sha: str = ""
    branch: str = ""
    files_committed: list[str] = []
    message: str = ""
    provenance: dict = Field(default_factory=dict)
    push: dict | None = None


class MergeRequest(BaseModel):
    source: str
    target: str | None = None


class PushRequest(BaseModel):
    branch: str | None = None
    set_upstream: bool = True
    confirm_protected: bool = False
