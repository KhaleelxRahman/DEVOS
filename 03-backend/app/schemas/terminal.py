from typing import List, Optional
from pydantic import BaseModel

class TerminalExecuteRequest(BaseModel):
    command: str
    args: Optional[List[str]] = None

class TerminalResultResponse(BaseModel):
    exit_code: int
    stdout: str
    stderr: str
    execution_time_ms: Optional[float] = None
