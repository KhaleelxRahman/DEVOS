import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Execution(Base):
    """Phase 2A execution foundation record (contract only — nothing executes).

    One row per execution_id. Authoritative initial states: QUEUED (accepted),
    PREPARING (reserved for 2B handoff), BLOCKED (policy rejection persisted
    for audit), FAILED (validation failure persisted where auditable).
    No process is spawned in Phase 2A; exit_code stays NULL until Phase 2B.
    """

    __tablename__ = "executions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    execution_id: Mapped[str] = mapped_column(
        String(36), unique=True, index=True, nullable=False,
        default=lambda: str(uuid.uuid4()),
    )
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    parent_execution_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )
    process_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    workspace_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    execution_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    command: Mapped[str] = mapped_column(String(512), nullable=False)
    arguments: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    working_directory: Mapped[str] = mapped_column(String(1024), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="QUEUED", index=True
    )
    exit_code: Mapped[int | None] = mapped_column(nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    timed_out: Mapped[bool] = mapped_column(nullable=False, default=False)
    cancelled: Mapped[bool] = mapped_column(nullable=False, default=False)
    stdout: Mapped[str | None] = mapped_column(Text, nullable=True)
    stderr: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Phase 2D dev-server preview fields: populated when a DEV_SERVER
    # execution is marked READY (real reachability check passed) and cleared
    # on stop. One preview per execution row — no second/parallel store.
    preview_port: Mapped[int | None] = mapped_column(nullable=True)
    preview_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
