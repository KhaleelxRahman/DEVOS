from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.errors import InvalidCredentialsException, AppException

class AuthService:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[User]:
        normalized_email = email.strip().lower()
        stmt = select(User).where(User.email == normalized_email)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def register(db: AsyncSession, data: UserRegister) -> tuple[User, str]:
        existing = await AuthService.get_by_email(db, data.email)
        if existing:
            raise AppException("An account with this email already exists", code="DUPLICATE_EMAIL", status_code=400)

        hashed_pw = get_password_hash(data.password)
        user = User(
            name=data.name.strip(),
            email=data.email.strip().lower(),
            password_hash=hashed_pw,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        token = create_access_token(subject=user.id)
        return user, token

    @staticmethod
    async def login(db: AsyncSession, data: UserLogin) -> tuple[User, str]:
        user = await AuthService.get_by_email(db, data.email)
        if not user or not user.password_hash:
            raise InvalidCredentialsException()

        if not verify_password(data.password, user.password_hash):
            raise InvalidCredentialsException()

        token = create_access_token(subject=user.id)
        return user, token
