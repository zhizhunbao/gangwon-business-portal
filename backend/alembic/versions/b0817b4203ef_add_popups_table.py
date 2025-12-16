"""add_popups_table

Revision ID: b0817b4203ef
Revises: 50749983e8a1
Create Date: 2025-12-14 19:07:52.458306

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b0817b4203ef'
down_revision: Union[str, Sequence[str], None] = '50749983e8a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create popups table."""
    op.create_table(
        'popups',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=True),
        sa.Column('link_url', sa.String(length=500), nullable=True),
        sa.Column('width', sa.Integer(), nullable=False, server_default='600'),
        sa.Column('height', sa.Integer(), nullable=False, server_default='400'),
        sa.Column('position', sa.String(length=20), nullable=False, server_default='center'),
        sa.Column('is_active', sa.String(length=10), nullable=False, server_default='false'),
        sa.Column('start_date', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('end_date', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    # Create indexes for better query performance
    op.create_index('idx_popups_is_active', 'popups', ['is_active', 'created_at'], unique=False)
    op.create_index('idx_popups_dates', 'popups', ['start_date', 'end_date'], unique=False)


def downgrade() -> None:
    """Drop popups table."""
    op.drop_index('idx_popups_dates', table_name='popups')
    op.drop_index('idx_popups_is_active', table_name='popups')
    op.drop_table('popups')
