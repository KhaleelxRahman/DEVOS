"""add conversation pinning"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = "9c8d7e6f5a4b"
down_revision: str | None = "8b7c6d5e4f3a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("conversations", "is_pinned")
