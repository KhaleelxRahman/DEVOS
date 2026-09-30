"""Provider-independent DEVOS v1.0.0 AI architecture.

Providers implement BaseAIProvider. The factory (AIService.from_settings)
selects a real provider only when its API key is configured; otherwise it
returns the clearly labelled local mock provider. Mock responses are never
presented as coming from a real provider.
"""

from abc import ABC, abstractmethod
import asyncio
from collections.abc import AsyncIterator
import json
import re
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.ai import AIMessageResponse, AIUsage

# Phase 9: structured output is requested in the prompt and then parsed
# defensively. Models wrap JSON in prose or ``` fences constantly, so the
# extraction has to be forgiving while the *validation* stays strict.
_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)
_JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


class BaseAIProvider(ABC):
    name: str = "base"
    model: str = ""
    is_mock: bool = True

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        context: dict[str, Any],
        history: list[dict[str, str]],
    ) -> AIMessageResponse: ...

    async def stream_response(
        self,
        prompt: str,
        context: dict[str, Any],
        history: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        """Yield response text in bounded chunks.

        Providers can override this with native provider streaming. The
        fallback preserves the streaming contract for providers that only
        expose a complete-response API.
        """
        response = await self.generate_response(prompt, context, history)
        for index in range(0, len(response.content), 64):
            yield response.content[index : index + 64]

    async def generate_structured(
        self,
        prompt: str,
        context: dict[str, Any],
        history: list[dict[str, str]],
    ) -> AIMessageResponse:
        """Structured-output variant, added in Phase 9.

        The default implementation simply asks for JSON in the prompt and
        returns the raw text, so every existing provider inherits a working
        structured path without being modified. A provider that supports a
        native JSON/schema mode can override this to use it.

        Kept as a concrete method (not abstract) on purpose: adding an abstract
        method would break every out-of-tree provider.
        """
        return await self.generate_response(prompt, context, history)

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Local fallback estimate, roughly 4 characters per token.

        This is explicitly an ESTIMATE and is never reported as provider usage.
        """
        return max(1, len(text or "") // 4)


def _render_context(context: dict[str, Any]) -> str:
    """Render a compact, size-limited text view of the project context."""
    parts: list[str] = []
    project = context.get("project") or {}
    if project:
        parts.append(
            f"Project: {project.get('name')} | stack: {', '.join(project.get('technologies') or [])}"
        )

    readme = context.get("readme")
    if readme:
        parts.append(f"README excerpt:\n{readme[:2000]}")

    tree = context.get("file_tree") or []
    paths: list[str] = []

    def collect(nodes):
        for node in nodes:
            paths.append(node.get("path", ""))
            if node.get("children"):
                collect(node["children"])

    collect(tree)
    if paths:
        parts.append("Files:\n" + "\n".join(paths[:200]))

    current = context.get("current_file")
    if current:
        parts.append(
            f"Active file: {current.get('path')}\n```{current.get('language', '')}\n"
            f"{(current.get('content') or '')[:8000]}\n```"
        )

    git_status = context.get("git_status")
    if git_status:
        parts.append(
            f"Git: branch={git_status.get('branch')} clean={git_status.get('is_clean')} "
            f"modified={len(git_status.get('modified') or [])} untracked={len(git_status.get('untracked') or [])}"
        )

    rendered = "\n\n".join(parts)
    return rendered[:16000]


class MockAIProvider(BaseAIProvider):
    """Deterministic local provider used when no real AI provider is configured.

    Every response is explicitly labelled so users can never mistake it for
    output of a real model.
    """

    name = "local-mock"
    model = "devos-local-mock"
    is_mock = True

    async def generate_response(
        self,
        prompt: str,
        context: dict[str, Any],
        history: list[dict[str, str]],
    ) -> AIMessageResponse:
        project_name = (context.get("project") or {}).get("name", "your project")
        current_file = context.get("current_file")
        file_note = (
            f" I can see your active file `{current_file.get('path')}`."
            if current_file
            else ""
        )
        content = (
            "**DEVOS v1.0.0 Local/Mock AI** (no AI provider configured — set `AI_PROVIDER` and "
            "`AI_API_KEY` to enable a real model).\n\n"
            f"You asked about `{project_name}`:{file_note}\n\n"
            f"> {prompt[:500]}\n\n"
            "This is a deterministic local response for development. A configured provider "
            "(Gemini or OpenAI) would answer using your project tree, README, active file "
            "and Git status as context."
        )
        return AIMessageResponse(role="assistant", content=content, provider=self.name)


class GeminiProvider(BaseAIProvider):
    name = "gemini"
    is_mock = False

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model

    async def generate_response(self, prompt, context, history) -> AIMessageResponse:
        context_text = _render_context(context)
        contents = [
            {
                "role": "user" if m.get("role") == "user" else "model",
                "parts": [{"text": m.get("content", "")}],
            }
            for m in history[-10:]
        ]
        contents.append(
            {
                "role": "user",
                "parts": [{"text": f"{context_text}\n\nUser question:\n{prompt}"}],
            }
        )
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={self.api_key}"
        )
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json={"contents": contents})
            resp.raise_for_status()
            data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        meta = data.get("usageMetadata") or {}
        return AIMessageResponse(
            role="assistant", content=text or "(empty response)", provider=self.name,
            model=self.model,
            usage=AIUsage(
                source="provider_reported",
                input_tokens=meta.get("promptTokenCount"),
                output_tokens=meta.get("candidatesTokenCount"),
                total_tokens=meta.get("totalTokenCount"),
            )
            if meta.get("totalTokenCount")
            else None,
        )


class OpenAIProvider(BaseAIProvider):
    name = "openai"
    is_mock = False

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    async def generate_response(self, prompt, context, history) -> AIMessageResponse:
        context_text = _render_context(context)
        messages = [
            {
                "role": "system",
                "content": "You are the DEVOS v1.0.0 coding assistant. Use the project context provided.",
            },
            {"role": "system", "content": context_text},
        ]
        messages.extend(
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in history[-10:]
            if m.get("role") in ("user", "assistant")
        )
        messages.append({"role": "user", "content": prompt})
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": self.model, "messages": messages},
            )
            resp.raise_for_status()
            data = resp.json()
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        meta = data.get("usage") or {}
        return AIMessageResponse(
            role="assistant", content=text or "(empty response)", provider=self.name,
            model=self.model,
            usage=AIUsage(
                source="provider_reported",
                input_tokens=meta.get("prompt_tokens"),
                output_tokens=meta.get("completion_tokens"),
                total_tokens=meta.get("total_tokens"),
            )
            if meta.get("total_tokens")
            else None,
        )


_ACTION_PROMPTS = {
    "explain": "Explain what the following code does, clearly and concisely.",
    "debug": "Analyze the following code for bugs and likely failure modes. Suggest fixes.",
    "refactor": "Refactor the following code for readability and maintainability. Show the improved version.",
    "test": "Write meaningful automated tests for the following code.",
    "document": "Write clear documentation (docstrings/comments) for the following code.",
    "security": "Perform a security review of the following code. Identify vulnerabilities and mitigations.",
    "optimize": "Suggest performance optimizations for the following code, with reasoning.",
}


class AIService:
    def __init__(self, provider: BaseAIProvider | None = None):
        self.provider = provider or MockAIProvider()

    @classmethod
    def from_settings(cls) -> "AIService":
        """Select a provider from configuration.

        A real provider is only used when its API key is actually configured;
        otherwise the labelled local mock provider is used.
        """
        provider_name = (settings.AI_PROVIDER or "mock").strip().lower()

        if provider_name == "gemini":
            key = settings.AI_API_KEY or settings.GEMINI_API_KEY
            if key:
                return cls(GeminiProvider(key, settings.AI_MODEL or "gemini-1.5-flash"))
        elif provider_name == "openai":
            key = settings.AI_API_KEY or settings.OPENAI_API_KEY
            if key:
                return cls(OpenAIProvider(key, settings.AI_MODEL or "gpt-4o-mini"))

        return cls(MockAIProvider())

    def status(self) -> dict[str, Any]:
        return {
            "provider": self.provider.name,
            "model": self.provider.model,
            "is_mock": self.provider.is_mock,
            "configured": not self.provider.is_mock,
        }

    async def chat(
        self,
        prompt: str,
        context: dict[str, Any],
        history: list[dict[str, str]] | None = None,
    ) -> AIMessageResponse:
        return await self.provider.generate_response(prompt, context, history or [])

    @staticmethod
    def extract_json(content: str) -> dict[str, Any] | None:
        """Best-effort JSON object extraction from a model reply.

        Returns None rather than raising: an unparseable reply is a normal,
        expected outcome that the caller must handle honestly, not an error
        that should be papered over.
        """
        if not content:
            return None
        for candidate in _FENCE_RE.findall(content) or [content]:
            candidate = candidate.strip()
            if not candidate:
                continue
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                match = _JSON_OBJECT_RE.search(candidate)
                if not match:
                    continue
                try:
                    parsed = json.loads(match.group(0))
                except json.JSONDecodeError:
                    continue
            if isinstance(parsed, dict):
                return parsed
        return None

    async def structured(
        self,
        prompt: str,
        context: dict[str, Any],
        history: list[dict[str, str]] | None = None,
        timeout: float = 60.0,
        max_retries: int = 1,
    ) -> tuple[dict[str, Any] | None, AIMessageResponse]:
        """Call the provider for structured JSON, with timeout and retry.

        Returns ``(parsed_or_None, response)``. The response is always present
        so the caller can record the real provider/model and the real outcome,
        including failures. Usage is taken from the provider when it reports
        any, and otherwise explicitly marked as an estimate or as none - it is
        never silently presented as provider usage.
        """
        last_error: str | None = None
        for attempt in range(max_retries + 1):
            try:
                response = await asyncio.wait_for(
                    self.provider.generate_structured(
                        prompt, context, history or []
                    ),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                last_error = f"provider timed out after {timeout}s"
            except Exception as exc:  # noqa: BLE001 - surfaced, never hidden
                last_error = f"{type(exc).__name__}: {exc}"
            else:
                if response.usage is None:
                    response.usage = AIUsage(
                        source="estimated",
                        input_tokens=BaseAIProvider.estimate_tokens(prompt),
                        output_tokens=BaseAIProvider.estimate_tokens(response.content),
                        total_tokens=(
                            BaseAIProvider.estimate_tokens(prompt)
                            + BaseAIProvider.estimate_tokens(response.content)
                        ),
                    )
                if response.model is None:
                    response.model = self.provider.model
                return self.extract_json(response.content), response
            if attempt < max_retries:
                await asyncio.sleep(0)

        return None, AIMessageResponse(
            role="assistant",
            content="",
            provider=self.provider.name,
            model=self.provider.model,
            usage=AIUsage(source="none"),
            error=last_error or "provider call failed",
        )

    async def stream_chat(
        self,
        prompt: str,
        context: dict[str, Any],
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[str]:
        async for chunk in self.provider.stream_response(prompt, context, history or []):
            yield chunk

    async def run_action(
        self,
        action: str,
        code: str,
        context: dict[str, Any],
        file_path: str | None = None,
        language: str | None = None,
    ) -> AIMessageResponse:
        if action not in _ACTION_PROMPTS:
            from app.core.errors import ValidationException

            raise ValidationException(f"Unknown AI action '{action}'")
        header = _ACTION_PROMPTS[action]
        location = f" (from `{file_path}`)" if file_path else ""
        prompt = f"{header}{location}\n\n```{language or ''}\n{code[:12000]}\n```"
        return await self.chat(prompt, context)
