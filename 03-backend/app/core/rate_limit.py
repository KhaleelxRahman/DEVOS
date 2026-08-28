import time
from collections import defaultdict

from fastapi import Request

from app.core.errors import AppException


class RateLimitExceededException(AppException):
    def __init__(self, message: str = "Too many requests. Please try again later."):
        super().__init__(message=message, code="RATE_LIMITED", status_code=429)

class InMemoryRateLimiter:
    """Sliding-window, per-IP, per-route-key rate limiter.

    Process-local and best-effort: suitable for the single-process deployment
    DEVOS v1.0.0 targets. Swap for Redis-backed limiting for multi-process setups.
    """

    def __init__(self):
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        hits = self._hits[key]
        cutoff = now - window_seconds
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(hits) >= limit:
            raise RateLimitExceededException()
        hits.append(now)

    def reset(self) -> None:
        self._hits.clear()

rate_limiter = InMemoryRateLimiter()

def _client_ip(request: Request) -> str:
    # Only trust X-Forwarded-For from explicitly trusted proxies; by default
    # use the direct peer address.
    return request.client.host if request.client else "unknown"

def rate_limit(limit: int, window_seconds: int, bucket: str):
    async def dependency(request: Request) -> None:
        key = f"{bucket}:{_client_ip(request)}"
        rate_limiter.check(key, limit, window_seconds)
    return dependency
