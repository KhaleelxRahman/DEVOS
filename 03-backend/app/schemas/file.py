from typing import List, Optional
from pydantic import BaseModel

class FileNodeResponse(BaseModel):
    name: str
    path: str
    type: str  # "file" | "directory"
    size: Optional[int] = None
    extension: Optional[str] = None
    children: Optional[List["FileNodeResponse"]] = None

class FileTreeResponse(BaseModel):
    files: List[FileNodeResponse]

class FileContentResponse(BaseModel):
    name: str
    path: str
    content: str
    language: Optional[str] = None
    size: int
