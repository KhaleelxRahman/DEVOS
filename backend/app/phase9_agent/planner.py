"""Real model planning for the Phase 9 agent.

Uses the EXISTING ``AIService`` provider abstraction - the same one the chat
composer uses - rather than introducing a second provider layer. Context comes
from the EXISTING ``ContextService.build_project_context``, which is already
size-bounded and already sanitises secrets, so the agent neither ships a whole
repository to a model nor sends it credentials.

The fallback is explicit. When no real model is configured, or the model
returns something unusable, the agent says so in the step evidence and falls
back to a deterministic, capability-derived plan. It never presents a fallback
plan as if a model produced it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.phase9_agent.validation import ProposalRejected, validate_plan
from app.services.ai_service import AIService
from app.services.context_service import ContextService
from app.services.quality_service import QualityService

PLAN_PROMPT = """You are the planner inside DEVOS, a development agent.

Project context:
{context}

Task from the user:
{task}

Respond with ONE JSON object and nothing else. No prose, no markdown fences.
Schema:
{{
  "goal": "one sentence restating the task",
  "summary": "what you will do, in 1-3 sentences",
  "files_to_modify": ["relative/path"],
  "files_to_create": ["relative/path"],
  "commands_required": ["command the project needs"],
  "tests_required": ["what must be proven"],
  "verification_steps": ["how to confirm it works"],
  "risk_level": "low" | "medium" | "high",
  "requires_approval": false
}}

Rules: use only paths that already appear in the file tree, or new paths in
existing folders. Never reference .env, .git, node_modules, credentials or
secrets. Never propose force-push, merge to main, deploy or destructive
commands."""


@dataclass
class AIOutcome:
    """What actually happened on the AI call - never inferred."""

    used_ai: bool
    provider: str
    model: str
    is_mock: bool
    usage_source: str
    total_tokens: int | None = None
    error: str | None = None
    rejected: str | None = None
    # The real provider response, so the caller can charge real usage against
    # the run's token ceiling instead of guessing after the fact.
    usage: Any | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "used_ai": self.used_ai,
            "provider": self.provider,
            "model": self.model,
            "is_mock": self.is_mock,
            "usage_source": self.usage_source,
            "total_tokens": self.total_tokens,
            "error": self.error,
            "rejected": self.rejected,
        }


@dataclass
class PlanResult:
    plan: dict[str, Any]
    outcome: AIOutcome
    # The real provider response, so the caller can charge the real usage
    # against the run's token ceiling instead of guessing after the fact.
    usage: Any | None = None


def deterministic_plan(task: str, project_id: str) -> dict[str, Any]:
    """Capability-derived plan used when no real model is available."""
    supported: set[str] = set()
    try:
        supported = {
            info.operation
            for info in QualityService.detect(project_id)
            if getattr(info, "available", False)
        }
    except Exception:  # noqa: BLE001 - detection is best-effort context
        supported = set()
    steps = ["EDITING", "BUILDING", "TESTING", "VERIFYING"]
    if not supported:
        steps.append("DIAGNOSING/FAILED (no quality operations detected)")
    return {
        "goal": task,
        "summary": (
            "Deterministic plan: no real model is configured, so DEVOS planned "
            "from the project's real capabilities instead of a language model."
        ),
        "files_to_modify": [],
        "files_to_create": [],
        "commands_required": sorted(supported),
        "tests_required": ["the project's own test operation must pass"],
        "verification_steps": ["re-run the test operation independently"],
        "risk_level": "low",
        "requires_approval": False,
        "source": "deterministic_fallback",
        "quality_ops_available": sorted(supported),
        "plan_steps": steps,
    }


async def build_plan(
    db: AsyncSession,
    project_id: str,
    user_id: str,
    task: str,
    ai: AIService | None = None,
    timeout: float = 60.0,
) -> PlanResult:
    """Produce a validated plan, preferring a real model when one is configured."""
    ai = ai or AIService.from_settings()

    try:
        context = await ContextService.build_project_context(db, project_id, user_id)
    except Exception:  # noqa: BLE001 - never fail the run on context building
        context = {}

    status = ai.status()
    if status["is_mock"]:
        return PlanResult(
            plan=deterministic_plan(task, project_id),
            outcome=AIOutcome(
                used_ai=False,
                provider=status["provider"],
                model=status["model"],
                is_mock=True,
                usage_source="none",
                error="no real AI provider is configured (AI_PROVIDER/AI_API_KEY)",
            ),
        )

    context_text = ContextService.sanitize_text(
        str(context.get("readme") or "")[:2000]
    )
    parsed, response = await ai.structured(
        PLAN_PROMPT.format(
            context=context_text or "(no context available)", task=task
        ),
        context,
        timeout=timeout,
    )

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
            "provider returned no parsable JSON plan"
            if not response.error
            else f"provider call failed: {response.error}"
        )
        return PlanResult(
            plan=deterministic_plan(task, project_id), outcome=outcome, usage=usage
        )

    try:
        plan = validate_plan(parsed, project_id)
    except ProposalRejected as exc:
        outcome.rejected = f"plan rejected by validation: {exc.reason}"
        return PlanResult(
            plan=deterministic_plan(task, project_id), outcome=outcome, usage=usage
        )

    plan["source"] = "ai_model"
    outcome.used_ai = True
    return PlanResult(plan=plan, outcome=outcome, usage=usage)

