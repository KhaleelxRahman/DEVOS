"""Phase 2A execution foundation schemas (contract only — nothing executes)."""

from typing import Literal

from pydantic import BaseModel, Field

ExecutionType = Literal[
    "DEPENDENCY_INSTALL",
    "BUILD",
    "TEST",
    "LINT",
    "TYPECHECK",
    "DEV_SERVER",
    "PREVIEW",
    "CUSTOM_SAFE_COMMAND",
]

EXECUTION_TYPES: set[str] = {
    "DEPENDENCY_INSTALL",
    "BUILD",
    "TEST",
    "LINT",
    "TYPECHECK",
    "DEV_SERVER",
    "PREVIEW",
    "CUSTOM_SAFE_COMMAND",
}

# Authoritative Phase 2A initial states. Extended states (INSTALLING,
# BUILDING, RUNNING, COMPLETED, ...) belong to Phase 2B+ and are rejected
# as input here.
ExecutionStatus = Literal["QUEUED", "PREPARING", "BLOCKED", "FAILED"]

EXECUTION_STATUSES: set[str] = {"QUEUED", "PREPARING", "BLOCKED", "FAILED"}


class ExecutionCreateRequest(BaseModel):
    execution_type: str = Field(min_length=1, max_length=32)
    command: str = Field(min_length=1, max_length=512)
    arguments: list[str] | None = Field(default=None, max_length=64)
    working_directory: str = Field(min_length=1, max_length=1024)
    workspace_id: str = Field(min_length=1, max_length=36)
    execution_id: str | None = Field(default=None, max_length=36)
    request_id: str | None = Field(default=None, max_length=64)
    parent_execution_id: str | None = Field(default=None, max_length=36)


class ExecutionResponse(BaseModel):
    execution_id: str
    request_id: str | None = None
    parent_execution_id: str | None = None
    process_id: str | None = None
    user_id: str
    project_id: str
    workspace_id: str
    execution_type: str
    command: str
    arguments: list[str] | None = None
    working_directory: str
    status: str
    exit_code: int | None = None
    failure_reason: str | None = None
    timed_out: bool = False
    cancelled: bool = False
    created_at: str | None = None
    started_at: str | None = None
    completed_at: str | None = None

    model_config = {"from_attributes": True}
