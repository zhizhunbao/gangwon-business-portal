"""merge heads before table merge

Revision ID: b62ee678887e
Revises: 478996478dc7, merge_members_profiles
Create Date: 2025-12-21 22:22:45.212075

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b62ee678887e'
down_revision: Union[str, Sequence[str], None] = ('478996478dc7', 'merge_members_profiles')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
