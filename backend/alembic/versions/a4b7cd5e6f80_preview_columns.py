"""add preview columns to executions table for Phase 2D

Revision ID: a4b7cd5e6f80
Revises: 3e7e5a9c4f1b
Create Date: 2026-09-14 08:00:00.000000

Phase 2D dev-server previews reuse the canonical executions table: each
preview IS an execution row (execution_type=DEV_SERVER). These two nullable
columns record the bound port and the backend proxy URL once the dev server
is confirmed reachable (status READY). The upgrade is idempotent — it only
adds columns that are missing, matching the defensive shape of the prior
executions migration.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "a4b7cd5e6f80"
down_revision: str | None = "3e7e5a9c4f1b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()
    if "executions" not in tables:
        # Fresh database: the executions migration owns the table; nothing
        # to add here. create_all in the app lifespan fills any leftovers.
        return
    cols = {c["name"] for c in inspector.get_columns("executions")}
    if "preview_port" not in cols:
        op.add_column(
            "executions",
            sa.Column("preview_port", sa.Integer(), nullable=True),
        )
    if "preview_url" not in cols:
        op.add_column(
            "executions",
            sa.Column("preview_url", sa.String(length=512), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "executions" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("executions")}
    if "preview_url" in cols:
        op.drop_column("executions", "preview_url")
    if "preview_port" in cols:
        op.drop_column("executions", "preview_port")