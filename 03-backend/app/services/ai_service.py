from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.schemas.ai import AIMessageResponse

class BaseAIProvider(ABC):
    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        context: Dict[str, Any],
        history: List[Dict[str, str]]
    ) -> AIMessageResponse:
        pass

class MockAIProvider(BaseAIProvider):
    async def generate_response(
        self,
        prompt: str,
        context: Dict[str, Any],
        history: List[Dict[str, str]]
    ) -> AIMessageResponse:
        project_name = context.get("project", {}).get("name", "DEVOS Project")
        return AIMessageResponse(
            role="assistant",
            content=f"DEVOS AI Assistant initialized for project '{project_name}'. Context Engine loaded successfully.",
        )

class AIService:
    def __init__(self, provider: BaseAIProvider = None):
        self.provider = provider or MockAIProvider()

    async def chat(
        self,
        prompt: str,
        context: Dict[str, Any],
        history: List[Dict[str, str]] = None
    ) -> AIMessageResponse:
        return await self.provider.generate_response(prompt, context, history or [])
