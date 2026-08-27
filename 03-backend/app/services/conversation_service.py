from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.conversation import Conversation
from app.models.message import ConversationMessage
from app.core.errors import AppException


class ConversationService:
    @staticmethod
    async def create(
        db: AsyncSession, project_id: str, user_id: str, title: str = "New Conversation"
    ) -> Conversation:
        conversation = Conversation(project_id=project_id, user_id=user_id, title=title[:255])
        db.add(conversation)
        await db.flush()
        await db.refresh(conversation)
        return conversation

    @staticmethod
    async def get_for_user(
        db: AsyncSession, conversation_id: str, project_id: str, user_id: str
    ) -> Conversation:
        stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.project_id == project_id,
            Conversation.user_id == user_id,
        )
        result = await db.execute(stmt)
        conversation = result.scalars().first()
        if not conversation:
            raise AppException("Conversation not found", code="CONVERSATION_NOT_FOUND", status_code=404)
        return conversation

    @staticmethod
    async def list_for_project(db: AsyncSession, project_id: str, user_id: str) -> List[Conversation]:
        stmt = (
            select(Conversation)
            .where(Conversation.project_id == project_id, Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc().nullslast(), Conversation.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def add_message(
        db: AsyncSession, conversation_id: str, role: str, content: str
    ) -> ConversationMessage:
        message = ConversationMessage(conversation_id=conversation_id, role=role, content=content)
        db.add(message)
        await db.flush()
        await db.refresh(message)
        return message

    @staticmethod
    async def list_messages(db: AsyncSession, conversation_id: str) -> List[ConversationMessage]:
        stmt = (
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
