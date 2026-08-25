from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.file import FileTreeResponse, FileContentResponse
from app.services.project_service import ProjectService
from app.services.file_service import FileService

router = APIRouter(prefix="/projects/{project_id}/files", tags=["files"])

@router.get("", response_model=ApiResponse[FileTreeResponse])
async def get_files(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    tree = FileService.get_file_tree(project_id)
    return ApiResponse(
        success=True,
        data=FileTreeResponse(files=tree),
    )

@router.get("/search", response_model=ApiResponse[dict])
async def search_files(
    project_id: str,
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    tree = FileService.get_file_tree(project_id)

    matches: List[str] = []
    def search_nodes(nodes):
        for node in nodes:
            if q.lower() in node.name.lower():
                matches.append(node.path)
            if node.children:
                search_nodes(node.children)

    search_nodes(tree)
    return ApiResponse(
        success=True,
        data={"query": q, "results": matches},
    )

@router.get("/{file_path:path}", response_model=ApiResponse[FileContentResponse])
async def get_file_content(
    project_id: str,
    file_path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    content = FileService.get_file_content(project_id, file_path)
    return ApiResponse(
        success=True,
        data=content,
    )
