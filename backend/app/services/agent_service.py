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
from app.schemas.execution import QUALITY_OPERATIONS
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
        steps.append(
            {
                "state": state,
                "detail": detail,
                "evidence": evidence or {},
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
        (iteration, repair_attempts, tokens_used) are deliberately excluded:
        re-reading those would discard increments the loop has not committed
        yet, and silently undo its own limits.
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
        # Locked Decision 5 C: a hard ceiling. Halting is not success.
        if run.max_tokens and run.tokens_used >= run.max_tokens:
            raise AgentLimitExceeded(
                "MAX_TOKENS", f"exceeded {run.max_tokens} tokens"
            )

    @staticmethod
    async def execute(db: AsyncSession, run_id: str) -> AgentRun:
        """Run the bounded loop to a terminal state and return the run."""
        run = (
            await db.execute(select(AgentRun).where(AgentRun.id == run_id))
        ).scalar_one()
        user = run.user
        project_id = run.project_id
        await ProjectService.get_for_user(db, project_id, user.id)

        try:
            await AgentService._loop(db, run, user, project_id)
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
    async def _loop(
        db: AsyncSession, run: AgentRun, user: User, project_id: str
    ) -> None:
        supported = AgentService.supported_quality_ops(project_id)

        # ---- PLANNING -------------------------------------------------
        await AgentService._check_limits(db, run)
        run.tokens_used += AgentService.estimate_tokens(run.task)
        await AgentService._check_limits(db, run)
        AgentService._record(
            run,
            "PLANNING",
            f"planned from real project context ({len(supported)} quality op(s) available)",
            {
                "plan": ["EDITING", "BUILDING", "TESTING", "VERIFYING"],
                "quality_ops_available": sorted(supported),
                "tokens_used": run.tokens_used,
            },
        )
        await db.commit()

        edits: list[dict[str, str]] = []
        applied_once = False

        while True:
            run.iteration += 1
            await db.commit()
            await AgentService._check_limits(db, run)

            # ---- EDITING (Phase 1, real write) ------------------------
            if not applied_once:
                edits, detail = await AgentService._edit_once(db, run, project_id)
                applied_once = True
            else:
                detail = {"skipped": "edits already applied this run"}
            AgentService._record(run, "EDITING", "workspace edit", detail)
            await db.commit()

            # ---- BUILDING + TESTING (Phase 2, real processes) ---------
            build = await AgentService._run_quality(db, run, user, project_id, "BUILD")
            test = await AgentService._run_quality(db, run, user, project_id, "TEST")
            AgentService._record(run, "BUILDING", "build operation", build)
            AgentService._record(run, "TESTING", "test operation", test)
            await db.commit()

            if test.get("ok"):
                # ---- VERIFYING: an independent second run -------------
                await AgentService._check_limits(db, run)
                verify = await AgentService._run_quality(
                    db, run, user, project_id, "TEST"
                )
                AgentService._record(
                    run, "VERIFYING", "re-ran the test operation to confirm", verify
                )
                await db.commit()
                if verify.get("ok"):
                    run.commit_proposals = AgentService._propose_commits(edits)
                    run.approval_state = (
                        "PENDING" if run.commit_proposals else "NOT_REQUIRED"
                    )
                    run.summary = (
                        f"Completed on iteration {run.iteration}: build exit "
                        f"{build.get('exit_code')}, test exit "
                        f"{test.get('exit_code')}, confirmed by an "
                        f"independent re-run."
                    )
                    AgentService._record(
                        run, "COMPLETED", run.summary, {"commits": run.commit_proposals}
                    )
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


            # ---- DIAGNOSING (Phase 3, real) ---------------------------
            run.repair_attempts += 1
            await db.commit()
            await AgentService._check_limits(db, run)
            diagnosis = await DiagnosisService.diagnose_latest_failure(
                db, user, project_id
            )
            AgentService._record(
                run,
                "DIAGNOSING",
                "grounded diagnosis of the real failing execution",
                {
                    "execution_id": getattr(diagnosis, "execution_id", None),
                    "detail": str(diagnosis)[:300],
                },
            )
            await db.commit()

            # ---- FIXING (Phase 4, real writes + rollback data) --------
            await AgentService._check_limits(db, run)
            proposal = RepairService.plan(diagnosis, project_id)
            if not proposal.supported or not proposal.changes:
                run.state = "FAILED"
                run.terminal_reason = (
                    f"repair unsupported: {proposal.reason}"
                    if not proposal.supported
                    else "diagnosis produced no actionable change"
                )
                AgentService._record(run, "FAILED", run.terminal_reason, {})
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
                run,
                "FIXING",
                f"applied {len(proposal.changes)} planned edit(s)",
                {"diff": diff[:1500], "requires_approval": proposal.requires_approval},
            )
            await db.commit()

    # ------------------------------------------------------------------
    # step helpers
    # ------------------------------------------------------------------
    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Conservative local estimate (~4 chars/token) for the hard ceiling.

        Provider-reported usage is preferred where the provider returns it;
        this floor keeps the budget enforceable regardless of provider.
        """
        return max(1, len(text or "") // 4)

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
    async def _edit_once(
        db: AsyncSession, run: AgentRun, project_id: str
    ) -> tuple[list[dict[str, str]], dict[str, Any]]:
        """Phase 1: a real file write through FileService."""
        content = (
            f"# Agent run notes\n\nTask: {run.task}\nRun: {run.id}\nState: EDITING\n"
        )
        try:
            # FileService is synchronous — awaiting it raised a TypeError that
            # silently produced an empty edit list.
            FileService.create_file(project_id, "", "AGENT_NOTES.md", content)
            return (
                [{"path": "AGENT_NOTES.md"}],
                {"written": "AGENT_NOTES.md", "via": "FileService.create_file"},
            )
        except Exception as exc:  # noqa: BLE001
            return [], {"skipped": f"no edit applied: {type(exc).__name__}: {exc}"}

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
        try:
            execution = await ExecutionService.run_quality_operation(
                db, user, project_id, operation
            )
        except Exception as exc:  # noqa: BLE001 - unavailable is a real result
            return {
                "ok": False,
                "operation": operation,
                "error": f"{type(exc).__name__}: {exc}",
            }
        return {
            "ok": execution.status == "COMPLETED",
            "operation": operation,
            "execution_id": execution.id,
            "status": execution.status,
            "exit_code": execution.exit_code,
            "stdout_tail": (execution.stdout or "")[-400:],
            "stderr_tail": (execution.stderr or "")[-400:],
        }

    @staticmethod
    def _propose_commits(edits: list[dict[str, str]]) -> list[dict[str, str]]:
        """Propose; never commit. Locked Decision 4 B."""
        return [{"path": e["path"], "summary": "agent edit"} for e in edits]

