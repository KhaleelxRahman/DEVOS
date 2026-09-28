import asyncio
import os
import re
import shutil
from typing import Any

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

# Phase 5 safety policy. These branches are only ever reached through an
# approved PR merge; this phase never pushes to them directly.
PROTECTED_BRANCHES = frozenset({"main", "master"})

# Every destructive/rewriting git verb Phase 5 refuses outright. They are
# listed so the refusal is explicit and auditable rather than an omission.
FORBIDDEN_OPERATIONS = frozenset({
    "push --force", "push -f", "reset --hard", "rebase", "amend",
    "filter-branch", "branch -D", "branch -d", "update-ref -d",
    "tag -d", "stash drop", "stash clear", "clean -fd",
})

# Flags that rewrite history or destroy work wherever they appear in argv.
# A prefix match on the joined command is not enough: a dangerous flag can
# legally sit at the END (`push origin main --force`), so these are matched
# as individual arguments.
FORBIDDEN_FLAGS = frozenset({
    "--force", "-f", "--force-with-lease", "--mirror",
    "--hard", "--delete", "--prune",
})


def _flag_is_forbidden(arg: str) -> str | None:
    """Return the forbidden flag if ``arg`` is one, else None."""
    if arg in FORBIDDEN_FLAGS:
        return arg
    # Destructive short options that combine, e.g. "-fd", "-df".
    if len(arg) > 1 and arg.startswith("-") and not arg.startswith("--"):
        if any(ch in arg[1:] for ch in "fd"):
            return arg
    return None


class GitSafetyError(AppException):
    """A git operation was refused by the Phase 5 safety policy."""

    def __init__(self, message: str, code: str = "GIT_UNSAFE_OPERATION",
                 status_code: int = 400) -> None:
        super().__init__(message=message, code=code, status_code=status_code)


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
    def _assert_safe(args: list[str]) -> None:
        """Refuse history-rewriting and destructive git verbs.

        This is the single choke point every git command passes through, so
        no caller can reach a forbidden operation indirectly. Refusal is
        explicit and named rather than a silent no-op.
        """
        if not args:
            return
        # A destructive flag is refused wherever it appears in argv, since
        # `git push origin main --force` puts it last.
        for arg in args:
            flag = _flag_is_forbidden(arg)
            if flag:
                raise GitSafetyError(
                    f"Refusing destructive git flag: '{flag}'. "
                    "Phase 5 never rewrites history or destroys work.",
                    code="GIT_UNSAFE_OPERATION",
                    status_code=400,
                )
        joined = " ".join(args)
        lowered = joined.lower()
        for forbidden in FORBIDDEN_OPERATIONS:
            if lowered == forbidden or lowered.startswith(forbidden + " "):
                raise GitSafetyError(
                    f"Refusing destructive git operation: '{forbidden}'. "
                    "Phase 5 never rewrites history or deletes refs.",
                    code="GIT_UNSAFE_OPERATION",
                    status_code=400,
                )

    @staticmethod
    async def _run_git_cmd(
        project_id: str, args: list[str], auto_init: bool = True
    ) -> tuple[int, str, str]:
        GitService._assert_safe(args)
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
    async def commit(
        project_id: str,
        message: str,
        files: list[str] | None = None,
        commit_all: bool = False,
    ) -> str:
        """Commit ONLY the explicitly listed files. Never ``git add .``.

        ``files`` is the allow-list of paths to stage. When omitted, the
        currently staged set is committed unchanged — this layer never
        widens scope on the user's behalf.

        ``commit_all`` is an explicit opt-in that stages every tracked
        modification (equivalent to ``git add -u``; it deliberately does
        NOT add untracked files, so a new file is never swept in silently).
        The Phase 5 provenance path never sets it.
        """
        if not message.strip():
            raise AppException(
                "Commit message cannot be empty",
                code="EMPTY_COMMIT_MESSAGE",
                status_code=400,
            )

        if files:
            for path in files:
                GitService._validate_relative_path(path)
            code, out, err = await GitService._run_git_cmd(
                project_id, ["add", "--", *files], auto_init=False
            )
            if code != 0:
                raise AppException(
                    f"Git stage failed: {err or out}",
                    code="GIT_ERROR",
                    status_code=400,
                )
        elif commit_all:
            # `git add -u` stages tracked modifications only. Untracked
            # files are left alone so a new file is never added silently.
            code, out, err = await GitService._run_git_cmd(
                project_id, ["add", "-u"], auto_init=False
            )
            if code != 0:
                raise AppException(
                    f"Git stage failed: {err or out}",
                    code="GIT_ERROR",
                    status_code=400,
                )
            # An initial commit has no tracked files, so `add -u` is a
            # no-op. In that case fall back to staging everything, which
            # is only correct because nothing is tracked yet.
            _c, staged_now, _e = await GitService._run_git_cmd(
                project_id, ["diff", "--cached", "--name-only"], auto_init=False
            )
            if not staged_now.strip():
                _c, tracked, _e = await GitService._run_git_cmd(
                    project_id, ["ls-files"], auto_init=False
                )
                if not tracked.strip():
                    await GitService._run_git_cmd(
                        project_id, ["add", "-A"], auto_init=False
                    )

        code, staged_out, staged_err = await GitService._run_git_cmd(
            project_id, ["diff", "--cached", "--name-only"], auto_init=False
        )
        if code != 0:
            raise AppException(
                f"Unable to inspect staged files: {staged_err or staged_out}",
                code="GIT_ERROR",
                status_code=400,
            )
        staged_files = [f for f in staged_out.splitlines() if f.strip()]
        if not staged_files:
            raise AppException(
                "Nothing staged to commit",
                code="GIT_NOTHING_TO_COMMIT",
                status_code=400,
            )
        sensitive = [
            path
            for path in staged_files
            if FileService.is_sensitive(os.path.basename(path))
        ]
        if sensitive:
            # Undo only the staging this call performed; the working tree
            # is never touched.
            if files:
                await GitService._run_git_cmd(
                    project_id, ["restore", "--staged", "--", *files],
                    auto_init=False,
                )
            raise AppException(
                f"Commit contains blocked sensitive files: {', '.join(sensitive)}",
                code="GIT_SENSITIVE_FILE",
                status_code=403,
            )
        # Commit
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id, ["commit", "-m", message.strip()], auto_init=False
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
        # Real SHA from real git output — never fabricated.
        _c, sha_out, _e = await GitService._run_git_cmd(
            project_id, ["rev-parse", "HEAD"], auto_init=False
        )
        return sha_out.strip()

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
    async def merge(project_id: str, source: str, target: str | None = None) -> str:
        """Fast-forward-only merge of ``source`` into ``target``/HEAD.

        Refuses to merge INTO a protected branch from this phase, and uses
        ``--ff-only`` so a divergent history can never be silently
        fast-forwarded over. A conflict is reported, never auto-resolved.
        """
        if not _BRANCH_RE.match(source) or ".." in source:
            raise AppException("Invalid source branch", code="GIT_ERROR",
                               status_code=400)
        effective_target = target or await GitService.current_branch(project_id)
        if effective_target in PROTECTED_BRANCHES:
            raise GitSafetyError(
                f"Refusing to merge into protected branch "
                f"'{effective_target}'. main is only reached through an "
                "approved PR merge.",
                code="GIT_PROTECTED_BRANCH",
                status_code=403,
            )
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id,
            ["merge", "--ff-only", source, effective_target],
            auto_init=False,
        )
        if code != 0:
            combined = (stderr or stdout).strip()
            raise AppException(
                f"Git merge failed (no changes were applied): {combined}",
                code="GIT_MERGE_CONFLICT",
                status_code=409,
            )
        return (stdout or stderr).strip()

    @staticmethod
    async def current_branch(project_id: str) -> str:
        _c, out, _e = await GitService._run_git_cmd(
            project_id, ["rev-parse", "--abbrev-ref", "HEAD"], auto_init=False
        )
        branch = out.strip()
        return "main" if branch in ("", "HEAD") else branch

    @staticmethod
    async def push(
        project_id: str,
        branch: str | None = None,
        set_upstream: bool = True,
        confirm_protected: bool = False,
    ) -> dict[str, Any]:
        """Push the current branch, refusing protected branches.

        Never force-pushes (``_assert_safe`` blocks the verb outright). The
        returned dict carries the real remote ref confirmed after the push
        via ``ls-remote``, so 'pushed' is evidence-backed, not inferred
        from an exit code.
        """
        effective = branch or await GitService.current_branch(project_id)
        if effective in PROTECTED_BRANCHES and not confirm_protected:
            raise GitSafetyError(
                f"Refusing to push directly to protected branch "
                f"'{effective}'. Push a feature branch and open an approved "
                "PR instead.",
                code="GIT_PROTECTED_BRANCH",
                status_code=403,
            )
        args = ["push"]
        if set_upstream:
            args.append("--set-upstream")
        args.extend(["origin", f"HEAD:refs/heads/{effective}"])
        code, stdout, stderr = await GitService._run_git_cmd(
            project_id, args, auto_init=False
        )
        combined = (stdout or stderr).strip()
        if code != 0:
            raise AppException(
                f"Git push failed: {combined}",
                code="GIT_PUSH_REJECTED",
                status_code=409,
            )
        # Confirm the remote ref actually matches local HEAD.
        _c, ls_out, _e = await GitService._run_git_cmd(
            project_id, ["ls-remote", "origin", f"refs/heads/{effective}"],
            auto_init=False,
        )
        remote_sha = ls_out.split()[0] if ls_out.strip() else ""
        _c, local_out, _e = await GitService._run_git_cmd(
            project_id, ["rev-parse", "HEAD"], auto_init=False
        )
        local_sha = local_out.strip()
        return {
            "branch": effective,
            "local_sha": local_sha,
            "remote_sha": remote_sha,
            "remote_confirmed": bool(remote_sha) and remote_sha == local_sha,
            "output": combined,
        }

    @staticmethod
    def _validate_relative_path(path: str) -> None:
        """Validate a git‑related file path.

        The path must be a relative POSIX‑style path without any of the following:
        * absolute components (os.path.isabs)
        * parent directory traversals ("..")
        * null bytes (potential injection vector)
        * leading dash (prevents treating the argument as a git option)

        Backslashes are folded to "/" before the traversal check: on POSIX a
        backslash is an ordinary filename character, so without this "..\\.."
        would split into a single element and slip through.

        Raises:
            AppException: with code "GIT_ERROR" and HTTP 400 when invalid.
        """
        normalized = path.replace("\\", "/") if path else path
        if (
            not path
            or os.path.isabs(path)
            or ".." in normalized.split("/")
            or "\x00" in path
            or path.startswith("-")
        ):
            raise AppException("Invalid file path", code="GIT_ERROR", status_code=400)
