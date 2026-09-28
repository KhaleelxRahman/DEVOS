"""Phase 6 repository index models.

One canonical store for what DEVOS knows about a project's real files,
symbols, imports, and references. Every row is keyed by ``project_id`` and
every query filters on it, so a query scoped to one project can never surface
another project's content.
"""

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project


class RepoIndex(Base, TimestampMixin):
    """One row per project: when its index was built and from what."""

    __tablename__ = "repo_indexes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    # Bumped on every full or incremental refresh; used for freshness checks.
    generation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    symbol_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Aggregate term statistics, so semantic search never re-reads the disk.
    term_frequencies: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    document_frequencies: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    total_terms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_reindex_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)

    project: Mapped["Project"] = relationship("Project")
    files: Mapped[list["RepoFile"]] = relationship(
        "RepoFile", back_populates="index", cascade="all, delete-orphan"
    )


class RepoFile(Base, TimestampMixin):
    """One real file on disk, with the content hash that drives freshness."""

    __tablename__ = "repo_files"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    index_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repo_indexes.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    # Project-relative, always POSIX separators, so results are identical on
    # Windows and Linux regardless of how the host stores the path.
    path: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    line_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    # Storing the body is what makes text search real rather than a re-read of
    # the filesystem on every query. Sensitive files never reach the indexer.
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    index: Mapped["RepoIndex"] = relationship("RepoIndex", back_populates="files")
    symbols: Mapped[list["RepoSymbol"]] = relationship(
        "RepoSymbol", back_populates="file", cascade="all, delete-orphan"
    )


class RepoSymbol(Base, TimestampMixin):
    """A symbol, import, or export extracted from a real file."""

    __tablename__ = "repo_symbols"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    file_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("repo_files.id", ondelete="CASCADE"), index=True
    )
    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    path: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    # class | function | method | import | export | route | constant
    kind: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    line: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # What this file imports, and what it exports.
    imports: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    exports: Mapped[Any | None] = mapped_column(JSON, nullable=True)

    file: Mapped["RepoFile"] = relationship("RepoFile", back_populates="symbols")