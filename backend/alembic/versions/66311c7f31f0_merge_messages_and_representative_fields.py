"""merge_messages_and_representative_fields

Revision ID: 66311c7f31f0
Revises: 5729d2a86e, add_rep_fields_001
Create Date: 2025-12-14 21:29:26.898631

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66311c7f31f0'
down_revision: Union[str, Sequence[str], None] = ('5729d2a86e', 'add_rep_fields_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
