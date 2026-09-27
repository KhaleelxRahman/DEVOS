"""PHASE 3 — grounded root-cause diagnosis of REAL execution failures.

This package diagnoses failures. It never re-runs a command and never
re-captures output: the single input is the Phase 2 ``Execution`` row
(exit code, stdout, stderr, failure_reason, timing) written by the
2A-2E engine. Phase 2 is the only failure-capture path; Phase 3 only
reasons over what it already recorded.

Truthfulness contract
---------------------
Every user-facing statement carries an explicit evidence tag:

* ``OBSERVED``  — literally present in the real execution record.
* ``INFERRED``  — a conclusion drawn from a named, matched signature
                  in observed text. The signature is reported as the
                  source so the reasoning is auditable.
* ``UNKNOWN``   — not determinable from the available evidence.

There is no free-form reasoning chain in the output. The engine emits
structured fields only; the pattern that produced each INFERRED claim
is the disclosed evidence for it.
"""

from app.phase3_diagnostics.evidence import (
    Diagnosis,
    Evidence,
    EvidenceTag,
    FailureCategory,
)
from app.phase3_diagnostics.diagnosis import DiagnosisEngine
from app.phase3_diagnostics.service import DiagnosisService

__all__ = [
    "Diagnosis",
    "DiagnosisEngine",
    "DiagnosisService",
    "Evidence",
    "EvidenceTag",
    "FailureCategory",
]
