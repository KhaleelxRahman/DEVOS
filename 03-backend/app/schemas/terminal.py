from pydantic import BaseModel


class TerminalExecuteRequest(BaseModel):
    command: str
    args: list[str] | None = None


class TerminalResultResponse(BaseModel):
    exit_code: int
    stdout: str
    stderr: str
    execution_time_ms: float | None = None
