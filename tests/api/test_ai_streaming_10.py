"""Phase 10: genuine AI streaming must not be simulated.

Before this, GeminiProvider inherited BaseAIProvider.stream_response, which
performs ONE blocking generateContent call and then slices the finished text
into 64-character pieces. That satisfies the streaming contract on the wire
while delivering nothing to the user until generation has already finished -
i.e. faked streaming. These tests pin the real :streamGenerateContent
transport, the API-key hygiene of that request, and the honest error path.
"""

import json

import httpx
import pytest

from app.services.ai_service import BaseAIProvider, GeminiProvider, MockAIProvider


class _FakeStream:
    """Minimal async context manager mimicking httpx's streaming response."""

    def __init__(self, lines, status=200):
        self._lines = lines
        self.status_code = status

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError(
                f"boom {self.status_code}",
                request=httpx.Request("POST", "https://example.invalid/streamGenerateContent"),
                response=httpx.Response(self.status_code),
            )

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _RecordingClient:
    def __init__(self, lines, status=200):
        self.lines = lines
        self.status = status
        self.calls = []

    def stream(self, method, url, **kwargs):
        self.calls.append({"method": method, "url": url, **kwargs})
        return _FakeStream(self.lines, self.status)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


def _patch_client(monkeypatch, client):
    import app.services.ai_service as module

    monkeypatch.setattr(module.httpx, "AsyncClient", lambda *a, **k: client)


def _sse(text):
    return "data: " + json.dumps({"candidates": [{"content": {"parts": [{"text": text}]}}]})


@pytest.mark.asyncio
async def test_gemini_stream_uses_native_streaming_transport(monkeypatch):
    """The provider must hit :streamGenerateContent, not :generateContent."""
    client = _RecordingClient([_sse("Hello"), _sse(" world")])
    _patch_client(monkeypatch, client)

    provider = GeminiProvider(api_key="k-test", model="gemini-test-model")
    chunks = [c async for c in provider.stream_response("hi", {}, [])]

    assert chunks == ["Hello", " world"]
    call = client.calls[0]
    assert call["method"] == "POST"
    assert call["url"].endswith(":streamGenerateContent")
    assert "generateContent?alt" not in call["url"]
    # SSE mode must be requested explicitly, otherwise Gemini returns a JSON array
    assert call["params"] == {"alt": "sse"}


@pytest.mark.asyncio
async def test_gemini_stream_yields_incrementally_not_as_one_blob(monkeypatch):
    """Each provider chunk must surface as its own delta.

    The old fallback emitted 64-char slices of an already-complete response
    only after the blocking call returned. A real stream delivers distinct,
    provider-sized pieces.
    """
    provider_chunks = [f"tok{i} " for i in range(5)]
    client = _RecordingClient([_sse(t) for t in provider_chunks])
    _patch_client(monkeypatch, client)

    provider = GeminiProvider(api_key="k-test", model="gemini-test-model")
    chunks = [c async for c in provider.stream_response("hi", {}, [])]

    assert chunks == provider_chunks
    assert "".join(chunks) == "tok0 tok1 tok2 tok3 tok4 "


@pytest.mark.asyncio
async def test_gemini_stream_ignores_noise_and_done_sentinels(monkeypatch):
    """Comments, blank lines, [DONE] and non-text parts must not become deltas."""
    lines = [
        "",
        ": keep-alive",
        _sse("a"),
        'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"x"}}]}}]}',
        "data: [DONE]",
        "data: not-json",
    ]
    client = _RecordingClient(lines)
    _patch_client(monkeypatch, client)

    provider = GeminiProvider(api_key="k-test", model="gemini-test-model")
    chunks = [c async for c in provider.stream_response("hi", {}, [])]

    assert chunks == ["a"]


@pytest.mark.asyncio
async def test_gemini_stream_preserves_history_and_context(monkeypatch):
    """Prompt assembly must match the non-streaming path."""
    client = _RecordingClient([_sse("ok")])
    _patch_client(monkeypatch, client)

    provider = GeminiProvider(api_key="k-test", model="gemini-test-model")
    history = [
        {"role": "user", "content": "earlier question"},
        {"role": "assistant", "content": "earlier answer"},
    ]
    context = {
        "project": {"name": "MatrixProj", "technologies": ["python"]},
        "current_file": {"path": "main.py", "language": "python", "content": "print(1)"},
    }
    _ = [c async for c in provider.stream_response("the question", context, history)]

    contents = client.calls[0]["json"]["contents"]
    assert contents[0] == {"role": "user", "parts": [{"text": "earlier question"}]}
    assert contents[1] == {"role": "model", "parts": [{"text": "earlier answer"}]}
    final = contents[-1]["parts"][0]["text"]
    assert "MatrixProj" in final
    assert "main.py" in final
    assert final.endswith("User question:\nthe question")


@pytest.mark.asyncio
async def test_gemini_stream_surfaces_provider_failure(monkeypatch):
    """A provider error must propagate, not be silently swallowed."""
    client = _RecordingClient([], status=500)
    _patch_client(monkeypatch, client)

    provider = GeminiProvider(api_key="k-test", model="gemini-test-model")
    with pytest.raises(httpx.HTTPStatusError):
        _ = [c async for c in provider.stream_response("hi", {}, [])]


def test_base_fallback_still_available_for_providers_without_native_stream():
    """The chunked fallback is retained for out-of-tree providers.

    It is a contract-preserving default, not a claim of native streaming, so
    it must stay a concrete (non-abstract) method on the base class.
    """
    assert "stream_response" in BaseAIProvider.__dict__
    assert MockAIProvider.stream_response is BaseAIProvider.stream_response
    # A real provider must NOT be left on that fallback.
    assert GeminiProvider.stream_response is not BaseAIProvider.stream_response


@pytest.mark.asyncio
async def test_base_fallback_still_chunks_for_mock_provider():
    """Mock provider keeps working through the inherited fallback."""
    provider = MockAIProvider()
    chunks = [c async for c in provider.stream_response("hello", {"project": {"name": "demo"}}, [])]
    joined = "".join(chunks)
    assert "demo" in joined
    # Fallback yields bounded pieces, not one giant string.
    assert all(len(c) <= 64 for c in chunks)


@pytest.mark.asyncio
async def test_gemini_stream_keeps_api_key_out_of_the_url(monkeypatch):
    """The key must travel in a header, never in the query string."""
    client = _RecordingClient([_sse("ok")])
    _patch_client(monkeypatch, client)

    provider = GeminiProvider(api_key="super-secret-key", model="gemini-test-model")
    _ = [c async for c in provider.stream_response("hi", {}, [])]

    call = client.calls[0]
    assert "super-secret-key" not in call["url"]
    assert "super-secret-key" not in str(call["params"])
    assert call["headers"]["x-goog-api-key"] == "super-secret-key"
