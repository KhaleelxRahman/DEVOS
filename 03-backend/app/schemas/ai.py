from datetime import datetime

from pydantic import BaseModel


class AIChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    current_file: str | None = None

class AIMessageResponse(BaseModel):
    role: str
    content: str
    created_at: datetime | None = None
    # Identifies the provider that produced the message, e.g. "local-mock",
    # "gemini" or "openai" — the UI must never disguise mock output as real.
    provider: str = "local-mock"

class AIChatResponse(BaseModel):
    conversation_id: str
    message: AIMessageResponse

class AIProviderStatusResponse(BaseModel):
    provider: str
    model: str
    is_mock: bool
    configured: bool

class AIActionRequest(BaseModel):
    action: str  # explain | debug | refactor | test | document | security | optimize
    code: str
    file_path: str | None = None
    language: str | None = None

class ConversationListResponse(BaseModel):
    conversations: list["ConversationResponse"] = []

class MessageListResponse(BaseModel):
    messages: list[AIMessageResponse] = []

class ConversationResponse(BaseModel):
    id: str
    project_id: str
    title: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
