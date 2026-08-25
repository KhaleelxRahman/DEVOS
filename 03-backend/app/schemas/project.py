from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    technologies: Optional[List[str]] = None
    repository_url: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    technologies: Optional[List[str]] = None
    repository_url: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    technologies: Optional[Any] = None
    repository_url: Optional[str] = None
    repository_provider: Optional[str] = None
    repository_id: Optional[str] = None
    default_branch: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
