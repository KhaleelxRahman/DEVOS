from typing import Optional, List, Dict, Any
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.github_connection import GitHubConnection
from app.core.config import settings
from app.core.errors import AppException

GITHUB_API_BASE = "https://api.github.com"


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

    @staticmethod
    def resolve_token(connection: Optional[GitHubConnection]) -> Optional[str]:
        """Return a usable token: the user's stored OAuth token, else the
        server-configured GITHUB_TOKEN. Tokens never leave the server."""
        if connection and connection.access_token:
            return connection.access_token
        if settings.GITHUB_TOKEN:
            return settings.GITHUB_TOKEN
        return None

    @staticmethod
    async def list_repositories(token: str) -> List[Dict[str, Any]]:
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "devos-app",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{GITHUB_API_BASE}/user/repos",
                headers=headers,
                params={"per_page": 50, "sort": "updated"},
            )
        if resp.status_code != 200:
            raise AppException(
                "GitHub API request failed",
                code="GITHUB_API_ERROR",
                status_code=502,
            )
        return [
            {
                "id": repo.get("id"),
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "private": repo.get("private"),
                "default_branch": repo.get("default_branch"),
                "description": repo.get("description"),
                "html_url": repo.get("html_url"),
            }
            for repo in resp.json()
        ]
