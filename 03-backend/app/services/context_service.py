import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.file_service import EXCLUDED_DIRECTORIES, FileService
from app.services.git_service import GitService
from app.services.project_service import ProjectService

SECRET_KEY_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|secret|token|password|auth[_-]?key)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.]{8,})['\"]?"),
    re.compile(r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{15,}"),
]

class ContextService:
    @staticmethod
    def sanitize_text(text: str) -> str:
        sanitized = text
        for pattern in SECRET_KEY_PATTERNS:
            sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
        return sanitized

    @staticmethod
    async def build_project_context(
        db: AsyncSession, project_id: str, user_id: str, current_file: str | None = None
    ) -> dict[str, Any]:
        project = await ProjectService.get_for_user(db, project_id, user_id)
        
        # 1. Project metadata
        metadata = {
            "name": project.name,
            "description": project.description,
            "technologies": project.technologies or [],
            "default_branch": project.default_branch or "main",
        }

        # 2. File tree (excludes node_modules, .git, dist, build, sensitive files)
        file_tree = FileService.get_file_tree(project_id)

        # 3. README excerpt — the highest-value project summary document
        readme_excerpt = None
        for readme_name in ("README.md", "readme.md", "README"):
            try:
                readme_content = FileService.get_file_content(project_id, readme_name)
                readme_excerpt = ContextService.sanitize_text(readme_content.content)[:4000]
                break
            except Exception:
                continue

        # 4. Active file content if provided
        active_file_data = None
        if current_file:
            try:
                active_file_data = FileService.get_file_content(project_id, current_file)
                active_file_data.content = ContextService.sanitize_text(active_file_data.content)
            except Exception:
                active_file_data = None

        # 4. Git status — heavy/generated directories filtered so the AI
        # context never drowns in node_modules/dist noise.
        git_status = None
        try:
            git_status = await GitService.get_status(project_id)
            excluded = tuple(prefix + "/" for prefix in EXCLUDED_DIRECTORIES)
            for field in ("modified", "added", "deleted", "untracked"):
                setattr(
                    git_status,
                    field,
                    [f for f in getattr(git_status, field) if not f.startswith(excluded)],
                )
        except Exception:
            pass

        return {
            "project": metadata,
            "readme": readme_excerpt,
            "file_tree": [node.model_dump() for node in file_tree],
            "current_file": active_file_data.model_dump() if active_file_data else None,
            "git_status": git_status.model_dump() if git_status else None,
        }
