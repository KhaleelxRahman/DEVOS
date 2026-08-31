"""Project-scoped AI endpoints.

Every route verifies project ownership through ProjectService.get_for_user,
so a user can never read or reply inside another user's conversation.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.ai import (
    AIActionRequest,
    AIChatRequest,
    AIChatResponse,
    AIMessageResponse,
    AIProviderStatusResponse,
    ConversationListResponse,
    ConversationResponse,
    MessageListResponse,
)
from app.schemas.common import ApiResponse
from app.services.activity_service import ActivityService
from app.services.ai_service import AIService
from app.services.context_service import ContextService
from app.services.conversation_service import ConversationService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/ai", tags=["ai"])


@router.get("/provider", response_model=ApiResponse[AIProviderStatusResponse])
async def get_provider(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    return ApiResponse(
        success=True,
        data=AIProviderStatusResponse.model_validate(AIService.from_settings().status()),
    )


@router.post("/chat", response_model=ApiResponse[AIChatResponse])
async def chat(
    project_id: str,
    payload: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)

    if payload.conversation_id:
        conversation = await ConversationService.get_for_user(
            db, payload.conversation_id, project_id, current_user.id
        )
    else:
        conversation = await ConversationService.create(db, project_id, current_user.id)

    context = await ContextService.build_project_context(
        db, project_id, current_user.id, current_file=payload.current_file
    )
    history = await ConversationService.list_messages(db, conversation.id)
    history_payload = [{"role": m.role, "content": m.content} for m in history]

    response = await AIService.from_settings().chat(payload.message, context, history_payload)

    await ConversationService.add_message(db, conversation.id, "user", payload.message)
    await ConversationService.add_message(db, conversation.id, response.role, response.content)
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="ai.chat",
        metadata={"conversation_id": conversation.id},
    )
    await db.commit()

    return ApiResponse(
        success=True,
        data=AIChatResponse(conversation_id=conversation.id, message=response),
    )


@router.get("/conversations", response_model=ApiResponse[ConversationListResponse])
async def list_conversations(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    conversations = await ConversationService.list_for_project(db, project_id, current_user.id)
    return ApiResponse(
        success=True,
        data=ConversationListResponse(
            conversations=[ConversationResponse.model_validate(c) for c in conversations]
        ),
    )


@router.post("/conversations", response_model=ApiResponse[ConversationResponse])
async def create_conversation(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    conversation = await ConversationService.create(db, project_id, current_user.id)
    await db.commit()
    return ApiResponse(success=True, data=ConversationResponse.model_validate(conversation))


@router.get("/conversations/{conversation_id}/messages", response_model=ApiResponse[MessageListResponse])
async def get_messages(
    project_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    conversation = await ConversationService.get_for_user(
        db, conversation_id, project_id, current_user.id
    )
    messages = await ConversationService.list_messages(db, conversation.id)
    return ApiResponse(
        success=True,
        data=MessageListResponse(
            messages=[AIMessageResponse(role=m.role, content=m.content) for m in messages]
        ),
    )


@router.post("/actions", response_model=ApiResponse[AIMessageResponse])
async def run_action(
    project_id: str,
    payload: AIActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    context = await ContextService.build_project_context(
        db, project_id, current_user.id, current_file=payload.file_path
    )
    response = await AIService.from_settings().run_action(
        payload.action,
        payload.code,
        context,
        file_path=payload.file_path,
        language=payload.language,
    )
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="ai.action",
        metadata={"action": payload.action},
    )
    await db.commit()
    return ApiResponse(success=True, data=response)