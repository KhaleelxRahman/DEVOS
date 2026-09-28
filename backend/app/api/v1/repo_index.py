"""Phase 6 repository-index and search endpoints.

Every route is scoped to one project and enforces ownership through
ProjectService.get_for_user before touching the index, so no query can return
another project's content.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.phase6_repo_index.service import ProjectNotIndexedError, RepoIndexService
from app.schemas.common import ApiResponse, ErrorDetail
from app.schemas.repo_index import (
    ArchitectureResponse,
    FileMatchResponse,
    IndexStateResponse,
    ReferenceResponse,
    SymbolMatchResponse,
    TextHitResponse,
)

router = APIRouter(prefix="/projects/{project_id}/repo-index", tags=["repo-index"])


@router.post("", response_model=ApiResponse[IndexStateResponse])
async def build_index(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Build or rebuild the index from the project's real files."""
    await RepoIndexService.index_project(
        db, current_user, project_id, reason="manual"
    )
    stats = await RepoIndexService.stats(db, current_user, project_id)
    return ApiResponse(success=True, data=IndexStateResponse(**stats))


@router.get("", response_model=ApiResponse[IndexStateResponse])
async def index_state(
    project_id: str,
    refresh: bool = Query(True, description="Refresh if files changed on disk"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Report index freshness, optionally refreshing changed files first."""
    try:
        if refresh:
            await RepoIndexService.refresh_if_stale(db, current_user, project_id)
        stats = await RepoIndexService.stats(db, current_user, project_id)
    except ProjectNotIndexedError as exc:
        return ApiResponse(
            success=False,
            data=None,
            error=ErrorDetail(code="NOT_INDEXED", message=str(exc)),
        )
    return ApiResponse(success=True, data=IndexStateResponse(**stats))


@router.get("/files", response_model=ApiResponse[list[FileMatchResponse]])
async def find_files(
    project_id: str,
    q: str = Query(min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Filename search over the project's real indexed paths."""
    await RepoIndexService.refresh_if_stale(db, current_user, project_id)
    matches = await RepoIndexService.find_files(db, current_user, project_id, q)
    return ApiResponse(success=True, data=[FileMatchResponse(**m) for m in matches])


@router.get("/search/text", response_model=ApiResponse[list[TextHitResponse]])
async def search_text(
    project_id: str,
    q: str = Query(min_length=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Literal text search returning real matching lines."""
    await RepoIndexService.refresh_if_stale(db, current_user, project_id)
    hits = await RepoIndexService.search_text(db, current_user, project_id, q, limit)
    return ApiResponse(success=True, data=[TextHitResponse(**h.to_dict()) for h in hits])


@router.get("/search/symbols", response_model=ApiResponse[list[SymbolMatchResponse]])
async def search_symbols(
    project_id: str,
    q: str = Query(min_length=1),
    limit: int = Query(25, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Symbol search over real extracted definitions."""
    await RepoIndexService.refresh_if_stale(db, current_user, project_id)
    matches = await RepoIndexService.search_symbols(db, current_user, project_id, q, limit)
    return ApiResponse(success=True, data=[SymbolMatchResponse(**m) for m in matches])


@router.get("/references", response_model=ApiResponse[list[ReferenceResponse]])
async def find_references(
    project_id: str,
    name: str = Query(min_length=1),
    limit: int = Query(25, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Find real usages of a symbol across the project."""
    await RepoIndexService.refresh_if_stale(db, current_user, project_id)
    refs = await RepoIndexService.find_references(db, current_user, project_id, name, limit)
    return ApiResponse(success=True, data=[ReferenceResponse(**r) for r in refs])


@router.get("/search/semantic", response_model=ApiResponse[list[TextHitResponse]])
async def search_semantic(
    project_id: str,
    q: str = Query(min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rank real files by relevance to a natural-language question."""
    await RepoIndexService.refresh_if_stale(db, current_user, project_id)
    hits = await RepoIndexService.search_semantic(db, current_user, project_id, q, limit)
    return ApiResponse(success=True, data=[TextHitResponse(**h.to_dict()) for h in hits])


@router.get("/architecture", response_model=ApiResponse[ArchitectureResponse])
async def architecture(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Describe the project's real structure from its indexed symbols."""
    await RepoIndexService.refresh_if_stale(db, current_user, project_id)
    arch = await RepoIndexService.get_architecture(db, current_user, project_id)
    return ApiResponse(success=True, data=ArchitectureResponse(**arch))