from pydantic import BaseModel, Field


class GitStatusResponse(BaseModel):
    branch: str
    is_clean: bool
    modified: list[str] = []
    added: list[str] = []
    deleted: list[str] = []
    untracked: list[str] = []


class GitCommitRequest(BaseModel):
    message: str
    files: list[str] = Field(
        default_factory=list,
        description="Explicit allow-list to stage. Never 'git add .'.",
    )
    commit_all: bool = Field(
        default=False,
        description=(
            "Opt-in: stage every tracked change with `git add -u`-equivalent "
            "semantics. Off by default; Phase 5 provenance commits never set "
            "it, so a verified change is never widened in scope."
        ),
    )


class GitDiffResponse(BaseModel):
    diff: str
    files_changed: int = 0
    insertions: int = 0
    deletions: int = 0


class GitBranchListResponse(BaseModel):
    current: str
    branches: list[str] = []


class GitLogEntry(BaseModel):
    hash: str
    author: str
    date: str
    message: str


class GitLogResponse(BaseModel):
    commits: list[GitLogEntry] = []


class GitStageRequest(BaseModel):
    files: list[str]


class GitCheckoutRequest(BaseModel):
    branch: str
    create: bool = False


class GitOperationResponse(BaseModel):
    success: bool = True
    message: str = ""
