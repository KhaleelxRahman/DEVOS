"""Idempotent database bootstrap for production deployments.

The deployment database was originally provisioned by the lifespan's
``Base.metadata.create_all`` (app/main.py), which creates missing tables
but never alters existing ones. A database provisioned by an older build
therefore lacks columns that newer models added (e.g.
``conversations.is_pinned``), and ``alembic upgrade head`` cannot be run
directly on it because the create-table migrations would collide with the
already-existing tables.

This bootstrap handles every deployment state:

* Fresh database (no tables at all)  -> the full Alembic chain runs.
* Legacy database (tables exist but
  no ``alembic_version``)            -> the create-table migrations are
  stamped as already applied (their
  objects exist via create_all), then
  the chain continues so column-level
  migrations are applied.
* Normal database (``alembic_version``
  present)                           -> plain ``alembic upgrade head``.

It runs on every app start from within ``app.main``'s lifespan (so it is
independent of the hosting start command), and can also be invoked
directly as ``python -m app.bootstrap_migrate`` from the backend root.
"""

import asyncio
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.db.session import engine

# Paths are resolved relative to this module so the bootstrap works no matter
# what the hosting platform sets as the process working directory.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ALEMBIC_INI = os.path.join(_BACKEND_ROOT, "alembic.ini")

# Last create-table-only revision. Everything up to here only creates
# objects that create_all already created on a legacy database.
LEGACY_STAMP_REVISION = "8b7c6d5e4f3a"


def _inspect_tables(sync_connection) -> tuple[bool, bool]:
    inspector = inspect(sync_connection)
    return inspector.has_table("alembic_version"), inspector.has_table("users")


async def _deployment_state() -> tuple[bool, bool]:
    async with engine.connect() as connection:
        return await connection.run_sync(_inspect_tables)


def run() -> None:
    if not os.path.exists(_ALEMBIC_INI):
        raise FileNotFoundError(f"alembic.ini not found at {_ALEMBIC_INI}")
    config = Config(_ALEMBIC_INI)
    has_version_table, has_users_table = asyncio.run(_deployment_state())
    if not has_version_table and has_users_table:
        # Legacy create_all-provisioned database: mark the create-table
        # migrations as applied so the upgrade only runs the column work.
        command.stamp(config, LEGACY_STAMP_REVISION)
    command.upgrade(config, "head")


def run_migrations_in_subprocess() -> None:
    """Run the bootstrap in a fresh interpreter.

    Called from the FastAPI lifespan, which executes inside an already
    running event loop. Alembic's own ``env.py`` (and the legacy stamp
    check) call ``asyncio.run(...)`` which raises when a loop is running,
    so this path must be executed in a child process.
    """
    import subprocess
    import sys

    env = os.environ.copy()
    result = subprocess.run(
        [sys.executable, "-m", "app.bootstrap_migrate"],
        cwd=_BACKEND_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"alembic bootstrap failed ({result.returncode}): "
            f"{(result.stderr or result.stdout)[-2000:]}"
        )


if __name__ == "__main__":
    run()
