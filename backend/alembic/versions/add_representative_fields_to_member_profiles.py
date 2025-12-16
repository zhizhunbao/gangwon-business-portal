"""add_representative_fields_to_member_profiles

Revision ID: add_rep_fields_001
Revises: b0817b4203ef
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_rep_fields_001'
down_revision: Union[str, None] = 'b0817b4203ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add representative, legal_number, and phone fields to member_profiles table."""
    op.add_column('member_profiles', sa.Column('representative', sa.String(length=100), nullable=True))
    op.add_column('member_profiles', sa.Column('legal_number', sa.String(length=20), nullable=True))
    op.add_column('member_profiles', sa.Column('phone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Remove representative, legal_number, and phone fields from member_profiles table."""
    op.drop_column('member_profiles', 'phone')
    op.drop_column('member_profiles', 'legal_number')
    op.drop_column('member_profiles', 'representative')

