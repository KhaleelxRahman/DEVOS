from datetime import datetime

from pydantic import BaseModel, Field, field_validator


ALLOWED_ARTIFACT_KINDS = {"code", "markdown", "json", "html", "mermaid", "svg", "text"}
MAX_ARTIFACT_CONTENT = 200_000


class ArtifactCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    kind: str = Field(default="text", max_length=32)
    content: str = Field(min_length=1, max_length=MAX_ARTIFACT_CONTENT)
    mime_type: str | None = Field(default=None, max_length=120)
    metadata: dict | None = None
    conversation_id: str | None = None
    message_id: str | None = None

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ALLOWED_ARTIFACT_KINDS:
            raise ValueError("Unsupported artifact kind")
        return normalized


class ArtifactResponse(BaseModel):
    id: str
    project_id: str
    conversation_id: str | None
    message_id: str | None
    name: str
    kind: str
    content: str
    mime_type: str | None
    metadata: dict | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class ArtifactListResponse(BaseModel):
    artifacts: list[ArtifactResponse]
