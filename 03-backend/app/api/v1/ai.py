from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.rate_limit import rate_limit
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
ai_service = AIService.from_settings()


@router.get("/provider", response_model=ApiResponse[AIProviderStatusResponse])
async def provider_status(current_user: User = Depends(get_current_user)):
    return ApiResponse(success=True, data=AIProviderStatusResponse(**ai_service.status()))


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
    return ApiResponse(success=True, data=ConversationResponse.model_validate(conversation))


@router.get("/conversations/{conversation_id}/messages", response_model=ApiResponse[MessageListResponse])
async def list_messages(
    project_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    conversation = await ConversationService.get_for_user(db, conversation_id, project_id, current_user.id)
    messages = await ConversationService.list_messages(db, conversation.id)
    return ApiResponse(
        success=True,
        data=MessageListResponse(
            messages=[
                AIMessageResponse(
                    role=m.role,
                    content=m.content,
                    created_at=m.created_at,
                    provider=ai_service.provider.name if m.role == "assistant" else "user",
                )
                for m in messages
            ]
        ),
    )


@router.post("/chat", response_model=ApiResponse[AIChatResponse], dependencies=[Depends(rate_limit(20, 60, "ai_chat"))])
async def chat(
    project_id: str,
    data: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)

    if data.conversation_id:
        conversation = await ConversationService.get_for_user(
            db, data.conversation_id, project_id, current_user.id
        )
    else:
        title = data.message.strip()[:60] or "New Conversation"
        conversation = await ConversationService.create(db, project_id, current_user.id, title=title)

    context = await ContextService.build_project_context(
        db, project_id, current_user.id, current_file=data.current_file
    )

    history_records = await ConversationService.list_messages(db, conversation.id)
    history = [{"role": m.role, "content": m.content} for m in history_records[-10:]]

    await ConversationService.add_message(db, conversation.id, "user", data.message)
    response_message = await ai_service.chat(prompt=data.message, context=context, history=history)
    await ConversationService.add_message(db, conversation.id, "assistant", response_message.content)

    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="ai.requested",
        metadata={"prompt_preview": data.message[:50], "provider": ai_service.provider.name},
    )

    return ApiResponse(
        success=True,
        data=AIChatResponse(conversation_id=conversation.id, message=response_message),
    )


@router.post("/actions", response_model=ApiResponse[AIMessageResponse], dependencies=[Depends(rate_limit(20, 60, "ai_actions"))])
async def run_action(
    project_id: str,
    data: AIActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    context = await ContextService.build_project_context(db, project_id, current_user.id)
    result = await ai_service.run_action(
        action=data.action,
        code=data.code,
        context=context,
        file_path=data.file_path,
        language=data.language,
    )
    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type=f"ai.action.{data.action}",
        metadata={"file": data.file_path},
    )
    return ApiResponse(success=True, data=result)

