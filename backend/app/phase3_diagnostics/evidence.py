"""Phase 3 evidence primitives: tags, categories, and the diagnosis record.

These types are the entire user-facing contract of the diagnosis engine.
A statement is only ever rendered with one of three tags, and the engine
cannot construct a claim that lacks a source.
"""

from dataclasses import dataclass, field
from enum import Enum


class EvidenceTag(str, Enum):
    """How a statement is grounded."""

    OBSERVED = "OBSERVED"   # directly present in the execution record
    INFERRED = "INFERRED"   # conclusion from a named matched signature
    UNKNOWN = "UNKNOWN"     # not determinable from available evidence


class FailureCategory(str, Enum):
    """Failure categories Phase 3 supports."""

    BUILD = "build"
    COMPILE = "compile"
    TYPE = "type"
    LINT = "lint"
    TEST = "test"
    DEPENDENCY = "dependency"
    RUNTIME = "runtime"
    CONFIGURATION = "configuration"
    ENVIRONMENT = "environment"
    PORT = "port"


@dataclass(frozen=True)
class Evidence:
    """One tagged claim plus the observable it came from.

    ``source`` is mandatory and non-empty: it names the execution field or
    the signature that licenses the claim. A claim with no source is not
    expressible, which is what prevents ungrounded narrative.
    """

    tag: EvidenceTag
    statement: str
    source: str

    def __post_init__(self) -> None:
        if not self.source:
            raise ValueError("Evidence requires a source")

    def to_dict(self) -> dict:
        return {
            "tag": self.tag.value,
            "statement": self.statement,
            "source": self.source,
        }


@dataclass
class Diagnosis:
    """Complete grounded diagnosis for one real execution.

    ``affected_files`` / ``affected_lines`` are only populated when a
    location was literally printed by the failing tool. An empty list
    means "no location was present in the evidence" — it never means
    "no file is involved".
    """

    execution_id: str
    problem: Evidence
    category: Evidence
    likely_cause: Evidence
    suggested_fix: Evidence
    evidence: list[Evidence] = field(default_factory=list)
    affected_files: list[str] = field(default_factory=list)
    affected_lines: list[dict] = field(default_factory=list)
    confidence: int = 0
    confidence_basis: str = ""

    def to_dict(self) -> dict:
        return {
            "execution_id": self.execution_id,
            "problem": self.problem.to_dict(),
            "category": self.category.to_dict(),
            "evidence": [e.to_dict() for e in self.evidence],
            "likely_cause": self.likely_cause.to_dict(),
            "affected_files": list(self.affected_files),
            "affected_lines": list(self.affected_lines),
            "suggested_fix": self.suggested_fix.to_dict(),
            "confidence": self.confidence,
            "confidence_basis": self.confidence_basis,
        }
