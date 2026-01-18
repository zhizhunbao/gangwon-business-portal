"""unify_attachments_to_jsonb

Revision ID: 9056bce9e2a4
Revises: b4126fd52784
Create Date: 2026-01-17 17:24:24.885216

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9056bce9e2a4'
down_revision: Union[str, Sequence[str], None] = 'b4126fd52784'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - unify all attachments to JSONB."""
    # Add attachments JSONB column to tables that don't have it
    op.add_column('performance_records', sa.Column('attachments', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('project_applications', sa.Column('attachments', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('messages', sa.Column('attachments', sa.dialects.postgresql.JSONB(), nullable=True))
    
    # Drop old attachment tables
    op.drop_table('application_attachments')
    op.drop_table('attachments')


def downgrade() -> None:
    """Downgrade schema - restore old attachment tables."""
    # Recreate attachment tables
    op.create_table('attachments',
        sa.Column('id', sa.dialects.postgresql.UUID(), nullable=False),
        sa.Column('file_id', sa.dialects.postgresql.UUID(), nullable=True),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.dialects.postgresql.UUID(), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=True),
        sa.Column('file_url', sa.String(500), nullable=False),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('stored_name', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('uploaded_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_attachments_resource', 'attachments', ['resource_type', 'resource_id'])
    op.create_index('idx_attachments_deleted_at', 'attachments', ['deleted_at'])
    
    op.create_table('application_attachments',
        sa.Column('id', sa.dialects.postgresql.UUID(), nullable=False),
        sa.Column('application_id', sa.dialects.postgresql.UUID(), nullable=False),
        sa.Column('file_id', sa.dialects.postgresql.UUID(), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('file_type', sa.String(100), nullable=True),
        sa.Column('file_url', sa.String(500), nullable=False),
        sa.Column('uploaded_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_attachments_application_id', 'application_attachments', ['application_id'])
    op.create_index('idx_application_attachments_deleted_at', 'application_attachments', ['deleted_at'])
    
    # Remove JSONB columns
    op.drop_column('messages', 'attachments')
    op.drop_column('project_applications', 'attachments')
    op.drop_column('performance_records', 'attachments')
