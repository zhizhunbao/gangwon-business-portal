"""add phone fields

Revision ID: 20260117204708
Revises: 60a94ab47772
Create Date: 2026-01-17 20:47:08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260117204708'
down_revision = '60a94ab47772'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add representative_phone and contact_person_phone fields to members table."""
    # Add representative_phone column
    op.add_column('members', sa.Column('representative_phone', sa.String(20), nullable=True))
    
    # Add contact_person_phone column
    op.add_column('members', sa.Column('contact_person_phone', sa.String(20), nullable=True))


def downgrade() -> None:
    """Remove representative_phone and contact_person_phone fields from members table."""
    op.drop_column('members', 'contact_person_phone')
    op.drop_column('members', 'representative_phone')
