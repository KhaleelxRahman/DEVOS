from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.ai import AIChatRequest, AIChatResponse, AIMessageResponse
from app.services.project_service import ProjectService
from app.services.context_service import ContextService
from app.services.ai_service import AIService
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/projects/{project_id}/ai", tags=["ai"])
ai_service = AIService()

@router.post("/chat", response_model=ApiResponse[AIChatResponse])
async def chat(
    project_id: str,
    data: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ProjectService.get_for_user(db, project_id, current_user.id)
    
    # Assemble project context
    context = await ContextService.build_project_context(
        db, project_id, current_user.id, current_file=data.current_file
    )

    # Generate response
    response_message = await ai_service.chat(
        prompt=data.message,
        context=context,
    )

    conv_id = data.conversation_id or "default-conversation"

    await ActivityService.record(
        db,
        user_id=current_user.id,
        project_id=project_id,
        activity_type="ai.requested",
        metadata={"prompt_preview": data.message[:50]},
    )

    return ApiResponse(
        success=True,
        data=AIChatResponse(
            conversation_id=conv_id,
            message=response_message,
        ),
    )
