"""Phase 9 — the autonomous development agent loop.

An orchestrator and nothing else. It sequences work and enforces safety limits;
it does not implement building, executing, diagnosing or repairing. Each of
those is delegated to the service that already owns it:

    PLANNING   Phase 6 repo index / Phase 2C quality detection
    EDITING    Phase 1 FileService        (real writes)
    BUILDING   Phase 2 ExecutionService   (real process, real exit code)
    TESTING    Phase 2 ExecutionService   (real process, real exit code)
    DIAGNOSING Phase 3 DiagnosisService   (grounded diagnosis)
    FIXING     Phase 4 RepairService      (planned edits, rollback backups)
    VERIFYING  Phase 2 ExecutionService   (independent re-run)
    commits    Phase 5                    (PROPOSED, never applied)

Locked decisions implemented here: Model B (bounded recovery loop), one project
per run, approve-the-commit-batch-once, hard token ceiling.

Three rules are structural, not stylistic:

1. Every transition is written to the run row, with its proof, before the next
   step acts on it — so the reported state is the state that actually ran.
2. COMPLETED is only reached when every step carries verifying evidence.
   Anything else is FAILED with the real reason. No evidence, no COMPLETED.
3. Nothing is committed, deployed, force-pushed or merged here.
"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_run import AGENT_STATES, AgentRun
from app.models.user import User
from app.phase3_diagnostics.service import DiagnosisService
from app.phase4_repair.service import RepairApplyError, RepairService
from app.phase9_agent.coder import apply_changes, propose_changes
from app.phase9_agent.planner import build_plan
from app.phase9_agent.redaction import redact_structure
from app.schemas.execution import QUALITY_OPERATIONS
from app.services.ai_service import AIService
from app.services.execution_service import ExecutionService
from app.services.file_service import FileService
from app.services.project_service import ProjectService
from app.services.quality_service import QualityService


class AgentLimitExceeded(Exception):
    """A safety limit stopped the run."""

    def __init__(self, limit: str, detail: str) -> None:
        super().__init__(f"{limit}: {detail}")
        self.limit = limit
        self.detail = detail


class AgentCancelled(Exception):
    """The user asked the run to stop and the loop honoured it."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


# Never performed automatically. If a future phase genuinely needs one, it must
# be surfaced for explicit approval rather than run inside the loop.
FORBIDDEN_AUTONOMOUS_ACTIONS: frozenset[str] = frozenset(
    {
        "deploy",
        "force-push",
        "merge-main",
        "delete-unrelated-files",
        "destructive-command",
        "exfiltrate-secrets",
        "commit",
        "push",
    }
)


class AgentService:
    """Sequencing + safety for one bounded run over one project."""

    @staticmethod
    async def get_owned_run(db: AsyncSession, run_id: str, user: User) -> AgentRun:
        run = (
            await db.execute(select(AgentRun).where(AgentRun.id == run_id))
        ).scalar_one_or_none()
        if run is None or run.user_id != user.id:
            # Never leak another user's run through a wrong-id guess.
            raise ValueError("AGENT_RUN_NOT_FOUND")
        return run

    @staticmethod
    def _record(
        run: AgentRun,
        state: str,
        detail: str,
        evidence: dict[str, Any] | None = None,
    ) -> None:
        if state not in AGENT_STATES:
            raise ValueError(f"invalid agent state: {state}")
        run.state = state
        steps = list(run.steps or [])
        # Evidence is persisted and rendered in the UI, so it is redacted on the
        # way in. A token echoed by a command's output must not become a stored
        # credential leak.
        steps.append(
            {
                "state": state,
                "detail": redact_structure(detail),
                "evidence": redact_structure(evidence or {}),
                "at": time.time(),
            }
        )
        run.steps = steps

    @staticmethod
    async def _check_limits(db: AsyncSession, run: AgentRun) -> None:
        """Runs at every step boundary. Raises on a real limit or a real stop.

        The run is re-read from the database first, and that is the whole point:
        the loop and the cancel endpoint use different sessions, so a run object
        held in memory never sees the cancel flag the user just set. Without
        this refresh, "stop" was a column the loop politely ignored.

        Only externally-owned fields are refreshed. The loop's own counters
        (iteration, repair_attempts, estimated_tokens) are deliberately
        excluded: re-reading those would discard increments the loop has not
        committed yet, and silently undo its own limits.
        """
        await db.refresh(run, attribute_names=[
            "cancel_requested",
            "max_runtime_seconds", "max_iterations", "max_repair_attempts",
            "max_tokens", "created_at",
        ])
        if run.cancel_requested:
            raise AgentCancelled("user requested stop")
        # created_at round-trips through SQLite as a NAIVE datetime even though
        # the column is declared timezone=True, so comparing it against
        # time.time() silently applied the machine's UTC offset (which made the
        # runtime limit trip on the very first check). Compare in UTC instead.
        created = run.created_at
        if run.max_runtime_seconds and created is not None:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if (
                datetime.now(timezone.utc) - created
            ).total_seconds() > run.max_runtime_seconds:
                raise AgentLimitExceeded(
                    "MAX_RUNTIME", f"exceeded {run.max_runtime_seconds}s"
                )
        if run.max_iterations and run.iteration > run.max_iterations:
            raise AgentLimitExceeded(
                "MAX_ITERATIONS", f"exceeded {run.max_iterations}"
            )
        if run.max_repair_attempts and run.repair_attempts > run.max_repair_attempts:
            raise AgentLimitExceeded(
                "MAX_REPAIR_ATTEMPTS", f"exceeded {run.max_repair_attempts}"
            )
        # An agent that can call a model without limit can spend without limit.
        if run.max_ai_calls and run.ai_calls > run.max_ai_calls:
            raise AgentLimitExceeded(
                "MAX_AI_CALLS", f"exceeded {run.max_ai_calls} AI calls"
            )
        # Locked Decision 5 C: a hard ceiling. Halting is not success.
        # Enforced against the honest total: real provider usage when the
        # provider reported it, otherwise the local estimate. Never against a
        # fabricated zero.
        if run.max_tokens and AgentService.tokens_charged(run) >= run.max_tokens:
            raise AgentLimitExceeded(
                "MAX_TOKENS", f"exceeded {run.max_tokens} tokens"
            )

    @staticmethod
    def tokens_charged(run: AgentRun) -> int:
        """Tokens charged against the ceiling.

        Real provider-reported totals win when present. Otherwise the local
        estimate is used, and the run's ``token_usage_source`` says so, so the
        number is never mistaken for provider truth.
        """
        if run.provider_total_tokens is not None and run.token_usage_source == "provider_reported":
            return int(run.provider_total_tokens or 0)
        return int(run.estimated_tokens or 0)

    @staticmethod
    def charge_tokens(run: AgentRun, usage) -> None:
        """Record one AI call's usage honestly."""
        run.ai_calls += 1
        if usage is None:
            return
        source = getattr(usage, "source", "none")
        run.token_usage_source = source
        if source == "provider_reported":
            run.provider_input_tokens = usage.input_tokens
            run.provider_output_tokens = usage.output_tokens
            run.provider_total_tokens = usage.total_tokens
        elif source == "estimated":
            run.estimated_tokens += int(
                (usage.input_tokens or 0) + (usage.output_tokens or 0)
            )

    @staticmethod
    def note_failure(run: AgentRun, signature: str | None) -> int:
        """Track consecutive identical failures and count the repeat."""
        signature = (signature or "").strip()[:200]
        if signature and signature == run.last_failure_signature:
            run.repeated_failure_count += 1
        else:
            run.repeated_failure_count = 1
            run.last_failure_signature = signature or None
        return run.repeated_failure_count


    @staticmethod
    async def execute(
        db: AsyncSession, run_id: str, ai: AIService | None = None
    ) -> AgentRun:
        """Run the bounded loop to a terminal state and return the run.

        ``ai`` is an injection point. Production passes None (the loop builds
        the provider from settings); tests pass a real AIService wrapping a
        stub provider, which is how token accounting is proven against genuine
        provider-reported usage rather than a mock shortcut.
        """
        run = (
            await db.execute(select(AgentRun).where(AgentRun.id == run_id))
        ).scalar_one()
        user = run.user
        project_id = run.project_id
        await ProjectService.get_for_user(db, project_id, user.id)

        try:
            await AgentService._loop(db, run, user, project_id, ai=ai)
        except AgentCancelled as exc:
            run.state = "CANCELLED"
            run.terminal_reason = f"stopped by user ({exc.detail})"
            AgentService._record(run, "CANCELLED", run.terminal_reason, {"stopped": "user"})
        except AgentLimitExceeded as exc:
            # A tripped limit is a real, non-success outcome — never COMPLETED.
            run.state = "FAILED"
            run.terminal_reason = f"{exc.limit} tripped: {exc.detail}"
            AgentService._record(run, "FAILED", run.terminal_reason, {"limit": exc.limit})
        except Exception as exc:  # noqa: BLE001 - the loop must never die silently
            run.state = "FAILED"
            run.terminal_reason = f"{type(exc).__name__}: {exc}"
            AgentService._record(run, "FAILED", run.terminal_reason, {})

        await db.commit()
        await db.refresh(run)
        return run

    @staticmethod
    def _failure_signature(result: dict[str, Any]) -> str:
        """A stable fingerprint of one failure.

        Used to detect "same failure, same result" repetition. Built from the
        execution id, exit code and a normalised slice of stderr, because the
        raw output contains timestamps and paths that differ every run and
        would defeat the comparison.
        """
        stderr = (result.get("stderr_tail") or "").strip()
        normalized = " ".join(stderr.split())[:200]
        return f"{result.get('status')}|{result.get('exit_code')}|{normalized}"

    @staticmethod
    async def _finalize(
        db: AsyncSession,
        run: AgentRun,
        user: User,
        project_id: str,
        build: dict[str, Any],
        test: dict[str, Any],
        edits: list[dict[str, Any]],
    ) -> dict[str, Any] | None:
        """VERIFYING -> REVIEW -> WAITING_FOR_APPROVAL -> COMPLETED.

        COMPLETED requires a successful INDEPENDENT re-run of the test
        operation, not merely that the previous command returned 0. Returns
        None when the run completed, or the failed verification result when the
        re-run disagreed - in which case the caller must diagnose it rather
        than claim success.
        """
        verify = await AgentService._run_quality(
            db, run, user, project_id, "TEST"
        )
        AgentService._record(
            run, "VERIFYING", "re-ran the test operation to confirm", verify
        )
        await db.commit()
        if not verify.get("ok"):
            return verify

        run.commit_proposals = AgentService._propose_commits(edits)
        run.approval_state = "PENDING" if run.commit_proposals else "NOT_REQUIRED"
        run.summary = (
            f"Completed on iteration {run.iteration}: build exit "
            f"{build.get('exit_code')}, test exit {test.get('exit_code')}, "
            f"confirmed by an independent re-run."
        )
        AgentService._record(
            run, "REVIEW", "reviewed the verification evidence before finishing",
            {
                "verified": True,
                "build_execution_id": build.get("execution_id"),
                "verify_execution_id": verify.get("execution_id"),
                "files_changed": run.files_changed or [],
            },
        )
        if run.commit_proposals:
            # Nothing is in git yet. The user must say yes first.
            AgentService._record(
                run,
                "WAITING_FOR_APPROVAL",
                "proposed commits are NOT applied; awaiting the user",
                {"proposals": run.commit_proposals},
            )
        AgentService._record(
            run, "COMPLETED", run.summary, {"commits": run.commit_proposals}
        )
        return None

    @staticmethod
    async def _loop(
        db: AsyncSession,
        run: AgentRun,
        user: User,
        project_id: str,
        ai: AIService | None = None,
    ) -> None:
        """The bounded loop.

        Sequence: PLANNING -> (EDITING -> BUILDING -> TESTING -> VERIFYING |
        DIAGNOSING -> FIXING -> RETESTING) per iteration -> REVIEW ->
        WAITING_FOR_APPROVAL -> COMPLETED.

        Every branch below ends in a real state with real evidence, or an
        honest failure. No path reports success without a real independent
        verification run behind it.
        """
        ai = ai or AIService.from_settings()
        plan_result = await build_plan(db, project_id, user.id, run.task, ai=ai)
        # Charge the real usage from the provider call, not a blind increment.
        AgentService.charge_tokens(run, plan_result.outcome.usage)
        run.plan = plan_result.plan
        plan = plan_result.plan

        AgentService._record(
            run,
            "PLANNING",
            f"plan from {plan_result.outcome.provider}"
            f"{' (validated model output)' if plan_result.outcome.used_ai else ''}",
            {
                "plan": plan,
                "ai": plan_result.outcome.to_dict(),
                "usage_source": run.token_usage_source,
                "tokens_charged": AgentService.tokens_charged(run),
            },
        )
        await db.commit()
        await AgentService._check_limits(db, run)

        edits: list[dict[str, Any]] = []
        applied_once = False

        while True:
            run.iteration += 1
            await db.commit()
            await AgentService._check_limits(db, run)

            # ---- EDITING: real model changes, applied via FileService ----
            if not applied_once:
                changes, outcome, escalations = await propose_changes(
                    project_id, run.task, plan=plan, ai=ai,
                )
                AgentService.charge_tokens(run, outcome.usage)
                records = apply_changes(project_id, changes) if changes else []
                if changes:
                    edits = [{"path": c.path} for c in changes]
                applied_once = True
                record_file = AgentService._write_run_record(project_id, run)
                if record_file.get("written"):
                    # The run record is a real file this run created, so it
                    # belongs in the proposed commit batch like any other
                    # change - otherwise a run that wrote nothing would
                    # silently have nothing for the user to approve.
                    edits = [{"path": record_file["written"]}] + edits
                edit_evidence: dict[str, Any] = {
                    "ai": outcome.to_dict(),
                    "changes": records,
                    "run_record": record_file,
                    "escalations": escalations,
                    "usage_source": run.token_usage_source,
                }
            else:
                edit_evidence = {"skipped": "edits already applied this run"}
            AgentService._record(run, "EDITING", "workspace edits", edit_evidence)
            run.files_changed = edit_evidence.get("changes") or []
            await db.commit()
            await AgentService._check_limits(db, run)

            # ---- BUILDING + TESTING: real processes, real exit codes -----
            build = await AgentService._run_quality(
                db, run, user, project_id, "BUILD"
            )
            test = await AgentService._run_quality(db, run, user, project_id, "TEST")
            AgentService._record(run, "BUILDING", "build operation", build)
            AgentService._record(run, "TESTING", "test operation", test)
            await db.commit()

            if test.get("ok"):
                await AgentService._check_limits(db, run)
                # Returns None when the run completed, or the failed
                # verification result when the re-run disagreed.
                verify = await AgentService._finalize(
                    db, run, user, project_id, build, test, edits
                )
                if verify is None:
                    return
                test = verify  # verification disagreed; diagnose instead

            # No real execution means no real failure to diagnose. Saying so is
            # the honest outcome; claiming a diagnosis would invent one.
            if not test.get("execution_id"):
                run.state = "FAILED"
                run.terminal_reason = (
                    "no real test execution ran, so there is no failure to "
                    f"diagnose: {test.get('error') or test.get('skipped')}"
                )
                AgentService._record(run, "FAILED", run.terminal_reason, test)
                return

            # ---- loop prevention: identical failure, identical result ----
            signature = AgentService._failure_signature(test)
            repeats = AgentService.note_failure(run, signature)
            if repeats > run.max_repeated_failures:
                run.state = "FAILED"
                run.terminal_reason = (
                    f"REPEATED_FAILURE: the same failure occurred {repeats} times "
                    f"in a row (signature={signature!r}); stopping rather than "
                    f"looping"
                )
                AgentService._record(
                    run, "FAILED", run.terminal_reason,
                    {"signature": signature, "repeats": repeats},
                )
                return

            # ---- DIAGNOSING (Phase 3, real) ---------------------------
            run.repair_attempts += 1
            await db.commit()
            await AgentService._check_limits(db, run)
            diagnosis = await DiagnosisService.diagnose_latest_failure(
                db, user, project_id
            )
            run.diagnosis = {
                "execution_id": getattr(diagnosis, "execution_id", None),
                "detail": str(diagnosis)[:500],
            }
            AgentService._record(
                run, "DIAGNOSING",
                "grounded diagnosis of the real failing execution", run.diagnosis,
            )
            await db.commit()

            # ---- FIXING (Phase 4, real writes + rollback data) --------
            await AgentService._check_limits(db, run)
            proposal = RepairService.plan(diagnosis, project_id)
            if not proposal.supported or not proposal.changes:
                run.state = "FAILED"
                run.terminal_reason = (
                    f"REPAIR_UNSUPPORTED: {proposal.reason}"
                    if not proposal.supported
                    else "REPAIR_UNSUPPORTED: diagnosis produced no actionable change"
                )
                AgentService._record(
                    run, "FAILED", run.terminal_reason, {"signature": signature}
                )
                return
            try:
                diff, _backups = RepairService.apply(proposal, project_id)
            except RepairApplyError as exc:
                run.state = "FAILED"
                run.terminal_reason = f"repair apply failed: {exc}"
                AgentService._record(run, "FAILED", run.terminal_reason, {})
                return
            edits = edits + [{"path": c.path} for c in proposal.changes]
            AgentService._record(
                run, "FIXING",
                f"applied {len(proposal.changes)} deterministic repair edit(s)",
                {
                    "diff": diff[:1500],
                    "requires_approval": proposal.requires_approval,
                    "signature": signature,
                },
            )
            await db.commit()

            # ---- RETESTING: prove the repair changed the real result ----
            await AgentService._check_limits(db, run)
            retest = await AgentService._run_quality(
                db, run, user, project_id, "TEST"
            )
            AgentService._record(
                run, "RETESTING", "re-ran tests after the repair", retest
            )
            await db.commit()
            if not retest.get("ok"):
                run.state = "FAILED"
                run.terminal_reason = (
                    "repair did not resolve the failure: retest still fails "
                    f"(exit {retest.get('exit_code')})"
                )
                AgentService._record(run, "FAILED", run.terminal_reason, retest)
                return

            # The repair worked. Verify it independently rather than starting
            # another iteration: a passing retest is not yet a verified result.
            verify = await AgentService._finalize(
                db, run, user, project_id, build, retest, edits
            )
            if verify is None:
                return
            test = verify  # independent re-run disagreed; diagnose it below


    # ------------------------------------------------------------------
    # step helpers
    # ------------------------------------------------------------------
    @staticmethod
    def supported_quality_ops(project_id: str) -> set[str]:
        """Real detection, delegated to the Phase 2C detector."""
        try:
            detected = QualityService.detect(project_id)
        except Exception:  # noqa: BLE001
            return set()
        return {
            info.operation
            for info in detected
            if getattr(info, "available", False)
            and info.operation in QUALITY_OPERATIONS
        }

    @staticmethod
    def _write_run_record(project_id: str, run: AgentRun) -> dict[str, Any]:
        """Write DEVOS_AGENT_RUN.md: a real, auditable record of this run.

        This is an audit artifact, NOT the implementation. It is written
        through the existing FileService like any other change, and it is
        replaced on later runs rather than duplicated. Its content is redacted,
        so a token that appeared in a command's output cannot be persisted here.
        """
        body = (
            "# DEVOS agent run record\n\n"
            f"- Run: `{run.id}`\n"
            f"- Task: {redact_structure(run.task)}\n"
            f"- Started: {run.created_at}\n"
            f"- Safety limits: {run.max_iterations} iterations, "
            f"{run.max_repair_attempts} repairs, "
            f"{run.max_runtime_seconds}s runtime, "
            f"{run.max_tokens} tokens ({run.token_usage_source})\n"
            "- This file records what the agent did. It is not the "
            "implementation; the plan and changes are in the run record.\n"
        )
        try:
            # FileService is synchronous - awaiting it raised a TypeError that
            # silently produced an empty edit list.
            try:
                FileService.create_file(project_id, "", "DEVOS_AGENT_RUN.md", body)
                action = "created"
            except Exception:  # noqa: BLE001 - already exists, so update it
                FileService.save_file(project_id, "DEVOS_AGENT_RUN.md", body)
                action = "updated"
            return {"written": "DEVOS_AGENT_RUN.md", "action": action,
                    "via": "FileService"}
        except Exception as exc:  # noqa: BLE001
            return {"skipped": f"run record not written: {type(exc).__name__}: {exc}"}

    @staticmethod
    async def _run_quality(
        db: AsyncSession,
        run: AgentRun,
        user: User,
        project_id: str,
        operation: str,
    ) -> dict[str, Any]:
        """Phase 2: a real subprocess through the canonical engine."""
        operation = operation.upper()
        await AgentService._check_limits(db, run)
        if operation not in QUALITY_OPERATIONS:
            return {
                "ok": False,
                "skipped": f"{operation} is not a quality operation",
            }
        started = time.perf_counter()
        try:
            execution = await ExecutionService.run_quality_operation(
                db, user, project_id, operation
            )
        except Exception as exc:  # noqa: BLE001 - unavailable is a real result
            return {
                "ok": False,
                "operation": operation,
                "duration_ms": int((time.perf_counter() - started) * 1000),
                "error": f"{type(exc).__name__}: {exc}",
            }
        return {
            "ok": execution.status == "COMPLETED",
            "operation": operation,
            "execution_id": execution.id,
            "status": execution.status,
            "exit_code": execution.exit_code,
            "duration_ms": int((time.perf_counter() - started) * 1000),
            "started_at": str(getattr(execution, "started_at", "") or ""),
            "finished_at": str(getattr(execution, "finished_at", "") or ""),
            # Output is redacted here too: a command that prints an env var
            # would otherwise land in persisted evidence.
            "stdout_tail": redact_structure((execution.stdout or "")[-400:]),
            "stderr_tail": redact_structure((execution.stderr or "")[-400:]),
        }

    @staticmethod
    def _propose_commits(edits: list[dict[str, str]]) -> list[dict[str, str]]:
        """Propose; never commit. Locked Decision 4 B."""
        return [{"path": e["path"], "summary": "agent edit"} for e in edits]

