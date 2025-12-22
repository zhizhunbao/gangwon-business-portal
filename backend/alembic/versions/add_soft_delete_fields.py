"""Add soft delete fields to core business tables

Revision ID: add_soft_delete_fields
Revises: merge_performance_tables
Create Date: 2025-12-21 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_soft_delete_fields'
down_revision = 'merge_performance_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add deleted_at fields to tables that need soft delete functionality."""
    
    # Check if columns exist before adding them
    connection = op.get_bind()
    
    # Helper function to check if column exists
    def column_exists(table_name: str, column_name: str) -> bool:
        result = connection.execute(
            sa.text("""
                SELECT COUNT(*) 
                FROM information_schema.columns 
                WHERE table_name = :table_name 
                AND column_name = :column_name
            """),
            {"table_name": table_name, "column_name": column_name}
        )
        return result.scalar() > 0
    
    # Add deleted_at to members table if it doesn't exist
    if not column_exists('members', 'deleted_at'):
        op.add_column('members', sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Add deleted_at to inquiries table if it doesn't exist
    if not column_exists('inquiries', 'deleted_at'):
        op.add_column('inquiries', sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Add deleted_at to notices table if it doesn't exist
    if not column_exists('notices', 'deleted_at'):
        op.add_column('notices', sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Add deleted_at to press_releases table if it doesn't exist
    if not column_exists('press_releases', 'deleted_at'):
        op.add_column('press_releases', sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Create indexes for better query performance (only if they don't exist)
    try:
        op.create_index('idx_members_deleted_at', 'members', ['deleted_at'])
    except Exception:
        pass  # Index might already exist
    
    try:
        op.create_index('idx_inquiries_deleted_at', 'inquiries', ['deleted_at'])
    except Exception:
        pass  # Index might already exist
    
    try:
        op.create_index('idx_notices_deleted_at', 'notices', ['deleted_at'])
    except Exception:
        pass  # Index might already exist
    
    try:
        op.create_index('idx_press_releases_deleted_at', 'press_releases', ['deleted_at'])
    except Exception:
        pass  # Index might already exist


def downgrade() -> None:
    """Remove deleted_at fields."""
    
    # Drop indexes
    op.drop_index('idx_press_releases_deleted_at', table_name='press_releases')
    op.drop_index('idx_notices_deleted_at', table_name='notices')
    op.drop_index('idx_inquiries_deleted_at', table_name='inquiries')
    op.drop_index('idx_members_deleted_at', table_name='members')
    
    # Drop columns
    op.drop_column('press_releases', 'deleted_at')
    op.drop_column('notices', 'deleted_at')
    op.drop_column('inquiries', 'deleted_at')
    op.drop_column('members', 'deleted_at')