"""Build a commit that traces back to a REAL Phase 4 result.

Two rules this module exists to enforce:

1. A Phase 4 result that is UNVERIFIED (or was reverted) is NOT committable.
   There is nothing to commit — the change was rolled back.
2. The commit message must attribute claims honestly. Phase 5 performs no
   rerun of its own, so it must never write "fixes the bug" as if it had
   verified that. It records what Phase 4 verified, and says so.
"""

from dataclasses import dataclass, field

# The only outcome that may be committed. Anything else means the change
# was reverted or never confirmed, so there is nothing real to record.
COMMITTABLE_OUTCOME = "VERIFIED"


class NotCommittableError(Exception):
    """Raised when a Phase 4 result must not be committed."""


@dataclass(frozen=True)
class CommitProvenance:
    """Structured record of where a commit came from."""

    phase4_outcome: str
    phase4_reverted: bool
    phase4_rerun_exit_code: int | None
    phase4_execution_id: str | None
    diagnosis_category: str
    diagnosis_signature: str
    files_touched: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "phase4_outcome": self.phase4_outcome,
            "phase4_reverted": self.phase4_reverted,
            "phase4_rerun_exit_code": self.phase4_rerun_exit_code,
            "phase4_execution_id": self.phase4_execution_id,
            "diagnosis_category": self.diagnosis_category,
            "diagnosis_signature": self.diagnosis_signature,
            "files_touched": list(self.files_touched),
        }


def build_provenance(
    outcome: str,
    reverted: bool,
    files_touched: list[str],
    diagnosis_category: str = "",
    diagnosis_signature: str = "",
    rerun_exit_code: int | None = None,
    execution_id: str | None = None,
) -> CommitProvenance:
    """Validate a Phase 4 result and capture it as provenance.

    Raises NotCommittableError when the result must not be committed, so
    an UNVERIFIED or reverted change can never reach a commit.
    """
    if reverted:
        raise NotCommittableError(
            "Phase 4 reverted this change (reverted=true). There is no "
            "committed change to record."
        )
    if outcome != COMMITTABLE_OUTCOME:
        raise NotCommittableError(
            f"Phase 4 outcome is '{outcome}', not '{COMMITTABLE_OUTCOME}'. "
            "Phase 5 commits only verified changes."
        )
    if not files_touched:
        raise NotCommittableError(
            "Phase 4 reported no files_touched; refusing to guess the scope."
        )
    return CommitProvenance(
        phase4_outcome=outcome,
        phase4_reverted=reverted,
        phase4_rerun_exit_code=rerun_exit_code,
        phase4_execution_id=execution_id,
        diagnosis_category=diagnosis_category,
        diagnosis_signature=diagnosis_signature,
        files_touched=list(files_touched),
    )


def build_commit_message(
    provenance: CommitProvenance, subject: str = ""
) -> str:
    """Compose an honest commit message from real provenance.

    The message states that the verification was performed and reported by
    Phase 4, and names the diagnosis that motivated the change. It never
    claims a rerun this phase did not perform.
    """
    category = provenance.diagnosis_category or "unknown"
    signature = provenance.diagnosis_signature or "unknown"
    header = subject.strip() or f"Apply verified repair ({category})"
    files = ", ".join(provenance.files_touched)
    exit_note = (
        f"exit {provenance.phase4_rerun_exit_code}"
        if provenance.phase4_rerun_exit_code is not None
        else "exit code not reported"
    )
    execution = provenance.phase4_execution_id or "not reported"
    return (
        f"{header}\n"
        "\n"
        f"Diagnosis (Phase 3): category={category} signature={signature}\n"
        f"Verification (Phase 4): outcome={provenance.phase4_outcome}, "
        f"reverted={provenance.phase4_reverted}, rerun {exit_note}\n"
        f"Phase 4 execution: {execution}\n"
        f"Files (Phase 4 files_touched): {files}\n"
        "\n"
        "The verification above was performed and reported by Phase 4; this "
        "commit only records that verified result."
    )
