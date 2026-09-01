"""Testing Center — runs a fixed allowlist of verification commands.

This is NOT a general-purpose command executor: only the predefined jobs
below can be requested, and their arguments cannot be influenced by the
caller beyond the project scope.
"""

import asyncio
import shutil
import time
from typing import Any

from app.core.errors import AppException
from app.services.project_service import ProjectService

ALLOWED_TEST_JOBS: dict[str, dict[str, Any]] = {
    "pytest": {
        "label": "Python test suite (pytest)",
        "argv": ["pytest", "-q"],
        "timeout_seconds": 180,
    },
    "typecheck": {
        "label": "TypeScript type check",
        "argv": ["npx", "--yes", "tsc", "--noEmit"],
        "timeout_seconds": 180,
    },
    "build": {
        "label": "Frontend production build",
        "argv": ["npm", "run", "build"],
        "timeout_seconds": 300,
    },
}


class TestingService:
    @staticmethod
    def list_jobs() -> list[dict[str, Any]]:
        return [
            {
                "id": job_id,
                "label": spec["label"],
                "available": shutil.which(spec["argv"][0]) is not None,
                "timeout_seconds": spec["timeout_seconds"],
            }
            for job_id, spec in ALLOWED_TEST_JOBS.items()
        ]

    @staticmethod
    async def run_job(project_id: str, job_id: str) -> dict[str, Any]:
        spec = ALLOWED_TEST_JOBS.get(job_id)
        if spec is None:
            raise AppException(
                f"Unknown test job '{job_id}'",
                code="TEST_JOB_NOT_FOUND",
                status_code=404,
            )

        executable = spec["argv"][0]
        if shutil.which(executable) is None:
            raise AppException(
                f"Required tool '{executable}' is not installed on this server",
                code="TEST_TOOL_UNAVAILABLE",
                status_code=503,
            )

        project_dir = ProjectService.get_project_storage_path(project_id)
        start_time = time.time()

        proc = await asyncio.create_subprocess_exec(
            *spec["argv"],
            cwd=project_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(), timeout=spec["timeout_seconds"]
            )
            timed_out = False
        except asyncio.TimeoutError:
            try:
                proc.kill()
            except Exception:
                pass
            await proc.wait()
            stdout_bytes = b""
            stderr_bytes = b""
            timed_out = True

        duration_ms = round((time.time() - start_time) * 1000, 2)
        stdout = stdout_bytes.decode("utf-8", errors="replace")[-50000:]
        stderr = stderr_bytes.decode("utf-8", errors="replace")[-50000:]
        exit_code = proc.returncode if proc.returncode is not None else -1

        if timed_out:
            status = "timeout"
        elif exit_code == 0:
            status = "passed"
        else:
            status = "failed"

        return {
            "job": job_id,
            "label": spec["label"],
            "status": status,
            "exit_code": exit_code,
            "duration_ms": duration_ms,
            "stdout": stdout,
            "stderr": stderr,
        }
