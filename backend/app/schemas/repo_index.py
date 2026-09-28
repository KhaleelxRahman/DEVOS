"""Phase 6 repository-index and search response schemas."""

from pydantic import BaseModel, Field


class IndexStateResponse(BaseModel):
    project_id: str
    generation: int
    file_count: int
    symbol_count: int
    last_reindex_reason: str | None = None
    languages: dict[str, int] = Field(default_factory=dict)


class FileMatchResponse(BaseModel):
    path: str
    language: str | None = None
    size_bytes: int = 0


class TextHitResponse(BaseModel):
    path: str
    score: float
    kind: str
    line: int | None = None
    snippet: str | None = None


class SymbolMatchResponse(BaseModel):
    name: str
    kind: str
    path: str
    line: int
    signature: str | None = None


class ReferenceResponse(BaseModel):
    path: str
    line: int
    snippet: str


class ArchitectureResponse(BaseModel):
    project_id: str
    symbols_by_kind: dict[str, int]
    internal_modules: list[str]
    total_symbols: int
