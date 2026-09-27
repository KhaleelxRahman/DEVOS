"""Phase 4 service: apply a proposed repair and verify it for real.

The verification step deliberately REUSES the Phase 2 execution engine: the
repair is verified by re-running the same quality operation that produced
the failure. No separate verification path is introduced.

Flow:  diagnosis (Phase 3) -> proposal -> apply -> rerun (Phase 2) ->
verify. If the rerun does not resolve the original failure, the applied
diff is REVERTED from the in-memory backup and the outcome is reported
UNVERIFIED with the real rerun evidence.
"""

from dataclasses import dataclass
from typing import Any

from app.phase4_repair.planner import RepairPlanner, RepairProposal

# A repair counts as verified only when the rerun genuinely succeeded:
# terminal COMPLETED state AND a zero exit code.
VERIFIED_STATUS = "COMPLETED"
VERIFIED_EXIT_CODE = 0


class RepairApplyError(Exception):
    """Raised when a repair cannot be safely applied."""


@dataclass
class VerificationResult:
    """Outcome of the real rerun, with the evidence that proves it."""

    verified: bool
    outcome: str  # "VERIFIED" | "UNVERIFIED" | "REVERTED"
    reason: str
    rerun: dict[str, Any] | None = None
    original: dict[str, Any] | None = None
    reverted: bool = False
    diff: str = ""
    files_touched: list[str] | None = None

    def to_dict(self) -> dict:
        return {
            "verified": self.verified,
            "outcome": self.outcome,
            "reason": self.reason,
            "diff": self.diff,
            "files_touched": self.files_touched or [],
            "reverted": self.reverted,
            "original_execution": self.original,
            "rerun_execution": self.rerun,
        }


class RepairService:
    """Applies and verifies Phase 4 repairs against real project files."""

    @staticmethod
    def plan(diagnosis, project_id: str) -> RepairProposal:
        return RepairPlanner().plan(diagnosis, project_id)

    @staticmethod
    def apply(
        proposal: RepairProposal, project_id: str
    ) -> tuple[str, list[tuple[str, str]]]:
        """Write the planned edits in place, returning a rollback backup.

        Returns (diff, [(path, previous_content), ...]). The backup is
        held in memory for the duration of the verification only; nothing
        is written outside the proposed paths.
        """
        if not proposal.supported or not proposal.changes:
            raise RepairApplyError("No supported change to apply.")

        backups: list[tuple[str, str]] = []
        diffs: list[str] = []
        try:
            for change in proposal.changes:
                from app.services.file_service import FileService

                # save_file is the existing, validated in-place writer. It
                # enforces project-root containment, sensitive-file blocks
                # and the write size cap, so no parallel write path is added.
                FileService.save_file(project_id, change.path, change.after)
                backups.append((change.path, change.before))
                from app.phase4_repair.planner import unified_diff

                diffs.append(
                    unified_diff(change.path, change.before, change.after)
                )
        except Exception as exc:  # noqa: BLE001
            RepairService.rollback(backups, project_id)
            raise RepairApplyError(
                f"Applying the repair failed and was rolled back: {exc}"
            ) from exc
        return "\n".join(diffs), backups

    @staticmethod
    def rollback(backups: list[tuple[str, str]], project_id: str) -> None:
        """Restore the exact prior content of each backed-up file."""
        from app.services.file_service import FileService

        for path, previous in backups:
            try:
                FileService.save_file(project_id, path, previous)
            except Exception:  # noqa: BLE001 - best effort during revert
                continue

    @staticmethod
    def is_resolved(execution) -> bool:
        """A rerun counts as resolved only on real success evidence."""
        return (
            getattr(execution, "status", None) == VERIFIED_STATUS
            and getattr(execution, "exit_code", None) == VERIFIED_EXIT_CODE
        )
