"""Repair planner: Phase 3 diagnosis -> a minimal, concrete file change.

The planner is deliberately BANNED. It only proposes a change when the
Phase 3 diagnosis names a signature that maps to a deterministic,
mechanical repair. It never invents code, never guesses, and never
rewrites a file wholesale.

Every proposal carries the exact target file and lines changed, a real
unified diff (the artifact the user approves), a risk level, and whether
user approval is required before the write.

Anything outside the repair table is reported UNSUPPORTED with a reason,
so a Phase 4 run can never silently "fix" something it does not
understand.
"""

import difflib
import json
import re
from dataclasses import dataclass, field
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class PlannedChange:
    """One concrete edit to one file."""

    path: str
    before: str
    after: str

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "before": self.before,
            "after": self.after,
            "diff": unified_diff(self.path, self.before, self.after),
            "lines_changed": _changed_line_count(self.before, self.after),
        }


@dataclass
class RepairProposal:
    """A proposed repair, pending approval."""

    supported: bool
    execution_id: str
    signature: str
    reason: str
    changes: list[PlannedChange] = field(default_factory=list)
    risk: str = RiskLevel.LOW.value
    requires_approval: bool = False
    auto_appliable: bool = False

    def to_dict(self) -> dict:
        return {
            "supported": self.supported,
            "execution_id": self.execution_id,
            "signature": self.signature,
            "reason": self.reason,
            "risk": self.risk,
            "requires_approval": self.requires_approval,
            "auto_appliable": self.auto_appliable,
            "files_touched": [c.path for c in self.changes],
            "changes": [c.to_dict() for c in self.changes],
        }


def unified_diff(path: str, before: str, after: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"a/{path}",
            tofile=f"b/{path}",
            n=3,
        )
    )


def _changed_line_count(before: str, after: str) -> int:
    """Added+removed line count, so the scope is visible before applying."""
    added = removed = 0
    for line in difflib.unified_diff(
        before.splitlines(), after.splitlines(), n=0, lineterm=""
    ):
        if line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    return added + removed


class PlanContext:
    """Read-only view of the real project files for planning."""

    def __init__(self, project_id: str, output: str):
        self.project_id = project_id
        self.output = output

    def read(self, relative_path: str) -> str | None:
        return _read(self, relative_path)


def _read(ctx: PlanContext, relative_path: str) -> str | None:
    from app.services.file_service import FileService

    try:
        abs_path = FileService.validate_safe_path(ctx.project_id, relative_path)
        with open(abs_path, "r", encoding="utf-8") as handle:
            return handle.read()
    except Exception:  # noqa: BLE001 - planning must never raise
        return None


def _repair_missing_script(ctx: PlanContext) -> tuple[str, str] | None:
    """package.json is missing the script the command invoked.

    Phase 3 reported ``Missing script: "<name>"``. The minimal, correct
    repair is to define that script in the project's own package.json.
    The command body is copied from the project's existing convention; when
    no convention exists we decline rather than invent a build command.
    """
    match = re.search(r"Missing script: \"(\w+)\"", ctx.output)
    if not match:
        return None
    script = match.group(1)
    raw = ctx.read("package.json")
    if raw is None:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    scripts = data.get("scripts")
    if not isinstance(scripts, dict) or script in scripts:
        return None

    # Only reuse an existing sibling script's shape when one is genuinely
    # present; otherwise we would be guessing at the user's build system.
    if "build" in scripts:
        body = scripts["build"]
    elif "test" in scripts:
        body = scripts["test"]
    else:
        return None

    updated, count = _add_script_entry(raw, script, body)
    if count != 1:
        return None
    # The result must remain valid JSON; a malformed edit is never applied.
    try:
        if script not in json.loads(updated).get("scripts", {}):
            return None
    except json.JSONDecodeError:
        return None
    return "package.json", updated


def _add_script_entry(raw: str, name: str, body: str) -> tuple[str, int]:
    """Insert a script entry into the existing scripts object, in place.

    Operates on the text so the rest of the file keeps its original
    formatting. The new member is appended after the LAST existing entry
    (adding the separating comma), or becomes the sole member when the
    scripts object is empty. Indentation is inferred from the existing
    members so the result matches the file's own style.
    """
    match = re.search(r'("scripts"\s*:\s*\{)(.*?)(\})', raw, re.DOTALL)
    if not match:
        return raw, 0
    open_brace_end = match.end(1)
    close_start = match.start(3)
    body_text = match.group(2)

    # Infer the member indentation from the first existing entry line.
    indent_match = re.search(r"\n([ \t]+)\S", body_text)
    indent = indent_match.group(1) if indent_match else "    "
    # Preserve the newline+indent that precedes the closing brace.
    tail = re.search(r"(\n[ \t]*)$", body_text)
    if tail:
        closing_indent = tail.group(1)
    elif body_text.strip() == "":
        # Empty object: mirror the member indent for the closing brace.
        closing_indent = "\n" + indent
    else:
        # No trailing newline inside the object: indent the closing brace
        # one level out from the member indentation.
        closing_indent = "\n" + (indent[:-4] if len(indent) >= 4 else "")

    entry_line = f'{indent}{json.dumps(name)}: {json.dumps(body)}'

    if body_text.strip() == "":
        new_body = "\n" + entry_line
    else:
        stripped = body_text.rstrip()
        new_body = stripped + ",\n" + entry_line
    new_body = new_body + closing_indent

    return raw[:open_brace_end] + new_body + raw[close_start:], 1


# The ONLY repairs Phase 4 will plan. Keyed by the Phase 3 signature name
# (the `source` on an INFERRED cause).
REPAIR_TABLE = {
    "missing_script": _repair_missing_script,
}


def _signature_of(diagnosis) -> str:
    """Extract the signature name from the Phase 3 cause source."""
    source = diagnosis.likely_cause.source
    if source.startswith("signature:"):
        return source.split(":", 1)[1]
    return ""


def is_plannable(diagnosis) -> bool:
    """True only when a bounded, deterministic repair exists."""
    return _signature_of(diagnosis) in REPAIR_TABLE


def _risk_for(diagnosis) -> RiskLevel:
    """Risk rises with the blast radius of the planned edit."""
    if diagnosis.category.statement in {"configuration", "dependency"}:
        return RiskLevel.LOW
    if diagnosis.category.statement in {"build", "compile", "type"}:
        return RiskLevel.MEDIUM
    return RiskLevel.HIGH


def _combined_output(diagnosis) -> str:
    """Reassemble the analysed text from the Phase 3 evidence list.

    Phase 4 does not re-run or re-capture anything: this only recovers what
    Phase 3 already observed, so the planner matches against exactly the
    evidence the diagnosis was built from.
    """
    parts: list[str] = []
    for item in diagnosis.evidence:
        if not item.source.startswith("signature:"):
            continue
        _, _, tail = item.statement.partition("diagnostic: ")
        if tail:
            parts.append(tail.rstrip("."))
    return "\n".join(parts)


class RepairPlanner:
    """Builds a RepairProposal from a Phase 3 Diagnosis."""

    def plan(self, diagnosis, project_id: str) -> RepairProposal:
        signature = _signature_of(diagnosis)
        repair = REPAIR_TABLE.get(signature)

        if repair is None:
            return RepairProposal(
                supported=False,
                execution_id=diagnosis.execution_id,
                signature=signature,
                reason=(
                    f"No deterministic repair is defined for signature "
                    f"'{signature or 'unknown'}'. Phase 4 does not invent "
                    "edits; this failure needs human judgement."
                ),
                requires_approval=True,
                auto_appliable=False,
            )

        # Phase 3's confidence gates the write: a weak diagnosis must never
        # silently rewrite a file.
        risk = _risk_for(diagnosis)
        requires_approval = diagnosis.confidence < 60 or risk == RiskLevel.HIGH

        ctx = PlanContext(project_id, _combined_output(diagnosis))
        result = repair(ctx)
        if result is None:
            return RepairProposal(
                supported=False,
                execution_id=diagnosis.execution_id,
                signature=signature,
                reason=(
                    "A repair rule exists for this signature, but the required "
                    "project file or convention was not present, so no safe "
                    "minimal edit could be derived."
                ),
                risk=risk.value,
                requires_approval=True,
                auto_appliable=False,
            )

        path, after = result
        before = ctx.read(path)
        if before is None or before == after:
            return RepairProposal(
                supported=False,
                execution_id=diagnosis.execution_id,
                signature=signature,
                reason="The target file could not be read, or is already correct.",
                risk=risk.value,
                requires_approval=True,
                auto_appliable=False,
            )

        return RepairProposal(
            supported=True,
            execution_id=diagnosis.execution_id,
            signature=signature,
            reason=f"Minimal edit for signature '{signature}'.",
            changes=[PlannedChange(path=path, before=before, after=after)],
            risk=risk.value,
            requires_approval=requires_approval,
            auto_appliable=(not requires_approval),
        )
