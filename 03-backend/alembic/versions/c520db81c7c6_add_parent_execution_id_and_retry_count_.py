"""add parent_execution_id and retry_count to executions

Revision ID: c520db81c7c6
Revises: a4b7cd5e6f80
Create Date: 2026-09-14 19:38:14.755171

"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'c520db81c7c6'
down_revision: Union[str, None] = 'a4b7cd5e6f80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent by construction: the base executions migration
    # (3e7e5a9c4f1b) already creates ``parent_execution_id`` and its index,
    # and a legacy ``create_all`` database already carries both columns.
    # Only add what is genuinely missing (same defensive shape as the
    # executions and preview-columns migrations).
    bind = op.get_bind()
    inspector = inspect(bind)
    if "executions" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("executions")}
    if "parent_execution_id" not in cols:
        op.add_column(
            "executions",
            sa.Column("parent_execution_id", sa.String(length=36), nullable=True),
        )
    idxs = {i["name"] for i in inspector.get_indexes("executions")}
    if "ix_executions_parent_execution_id" not in idxs:
        op.create_index(
            "ix_executions_parent_execution_id", "executions",
            ["parent_execution_id"])
    if "retry_count" not in cols:
        op.add_column(
            "executions",
            sa.Column("retry_count", sa.Integer(), nullable=False,
                      server_default='0'),
        )
    # completed_at already exists in the base migration; no-op here for safety.


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if "executions" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("executions")}
    idxs = {i["name"] for i in inspector.get_indexes("executions")}
    if "ix_executions_parent_execution_id" in idxs:
        op.drop_index(
            "ix_executions_parent_execution_id", table_name="executions")
    if "parent_execution_id" in cols:
        op.drop_column("executions", "parent_execution_id")
    if "retry_count" in cols:
        op.drop_column("executions", "retry_count")
