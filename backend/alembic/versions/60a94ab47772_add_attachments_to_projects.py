"""add_attachments_to_projects

Revision ID: 60a94ab47772
Revises: 9056bce9e2a4
Create Date: 2026-01-17 18:05:20.938607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '60a94ab47772'
down_revision: Union[str, Sequence[str], None] = '9056bce9e2a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add attachments column to projects table
    op.add_column('projects', sa.Column('attachments', sa.dialects.postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove attachments column from projects table
    op.drop_column('projects', 'attachments')
