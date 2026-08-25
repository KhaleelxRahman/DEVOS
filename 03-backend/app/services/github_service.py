from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.github_connection import GitHubConnection

class GitHubService:
    @staticmethod
    async def get_connection(db: AsyncSession, user_id: str) -> Optional[GitHubConnection]:
        stmt = select(GitHubConnection).where(GitHubConnection.user_id == user_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def disconnect(db: AsyncSession, user_id: str) -> bool:
        conn = await GitHubService.get_connection(db, user_id)
        if conn:
            await db.delete(conn)
            await db.flush()
            return True
        return False
