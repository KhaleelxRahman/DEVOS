import pytest

from app.services.ai_service import (
    AIService,
    MockAIProvider,
    GeminiProvider,
    OpenAIProvider,
)
from app.core.errors import ValidationException


def test_default_provider_is_labelled_mock():
    service = AIService.from_settings()
    status = service.status()
    assert status["provider"] == "local-mock"
    assert status["is_mock"] is True
    assert status["configured"] is False


def test_factory_falls_back_to_mock_when_key_missing(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "AI_API_KEY", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    service = AIService.from_settings()
    assert isinstance(service.provider, MockAIProvider)


def test_factory_selects_real_provider_when_configured(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "AI_API_KEY", "test-key-not-real")
    service = AIService.from_settings()
    assert isinstance(service.provider, GeminiProvider)
    assert service.provider.is_mock is False

    monkeypatch.setattr(settings, "AI_PROVIDER", "openai")
    service = AIService.from_settings()
    assert isinstance(service.provider, OpenAIProvider)


@pytest.mark.asyncio
async def test_mock_provider_response_is_labelled():
    provider = MockAIProvider()
    response = await provider.generate_response(
        "hello", {"project": {"name": "demo"}}, []
    )
    assert response.provider == "local-mock"
    assert "Mock" in response.content
    assert "demo" in response.content


@pytest.mark.asyncio
async def test_run_action_rejects_unknown_action():
    service = AIService()
    with pytest.raises(ValidationException):
        await service.run_action("delete-everything", "code", {})


@pytest.mark.asyncio
async def test_run_action_accepts_known_actions():
    service = AIService()
    for action in (
        "explain",
        "debug",
        "refactor",
        "test",
        "document",
        "security",
        "optimize",
    ):
        response = await service.run_action(action, "x = 1", {})
        assert response.role == "assistant"


def test_mock_response_never_contains_api_keys():
    from app.core.config import settings

    service = AIService.from_settings()
    rendered = str(service.status())
    assert settings.AI_API_KEY not in rendered or not settings.AI_API_KEY
    assert settings.GEMINI_API_KEY not in rendered or not settings.GEMINI_API_KEY
    assert settings.OPENAI_API_KEY not in rendered or not settings.OPENAI_API_KEY
