"""add_attachments_to_notices

Revision ID: b4126fd52784
Revises: add_category_field
Create Date: 2026-01-17 16:16:52.413671

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4126fd52784'
down_revision: Union[str, Sequence[str], None] = 'add_category_field'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add attachments column to notices table
    op.add_column('notices', sa.Column('attachments', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove attachments column from notices table
    op.drop_column('notices', 'attachments')
