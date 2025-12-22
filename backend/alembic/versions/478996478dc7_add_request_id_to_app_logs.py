"""add_request_id_to_app_logs

Revision ID: 478996478dc7
Revises: f39d4a4be377
Create Date: 2025-12-21 19:30:25.652470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '478996478dc7'
down_revision: Union[str, Sequence[str], None] = 'f39d4a4be377'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add request_id column to app_logs table
    op.add_column('app_logs', sa.Column('request_id', sa.String(100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove request_id column from app_logs table
    op.drop_column('app_logs', 'request_id')
