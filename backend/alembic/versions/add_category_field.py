"""add new profile fields to members table

Revision ID: add_category_field
Revises: 917bc600b01e
Create Date: 2026-01-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_category_field'
down_revision: Union[str, None] = '917bc600b01e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add category column to members table (other fields already exist)
    op.add_column('members', sa.Column('category', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('members', 'category')
