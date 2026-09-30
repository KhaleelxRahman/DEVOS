"""Phase 9 agent request/response schemas.

Body-based, matching the rest of the DEVOS API (e.g. `POST /git/commit`).
"""

from typing import Any

from pydantic import BaseModel, Field


class AgentRunCreate(BaseModel):
    project_id: str
    task: str = Field(min_length=1)
    max_iterations: int = 3
    max_repair_attempts: int = 3
    max_runtime_seconds: int = 900
    max_tokens: int = 100_000
    start: bool = True


class AgentCommitApproval(BaseModel):
    """A user-supplied message is required: the agent never writes one itself."""

    message: str = Field(min_length=1)
