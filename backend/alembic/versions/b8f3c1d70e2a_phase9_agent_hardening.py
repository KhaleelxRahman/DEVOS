"""Phase 9 hardening: honest token accounting, AI-call budget, loop prevention.

Adds separate estimated / provider-reported token columns, a usage-source
discriminator, an AI-call ceiling, repeated-failure tracking, and the
plan/files_changed/diagnosis records the UI reads. The ambiguous single
`tokens_used` column is removed: one number could not tell the user whether it
was real provider usage or a local guess.

Revision ID: b8f3c1d70e2a
Revises: e7b2c9f4a1d3
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b8f3c1d70e2a"
down_revision: str | None = "e7b2c9f4a1d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLE = "agent_runs"

_ADDED = (
    ("estimated_tokens", sa.Integer(), False, "0"),
    ("provider_input_tokens", sa.Integer(), True, None),
    ("provider_output_tokens", sa.Integer(), True, None),
    ("provider_total_tokens", sa.Integer(), True, None),
    ("token_usage_source", sa.String(length=20), False, "none"),
    ("ai_calls", sa.Integer(), False, "0"),
    ("max_ai_calls", sa.Integer(), False, "20"),
    ("repeated_failure_count", sa.Integer(), False, "0"),
    ("max_repeated_failures", sa.Integer(), False, "2"),
    ("last_failure_signature", sa.Text(), True, None),
    ("plan", sa.JSON(), True, None),
    ("files_changed", sa.JSON(), True, None),
    ("diagnosis", sa.JSON(), True, None),
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _TABLE not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns(_TABLE)}
    for name, coltype, nullable, default in _ADDED:
        if name in existing:
            continue
        kwargs = {"nullable": nullable}
        if default is not None:
            kwargs["server_default"] = default
        op.add_column(_TABLE, sa.Column(name, coltype, **kwargs))

    # Remove the ambiguous column only if it is really there.
    if "tokens_used" in existing:
        with op.batch_alter_table(_TABLE) as batch:
            batch.drop_column("tokens_used")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if _TABLE not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns(_TABLE)}

    with op.batch_alter_table(_TABLE) as batch:
        if "tokens_used" not in existing:
            batch.add_column(
                sa.Column("tokens_used", sa.Integer(), nullable=False, server_default="0")
            )
    existing = {c["name"] for c in inspector.get_columns(_TABLE)}
    with op.batch_alter_table(_TABLE) as batch:
        for name, _t, _n, _d in reversed(_ADDED):
            if name in existing:
                batch.drop_column(name)
