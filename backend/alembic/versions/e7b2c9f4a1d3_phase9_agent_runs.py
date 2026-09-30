"""Phase 9: agent_runs

The durable record of every autonomous run: its state, the safety-limit
counters, the cancel flag the orchestrator reads, the append-only step log
with real evidence, and the commit proposals waiting on the user.

Revision ID: e7b2c9f4a1d3
Revises: d4e1f0a9b2c7
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e7b2c9f4a1d3"
down_revision: str | None = "d4e1f0a9b2c7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Bootstrap runs Base.metadata.create_all before alembic upgrade head, so
    # this must be a no-op when the table is already there — the same guard the
    # Phase 5B migration uses for its table.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "agent_runs" in inspector.get_table_names():
        return

    op.create_table(
        "agent_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("terminal_reason", sa.Text(), nullable=True),
        sa.Column("iteration", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("repair_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_iterations", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("max_repair_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("max_runtime_seconds", sa.Integer(), nullable=False, server_default="900"),
        sa.Column("max_tokens", sa.Integer(), nullable=False, server_default="100000"),
        sa.Column("cancel_requested", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("steps", sa.JSON(), nullable=True),
        sa.Column("commit_proposals", sa.JSON(), nullable=True),
        sa.Column("approval_state", sa.String(length=16), nullable=False, server_default="NOT_REQUIRED"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_runs_project_id", "agent_runs", ["project_id"])
    op.create_index("ix_agent_runs_user_id", "agent_runs", ["user_id"])
    op.create_index("ix_agent_runs_state", "agent_runs", ["state"])


def downgrade() -> None:
    bind = op.get_bind()
    if "agent_runs" not in sa.inspect(bind).get_table_names():
        return
    op.drop_index("ix_agent_runs_state", table_name="agent_runs")
    op.drop_index("ix_agent_runs_user_id", table_name="agent_runs")
    op.drop_index("ix_agent_runs_project_id", table_name="agent_runs")
    op.drop_table("agent_runs")
