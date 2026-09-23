import asyncio
import os
import re
import shutil

from app.core.errors import AppException
from app.services.file_service import FileService
from app.schemas.git import (
    GitBranchListResponse,
    GitDiffResponse,
    GitLogEntry,
    GitLogResponse,
    GitStatusResponse,
)
from app.services.project_service import ProjectService

_BRANCH_RE = re.compile(r"^[A-Za-z0-9._\-/]+$")


class GitService:
    @staticmethod
    def _ensure_git_available() -> None:
        if shutil.which("git") is None:
            raise AppException(
                "Git is not installed on this server",
                code="GIT_UNAVAILABLE",
                status_code=503,
            )

    @staticmethod
    async def _run_git_cmd(
        project_id: str, args: list[str], auto_init: bool = True
    ) -> tuple[int, str, str]:
        GitService._ensure_git_available()
        project_dir = ProjectService.get_project_storage_path(project_id)

        # Ensure git repo initialized
        if auto_init and not os.path.exists(os.path.join(project_dir, ".git")):
            init_proc = await asyncio.create_subprocess_exec(
                "git",
                "init",
                "-b",
                "main",
                cwd=project_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await init_proc.communicate()
            # Repo-local identity so commits work without a global git config.
            for key, value in (
                ("user.name", "DEVOS v1.0.0"),
                ("user.email", "devos@localhost"),
            ):
                cfg_proc = await asyncio.create_subprocess_exec(
                    "git",
                    "config",
                    key,
                    value,
                    cwd=project_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await cfg_proc.communicate()

        proc = await asyncio.create_subprocess_exec(
            "git",
            *args,
            cwd=project_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        return (
            proc.returncode or 0,
            stdout.decode("utf-8", errors="replace"),
            stderr.decode("utf-8", errors="replace"),
        )

    @staticmethod
    async def get_status(project_id: str) -> GitStatusResponse:
        # Get branch
        _code, branch_out, _ = await GitService._run_git_cmd(
            project_id, ["rev-parse", "--abbrev-ref", "HEAD"]
        )
        branch = branch_out.strip() or "main"
        if branch == "HEAD":
            branch = "main"

        # Get status porcelain
        _code, status_out, _ = await GitService._run_git_cmd(
            project_id, ["status", "--porcelain"]
        )

        modified = []
        added = []
        deleted = []
        untracked = []

        for line in status_out.splitlines():
            if not line:
                continue
            status_code = line[:2]
            filename = line[3:].strip()

            if "??" in status_code:
                untracked.append(filename)
            elif "M" in status_code:
                modified.append(filename)
            elif "A" in status_code:
                added.append(filename)
            elif "D" in status_code:
                deleted.append(filename)

        is_clean = (
            len(modified) == 0
            and len(added) == 0
            and len(deleted) == 0
            and len(untracked) == 0
        )

        return GitStatusResponse(
            branch=branch,
            is_clean=is_clean,
            modified=modified,
            added=added,
            deleted=deleted,
            untracked=untracked,
        )

    @staticmethod
    async def get_diff(project_id: str) -> GitDiffResponse:
        _code, diff_out, _ = await GitService._run_git_cmd(project_id, ["diff"])
        return GitDiffResponse(
            diff=diff_out,
            files_changed=(
                len(diff_out.split("diff --git")) - 1 if "diff --git" in diff_out else 0
            ),
        )

    @staticmethod
    async def commit(project_id: str, message: str) -> bool:
        if not message.strip():
            raise AppException(
                "Commit message cannot be empty",
                code="EMPTY_COMMIT_MESSAGE",
                status_code=400,
            )

        # Stage all
        await GitService._run_git_cmd(project_id, ["add", "."])
        code, staged_out, staged_err = await GitService._run_git_cmd(
            project_id, ["diff", "--cached", "--name-only"], auto_init=False
        )
        if code != 0:
            raise AppException(
                f"Unable to inspect staged files: {staged_err or staged_out}",
                code="GIT_ERROR",
                status_code=400,
            )
        sensitive = [
            path
            for path in staged_out.splitlines()
            if FileService.is_sensitive(os.path.basename(path))
        ]
        if sensitive:
            await GitService._run_git_cmd(project_id, ["reset"], auto_init=False)
            raise AppException(
                f"Commit contains blocked sensitive files: {', '.join(sensitive)}",
                code="GIT_SENSITIVE_FILE",
                status_code=403,
            )
        # Commit
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id, ["commit", "-m", message.strip()]
        )
        if (
            code != 0
            and "nothing to commit" not in stdout
            and "nothing to commit" not in stderr
        ):
            raise AppException(
                f"Git commit failed: {stderr or stdout}",
                code="GIT_ERROR",
                status_code=400,
            )

        return True

    @staticmethod
    async def get_branches(project_id: str) -> GitBranchListResponse:
        _code, out, _ = await GitService._run_git_cmd(
            project_id, ["branch", "--format=%(refname:short)"]
        )

        branches = [b.strip() for b in out.splitlines() if b.strip()]
        _code, current_out, _ = await GitService._run_git_cmd(
            project_id, ["rev-parse", "--abbrev-ref", "HEAD"]
        )
        current = current_out.strip() or (branches[0] if branches else "main")
        if current == "HEAD":
            current = branches[0] if branches else "main"
        return GitBranchListResponse(current=current, branches=branches)

    @staticmethod
    async def get_log(project_id: str, limit: int = 20) -> GitLogResponse:
        limit = max(1, min(limit, 100))
        code, out, _ = await GitService._run_git_cmd(
            project_id,
            ["log", f"--max-count={limit}", "--pretty=format:%h%x1f%an%x1f%ad%x1f%s"],
        )
        commits: list[GitLogEntry] = []
        if code == 0 and out.strip():
            for line in out.splitlines():
                parts = line.split("\x1f")
                if len(parts) == 4:
                    commits.append(
                        GitLogEntry(
                            hash=parts[0],
                            author=parts[1],
                            date=parts[2],
                            message=parts[3],
                        )
                    )
        return GitLogResponse(commits=commits)

    @staticmethod
    async def stage(project_id: str, files: list[str]) -> None:
        if not files:
            raise AppException(
                "No files specified to stage", code="GIT_ERROR", status_code=400
            )
        for f in files:
            GitService._validate_relative_path(f)
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id, ["add", "--", *files]
        )
        if code != 0:
            raise AppException(
                f"Git stage failed: {stderr or stdout}",
                code="GIT_ERROR",
                status_code=400,
            )

    @staticmethod
    async def unstage(project_id: str, files: list[str]) -> None:
        if not files:
            raise AppException(
                "No files specified to unstage", code="GIT_ERROR", status_code=400
            )
        for f in files:
            GitService._validate_relative_path(f)
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id, ["restore", "--staged", "--", *files]
        )
        if code != 0:
            raise AppException(
                f"Git unstage failed: {stderr or stdout}",
                code="GIT_ERROR",
                status_code=400,
            )

    @staticmethod
    async def checkout(project_id: str, branch: str, create: bool = False) -> None:
        branch = branch.strip()
        if (
            not branch
            or not _BRANCH_RE.match(branch)
            or branch.startswith("-")
            or ".." in branch
        ):
            raise AppException("Invalid branch name", code="GIT_ERROR", status_code=400)
        args = ["checkout", "-b", branch] if create else ["checkout", branch]
        code, stdout, stderr = await GitService._run_git_cmd(project_id, args)
        if code != 0:
            raise AppException(
                f"Git checkout failed: {stderr or stdout}",
                code="GIT_ERROR",
                status_code=400,
            )

    @staticmethod
    async def pull(project_id: str) -> str:
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id, ["pull"], auto_init=False
        )
        if code != 0:
            raise AppException(
                f"Git pull failed: {stderr or stdout}",
                code="GIT_ERROR",
                status_code=400,
            )
        return stdout.strip()

    @staticmethod
    async def push(project_id: str) -> str:
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id, ["push"], auto_init=False
        )
        if code != 0:
            raise AppException(
                f"Git push failed: {stderr or stdout}",
                code="GIT_ERROR",
                status_code=400,
            )
        return (stdout or stderr).strip()

    @staticmethod
    def _validate_relative_path(path: str) -> None:
        """Validate a git‑related file path.

        The path must be a relative POSIX‑style path without any of the following:
        * absolute components (os.path.isabs)
        * parent directory traversals ("..")
        * null bytes (potential injection vector)
        * leading dash (prevents treating the argument as a git option)

        Raises:
            AppException: with code "GIT_ERROR" and HTTP 400 when invalid.
        """
        if (
            not path
            or os.path.isabs(path)
            or ".." in path.split("/")
            or "\x00" in path
            or path.startswith("-")
        ):
            raise AppException("Invalid file path", code="GIT_ERROR", status_code=400)
