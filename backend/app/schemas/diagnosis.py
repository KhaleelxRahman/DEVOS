"""Phase 3 diagnosis response schemas.

The structured payload mirrors the engine's evidence contract exactly:
every claim carries a tag and a source. No field is ever a free-form
narrative without provenance.
"""

from pydantic import BaseModel, Field


class DiagnosisEvidenceResponse(BaseModel):
    """One tagged claim plus the observable that licenses it."""

    tag: str = Field(description="OBSERVED | INFERRED | UNKNOWN")
    statement: str
    source: str = Field(description="The execution field or signature name "
                                     "this claim is grounded in")


class DiagnosisLineResponse(BaseModel):
    file: str
    line: int


class DiagnosisResponse(BaseModel):
    """Grounded diagnosis of one real execution failure."""

    diagnosable: bool = True
    execution_id: str | None = None
    problem: DiagnosisEvidenceResponse
    category: DiagnosisEvidenceResponse
    evidence: list[DiagnosisEvidenceResponse] = []
    likely_cause: DiagnosisEvidenceResponse | None = None
    affected_files: list[str] = []
    affected_lines: list[DiagnosisLineResponse] = []
    suggested_fix: DiagnosisEvidenceResponse | None = None
    confidence: int = 0
    confidence_basis: str = ""
    # Pre-rendered required output structure, so the UI never has to
    # reassemble it and never sees internal reasoning.
    report: str = ""
