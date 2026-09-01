from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import Activity


class ActivityService:
    @staticmethod
    async def record(
        db: AsyncSession,
        user_id: str,
        activity_type: str,
        project_id: str | None = None,
        metadata: Any | None = None,
    ) -> Activity:
        activity = Activity(
            user_id=user_id,
            project_id=project_id,
            activity_type=activity_type,
            metadata_json=metadata,
        )
        db.add(activity)
        await db.flush()
        await db.refresh(activity)
        return activity

    @staticmethod
    async def list_for_user(
        db: AsyncSession, user_id: str, limit: int = 20
    ) -> list[Activity]:
        stmt = (
            select(Activity)
            .where(Activity.user_id == user_id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_for_project(
        db: AsyncSession, project_id: str, limit: int = 20
    ) -> list[Activity]:
        stmt = (
            select(Activity)
            .where(Activity.project_id == project_id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
