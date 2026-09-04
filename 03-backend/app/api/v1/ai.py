"""Project-scoped AI endpoints.

Every route verifies project ownership through ProjectService.get_for_user,
so a user can never read or reply inside another user's conversation.
"""

import asyncio
import json
import re
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import AsyncSessionLocal, get_db
from app.models.user import User
from app.schemas.ai import (
    AIActionRequest,
    AIChatRequest,
    AIChatResponse,
    AIMessageResponse,
    AIProviderStatusResponse,
    ConversationListResponse,
    ConversationResponse,
    ConversationUpdateRequest,
    MessageListResponse,
)
from app.schemas.artifact import ArtifactCreateRequest, ArtifactListResponse, ArtifactResponse
from app.schemas.common import ApiResponse
from app.services.activity_service import ActivityService
from app.services.ai_service import AIService
from app.services.context_service import ContextService
from app.services.conversation_service import ConversationService
from app.services.project_service import ProjectService
from app.services.artifact_service import ArtifactService
from app.core.errors import ValidationException

router = APIRouter(prefix="/projects/{project_id}/ai", tags=["ai"])


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, separators=(',', ':'))}\n\n"


def get_db_session():
    return AsyncSessionLocal()


def _artifact_response(artifact):
    return ArtifactResponse(
        id=artifact.id,
        project_id=artifact.project_id,
        conversation_id=artifact.conversation_id,
        message_id=artifact.message_id,
        name=artifact.name,
        kind=artifact.kind,
        content=artifact.content,
        mime_type=artifact.mime_type,
        metadata=artifact.metadata_json,
        created_at=artifact.created_at,
        updated_at=artifact.updated_at,
    )


def _extract_artifact(content: str) -> tuple[str, str, str] | None:
    match = re.search(r"```([a-zA-Z0-9_-]*)\n([\s\S]*?)```", content)
    if not match:
        return None
    language = match.group(1).lower() or "text"
    kind = {"md": "markdown", "markdown": "markdown", "json": "json", "html": "html",
            "mermaid": "mermaid", "svg": "svg"}.get(language, "code")
    extension = {"markdown": "md", "json": "json", "html": "html", "mermaid": "mmd", "svg": "svg"}.get(kind, language)
    return f"assistant-artifact.{extension}", kind, match.group(2)


@router.get("/provider", response_model=ApiResponse[AIProviderStatusResponse])
async def get_provider(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    return ApiResponse(
        success=True,
        data=AIProviderStatusResponse.model_validate(
            AIService.from_settings().status()
        ),
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

    response = await AIService.from_settings().chat(
        payload.message, context, history_payload
    )

    await ConversationService.add_message(db, conversation.id, "user", payload.message)
    if conversation.title == "New Conversation":
        conversation.title = payload.message.strip()[:80] or "New Conversation"
    await ConversationService.add_message(
        db, conversation.id, response.role, response.content
    )
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


@router.post("/chat/stream")
async def chat_stream(
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
    service = AIService.from_settings()
    await ConversationService.add_message(db, conversation.id, "user", payload.message)
    if conversation.title == "New Conversation":
        conversation.title = payload.message.strip()[:80] or "New Conversation"
    await db.commit()
    conversation_id = conversation.id

    async def events() -> AsyncIterator[str]:
        chunks: list[str] = []
        try:
            yield _sse("start", {"conversation_id": conversation_id, "provider": service.provider.name})
            async for chunk in service.stream_chat(payload.message, context, history_payload):
                if not chunk:
                    continue
                chunks.append(chunk)
                yield _sse("delta", {"content": chunk})
                await asyncio.sleep(0)
            content = "".join(chunks)
            if not content:
                raise RuntimeError("AI provider returned an empty response")
            async with get_db_session() as final_db:
                assistant_message = await ConversationService.add_message(
                    final_db, conversation_id, "assistant", content
                )
                artifact = _extract_artifact(content)
                artifact_id = None
                if artifact:
                    created = await ArtifactService.create(
                        final_db,
                        project_id,
                        current_user.id,
                        ArtifactCreateRequest(
                            name=artifact[0],
                            kind=artifact[1],
                            content=artifact[2],
                            conversation_id=conversation_id,
                            message_id=assistant_message.id,
                        ),
                    )
                    artifact_id = created.id
                await ActivityService.record(
                    final_db, user_id=current_user.id, project_id=project_id,
                    activity_type="ai.chat", metadata={"conversation_id": conversation_id, "streamed": True},
                )
                await final_db.commit()
            complete = {"conversation_id": conversation_id, "content": content, "provider": service.provider.name}
            if artifact_id:
                complete["artifact_id"] = artifact_id
            yield _sse("complete", complete)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            yield _sse("error", {"message": str(exc)})

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/artifacts", response_model=ApiResponse[ArtifactListResponse])
async def list_artifacts(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    artifacts = await ArtifactService.list_for_project(db, project_id, current_user.id)
    return ApiResponse(
        success=True,
        data=ArtifactListResponse(artifacts=[_artifact_response(a) for a in artifacts]),
    )


@router.post("/artifacts", response_model=ApiResponse[ArtifactResponse])
async def create_artifact(
    project_id: str,
    payload: ArtifactCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    artifact = await ArtifactService.create(db, project_id, current_user.id, payload)
    await db.commit()
    return ApiResponse(success=True, data=_artifact_response(artifact))


@router.get("/artifacts/{artifact_id}", response_model=ApiResponse[ArtifactResponse])
async def get_artifact(
    project_id: str,
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    artifact = await ArtifactService.get_for_user(db, artifact_id, project_id, current_user.id)
    return ApiResponse(success=True, data=_artifact_response(artifact))


@router.delete("/artifacts/{artifact_id}", response_model=ApiResponse[dict])
async def delete_artifact(
    project_id: str,
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    artifact = await ArtifactService.get_for_user(db, artifact_id, project_id, current_user.id)
    await ArtifactService.delete(db, artifact)
    await db.commit()
    return ApiResponse(success=True, data={"deleted": True})


@router.get("/conversations", response_model=ApiResponse[ConversationListResponse])
async def list_conversations(
    project_id: str,
    q: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    conversations = await ConversationService.list_for_project(
        db, project_id, current_user.id, q
    )
    return ApiResponse(
        success=True,
        data=ConversationListResponse(
            conversations=[
                ConversationResponse.model_validate(c) for c in conversations
            ]
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
    return ApiResponse(
        success=True, data=ConversationResponse.model_validate(conversation)
    )


@router.patch("/conversations/{conversation_id}", response_model=ApiResponse[ConversationResponse])
async def update_conversation(
    project_id: str,
    conversation_id: str,
    payload: ConversationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    conversation = await ConversationService.get_for_user(db, conversation_id, project_id, current_user.id)
    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise ValidationException("Conversation title cannot be empty")
        conversation.title = title[:255]
    if payload.is_pinned is not None:
        conversation.is_pinned = payload.is_pinned
    await db.commit()
    await db.refresh(conversation)
    return ApiResponse(success=True, data=ConversationResponse.model_validate(conversation))


@router.delete("/conversations/{conversation_id}", response_model=ApiResponse[dict])
async def delete_conversation(
    project_id: str,
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    conversation = await ConversationService.get_for_user(db, conversation_id, project_id, current_user.id)
    await ConversationService.delete(db, conversation)
    await db.commit()
    return ApiResponse(success=True, data={"deleted": True})


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=ApiResponse[MessageListResponse],
)
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
            messages=[
                AIMessageResponse(role=m.role, content=m.content) for m in messages
            ]
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
