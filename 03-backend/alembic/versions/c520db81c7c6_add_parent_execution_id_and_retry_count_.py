"""add parent_execution_id and retry_count to executions

Revision ID: c520db81c7c6
Revises: a4b7cd5e6f80
Create Date: 2026-09-14 19:38:14.755171

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c520db81c7c6'
down_revision: Union[str, None] = 'a4b7cd5e6f80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('executions', sa.Column('parent_execution_id', sa.String(length=36), nullable=True))
    op.create_index('ix_executions_parent_execution_id', 'executions', ['parent_execution_id'])
    op.add_column('executions', sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'))
    # completed_at already exists in the base migration; no-op here for safety.


def downgrade() -> None:
    op.drop_index('ix_executions_parent_execution_id', table_name='executions')
    op.drop_column('executions', 'parent_execution_id')
    op.drop_column('executions', 'retry_count')
