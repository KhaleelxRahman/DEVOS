import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Generation(Base):
    """Phase 1 builder generation transaction (D-03/D-04).

    One row per generation_request_id. Statuses: IDLE/PLANNING/GENERATING/
    APPLYING/SYNCING/COMPLETED plus failure states PARTIAL/FAILED/CANCELLED/
    BLOCKED. Failure states are never mapped to COMPLETED.
    """

    __tablename__ = "generations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    generation_request_id: Mapped[str] = mapped_column(
        String(36), unique=True, index=True, nullable=False,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_build_spec: Mapped[Any | None] = mapped_column("normalized_build_spec", JSON, nullable=True)
    mode: Mapped[str] = mapped_column(String(32), nullable=False, default="generate")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="IDLE", index=True)
    created_files: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    modified_files: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    deleted_files: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    failed_operations: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
