from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.file import FileTreeResponse, FileContentResponse
from app.services.project_service import ProjectService
from app.services.file_service import FileService
from app.services.activity_service import ActivityService

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

class CreateFileRequest(BaseModel):
    parent_path: str = Field(default="", max_length=512)
    name: str = Field(min_length=1, max_length=255)
    content: str = Field(default="", max_length=2 * 1024 * 1024)


class CreateFolderRequest(BaseModel):
    parent_path: str = Field(default="", max_length=512)
    name: str = Field(min_length=1, max_length=255)


class SaveFileRequest(BaseModel):
    content: str = Field(default="", max_length=2 * 1024 * 1024)


class RenameRequest(BaseModel):
    path: str = Field(min_length=1, max_length=512)
    new_name: str = Field(min_length=1, max_length=255)


@router.post("/file", response_model=ApiResponse[FileContentResponse])
async def create_file(
    project_id: str,
    payload: CreateFileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    created = FileService.create_file(project_id, payload.parent_path, payload.name, payload.content)
    await ActivityService.record(db, current_user.id, "file_created", project_id, {"path": created.path})
    await db.commit()
    return ApiResponse(success=True, data=created)


@router.post("/folder", response_model=ApiResponse[dict])
async def create_folder(
    project_id: str,
    payload: CreateFolderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    path = FileService.create_folder(project_id, payload.parent_path, payload.name)
    await ActivityService.record(db, current_user.id, "folder_created", project_id, {"path": path})
    await db.commit()
    return ApiResponse(success=True, data={"path": path})


@router.post("/upload", response_model=ApiResponse[dict])
async def upload_files(
    project_id: str,
    parent_path: str = Form(default=""),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    if len(files) > FileService.MAX_UPLOADS_PER_REQUEST:
        return ApiResponse(success=False, data={"uploaded": [], "errors": [f"Too many files (max {FileService.MAX_UPLOADS_PER_REQUEST})"]})
    uploaded: List[str] = []
    errors: List[str] = []
    for uf in files:
        data = await uf.read()
        try:
            path = FileService.save_upload(project_id, parent_path, uf.filename or "upload", data)
            uploaded.append(path)
        except Exception as e:  # per-file failure must not abort the batch
            errors.append(f"{uf.filename}: {e}")
    if uploaded:
        await ActivityService.record(db, current_user.id, "files_uploaded", project_id, {"paths": uploaded})
        await db.commit()
    return ApiResponse(success=not errors, data={"uploaded": uploaded, "errors": errors})


@router.post("/rename", response_model=ApiResponse[dict])
async def rename_entry(
    project_id: str,
    payload: RenameRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    new_path = FileService.rename(project_id, payload.path, payload.new_name)
    await ActivityService.record(db, current_user.id, "file_renamed", project_id, {"from": payload.path, "to": new_path})
    await db.commit()
    return ApiResponse(success=True, data={"path": new_path})


@router.put("/{file_path:path}", response_model=ApiResponse[FileContentResponse])
async def save_file(
    project_id: str,
    file_path: str,
    payload: SaveFileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    saved = FileService.save_file(project_id, file_path, payload.content)
    await ActivityService.record(db, current_user.id, "file_saved", project_id, {"path": file_path})
    await db.commit()
    return ApiResponse(success=True, data=saved)


@router.delete("/{file_path:path}", response_model=ApiResponse[dict])
async def delete_entry(
    project_id: str,
    file_path: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    FileService.delete(project_id, file_path)
    await ActivityService.record(db, current_user.id, "file_deleted", project_id, {"path": file_path})
    await db.commit()
    return ApiResponse(success=True, data={"deleted": file_path})

