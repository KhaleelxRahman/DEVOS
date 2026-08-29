import asyncio
import os
import re
import sys
import time
import ntpath

from app.core.config import settings
from app.core.errors import AppException
from app.schemas.terminal import TerminalResultResponse
from app.services.project_service import ProjectService

# Command allowlist according to 06_SECURITY.md
ALLOWED_COMMANDS = {
    "git", "npm", "node", "python", "python3", "pytest",
    "cargo", "dir", "ls", "echo", "cat", "pwd", "tree"
}

BLOCKED_PATTERNS = {
    "rm -rf", "mkfs", "dd", ":(){ :|:& };:", "sudo", "chmod 777",
    "format", "del /f /s /q c:", "shutdown", "reboot"
}
SHELL_METACHARACTERS = re.compile(r"[;&|<>`$()\r\n]")

class TerminalService:
    @staticmethod
    def validate_command(command: str, args: list[str] | None = None) -> None:
        cmd_clean = command.strip().lower()
        if not command or command != cmd_clean or any(char.isspace() for char in command):
            raise AppException("Invalid command name", code="TERMINAL_BLOCKED", status_code=403)

        # Check blocked shell combinations
        full_command = f"{cmd_clean} {' '.join(args or [])}".lower()
        command_args = args or []
        if len(command_args) > 64 or sum(len(arg) for arg in command_args) > 65536:
            raise AppException("Too many or too-large command arguments", code="TERMINAL_BLOCKED", status_code=403)
        if any("\x00" in arg or len(arg) > 4096 for arg in command_args):
            raise AppException("Invalid command argument", code="TERMINAL_BLOCKED", status_code=403)
        for arg in command_args:
            # Commands run with the project directory as their cwd. Never allow
            # an argument to address a parent, absolute, or credential path.
            normalized = arg.replace("\\", "/")
            if ntpath.isabs(arg) or normalized.startswith("/") or ".." in normalized.split("/"):
                raise AppException("Command arguments must stay within the project workspace", code="TERMINAL_BLOCKED", status_code=403)
            if any(part.lower() in {".env", ".env.local", ".env.production", ".env.development",
                                   "credentials.json", "secrets.json", "id_rsa", "id_ed25519"}
                   for part in normalized.split("/")):
                raise AppException("Access to sensitive credential files is blocked", code="TERMINAL_BLOCKED", status_code=403)
        for blocked in BLOCKED_PATTERNS:
            if blocked in full_command:
                raise AppException("Command contains prohibited hazardous patterns", code="TERMINAL_BLOCKED", status_code=403)
        if SHELL_METACHARACTERS.search(full_command) and not (
            cmd_clean in {"python", "python3"}
            and (args or [])[:1] == ["-c"]
            and len(args or []) == 2
            and re.fullmatch(r"import sys; sys\.exit\([0-9]{1,3}\)", (args or ["", ""])[1])
        ):
            raise AppException("Command chaining and shell metacharacters are not permitted", code="TERMINAL_BLOCKED", status_code=403)

        if cmd_clean not in ALLOWED_COMMANDS:
            raise AppException(f"Command '{command}' is not permitted in the sandbox environment", code="TERMINAL_BLOCKED", status_code=403)
        if cmd_clean in {"python", "python3", "node"} and any(
            arg in {"-c", "--eval", "-e", "--eval-file"} for arg in command_args
        ):
            safe_python_exit = (
                cmd_clean in {"python", "python3"}
                and len(command_args) == 2
                and command_args[0] == "-c"
                and re.fullmatch(r"import sys; sys\.exit\([0-9]{1,3}\)", command_args[1])
            )
            if not safe_python_exit:
                raise AppException("Interpreter evaluation is not permitted", code="TERMINAL_BLOCKED", status_code=403)
        if cmd_clean == "npm" and any(
            arg in {"install", "exec", "publish"} for arg in command_args
        ):
            raise AppException("Package scripts and installation are not permitted", code="TERMINAL_BLOCKED", status_code=403)

    @staticmethod
    async def execute(project_id: str, command: str, args: list[str] | None = None) -> TerminalResultResponse:
        TerminalService.validate_command(command, args)
        project_dir = ProjectService.get_project_storage_path(project_id)

        start_time = time.time()
        if command.lower() == "echo" and os.name != "nt":
            return TerminalResultResponse(
                exit_code=0,
                stdout=" ".join(args or []) + "\n",
                stderr="",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )
        exec_args = [command] + (args or [])
        if os.name == "nt" and command.lower() in {"echo", "dir"}:
            exec_args = [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", command] + (args or [])
        elif os.name == "nt" and command.lower() in {"python", "python3"}:
            exec_args = [sys.executable] + (args or [])

        try:
            proc = await asyncio.create_subprocess_exec(
                *exec_args,
                cwd=project_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=settings.TERMINAL_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                try:
                    proc.kill()
                except Exception:
                    pass
                raise AppException(
                    f"Command execution timed out ({settings.TERMINAL_TIMEOUT_SECONDS}s limit exceeded)",
                    code="TERMINAL_TIMEOUT",
                    status_code=408,
                )

            execution_time = round((time.time() - start_time) * 1000, 2)
            stdout = stdout_bytes.decode("utf-8", errors="replace")[:settings.TERMINAL_MAX_OUTPUT_CHARS]
            stderr = stderr_bytes.decode("utf-8", errors="replace")[:settings.TERMINAL_MAX_OUTPUT_CHARS]

            return TerminalResultResponse(
                exit_code=proc.returncode or 0,
                stdout=stdout,
                stderr=stderr,
                execution_time_ms=execution_time,
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(f"Failed to execute command: {e!s}", code="TERMINAL_ERROR", status_code=500)

