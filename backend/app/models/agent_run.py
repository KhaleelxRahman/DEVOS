"""Phase 9 agent run model.

One row per agent run. The row IS the agent's observable state: the current
state, the safety-limit counters, the append-only step log, and the commit
proposals waiting on the user. Nothing about a run is implied by the UI —
every transition is written here first, so `GET /agent/runs/{id}` is the same
truth the orchestrator acted on.

Cancellation is a column, not an in-memory flag, so a stop issued by the UI
actually reaches a run that is executing.
"""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


# The state machine the agent is allowed to occupy. Kept as a module constant
# so the service, the API and the tests all validate against one list.
AGENT_STATES: tuple[str, ...] = (
    "PLANNING",
    "EDITING",
    "BUILDING",
    "TESTING",
    "DIAGNOSING",
    "FIXING",
    "VERIFYING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
)

TERMINAL_AGENT_STATES: frozenset[str] = frozenset(
    {"COMPLETED", "FAILED", "CANCELLED"}
)


class AgentRun(Base, TimestampMixin):
    """A single bounded agent run over exactly one project."""

    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    task: Mapped[str] = mapped_column(Text, nullable=False)

    # Current position in the state machine. Never a value outside AGENT_STATES.
    state: Mapped[str] = mapped_column(
        String(16), nullable=False, default="PLANNING", index=True
    )
    # Why the run ended, or the limit that stopped it. Real reason, never blank
    # on a terminal state.
    terminal_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Safety-limit counters, checked at every step boundary.
    iteration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    repair_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_iterations: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    max_repair_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3
    )
    max_runtime_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=900
    )
    # Locked decision (Phase 9, Decision 5 C): a hard token ceiling. Hitting it
    # halts the run as FAILED/PARTIAL; it is never silently absorbed.
    max_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=100_000)

    # Real cancellation: the UI sets this, the orchestrator reads it at every
    # step boundary and stops. It is not a cosmetic UI state.
    cancel_requested: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Append-only evidence for every transition: state, what really happened,
    # and the concrete proof (exit code, diff, diagnosis id, ...).
    steps: Mapped[Any | None] = mapped_column(JSON, nullable=True)

    # Commits the run WANTS to make. Nothing here is in git until the user
    # approves the batch (Phase 9 Decision 4 B).
    commit_proposals: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    approval_state: Mapped[str] = mapped_column(
        String(16), nullable=False, default="NOT_REQUIRED"
    )
    # Human-readable summary; never claims COMPLETED without verifying evidence.
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", lazy="selectin")
    user: Mapped["User"] = relationship("User", lazy="selectin")
