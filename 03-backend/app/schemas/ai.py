from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class AIChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    current_file: Optional[str] = None

class AIMessageResponse(BaseModel):
    role: str
    content: str
    created_at: Optional[datetime] = None

class AIChatResponse(BaseModel):
    conversation_id: str
    message: AIMessageResponse

class ConversationResponse(BaseModel):
    id: str
    project_id: str
    title: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
