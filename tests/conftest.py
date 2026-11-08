import sys
import os
import tempfile

# Add backend directory to sys.path for test discovery
backend_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "03-backend")
)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Isolate the test database and project storage BEFORE any app import.
_TEST_DIR = tempfile.mkdtemp(prefix="devos_tests_")
os.environ["DATABASE_URL"] = (
    f"sqlite+aiosqlite:///{os.path.join(_TEST_DIR, 'devos_test.db')}"
)
os.environ["PROJECTS_STORAGE_PATH"] = os.path.join(_TEST_DIR, "projects_storage")

# CORS must also be set before any test module imports app.main or
# app.core.config. Each test file may override this per its own needs, but
# the global default must be a valid allow-listed origin so the first import
# does not create a settings object with an empty CORS list.
os.environ.setdefault(
    "BACKEND_CORS_ORIGINS",
    '["http://localhost:5173","http://localhost:3000","https://devos-ebon.vercel.app"]',
)

# Isolate the AI provider as well. Several API tests assert the
# "local-mock" provider and expect deterministic offline responses, but
# AIService.from_settings() reads the developer's real .env. Without this the
# suite silently makes live, billable provider calls and then fails on
# whatever the provider happened to answer (rate limits, outages, 5xx).
# A test that genuinely needs a real provider must opt in explicitly via the
# `real_ai_provider` fixture below.
os.environ["AI_PROVIDER"] = "mock"
os.environ["AI_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["AI_MODEL"] = ""

# Rate limiting is process-local; reset between tests so per-IP limits in
# auth/waitlist/contact/AI/terminal do not leak across test cases.
import pytest as _pytest  # noqa: E402  (kept after env setup by intent)


@_pytest.fixture
def real_ai_provider():
    """Opt in to the provider configured in the developer's .env.

    This performs a real network call and may consume provider quota, so it is
    never automatic. Without this fixture the provider stays the local mock.

    ``app.core.config`` builds ``settings`` once at import time, so the module
    is reloaded for the env vars above to take effect, then restored
    afterwards so later tests keep the offline mock.
    """
    import importlib

    import app.core.config as config

    with open(
        os.path.join(os.path.dirname(__file__), "..", "backend", ".env"),
        encoding="utf-8",
    ) as fh:
        for line in fh:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key.strip()] = value.strip().strip('"')

    reloaded = importlib.reload(config)
    try:
        yield reloaded.settings
    finally:
        for name in ("AI_PROVIDER", "AI_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "AI_MODEL"):
            os.environ[name] = ""
        importlib.reload(config)


@_pytest.fixture(autouse=True)
def _reset_rate_limiter():
    from app.core.rate_limit import rate_limiter

    rate_limiter.reset()
    yield
    rate_limiter.reset()
