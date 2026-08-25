import re
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.project_service import ProjectService
from app.services.file_service import FileService
from app.services.git_service import GitService

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
        db: AsyncSession, project_id: str, user_id: str, current_file: Optional[str] = None
    ) -> Dict[str, Any]:
        project = await ProjectService.get_for_user(db, project_id, user_id)
        
        # 1. Project metadata
        metadata = {
            "name": project.name,
            "description": project.description,
            "technologies": project.technologies or [],
            "default_branch": project.default_branch or "main",
        }

        # 2. File tree
        file_tree = FileService.get_file_tree(project_id)

        # 3. Active file content if provided
        active_file_data = None
        if current_file:
            try:
                active_file_data = FileService.get_file_content(project_id, current_file)
                active_file_data.content = ContextService.sanitize_text(active_file_data.content)
            except Exception:
                active_file_data = None

        # 4. Git status
        git_status = None
        try:
            git_status = await GitService.get_status(project_id)
        except Exception:
            pass

        return {
            "project": metadata,
            "file_tree": [node.model_dump() for node in file_tree],
            "current_file": active_file_data.model_dump() if active_file_data else None,
            "git_status": git_status.model_dump() if git_status else None,
        }
