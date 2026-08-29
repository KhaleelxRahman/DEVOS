from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppException
from app.models.github_connection import GitHubConnection

GITHUB_API_BASE = "https://api.github.com"


class GitHubService:
    @staticmethod
    def authorization_url(state: str) -> str:
        if not settings.GITHUB_CLIENT_ID:
            raise AppException(
                "GitHub OAuth is not configured",
                code="GITHUB_NOT_CONFIGURED",
                status_code=503,
            )
        query = urlencode(
            {
                "client_id": settings.GITHUB_CLIENT_ID,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
                "scope": "read:user,repo",
                "state": state,
            }
        )
        return f"https://github.com/login/oauth/authorize?{query}"

    @staticmethod
    async def exchange_code(code: str) -> dict[str, Any]:
        if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
            raise AppException(
                "GitHub OAuth is not configured",
                code="GITHUB_NOT_CONFIGURED",
                status_code=503,
            )
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
            )
        if response.status_code != 200:
            raise AppException("GitHub OAuth token exchange failed", code="GITHUB_OAUTH_ERROR", status_code=502)
        payload = response.json()
        if not payload.get("access_token"):
            raise AppException("GitHub OAuth did not return an access token", code="GITHUB_OAUTH_ERROR", status_code=502)
        return payload

    @staticmethod
    async def get_github_user(token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "User-Agent": "devos-app",
                },
            )
        if response.status_code != 200:
            raise AppException("Unable to read GitHub account", code="GITHUB_API_ERROR", status_code=502)
        return response.json()

    @staticmethod
    async def save_connection(
        db: AsyncSession, user_id: str, github_user: dict[str, Any], token: str
    ) -> GitHubConnection:
        connection = await GitHubService.get_connection(db, user_id)
        if connection is None:
            connection = GitHubConnection(user_id=user_id)
            db.add(connection)
        connection.github_user_id = str(github_user.get("id", ""))
        connection.github_username = github_user.get("login", "")
        connection.access_token = token
        await db.flush()
        await db.refresh(connection)
        return connection

    @staticmethod
    async def get_connection(db: AsyncSession, user_id: str) -> GitHubConnection | None:
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
    def resolve_token(connection: GitHubConnection | None) -> str | None:
        """Return a usable token: the user's stored OAuth token, else the
        server-configured GITHUB_TOKEN. Tokens never leave the server."""
        if connection and connection.access_token:
            return connection.access_token
        if settings.GITHUB_TOKEN:
            return settings.GITHUB_TOKEN
        return None

    @staticmethod
    async def list_repositories(token: str) -> list[dict[str, Any]]:
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
                "avatar_url": repo.get("owner", {}).get("avatar_url"),
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language"),
                "updated_at": repo.get("updated_at"),
            }
            for repo in resp.json()
        ]

