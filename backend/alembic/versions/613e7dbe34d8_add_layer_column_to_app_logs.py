"""add_layer_column_to_app_logs

Revision ID: 613e7dbe34d8
Revises: f1g2h3i4j5k6
Create Date: 2025-12-21 19:01:25.537682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '613e7dbe34d8'
down_revision: Union[str, Sequence[str], None] = 'f1g2h3i4j5k6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add layer column to app_logs table
    op.add_column('app_logs', sa.Column('layer', sa.String(100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove layer column from app_logs table
    op.drop_column('app_logs', 'layer')
