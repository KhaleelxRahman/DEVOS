"""Validation for anything a model produced.

The rule this module exists to enforce: raw model output is DATA, never an
instruction. Nothing here executes a model string. A proposal is only ever
turned into a filesystem change after it has been:

1. shape-validated (required keys, correct types),
2. path-validated through the *existing* ``FileService.validate_safe_path``,
   so traversal and sensitive-file rules stay in one place,
3. operation-checked against a fixed whitelist,
4. screened for dangerous intent that must be surfaced for approval,
5. screened for secrets, which are redacted rather than written.

A rejected proposal is a normal, expected outcome and is reported as such.
It is never coerced into something executable.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.phase9_agent.redaction import redact, redact_structure
from app.services.file_service import FileService

# The only file operations the agent will ever perform. Anything else in model
# output is unsupported, not "handled creatively".
ALLOWED_OPERATIONS = frozenset({"create", "modify", "append"})

# Paths a model must never be allowed to touch.
FORBIDDEN_PATH_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"(^|/)\.git(/|$)"),
    re.compile(r"(^|/)\.env(\.|$)"),
    re.compile(r"(^|/)node_modules(/|$)"),
    re.compile(r"(^|/)\.github/workflows/"),
    re.compile(r"(^|/)id_rsa(\.pub)?$"),
)

# Commands refused outright rather than approval-gated: the Phase 9 approval
# flow covers commits, not arbitrary shell execution.
FORBIDDEN_COMMAND_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("force-push", re.compile(r"(?i)\bpush\b.*(--force\b|\s-f\b)")),
    ("merge-main", re.compile(r"(?i)\bgit\s+merge\b.*\bmain\b")),
    ("reset-hard", re.compile(r"(?i)\bgit\s+reset\b.*--hard")),
    ("clean-force", re.compile(r"(?i)\bgit\s+clean\b.*-[a-z]*f")),
    ("history-rewrite", re.compile(r"(?i)\bgit\s+(filter-branch|rebase)\b")),
    ("remote-delete", re.compile(r"(?i)\bgit\s+push\b.*--delete\b")),
    ("sudo", re.compile(r"(?i)\bsudo\b")),
    ("chmod-777", re.compile(r"(?i)\bchmod\s+(-R\s+)?777\b")),
    ("destructive-rm", re.compile(r"(?i)\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(/|\*)")),
    ("pipe-to-shell", re.compile(r"(?i)\b(curl|wget)\b[^|]*\|\s*(ba)?sh\b")),
    ("credential-exfiltration", re.compile(
        r"(?i)\b(curl|wget|fetch)\b[^|;]*\b(creds?|credentials?|secrets?|\.env|id_rsa|"
        r"access[_-]?token|api[_-]?key)\b"
    )),
    ("shutdown", re.compile(r"(?i)\b(shutdown|reboot|halt|poweroff)\b")),
    ("fork-bomb", re.compile(r":\(\)\s*\{\s*:\|:&\s*\}\s*;:")),
)

# Risky-but-reviewable intent: raises RequiresApproval for the UI, never runs.
_APPROVAL_COMMAND_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("deploy", re.compile(
        r"(?i)\b(deploy|vercel|netlify|render|flyctl|kubectl|helm|terraform\s+apply)\b"
    )),
    ("npm-publish", re.compile(r"(?i)\bnpm\s+publish\b")),
    ("package-upload", re.compile(r"(?i)\b(twine|pip\s+install\s+--index-url)\b")),
    ("database-mutation", re.compile(
        r"(?i)\b(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE|DELETE\s+FROM)\b"
    )),
)

MAX_PROPOSED_BYTES = 400_000
MAX_CHANGES_PER_PROPOSAL = 20
MAX_PATH_LENGTH = 240


class RequiresApproval(Exception):
    """The model asked for something that must be shown to the user first."""

    def __init__(self, kind: str, detail: str) -> None:
        super().__init__(f"{kind}: {detail}")
        self.kind = kind
        self.detail = detail


class ProposalRejected(Exception):
    """The model's output is malformed, unsafe or out of scope."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass
class ValidatedChange:
    """One filesystem change that survived every check."""

    path: str
    operation: str
    content: str
    reason: str = ""
    existed: bool = False
    warnings: list[str] = field(default_factory=list)
    redacted: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "operation": self.operation,
            "reason": self.reason,
            "existed": self.existed,
            "warnings": self.warnings,
            "secrets_redacted": self.redacted,
            "bytes": len(self.content.encode("utf-8")),
        }


def screen_command(command: str) -> tuple[bool, str | None, str | None]:
    """Classify a command string. Returns ``(forbidden, kind, detail)``."""
    if not command:
        return False, None, None
    for kind, pattern in FORBIDDEN_COMMAND_PATTERNS:
        if pattern.search(command):
            return True, kind, f"refused: matches blocked pattern '{kind}'"
    return False, None, None


def command_needs_approval(command: str) -> tuple[str | None, str | None]:
    """Risky-but-reviewable commands, which must be surfaced, never run."""
    for kind, pattern in _APPROVAL_COMMAND_PATTERNS:
        if pattern.search(command):
            return kind, f"requires explicit user approval: '{kind}'"
    return None, None


def _validate_path(project_id: str, path: Any) -> str:
    if not isinstance(path, str) or not path.strip():
        raise ProposalRejected("change path must be a non-empty string")
    clean = path.strip().replace("\\", "/").lstrip("/")
    if len(clean) > MAX_PATH_LENGTH:
        raise ProposalRejected(f"change path exceeds {MAX_PATH_LENGTH} characters")
    if ".." in clean.split("/"):
        raise ProposalRejected(f"path traversal rejected: {path!r}")
    for pattern in FORBIDDEN_PATH_PATTERNS:
        if pattern.search(clean):
            raise ProposalRejected(f"path is off-limits to the agent: {clean!r}")
    # Delegate the real filesystem + sensitive-file rules to FileService so
    # there is exactly one implementation of them.
    FileService.validate_safe_path(project_id, clean)
    return clean


def _exists(project_id: str, path: str) -> bool:
    import os

    try:
        return os.path.isfile(FileService.validate_safe_path(project_id, path))
    except Exception:  # noqa: BLE001 - existence is best-effort context only
        return False


def validate_change(project_id: str, raw: Any) -> ValidatedChange:
    """Validate ONE model-proposed change, or raise ``ProposalRejected``."""
    if not isinstance(raw, dict):
        raise ProposalRejected("each change must be a JSON object")

    operation = raw.get("operation")
    if operation is None:
        operation = "modify"
    if not isinstance(operation, str) or not operation.strip():
        raise ProposalRejected("operation must be a non-empty string")
    operation = operation.strip().lower()
    if operation not in ALLOWED_OPERATIONS:
        raise ProposalRejected(
            f"unsupported operation {operation!r}; allowed: {sorted(ALLOWED_OPERATIONS)}"
        )

    path = _validate_path(project_id, raw.get("path"))

    content = raw.get("content")
    if content is None:
        raise ProposalRejected(f"change for {path!r} has no content")
    if not isinstance(content, str):
        raise ProposalRejected(f"change for {path!r} content must be a string")
    if len(content.encode("utf-8")) > MAX_PROPOSED_BYTES:
        raise ProposalRejected(f"change for {path!r} exceeds {MAX_PROPOSED_BYTES} bytes")

    # A model echoing a credential is a leak in the other direction.
    safe_content = redact(content)
    redacted = safe_content != content

    return ValidatedChange(
        path=path,
        operation=operation,
        content=safe_content,
        reason=redact(str(raw.get("reason") or "")[:500]),
        existed=_exists(project_id, path),
        warnings=(["secrets redacted from proposed content"] if redacted else []),
        redacted=redacted,
    )


def validate_changes(project_id: str, raw: Any) -> list[ValidatedChange]:
    """Validate a whole proposal, all-or-nothing.

    A partially applied proposal is the worst outcome: the project ends up in a
    state neither the model nor the user described. So every entry is validated
    before anything is applied.
    """
    if not isinstance(raw, list):
        raise ProposalRejected("'changes' must be a JSON array")
    if not raw:
        raise ProposalRejected("'changes' is empty")
    if len(raw) > MAX_CHANGES_PER_PROPOSAL:
        raise ProposalRejected(
            f"proposal has {len(raw)} changes; the cap is {MAX_CHANGES_PER_PROPOSAL}"
        )
    seen: set[str] = set()
    out: list[ValidatedChange] = []
    for entry in raw:
        change = validate_change(project_id, entry)
        if change.path in seen:
            raise ProposalRejected(f"duplicate target path in proposal: {change.path!r}")
        seen.add(change.path)
        out.append(change)
    return out



# ---------------------------------------------------------------- plan schema
PLAN_REQUIRED = ("goal", "summary")
PLAN_LIST_FIELDS = (
    "files_to_modify", "files_to_create", "commands_required",
    "tests_required", "verification_steps",
)
PLAN_RISK_LEVELS = frozenset({"low", "medium", "high"})


def validate_plan(raw: Any, project_id: str) -> dict[str, Any]:
    """Validate a structured plan. Raises ``ProposalRejected`` when unusable."""
    if not isinstance(raw, dict):
        raise ProposalRejected("plan must be a JSON object")
    missing = [f for f in PLAN_REQUIRED if not str(raw.get(f) or "").strip()]
    if missing:
        raise ProposalRejected(f"plan is missing required field(s): {missing}")

    plan: dict[str, Any] = {
        "goal": str(raw["goal"])[:1000],
        "summary": str(raw["summary"])[:2000],
        "risk_level": str(raw.get("risk_level") or "medium").strip().lower(),
        "requires_approval": bool(raw.get("requires_approval", False)),
    }
    if plan["risk_level"] not in PLAN_RISK_LEVELS:
        raise ProposalRejected(
            f"unknown risk_level {plan['risk_level']!r}; "
            f"allowed: {sorted(PLAN_RISK_LEVELS)}"
        )

    for name in PLAN_LIST_FIELDS:
        value = raw.get(name) or []
        if not isinstance(value, list):
            raise ProposalRejected(f"plan field {name!r} must be an array")
        plan[name] = [str(v)[:400] for v in value[:50]]

    approval_reasons: list[str] = []
    # Every command a plan names is screened. Blocked = hard reject.
    # Reviewable = escalate to the user rather than run it.
    for command in plan["commands_required"]:
        forbidden, _kind, detail = screen_command(command)
        if forbidden:
            raise ProposalRejected(f"plan requests a blocked command ({detail})")
        approval_kind, _ = command_needs_approval(command)
        if approval_kind:
            plan["requires_approval"] = True
            approval_reasons.append(f"command: {approval_kind}")

    # Plan file references are held to the same path rules as actual changes.
    for name in ("files_to_modify", "files_to_create"):
        for path in plan[name]:
            try:
                _validate_path(project_id, path)
            except ProposalRejected as exc:
                raise ProposalRejected(f"plan {name}: {exc.reason}") from exc

    if plan["risk_level"] == "high":
        plan["requires_approval"] = True
        approval_reasons.append("plan declared itself high risk")

    if approval_reasons:
        plan["approval_reasons"] = approval_reasons
    return redact_structure(plan)

