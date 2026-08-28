"""waitlist and contact messages

Revision ID: f3a1c9d2e4b5
Revises: 20bcc654f259
Create Date: 2026-08-26 05:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f3a1c9d2e4b5'
down_revision: str | None = '20bcc654f259'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'waitlist_entries',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_waitlist_entries_email', 'waitlist_entries', ['email'], unique=True)
    op.create_table(
        'contact_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=200), nullable=False),
        sa.Column('message', sa.String(length=4000), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('contact_messages')
    op.drop_index('ix_waitlist_entries_email', table_name='waitlist_entries')
    op.drop_table('waitlist_entries')
