"""PHASE 5 — Git/GitHub workflow engineering on the user's behalf.

This package does NOT diagnose (Phase 3) or repair (Phase 4). It consumes
a Phase 4 verification result AS-IS — outcome, files_touched, and the
Phase 3 diagnosis category/signature — and turns it into one real git
commit, so a commit can never claim something this phase did not verify.

There is exactly ONE git integration layer: ``app.services.git_service``,
which every caller shares. This module adds the traceability and approval
gating on top; it never wraps git commands a second time.

Safety policy (enforced in GitService, not here):
  * no force push, no history rewrite, no ref deletion
  * main is only reached through an approved PR merge
  * UNVERIFIED / reverted Phase 4 results are never committed
"""

from app.phase5_git.commit_provenance import (
    CommitProvenance,
    build_commit_message,
    build_provenance,
)

__all__ = ["CommitProvenance", "build_commit_message", "build_provenance"]
