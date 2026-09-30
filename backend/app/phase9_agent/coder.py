"""Real model code generation for the Phase 9 agent.

The pipeline is deliberately one-directional and every stage is a gate:

    LLM
     -> structured change proposal (JSON)
     -> validation      (shape, operation whitelist)
     -> safety checks   (paths, off-limits files, blocked intent)
     -> FileService     (the ONLY thing that touches the filesystem)
     -> real files

The model never mutates anything. It emits JSON; ``FileService`` - the same
service the rest of DEVOS uses - performs the write, which means path
traversal, sensitive files and size limits are enforced by existing,
already-tested code rather than by a second implementation here.

When no real model is configured, this returns zero changes and says so. The
agent does not fabricate an implementation it never received.
"""

from __future__ import annotations

from typing import Any

from app.phase9_agent.planner import AIOutcome
from app.phase9_agent.validation import (
    ProposalRejected,
    ValidatedChange,
    command_needs_approval,
    screen_command,
    validate_changes,
)
from app.services.ai_service import AIService
from app.services.context_service import ContextService
from app.services.file_service import FileService

CODE_PROMPT = """You are the code editor inside DEVOS, a development agent.

Task:
{task}

{context_heading}
{context}

Existing files you may reference:
{files}

Respond with ONE JSON object and nothing else:
{{"changes": [
  {{"path": "relative/path", "operation": "create|modify|append",
    "content": "the COMPLETE new file content", "reason": "why"}}
]}}

Hard rules:
- "content" must be the COMPLETE file content, not a diff or an excerpt.
- Only create/modify files you have been asked to touch.
- Never output .env, .git, node_modules, credentials, or keys.
- Never output deploy, force-push, or destructive commands."""


def _file_excerpt(project_id: str, paths: list[str], per_file: int = 1200) -> str:
    out: list[str] = []
    for path in paths[:8]:
        try:
            content = FileService.get_file_content(project_id, path).content
        except Exception:  # noqa: BLE001 - unreadable file is just omitted
            continue
        out.append(f"--- {path} ---\n{content[:per_file]}")
    return "\n".join(out)[:8000]


def _project_files(project_id: str) -> list[str]:
    """Flat list of project file paths, via the existing file tree service."""
    try:
        tree = FileService.get_file_tree(project_id)
    except Exception:  # noqa: BLE001
        return []
    paths: list[str] = []

    def collect(nodes: Any) -> None:
        for node in nodes or []:
            if isinstance(node, dict):
                if node.get("path"):
                    paths.append(str(node["path"]))
                collect(node.get("children"))

    collect(tree)
    return paths[:400]


async def propose_changes(
    project_id: str,
    task: str,
    plan: dict[str, Any] | None = None,
    context: dict[str, Any] | None = None,
    ai: AIService | None = None,
    last_failure: str | None = None,
    timeout: float = 60.0,
) -> tuple[list[ValidatedChange], AIOutcome, list[dict[str, Any]]]:
    """Ask the model for changes, validate them, and return them UNAPPLIED.

    Returns ``(changes, outcome, applied_records)``; the caller applies the
    changes through ``apply_changes`` so the orchestrator keeps control of when
    the filesystem is touched.
    """
    ai = ai or AIService.from_settings()
    status = ai.status()

    if status["is_mock"]:
        return [], AIOutcome(
            used_ai=False,
            provider=status["provider"],
            model=status["model"],
            is_mock=True,
            usage_source="none",
            error="no real AI provider is configured; the agent will not invent code",
        ), []

    files = _project_files(project_id)
    targets = (plan or {}).get("files_to_modify") or []
    targets = [t for t in targets if isinstance(t, str)][:8]
    excerpt = _file_excerpt(project_id, targets) if targets else ""

    context_heading = "Current failure to fix:" if last_failure else ""
    prompt = CODE_PROMPT.format(
        task=task,
        context_heading=context_heading,
        context=last_failure[:3000] if last_failure else "(no prior failure)",
        files=excerpt or "\n".join(files[:120]) or "(no files)",
    )

    parsed, response = await ai.structured(prompt, context or {}, timeout=timeout)
    usage = response.usage
    outcome = AIOutcome(
        used_ai=False,
        provider=response.provider,
        model=response.model or status["model"],
        is_mock=False,
        usage_source=usage.source if usage else "none",
        total_tokens=usage.total_tokens if usage else None,
        error=response.error,
        usage=usage,
    )

    if parsed is None:
        outcome.rejected = (
            "provider returned no parsable change proposal"
            if not response.error
            else f"provider call failed: {response.error}"
        )
        return [], outcome, []

    # Screen the model's commands BEFORE validating its changes: a proposal
    # whose command list is dangerous must be refused on that ground, even if
    # its (empty or malformed) change list fails validation first.
    escalations: list[dict[str, Any]] = []
    for command in (parsed.get("commands") or []):
        if not isinstance(command, str):
            continue
        forbidden, kind, detail = screen_command(command)
        if forbidden:
            outcome.rejected = f"model proposed a blocked command ({detail})"
            return [], outcome, escalations
        approval_kind, approval_detail = command_needs_approval(command)
        if approval_kind:
            escalations.append(
                {"command": command, "kind": approval_kind, "detail": approval_detail}
            )

    try:
        changes = validate_changes(project_id, parsed.get("changes"))
    except ProposalRejected as exc:
        outcome.rejected = f"change proposal rejected: {exc.reason}"
        return [], outcome, escalations

    outcome.used_ai = True
    return changes, outcome, escalations


def apply_changes(
    project_id: str, changes: list[ValidatedChange]
) -> list[dict[str, Any]]:
    """Apply validated changes through the EXISTING FileService.

    All-or-nothing by validation (see ``validate_changes``); per-file failures
    here are recorded rather than raised, so one bad write does not leave the
    caller guessing what landed. Every record states what really happened.
    """
    records: list[dict[str, Any]] = []
    for change in changes:
        record: dict[str, Any] = change.to_dict()
        try:
            if change.operation == "create" and not change.existed:
                FileService.create_file(
                    project_id,
                    change.path.rsplit("/", 1)[0] if "/" in change.path else "",
                    change.path.rsplit("/", 1)[-1],
                    change.content,
                )
            elif change.operation == "append" and change.existed:
                existing = FileService.get_file_content(project_id, change.path).content
                FileService.save_file(
                    project_id, change.path, existing + change.content
                )
            else:
                if not change.existed:
                    FileService.create_file(
                        project_id,
                        change.path.rsplit("/", 1)[0] if "/" in change.path else "",
                        change.path.rsplit("/", 1)[-1],
                        change.content,
                    )
                else:
                    FileService.save_file(project_id, change.path, change.content)
            record["result"] = "written"
        except Exception as exc:  # noqa: BLE001 - recorded, never swallowed
            record["result"] = "failed"
            record["error"] = f"{type(exc).__name__}: {exc}"
        records.append(record)
    return records

