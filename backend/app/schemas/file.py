from pydantic import BaseModel


class FileNodeResponse(BaseModel):
    name: str
    path: str
    type: str  # "file" | "directory"
    size: int | None = None
    extension: str | None = None
    children: list["FileNodeResponse"] | None = None


class FileTreeResponse(BaseModel):
    files: list[FileNodeResponse]


class FileContentResponse(BaseModel):
    name: str
    path: str
    content: str
    language: str | None = None
    size: int
