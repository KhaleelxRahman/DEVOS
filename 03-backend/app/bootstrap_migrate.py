"""Idempotent database bootstrap for production deployments.

The deployment database was originally provisioned by the lifespan's
``Base.metadata.create_all`` (app/main.py), which creates missing tables
but never alters existing ones. A database provisioned by an older build
therefore lacks columns that newer models added, and ``alembic upgrade
head`` cannot be run directly on it because the create-table migrations
would collide with the already-existing tables.

This bootstrap handles every deployment state:

* Fresh database (no tables at all)  -> the full Alembic chain runs.
* Legacy database (tables exist but
  no ``alembic_version``)            -> the create-table migrations are
  stamped as already applied (their
  objects exist via create_all), then
  the chain continues so column-level
  migrations (e.g. conversations.is_pinned)
  are applied.
* Normal database (``alembic_version``
  present)                           -> plain ``alembic upgrade head``.

Run as ``python -m app.bootstrap_migrate`` from the backend root before
starting uvicorn.
"""

import asyncio

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.db.session import engine

# Last create-table-only revision. Everything up to here only creates
# objects that create_all already created on a legacy database.
LEGACY_STAMP_REVISION = "8b7c6d5e4f3a"


def _inspect_tables(sync_connection) -> tuple[bool, bool]:
    inspector = inspect(sync_connection)
    return inspector.has_table("alembic_version"), inspector.has_table("users")


async def _deployment_state() -> tuple[bool, bool]:
    async with engine.connect() as connection:
        return await connection.run_sync(_inspect_tables)


def main() -> None:
    config = Config("alembic.ini")
    has_version_table, has_users_table = asyncio.run(_deployment_state())
    if not has_version_table and has_users_table:
        # Legacy create_all-provisioned database: mark the create-table
        # migrations as applied so the upgrade only runs the column work.
        command.stamp(config, LEGACY_STAMP_REVISION)
    command.upgrade(config, "head")


if __name__ == "__main__":
    main()
