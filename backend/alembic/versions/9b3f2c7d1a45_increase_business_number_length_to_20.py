"""increase business_number length to 20

Revision ID: 9b3f2c7d1a45
Revises: 0a5112e12538
Create Date: 2025-11-26 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9b3f2c7d1a45"
down_revision: Union[str, Sequence[str], None] = "0a5112e12538"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Increase members.business_number length to 20."""
    op.alter_column("members", "business_number", type_=sa.String(length=20))


def downgrade() -> None:
    """Revert members.business_number length back to 12."""
    op.alter_column("members", "business_number", type_=sa.String(length=12))
