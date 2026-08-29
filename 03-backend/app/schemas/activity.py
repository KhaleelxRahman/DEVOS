from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ActivityResponse(BaseModel):
    id: str
    user_id: str
    project_id: str | None = None
    activity_type: str
    # The ORM attribute is metadata_json (SQLAlchemy reserves .metadata).
    metadata: Any | None = Field(default=None, validation_alias="metadata_json")
    created_at: datetime

    model_config = {"from_attributes": True}

class ActivityListResponse(BaseModel):
    activities: list[ActivityResponse]

