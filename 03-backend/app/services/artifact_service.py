from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppException
from app.models.artifact import Artifact
from app.schemas.artifact import ArtifactCreateRequest


class ArtifactService:
    @staticmethod
    async def create(
        db: AsyncSession, project_id: str, user_id: str, payload: ArtifactCreateRequest
    ) -> Artifact:
        artifact = Artifact(
            project_id=project_id,
            user_id=user_id,
            conversation_id=payload.conversation_id,
            message_id=payload.message_id,
            name=payload.name.strip(),
            kind=payload.kind,
            content=payload.content,
            mime_type=payload.mime_type,
            metadata_json=payload.metadata,
        )
        db.add(artifact)
        await db.flush()
        await db.refresh(artifact)
        return artifact

    @staticmethod
    async def list_for_project(
        db: AsyncSession, project_id: str, user_id: str
    ) -> list[Artifact]:
        result = await db.execute(
            select(Artifact)
            .where(Artifact.project_id == project_id, Artifact.user_id == user_id)
            .order_by(Artifact.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_for_user(
        db: AsyncSession, artifact_id: str, project_id: str, user_id: str
    ) -> Artifact:
        result = await db.execute(
            select(Artifact).where(
                Artifact.id == artifact_id,
                Artifact.project_id == project_id,
                Artifact.user_id == user_id,
            )
        )
        artifact = result.scalars().first()
        if not artifact:
            raise AppException("Artifact not found", code="ARTIFACT_NOT_FOUND", status_code=404)
        return artifact

    @staticmethod
    async def delete(db: AsyncSession, artifact: Artifact) -> None:
        await db.delete(artifact)
