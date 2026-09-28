"""Phase 6: repository understanding - one canonical index and search layer."""

from app.phase6_repo_index.extractor import FileFacts, SymbolRecord, extract
from app.phase6_repo_index.service import (
    ProjectNotIndexedError,
    RepoIndexService,
    SearchHit,
)

__all__ = [
    "FileFacts",
    "ProjectNotIndexedError",
    "RepoIndexService",
    "SearchHit",
    "SymbolRecord",
    "extract",
]