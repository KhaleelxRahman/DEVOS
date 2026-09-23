from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AuthRequiredException
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService


async def get_current_user(
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthRequiredException()

    token = authorization.split(" ")[1]
    user_id = decode_access_token(token)
    if not user_id:
        raise AuthRequiredException("Invalid or expired session token")

    user = await AuthService.get_by_id(db, user_id)
    if not user:
        raise AuthRequiredException("User associated with token no longer exists")

    return user
