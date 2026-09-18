import pytest
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

# Rate limiting is process-local; reset between tests so per-IP limits in
# auth/waitlist/contact/AI/terminal do not leak across test cases.
import pytest as _pytest


@_pytest.fixture(autouse=True)
def _reset_rate_limiter():
    from app.core.rate_limit import rate_limiter

    rate_limiter.reset()
    yield
    rate_limiter.reset()
