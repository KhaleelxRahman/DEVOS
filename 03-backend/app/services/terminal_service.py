import asyncio
import time
from typing import List, Optional
from app.services.project_service import ProjectService
from app.schemas.terminal import TerminalResultResponse
from app.core.errors import AppException

# Command allowlist according to 06_SECURITY.md
ALLOWED_COMMANDS = {
    "git", "npm", "node", "python", "python3", "pip", "pip3", "pytest",
    "cargo", "dir", "ls", "echo", "cat", "pwd", "tree"
}

BLOCKED_PATTERNS = {
    "rm -rf", "mkfs", "dd", ":(){ :|:& };:", "sudo", "chmod 777",
    "format", "del /f /s /q c:", "shutdown", "reboot"
}

class TerminalService:
    @staticmethod
    def validate_command(command: str, args: Optional[List[str]] = None) -> None:
        cmd_clean = command.strip().lower()

        # Check blocked shell combinations
        full_command = f"{cmd_clean} {' '.join(args or [])}".lower()
        for blocked in BLOCKED_PATTERNS:
            if blocked in full_command:
                raise AppException("Command contains prohibited hazardous patterns", code="TERMINAL_BLOCKED", status_code=403)

        if cmd_clean not in ALLOWED_COMMANDS:
            raise AppException(f"Command '{command}' is not permitted in the sandbox environment", code="TERMINAL_BLOCKED", status_code=403)

    @staticmethod
    async def execute(project_id: str, command: str, args: Optional[List[str]] = None) -> TerminalResultResponse:
        TerminalService.validate_command(command, args)
        project_dir = ProjectService.get_project_storage_path(project_id)

        start_time = time.time()
        exec_args = [command] + (args or [])

        try:
            proc = await asyncio.create_subprocess_exec(
                *exec_args,
                cwd=project_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=30.0)
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                raise AppException("Command execution timed out (30s limit exceeded)", code="TERMINAL_TIMEOUT", status_code=408)

            execution_time = round((time.time() - start_time) * 1000, 2)
            stdout = stdout_bytes.decode("utf-8", errors="replace")[:100000]  # 100KB output limit
            stderr = stderr_bytes.decode("utf-8", errors="replace")[:100000]

            return TerminalResultResponse(
                exit_code=proc.returncode or 0,
                stdout=stdout,
                stderr=stderr,
                execution_time_ms=execution_time,
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(f"Failed to execute command: {str(e)}", code="TERMINAL_ERROR", status_code=500)
