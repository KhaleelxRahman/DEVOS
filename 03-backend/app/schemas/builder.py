from typing import Any, Literal

from pydantic import BaseModel, Field


RequirementClass = Literal["EXPLICIT", "INFERRED", "OPTIONAL", "UNSUPPORTED"]

GENERATION_STATUSES = {
    "IDLE", "PLANNING", "GENERATING", "APPLYING", "SYNCING",
    "COMPLETED", "PARTIAL", "FAILED", "CANCELLED", "BLOCKED",
}

TERMINAL_STATUSES = {"COMPLETED", "PARTIAL", "FAILED", "CANCELLED", "BLOCKED"}


class ClassifiedRequirement(BaseModel):
    key: str
    label: str
    value: str
    classification: RequirementClass
    reason: str | None = None


class NormalizedBuildSpec(BaseModel):
    app_name: str
    summary: str
    stack: dict[str, str]
    requirements: list[ClassifiedRequirement] = []
    unsupported: list[str] = []
    missing_environment: list[str] = []
    plan: list[str] = []
    files: list[str] = []


class BuilderPlanRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    project_id: str | None = None
    project_name: str | None = Field(default=None, max_length=255)
    mode: str = Field(default="generate", max_length=32)


class BuilderGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    project_id: str | None = None
    project_name: str | None = Field(default=None, max_length=255)
    generation_request_id: str | None = None
    mode: str = Field(default="generate", max_length=32)


class BuilderRetryRequest(BaseModel):
    generation_request_id: str = Field(min_length=1, max_length=36)


class FileOperation(BaseModel):
    path: str
    operation: str  # created | modified | skipped | failed
    reason: str | None = None


class GenerationResponse(BaseModel):
    generation_request_id: str
    project_id: str
    status: str
    mode: str
    normalized_build_spec: NormalizedBuildSpec | None = None
    created_files: list[str] = []
    modified_files: list[str] = []
    deleted_files: list[str] = []
    failed_operations: list[FileOperation] = []
    operations: list[FileOperation] = []
    summary: str | None = None
    error: str | None = None

    model_config = {"from_attributes": True}


class BuilderStreamRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    project_id: str | None = None
    data: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Request types used by the builder API surface
# ---------------------------------------------------------------------------


class CreateGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    generation_request_id: str | None = None
    project_name: str | None = Field(default=None, max_length=255)
    mode: str = Field(default="build", max_length=32)


# ---------------------------------------------------------------------------
# Response types used by the builder API surface
# ---------------------------------------------------------------------------


class StatusResponse(BaseModel):
    generation_request_id: str
    project_id: str
    status: str
    started_at: str | None = None
    completed_at: str | None = None


class RequirementsClassification(BaseModel):
    project_id: str
    prompt: str
    requirements: list[ClassifiedRequirement]
    plan: str
    stack: dict[str, str]
    unsupported: list[str]
    mode: str


class GeneratedPlan(BaseModel):
    project_id: str
    prompt: str
    plan: str
    spec: NormalizedBuildSpec
    files: list[str]


class BuilderStreamEvent(BaseModel):
    event: str
    data: dict[str, Any]


class SummaryResponse(BaseModel):
    generation_request_id: str
    project_id: str
    status: str
    summary: str
    created_files: list[str]
    modified_files: list[str]
    deleted_files: list[str]
    diff: str
    started_at: str | None = None
    completed_at: str | None = None


class ApplyStatusResponse(BaseModel):
    generation_request_id: str
    project_id: str
    applied_files: list[str]
    modified_files: list[str]
    failed_operations: list[str]
    status: str


class ClassificationResponse(BaseModel):
    project_id: str
    prompt: str
    requirements: list[ClassifiedRequirement]
    plan: str
    stack: dict[str, str]
    unsupported: list[str]
