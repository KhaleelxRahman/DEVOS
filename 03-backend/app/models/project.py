import uuid
from typing import List, Optional, Any
from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    technologies: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    repository_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    repository_provider: Mapped[Optional[str]] = mapped_column(String(50), default="github", nullable=True)
    repository_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    default_branch: Mapped[Optional[str]] = mapped_column(String(100), default="main", nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    conversations: Mapped[List["Conversation"]] = relationship(
        "Conversation", back_populates="project", cascade="all, delete-orphan"
    )
    activities: Mapped[List["Activity"]] = relationship(
        "Activity", back_populates="project", cascade="all, delete-orphan"
    )
