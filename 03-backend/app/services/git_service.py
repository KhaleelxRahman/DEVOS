import os
import asyncio
from typing import List, Optional
from app.services.project_service import ProjectService
from app.schemas.git import GitStatusResponse, GitDiffResponse
from app.core.errors import AppException

class GitService:
    @staticmethod
    async def _run_git_cmd(project_id: str, args: List[str]) -> tuple[int, str, str]:
        project_dir = ProjectService.get_project_storage_path(project_id)
        
        # Ensure git repo initialized
        if not os.path.exists(os.path.join(project_dir, ".git")):
            init_proc = await asyncio.create_subprocess_exec(
                "git", "init",
                cwd=project_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await init_proc.communicate()

        proc = await asyncio.create_subprocess_exec(
            "git", *args,
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
        code, branch_out, _ = await GitService._run_git_cmd(project_id, ["rev-parse", "--abbrev-ref", "HEAD"])
        branch = branch_out.strip() or "main"
        if branch == "HEAD":
            branch = "main"

        # Get status porcelain
        code, status_out, _ = await GitService._run_git_cmd(project_id, ["status", "--porcelain"])
        
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

        is_clean = len(modified) == 0 and len(added) == 0 and len(deleted) == 0 and len(untracked) == 0

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
        code, diff_out, _ = await GitService._run_git_cmd(project_id, ["diff"])
        return GitDiffResponse(
            diff=diff_out,
            files_changed=len(diff_out.split("diff --git")) - 1 if "diff --git" in diff_out else 0,
        )

    @staticmethod
    async def commit(project_id: str, message: str) -> bool:
        if not message.strip():
            raise AppException("Commit message cannot be empty", code="EMPTY_COMMIT_MESSAGE", status_code=400)

        # Stage all
        await GitService._run_git_cmd(project_id, ["add", "."])
        # Commit
        code, stdout, stderr = await GitService._run_git_cmd(project_id, ["commit", "-m", message.strip()])
        if code != 0 and "nothing to commit" not in stdout and "nothing to commit" not in stderr:
            raise AppException(f"Git commit failed: {stderr or stdout}", code="GIT_ERROR", status_code=400)

        return True
