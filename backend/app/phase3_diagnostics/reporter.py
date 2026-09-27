"""Phase 3 — structured diagnosis output.

The reporter renders a Diagnosis into the required user-facing structure.
It emits tagged statements only. It deliberately does NOT print the
engine's internal matching order, regex evaluation, or any other
reasoning trace: the disclosed `source` on each statement is the entire
justification surface.

    Problem / Category / Evidence / Likely Cause / Affected Files /
    Affected Lines / Suggested Fix / Confidence
"""

from app.phase3_diagnostics.evidence import Diagnosis


def render_diagnosis(diagnosis: Diagnosis) -> str:
    """Render the required output structure as plain text."""
    lines: list[str] = [
        f"Problem            : {diagnosis.problem.statement} "
        f"[{diagnosis.problem.tag.value}]",
        f"Category           : {diagnosis.category.statement} "
        f"[{diagnosis.category.tag.value}]",
        "",
        "Evidence:",
    ]
    if diagnosis.evidence:
        for item in diagnosis.evidence:
            lines.append(
                f"  [{item.tag.value}] {item.statement}  (source: {item.source})"
            )
    else:
        lines.append("  [UNKNOWN] No evidence was recorded for this failure.")

    lines.extend([
        "",
        f"Likely Cause       : {diagnosis.likely_cause.statement} "
        f"[{diagnosis.likely_cause.tag.value}]",
        "",
        "Affected Files     : "
        + (", ".join(diagnosis.affected_files) if diagnosis.affected_files
           else "none determinable from the captured evidence"),
        "",
        "Affected Lines     : "
        + (", ".join(f"{entry['file']}:{entry['line']}"
                     for entry in diagnosis.affected_lines)
           if diagnosis.affected_lines
           else "none determinable from the captured evidence"),
        "",
        f"Suggested Fix      : {diagnosis.suggested_fix.statement} "
        f"[{diagnosis.suggested_fix.tag.value}]",
        "",
        f"Confidence         : {diagnosis.confidence}/100",
        f"Confidence Basis   : {diagnosis.confidence_basis}",
    ])
    return "\n".join(lines)


def render_summary(diagnosis: Diagnosis) -> str:
    """One-line summary for history rows."""
    cause_tag = diagnosis.likely_cause.tag.value
    return (
        f"[{cause_tag}] {diagnosis.category.statement}: "
        f"{diagnosis.likely_cause.statement} "
        f"(confidence {diagnosis.confidence}/100)"
    )
