"""remove app_logs user_id foreign key constraint

Revision ID: f1g2h3i4j5k6
Revises: d6888861afb9
Create Date: 2025-12-18

The app_logs table should be able to log activities from both members and admins.
The foreign key constraint to members table prevents logging admin activities.
This migration removes the foreign key constraint to allow logging any user_id.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f1g2h3i4j5k6'
down_revision: Union[str, None] = 'fix_is_read_boolean'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove foreign key constraint on app_logs.user_id."""
    # Drop the foreign key constraint
    # The constraint name is 'application_logs_user_id_fkey' (from original table name)
    op.drop_constraint('application_logs_user_id_fkey', 'app_logs', type_='foreignkey')


def downgrade() -> None:
    """Restore foreign key constraint on app_logs.user_id."""
    # Recreate the foreign key constraint
    op.create_foreign_key(
        'application_logs_user_id_fkey',
        'app_logs',
        'members',
        ['user_id'],
        ['id']
    )
