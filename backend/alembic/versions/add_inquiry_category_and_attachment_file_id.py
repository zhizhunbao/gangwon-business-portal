"""Add category to inquiries and file_id to attachments

Revision ID: e7f8g9h0i1j2
Revises: 5c40ba0a0d9d
Create Date: 2025-12-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7f8g9h0i1j2'
down_revision: Union[str, Sequence[str], None] = '5c40ba0a0d9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add category column to inquiries and file_id to attachments."""
    # Add category column to inquiries table
    op.add_column('inquiries', sa.Column('category', sa.String(length=50), nullable=True, server_default='general'))
    
    # Add file_id column to attachments table (for external storage reference)
    op.add_column('attachments', sa.Column('file_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove category from inquiries and file_id from attachments."""
    op.drop_column('inquiries', 'category')
    op.drop_column('attachments', 'file_id')
