from app.schemas.common import ApiResponse, ErrorDetail, HealthResponse
from app.schemas.auth import UserRegister, UserLogin, UserResponse, AuthResponseData
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.schemas.file import FileNodeResponse, FileTreeResponse, FileContentResponse
from app.schemas.git import GitStatusResponse, GitCommitRequest, GitDiffResponse
from app.schemas.ai import AIChatRequest, AIChatResponse, ConversationResponse
from app.schemas.terminal import TerminalExecuteRequest, TerminalResultResponse
from app.schemas.activity import ActivityResponse, ActivityListResponse

__all__ = [
    "ApiResponse",
    "ErrorDetail",
    "HealthResponse",
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "AuthResponseData",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectListResponse",
    "FileNodeResponse",
    "FileTreeResponse",
    "FileContentResponse",
    "GitStatusResponse",
    "GitCommitRequest",
    "GitDiffResponse",
    "AIChatRequest",
    "AIChatResponse",
    "ConversationResponse",
    "TerminalExecuteRequest",
    "TerminalResultResponse",
    "ActivityResponse",
    "ActivityListResponse",
]
