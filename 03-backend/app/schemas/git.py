from typing import List, Optional
from pydantic import BaseModel

class GitStatusResponse(BaseModel):
    branch: str
    is_clean: bool
    modified: List[str] = []
    added: List[str] = []
    deleted: List[str] = []
    untracked: List[str] = []

class GitCommitRequest(BaseModel):
    message: str

class GitDiffResponse(BaseModel):
    diff: str
    files_changed: int = 0
    insertions: int = 0
    deletions: int = 0
