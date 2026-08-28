from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    technologies: list[str] | None = None
    repository_url: str | None = None

class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    technologies: list[str] | None = None
    repository_url: str | None = None

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None = None
    technologies: Any | None = None
    repository_url: str | None = None
    repository_provider: str | None = None
    repository_id: str | None = None
    default_branch: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}

class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
