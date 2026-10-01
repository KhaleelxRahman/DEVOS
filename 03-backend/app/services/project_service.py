import os
import shutil
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ProjectAccessDeniedException, ProjectNotFoundException
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    @staticmethod
    def _resolve_project_storage_path(project_id: str, create: bool) -> str:
        # Project IDs are UUIDs. Reject malformed IDs before using them in paths.
        try:
            normalized_id = str(uuid.UUID(str(project_id)))
        except (TypeError, ValueError) as exc:
            raise ProjectNotFoundException() from exc

        base_dir = os.path.realpath(settings.PROJECTS_STORAGE_PATH)
        project_dir = os.path.realpath(os.path.join(base_dir, normalized_id))
        if os.path.commonpath((base_dir, project_dir)) != base_dir:
            raise ProjectAccessDeniedException("Invalid project path")

        if create:
            os.makedirs(project_dir, exist_ok=True)
        return project_dir

    @staticmethod
    def get_project_storage_path(project_id: str) -> str:
        return ProjectService._resolve_project_storage_path(project_id, create=True)

    @staticmethod
    async def create(db: AsyncSession, user_id: str, data: ProjectCreate) -> Project:
        project = Project(
            user_id=user_id,
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            technologies=data.technologies or [],
            repository_url=data.repository_url,
            default_branch="main",
        )
        db.add(project)
        await db.flush()
        await db.refresh(project)

        # Initialize local storage directory for the project workspace
        ProjectService.get_project_storage_path(project.id)

        return project

    @staticmethod
    async def get_by_id(db: AsyncSession, project_id: str) -> Project | None:
        try:
            normalized_id = str(uuid.UUID(str(project_id)))
        except (TypeError, ValueError):
            return None
        stmt = select(Project).where(Project.id == normalized_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_for_user(db: AsyncSession, project_id: str, user_id: str) -> Project:
        project = await ProjectService.get_by_id(db, project_id)
        if not project:
            raise ProjectNotFoundException()
        if project.user_id != user_id:
            raise ProjectAccessDeniedException()
        return project

    @staticmethod
    async def list_for_user(db: AsyncSession, user_id: str) -> list[Project]:
        stmt = (
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def update(
        db: AsyncSession, project_id: str, user_id: str, data: ProjectUpdate
    ) -> Project:
        project = await ProjectService.get_for_user(db, project_id, user_id)

        if data.name is not None:
            project.name = data.name.strip()
        if data.description is not None:
            project.description = data.description.strip()
        if data.technologies is not None:
            project.technologies = data.technologies
        if data.repository_url is not None:
            project.repository_url = data.repository_url

        await db.flush()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete(db: AsyncSession, project_id: str, user_id: str) -> bool:
        project = await ProjectService.get_for_user(db, project_id, user_id)
        storage_path = ProjectService._resolve_project_storage_path(project.id, create=False)
        await db.delete(project)
        await db.flush()
        if os.path.isdir(storage_path):
            shutil.rmtree(storage_path)
        return True
