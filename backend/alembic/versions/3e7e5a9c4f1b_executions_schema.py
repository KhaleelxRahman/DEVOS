"""add executions table for Phase 2A/2B execution foundation

Revision ID: 3e7e5a9c4f1b
Revises: 9c8d7e6f5a4b
Create Date: 2026-08-26 06:00:00.000000

This migration creates the executions table that was added to the
SQLAlchemy model in Phase 2A. Some deployments provisioned the table
via Base.metadata.create_all without these columns, so the upgrade
is idempotent: it only adds columns that are actually missing and
only creates the table if it does not already exist.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "3e7e5a9c4f1b"
down_revision: str | None = "9c8d7e6f5a4b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    table_names = inspector.get_table_names()

    if "executions" not in table_names:
        # Fresh database: full table creation.
        op.create_table(
            "executions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("execution_id", sa.String(length=36), nullable=False),
            sa.Column("request_id", sa.String(length=64), nullable=True),
            sa.Column("parent_execution_id", sa.String(length=36), nullable=True),
            sa.Column("process_id", sa.String(length=64), nullable=True),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("project_id", sa.String(length=36), nullable=False),
            sa.Column("workspace_id", sa.String(length=36), nullable=False),
            sa.Column("execution_type", sa.String(length=32), nullable=False),
            sa.Column("command", sa.String(length=512), nullable=False),
            sa.Column("arguments", sa.JSON(), nullable=True),
            sa.Column("working_directory", sa.String(length=1024), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="QUEUED"),
            sa.Column("exit_code", sa.Integer(), nullable=True),
            sa.Column("failure_reason", sa.Text(), nullable=True),
            sa.Column("timed_out", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("cancelled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("stdout", sa.Text(), nullable=True),
            sa.Column("stderr", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_executions_execution_id", "executions", ["execution_id"], unique=True)
        op.create_index("ix_executions_parent_execution_id", "executions", ["parent_execution_id"])
        op.create_index("ix_executions_user_id", "executions", ["user_id"])
        op.create_index("ix_executions_project_id", "executions", ["project_id"])
        op.create_index("ix_executions_status", "executions", ["status"])
    else:
        # Legacy create_all-provisioned table: add missing columns.
        cols = {c["name"] for c in inspector.get_columns("executions")}
        if "stdout" not in cols:
            op.add_column("executions", sa.Column("stdout", sa.Text(), nullable=True))
        if "stderr" not in cols:
            op.add_column("executions", sa.Column("stderr", sa.Text(), nullable=True))
        if "process_id" not in cols:
            op.add_column("executions", sa.Column("process_id", sa.String(length=64), nullable=True))
        if "exit_code" not in cols:
            op.add_column("executions", sa.Column("exit_code", sa.Integer(), nullable=True))
        if "failure_reason" not in cols:
            op.add_column("executions", sa.Column("failure_reason", sa.Text(), nullable=True))
        if "timed_out" not in cols:
            op.add_column("executions", sa.Column("timed_out", sa.Boolean(), nullable=False, server_default=sa.false()))
        if "cancelled" not in cols:
            op.add_column("executions", sa.Column("cancelled", sa.Boolean(), nullable=False, server_default=sa.false()))
        if "request_id" not in cols:
            op.add_column("executions", sa.Column("request_id", sa.String(length=64), nullable=True))
        if "parent_execution_id" not in cols:
            op.add_column("executions", sa.Column("parent_execution_id", sa.String(length=36), nullable=True))
        # Ensure indexes exist.
        idxs = {i["name"] for i in inspector.get_indexes("executions")}
        if "ix_executions_execution_id" not in idxs:
            op.create_index("ix_executions_execution_id", "executions", ["execution_id"], unique=True)
        if "ix_executions_user_id" not in idxs:
            op.create_index("ix_executions_user_id", "executions", ["user_id"])
        if "ix_executions_project_id" not in idxs:
            op.create_index("ix_executions_project_id", "executions", ["project_id"])


def downgrade() -> None:
    op.drop_table("executions")