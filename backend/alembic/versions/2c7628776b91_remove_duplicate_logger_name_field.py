"""remove_duplicate_logger_name_field

Revision ID: 2c7628776b91
Revises: a1b2c3d4e5f6
Create Date: 2025-11-29 19:54:21.142539

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c7628776b91'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove duplicate logger_name field from application_logs table."""
    # Drop the logger_name column from application_logs table
    op.drop_column('application_logs', 'logger_name')


def downgrade() -> None:
    """Restore logger_name field to application_logs table."""
    # Add back the logger_name column (nullable, same as module)
    op.add_column('application_logs', sa.Column('logger_name', sa.String(length=255), nullable=True))
