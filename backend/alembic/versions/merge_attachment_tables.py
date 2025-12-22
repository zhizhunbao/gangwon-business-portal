"""merge_attachment_tables

Revision ID: merge_attachment_tables  
Revises: merge_message_tables
Create Date: 2025-12-21 22:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_attachment_tables'
down_revision = 'merge_message_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Merge message and broadcast attachment tables into the existing attachments table."""
    
    # The attachments table already exists and uses polymorphic pattern
    # We just need to migrate data from message_attachments and broadcast_attachments
    
    # Note: These tables were already dropped in the previous migration
    # This migration is for completeness and future reference
    
    # If the tables still exist, migrate the data:
    # (This is a safety check in case the previous migration didn't complete)
    
    # Check if message_attachments table exists and migrate
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    
    if 'message_attachments' in inspector.get_table_names():
        op.execute("""
            INSERT INTO attachments (
                id, resource_type, resource_id, file_type, file_url, 
                original_name, stored_name, file_size, mime_type, uploaded_at
            )
            SELECT 
                id, 'message', message_id, 'document', file_path,
                file_name, file_name, file_size, mime_type, created_at
            FROM message_attachments
        """)
        op.drop_table('message_attachments')
    
    if 'broadcast_attachments' in inspector.get_table_names():
        op.execute("""
            INSERT INTO attachments (
                id, resource_type, resource_id, file_type, file_url,
                original_name, stored_name, file_size, mime_type, uploaded_at
            )
            SELECT 
                id, 'message', broadcast_id, 'document', file_path,
                file_name, file_name, file_size, mime_type, created_at
            FROM broadcast_attachments
        """)
        op.drop_table('broadcast_attachments')


def downgrade() -> None:
    """Split attachments back into separate tables (simplified)."""
    
    # Create message_attachments table
    op.create_table('message_attachments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('message_id', sa.UUID(), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ondelete='CASCADE'),
    )
    
    # Migrate message attachments back
    op.execute("""
        INSERT INTO message_attachments (
            id, message_id, file_name, file_path, file_size, mime_type, created_at
        )
        SELECT 
            id, resource_id, original_name, file_url, file_size, mime_type, uploaded_at
        FROM attachments
        WHERE resource_type = 'message'
    """)
    
    # Remove message attachments from unified table
    op.execute("DELETE FROM attachments WHERE resource_type = 'message'")