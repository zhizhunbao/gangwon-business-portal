"""merge_banner_and_business_number_migrations

Revision ID: fb6b4ef9db06
Revises: 7414cd79a8e2, 9b3f2c7d1a45
Create Date: 2025-11-29 15:39:19.287925

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb6b4ef9db06'
down_revision: Union[str, Sequence[str], None] = ('7414cd79a8e2', '9b3f2c7d1a45')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
