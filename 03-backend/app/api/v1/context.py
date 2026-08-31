from fastapi import APIRouter
from pydantic import BaseModel

from app.services.context.file_context_service import search_files

router = APIRouter(prefix="/api/v1/context", tags=["Context"])

class ContextRequest(BaseModel):
    query: str

@router.post("/search")
def search(request: ContextRequest):
    return search_files(request.query)
