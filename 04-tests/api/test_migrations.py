"""Regression tests for the production database migration bootstrap.

The production database was originally provisioned by ``create_all`` (which
never alters existing tables). Repo-HEAD models later added columns (e.g.
``conversations.is_pinned``) via Alembic migrations. ``app.bootstrap_migrate``
must therefore upgrade BOTH a fresh database and a legacy create_all
database. These tests run the bootstrap in a subprocess against isolated
temporary SQLite databases.
"""

import os
import sqlite3
import subprocess
import sys

import pytest

# Locate the backend root the same way the sibling API tests do.
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "03-backend"))

LEGACY_CREATE_ALL = (
    "import asyncio\n"
    "from app.db.base import Base\n"
    "from app.db.session import engine\n"
    "import app.models\n"
    "async def _m():\n"
    "    async with engine.begin() as conn:\n"
    "        await conn.run_sync(Base.metadata.create_all)\n"
    "    await engine.dispose()\n"
    "asyncio.run(_m())\n"
)

LEGACY_DROP_PINNED = (
    "import sqlite3, sys\n"
    "conn = sqlite3.connect(sys.argv[1])\n"
    "conn.execute('ALTER TABLE conversations DROP COLUMN is_pinned')\n"
    "conn.commit()\n"
    "conn.close()\n"
)


def _run_bootstrap(db_path) -> subprocess.CompletedProcess:
    env = {**os.environ, "DATABASE_URL": f"sqlite+aiosqlite:///{db_path}"}
    return subprocess.run(
        [sys.executable, "-m", "app.bootstrap_migrate"],
        cwd=BACKEND_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=180,
    )


def _conversation_columns(db_path) -> set[str]:
    conn = sqlite3.connect(db_path)
    try:
        return {row[1] for row in conn.execute("PRAGMA table_info(conversations)")}
    finally:
        conn.close()


def _alembic_head(db_path) -> str:
    conn = sqlite3.connect(db_path)
    try:
        return conn.execute(
            "SELECT version_num FROM alembic_version"
        ).fetchone()[0]
    finally:
        conn.close()


def _provision_legacy(db_path):
    """Create the legacy schema: current create_all schema minus is_pinned."""
    env = {**os.environ, "DATABASE_URL": f"sqlite+aiosqlite:///{db_path}"}
    subprocess.run(
        [sys.executable, "-c", LEGACY_CREATE_ALL],
        cwd=BACKEND_ROOT,
        env=env,
        check=True,
        capture_output=True,
        timeout=120,
    )
    subprocess.run(
        [sys.executable, "-c", LEGACY_DROP_PINNED, str(db_path)],
        check=True,
        capture_output=True,
        timeout=120,
    )


def test_bootstrap_upgrades_fresh_database(tmp_path):
    """A brand-new database runs the full Alembic chain."""
    db_path = tmp_path / "fresh.db"
    result = _run_bootstrap(db_path)
    assert result.returncode == 0, result.stderr[-1000:]
    assert "is_pinned" in _conversation_columns(db_path)
    assert _alembic_head(db_path) == "a4b7cd5e6f80"


def test_bootstrap_upgrades_legacy_database(tmp_path):
    """A legacy `create_all` database (missing is_pinned) is upgraded, and the
    create-table migrations are stamped rather than re-run."""
    db_path = tmp_path / "legacy.db"
    _provision_legacy(db_path)
    assert "is_pinned" not in _conversation_columns(db_path)

    result = _run_bootstrap(db_path)
    assert result.returncode == 0, result.stderr[-1000:]
    assert "is_pinned" in _conversation_columns(db_path)
    assert _alembic_head(db_path) == "a4b7cd5e6f80"


def test_bootstrap_is_idempotent(tmp_path):
    """Running the bootstrap twice leaves the schema intact."""
    db_path = tmp_path / "twice.db"
    _provision_legacy(db_path)
    first = _run_bootstrap(db_path)
    assert first.returncode == 0, first.stderr[-1000:]
    second = _run_bootstrap(db_path)
    assert second.returncode == 0, second.stderr[-1000:]
    assert _alembic_head(db_path) == "a4b7cd5e6f80"
    assert "is_pinned" in _conversation_columns(db_path)

