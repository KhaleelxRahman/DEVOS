from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel

class ActivityResponse(BaseModel):
    id: str
    user_id: str
    project_id: Optional[str] = None
    activity_type: str
    metadata: Optional[Any] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]
