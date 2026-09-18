"""Phase 2A/2B execution schemas."""

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

# Phase 2B adds real process states on top of the Phase 2A initial states.
ExecutionStatus = Literal[
    "QUEUED", "PREPARING", "STARTING", "RUNNING",
    "COMPLETED", "FAILED", "BLOCKED", "CANCELLED", "TIMED_OUT",
]

EXECUTION_STATUSES: set[str] = {
    "QUEUED", "PREPARING", "STARTING", "RUNNING",
    "COMPLETED", "FAILED", "BLOCKED", "CANCELLED", "TIMED_OUT",
}

# Phase 2D dev-server preview states. A preview execution starts RUNNING,
# becomes READY only after a real reachability check, and ends STOPPED /
# CANCELLED / FAILED / TIMED_OUT. CANCELLED is the stop path's canonical
# terminal state (stop reuses the Phase 2B cancel/kill machinery).
PREVIEW_STATUSES: set[str] = {
    "STARTING", "RUNNING", "READY", "STOPPED",
    "FAILED", "CANCELLED", "TIMED_OUT",
}


class ExecutionCreateRequest(BaseModel):
    execution_type: str = Field(min_length=1, max_length=32)
    command: str = Field(min_length=1, max_length=512)
    arguments: list[str] | None = Field(default=None, max_length=64)
    working_directory: str = Field(min_length=1, max_length=1024)
    workspace_id: str = Field(min_length=1, max_length=36)
    execution_id: str | None = Field(default=None, max_length=36)
    request_id: str | None = Field(default=None, max_length=64)
    parent_execution_id: str | None = Field(default=None, max_length=36)


class ExecutionStreamEvent(BaseModel):
    event: str
    data: dict


# ---------------------------------------------------------------------------
# Phase 2C — quality operations (BUILD / TEST / LINT / TYPECHECK)
# ---------------------------------------------------------------------------
QUALITY_OPERATIONS: set[str] = {"BUILD", "TEST", "LINT", "TYPECHECK"}


class QualityOperationInfo(BaseModel):
    """Detection result for one quality operation.

    supported  — the project's real configuration defines this operation.
    available  — the detected tool binary exists on the execution server.
    command    — the exact command the Phase 2B engine will run (policy-
                 approved vocabulary only).
    source     — the project configuration file the command was detected in.
    """

    operation: str
    supported: bool
    available: bool = False
    command: str | None = None
    arguments: list[str] | None = None
    source: str | None = None
    reason: str | None = None


class QualityOperationsResponse(BaseModel):
    project_id: str
    operations: list[QualityOperationInfo]


class ExecutionResponse(BaseModel):
    execution_id: str
    request_id: str | None = None
    parent_execution_id: str | None = None
    # Phase 2E retry field: how many times this execution (or its parent,
    # when this row is a retry child) has been re-run.
    retry_count: int = 0
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
    stdout: str | None = None
    stderr: str | None = None
    # Phase 2D dev-server preview fields (populated when status == READY).
    preview_port: int | None = None
    preview_url: str | None = None
    created_at: str | None = None
    started_at: str | None = None
    completed_at: str | None = None

    model_config = {"from_attributes": True}


class PreviewInfo(BaseModel):
    """Phase 2D preview status payload.

    execution_id  — the DEV_SERVER execution row backing this preview.
    url           — backend proxy URL the browser iframe will load.
    port          — real TCP port the dev server bound to, once reachable.
    status        — STARTING / RUNNING / READY / STOPPED / FAILED / CANCELLED.
    exit_code     — process exit code when the preview ended.
    stdout        — live dev-server output captured so far.
    stderr        — live dev-server error output captured so far.
    """

    execution_id: str
    project_id: str
    url: str | None = None
    port: int | None = None
    status: str
    exit_code: int | None = None
    failure_reason: str | None = None
    stdout: str | None = None
    stderr: str | None = None


class StartPreviewResponse(BaseModel):
    preview: PreviewInfo
