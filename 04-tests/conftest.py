import pytest
import sys
import os
import tempfile

# Add backend directory to sys.path for test discovery
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "03-backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Isolate the test database and project storage BEFORE any app import.
_TEST_DIR = tempfile.mkdtemp(prefix="devos_tests_")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{os.path.join(_TEST_DIR, 'devos_test.db')}"
os.environ["PROJECTS_STORAGE_PATH"] = os.path.join(_TEST_DIR, "projects_storage")


# Rate limiting is process-local; reset between tests so per-IP limits in
# auth/waitlist/contact/AI/terminal do not leak across test cases.
import pytest as _pytest

@_pytest.fixture(autouse=True)
def _reset_rate_limiter():
    from app.core.rate_limit import rate_limiter
    rate_limiter.reset()
    yield
    rate_limiter.reset()
