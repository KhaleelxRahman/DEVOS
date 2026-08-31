from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai.code_suggestion_service import generate_suggestion

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])

class SuggestRequest(BaseModel):
    code: str

@router.post("/suggest")
def suggest(request: SuggestRequest):
    return generate_suggestion(request.code)
