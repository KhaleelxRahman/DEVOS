from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AIChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    current_file: str | None = None


class AIUsage(BaseModel):
    """Token accounting that never overstates what is known.

    ``source`` is the whole point:
      * ``provider_reported`` - the provider returned real usage numbers.
      * ``estimated``          - DEVOS estimated locally; NOT provider usage.
      * ``none``               - no usage information is available at all.

    The agent's hard token ceiling is enforced against the estimate when that
    is all there is, and the UI must label which one it is showing.
    """

    source: Literal["provider_reported", "estimated", "none"] = "none"
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None

    @property
    def is_provider_reported(self) -> bool:
        return self.source == "provider_reported"


class AIMessageResponse(BaseModel):
    role: str
    content: str
    created_at: datetime | None = None
    # Identifies the provider that produced the message, e.g. "local-mock",
    # "gemini" or "openai" — the UI must never disguise mock output as real.
    provider: str = "local-mock"
    # Model that actually answered, when the provider reports it.
    model: str | None = None
    # Real provider usage when available; otherwise explicitly NOT provider
    # usage. Optional so every existing construction site keeps working.
    usage: AIUsage | None = None
    # Set when the provider call failed or was refused, so a caller can never
    # mistake an error path for a real answer.
    error: str | None = None


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
    is_pinned: bool = False

    model_config = {"from_attributes": True}


class ConversationUpdateRequest(BaseModel):
    title: str | None = None
    is_pinned: bool | None = None
