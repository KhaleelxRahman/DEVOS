"""PHASE 3 — root-cause diagnosis engine.

Consumes a real Phase 2 ``Execution`` record (exit code, stdout, stderr,
failure_reason, status, timing) and produces a grounded diagnosis.

It never re-runs the command and never re-captures output. The single
source of truth is the record the 2A-2E engine already wrote.
"""

import re

from app.phase3_diagnostics.evidence import (
    Diagnosis,
    Evidence,
    EvidenceTag,
    FailureCategory,
)
from app.phase3_diagnostics.signatures import (
    STRONG_SIGNATURES,
    WEAK_SIGNATURES,
    Signature,
)

# Statuses that represent a real failure worth diagnosing. COMPLETED is
# excluded: there is nothing to diagnose about a success.
DIAGNOSABLE_STATUSES = frozenset({"FAILED", "TIMED_OUT", "BLOCKED", "CANCELLED"})

# Confidence is deliberately not uniformly high: a strong machine-readable
# signature earns high confidence, a weak phrase earns low confidence, and
# no signature earns UNKNOWN with minimal confidence.
CONFIDENCE_STRONG_BASE = 85
CONFIDENCE_WEAK_CEILING = 40
CONFIDENCE_UNKNOWN = 20

# Phase 2 execution_type -> the category the failure is *expected* to be.
# Used only to label a category when no signature narrows it further, and
# always reported as INFERRED from the command, never as OBSERVED.
_TYPE_TO_CATEGORY: dict[str, FailureCategory] = {
    "BUILD": FailureCategory.BUILD,
    "TEST": FailureCategory.TEST,
    "LINT": FailureCategory.LINT,
    "TYPECHECK": FailureCategory.TYPE,
    "DEPENDENCY_INSTALL": FailureCategory.DEPENDENCY,
    "DEV_SERVER": FailureCategory.RUNTIME,
    "PREVIEW": FailureCategory.RUNTIME,
    "CUSTOM_SAFE_COMMAND": FailureCategory.RUNTIME,
}

# Locations a failing tool prints. A location is emitted only when the
# pattern genuinely carries both a file and a line number.
_LOCATION_PATTERNS: tuple[re.Pattern, ...] = (
    # TypeScript: src/foo.ts(12,5): error TS2322:
    re.compile(r"^\s*(\S+\.tsx?)\((\d+),\d+\):\s*(?:error|warning)", re.M),
    # Python traceback: File "path/to/x.py", line 42
    re.compile(r'File "([^"]+\.py)", line (\d+)'),
    # pytest: tests/test_x.py:12: in test_name
    re.compile(r"^(\S+\.py):(\d+):\s+in\s+\w+", re.M),
    # Generic: path/to/file.js:120:5   /  path/file.py:42:
    re.compile(r"^\s*(\.{0,2}[/\\][\w./\\-]+\.\w{1,5}):(\d+)(?::\d+)?\s*$", re.M),
)


class DiagnosisEngine:
    """Turns one real execution record into a grounded diagnosis."""

    def diagnose(self, execution) -> Diagnosis:
        """Diagnose a Phase 2 ``Execution`` ORM row.

        Every field read here is a column the Phase 2 engine already
        persisted. No subprocess is started and no network call is made.
        """
        execution_id = getattr(execution, "execution_id", "")
        status = getattr(execution, "status", "UNKNOWN")
        exit_code = getattr(execution, "exit_code", None)
        stdout = getattr(execution, "stdout", None) or ""
        stderr = getattr(execution, "stderr", None) or ""
        failure_reason = getattr(execution, "failure_reason", None) or ""
        command = getattr(execution, "command", "") or ""
        arguments = list(getattr(execution, "arguments", None) or [])
        execution_type = getattr(execution, "execution_type", "") or ""
        timed_out = bool(getattr(execution, "timed_out", False))
        cancelled = bool(getattr(execution, "cancelled", False))
        full_command = " ".join([command, *arguments]).strip()

        evidence = self._observed_evidence(
            status, exit_code, full_command, failure_reason,
            timed_out, cancelled, stdout, stderr,
        )

        # --- match signatures against the REAL captured text -------------
        combined = "\n".join(part for part in (stderr, stdout) if part)
        matches = self._match(combined)

        if not stderr.strip() and not stdout.strip():
            evidence.append(Evidence(
                tag=EvidenceTag.OBSERVED,
                statement="The execution recorded no stdout and no stderr, "
                          "so there is no textual failure evidence to "
                          "analyse.",
                source="execution.stdout/execution.stderr",
            ))

        for signature, matched_text in matches:
            evidence.append(Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=f"Output contains a {signature.name} diagnostic: "
                          f"{self._clip(matched_text)}",
                source=f"signature:{signature.name}",
            ))

        category = self._resolve_category(matches, execution_type, status)
        files, lines = self._extract_locations(combined)
        cause, fix, confidence, basis = self._resolve_cause(
            matches, status, exit_code, combined, timed_out, cancelled,
        )

        return Diagnosis(
            execution_id=execution_id,
            problem=Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=self._problem_statement(
                    status, exit_code, execution_type, timed_out, cancelled,
                ),
                source="execution.status/execution.exit_code",
            ),
            category=category,
            evidence=evidence,
            likely_cause=cause,
            affected_files=files,
            affected_lines=lines,
            suggested_fix=fix,
            confidence=confidence,
            confidence_basis=basis,
        )

    # -- internals -------------------------------------------------------

    def _observed_evidence(
        self, status, exit_code, full_command, failure_reason,
        timed_out, cancelled, stdout, stderr,
    ) -> list[Evidence]:
        """The raw facts copied straight from the Phase 2 record."""
        evidence: list[Evidence] = [
            Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=f"Execution status recorded as {status}.",
                source="execution.status",
            ),
            Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=(
                    f"Exit code recorded as {exit_code}."
                    if exit_code is not None
                    else "No exit code was recorded for this execution."
                ),
                source="execution.exit_code",
            ),
            Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=(f"Command executed: {full_command}"
                           if full_command else "No command was recorded."),
                source="execution.command",
            ),
            Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=f"Captured output: {len(stderr)} bytes of stderr, "
                          f"{len(stdout)} bytes of stdout.",
                source="execution.stdout/execution.stderr",
            ),
        ]
        if failure_reason:
            evidence.append(Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=f"Failure reason recorded: {failure_reason}",
                source="execution.failure_reason",
            ))
        if timed_out:
            evidence.append(Evidence(
                tag=EvidenceTag.OBSERVED,
                statement="The execution was terminated by the timeout "
                          "guard before the process exited on its own.",
                source="execution.timed_out",
            ))
        if cancelled:
            evidence.append(Evidence(
                tag=EvidenceTag.OBSERVED,
                statement="The execution was cancelled by an explicit "
                          "cancel request.",
                source="execution.cancelled",
            ))
        return evidence

    @staticmethod
    def _clip(text: str, limit: int = 160) -> str:
        flat = " ".join(text.split())
        return flat if len(flat) <= limit else flat[:limit] + "..."

    def _match(self, text: str) -> list[tuple[Signature, str]]:
        if not text:
            return []
        found: list[tuple[Signature, str]] = []
        for signature in STRONG_SIGNATURES + WEAK_SIGNATURES:
            match = re.search(signature.pattern, text, re.MULTILINE)
            if match:
                found.append((signature, match.group(0)))
        return found

    def _resolve_category(
        self,
        matches: list[tuple[Signature, str]],
        execution_type: str,
        status: str,
    ) -> Evidence:
        strong = [sig for sig, _ in matches if sig.strong]
        if strong:
            # A specific machine-readable signature is the most precise
            # category signal available, and it literally matched.
            return Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=strong[0].category.value,
                source=f"signature:{strong[0].name}",
            )
        weak = [sig for sig, _ in matches if not sig.strong]
        if weak:
            return Evidence(
                tag=EvidenceTag.OBSERVED,
                statement=weak[0].category.value,
                source=f"signature:{weak[0].name}",
            )
        mapped = _TYPE_TO_CATEGORY.get(execution_type)
        if mapped:
            return Evidence(
                tag=EvidenceTag.INFERRED,
                statement=mapped.value,
                source=f"execution.execution_type={execution_type} "
                       "(command category; no output signature narrowed it)",
            )
        return Evidence(
            tag=EvidenceTag.UNKNOWN,
            statement="unknown",
            source="no output signature matched and execution_type "
                   f"'{execution_type}' is not a recognised category",
        )

    def _extract_locations(self, text: str) -> tuple[list[str], list[dict]]:
        """Emit file/line pairs only where the tool actually printed them."""
        if not text:
            return [], []
        files: list[str] = []
        lines: list[dict] = []
        seen: set[tuple[str, int]] = set()
        for pattern in _LOCATION_PATTERNS:
            for match in pattern.finditer(text):
                path, raw_number = match.group(1), match.group(2)
                if not path or ("/" not in path and "\\" not in path):
                    continue
                normalised = path.replace("\\", "/")
                if normalised not in files:
                    files.append(normalised)
                if raw_number and raw_number.isdigit():
                    number = int(raw_number)
                    if (normalised, number) not in seen:
                        seen.add((normalised, number))
                        lines.append({"file": normalised, "line": number})
        return files, lines

    def _problem_statement(
        self, status, exit_code, execution_type, timed_out, cancelled,
    ) -> str:
        if cancelled:
            return ("The execution was cancelled before it completed; "
                    "this is not a defect in the executed code.")
        if timed_out:
            return (f"The {execution_type} execution exceeded its time "
                    "limit and was terminated without exiting on its own.")
        if exit_code is None:
            return (f"The {execution_type} execution ended in status "
                    f"{status} without recording an exit code.")
        return (f"The {execution_type} execution failed with exit code "
                f"{exit_code}.")

    def _resolve_cause(
        self,
        matches: list[tuple[Signature, str]],
        status: str,
        exit_code: int | None,
        combined: str,
        timed_out: bool,
        cancelled: bool,
    ) -> tuple[Evidence, Evidence, int, str]:
        """Return (cause, fix, confidence, basis).

        Confidence is derived from evidence strength, never assigned by
        default. Nothing here invents a cause: with no usable evidence the
        result is an explicit UNKNOWN at minimal confidence.
        """
        strong = [sig for sig, _ in matches if sig.strong]
        weak = [sig for sig, _ in matches if not sig.strong]

        if cancelled:
            return (
                Evidence(
                    tag=EvidenceTag.OBSERVED,
                    statement="The run was stopped by a cancel request, so "
                              "no code-level root cause applies.",
                    source="execution.cancelled",
                ),
                Evidence(
                    tag=EvidenceTag.OBSERVED,
                    statement="Re-run the execution if the real result is "
                              "needed.",
                    source="execution.cancelled",
                ),
                100,
                "Certain: the Phase 2 record itself marks the run as "
                "cancelled, so the outcome is fully explained.",
            )

        if timed_out:
            return (
                Evidence(
                    tag=EvidenceTag.OBSERVED,
                    statement="The process did not finish within the "
                              "configured execution timeout.",
                    source="execution.timed_out",
                ),
                Evidence(
                    tag=EvidenceTag.INFERRED,
                    statement="Increase the execution timeout or reduce the "
                              "work the command performs.",
                    source="execution.timed_out + TERMINAL_TIMEOUT_SECONDS",
                ),
                85,
                "High for the timeout itself (the guard set the flag). The "
                "reason the command overran is not observable in this "
                "record and is not claimed.",
            )

        if strong:
            primary = strong[0]
            corroborating = len(strong) - 1
            confidence = min(95, CONFIDENCE_STRONG_BASE + corroborating * 3)
            basis = (
                f"Strong signature '{primary.name}' matched the captured "
                "output verbatim"
            )
            if corroborating:
                basis += f", corroborated by {corroborating} further signature(s)"
            basis += "."
            return (
                Evidence(
                    tag=EvidenceTag.INFERRED,
                    statement=primary.cause,
                    source=f"signature:{primary.name}",
                ),
                Evidence(
                    tag=EvidenceTag.INFERRED,
                    statement=primary.fix,
                    source=f"signature:{primary.name}",
                ),
                confidence,
                basis,
            )

        if weak:
            names = ", ".join(sig.name for sig in weak)
            return (
                Evidence(
                    tag=EvidenceTag.UNKNOWN,
                    statement="The output only reports that the command "
                              "failed, without a specific diagnostic. The "
                              "root cause cannot be determined from this "
                              "evidence.",
                    source=f"weak signature(s): {names}",
                ),
                Evidence(
                    tag=EvidenceTag.UNKNOWN,
                    statement="Read the full captured output above; it does "
                              "not contain a specific actionable error.",
                    source=f"weak signature(s): {names}",
                ),
                CONFIDENCE_WEAK_CEILING,
                "Low: only generic failure phrasing was present, with no "
                "machine-readable diagnostic.",
            )

        if not combined.strip():
            return (
                Evidence(
                    tag=EvidenceTag.UNKNOWN,
                    statement="The execution recorded no output, so the "
                              "reason for the failure cannot be determined.",
                    source="execution.stdout/execution.stderr (both empty)",
                ),
                Evidence(
                    tag=EvidenceTag.UNKNOWN,
                    statement="Re-run with output capture enabled to obtain "
                              "diagnostic evidence.",
                    source="execution.stdout/execution.stderr (both empty)",
                ),
                CONFIDENCE_UNKNOWN,
                "Minimal: a non-zero outcome with no captured output "
                "supports no conclusion at all.",
            )

        return (
            Evidence(
                tag=EvidenceTag.UNKNOWN,
                statement="No known failure signature matched the captured "
                          "output. The root cause is not determined.",
                source=f"no signature matched (status={status}, "
                       f"exit_code={exit_code})",
            ),
            Evidence(
                tag=EvidenceTag.UNKNOWN,
                statement="Inspect the raw stdout/stderr above; the failure "
                          "is outside the patterns this engine recognises.",
                source=f"no signature matched (status={status}, "
                       f"exit_code={exit_code})",
            ),
            CONFIDENCE_UNKNOWN,
            "Minimal: output exists but matches no known diagnostic.",
        )
