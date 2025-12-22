"""merge_message_tables

Revision ID: merge_message_tables
Revises: b62ee678887e
Create Date: 2025-12-21 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'merge_message_tables'
down_revision = 'b62ee678887e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Merge all message-related tables into a unified messages table."""
    
    # Step 1: Create new unified messages table
    op.create_table('messages_unified',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('message_type', sa.String(20), nullable=False, server_default='direct'),  # direct, thread, broadcast
        sa.Column('thread_id', sa.UUID(), nullable=True),  # For grouping related messages
        sa.Column('parent_id', sa.UUID(), nullable=True),  # For reply chains
        sa.Column('sender_id', sa.UUID(), nullable=True),  # Admin or member ID
        sa.Column('sender_type', sa.String(20), nullable=True),  # admin, member, system
        sa.Column('recipient_id', sa.UUID(), nullable=True),  # For direct messages
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False, server_default='general'),
        sa.Column('status', sa.String(20), nullable=False, server_default='sent'),  # sent, delivered, read
        sa.Column('priority', sa.String(20), nullable=False, server_default='normal'),  # low, normal, high, urgent
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_important', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_broadcast', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('broadcast_count', sa.Integer(), nullable=True),  # For broadcast messages
        sa.Column('read_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('sent_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['sender_id'], ['members.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['recipient_id'], ['members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['thread_id'], ['messages_unified.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['messages_unified.id'], ondelete='CASCADE'),
    )
    
    # Step 2: Create indexes for the new table
    op.create_index('idx_messages_unified_recipient', 'messages_unified', ['recipient_id', 'is_read'])
    op.create_index('idx_messages_unified_sender', 'messages_unified', ['sender_id'])
    op.create_index('idx_messages_unified_thread', 'messages_unified', ['thread_id', 'created_at'])
    op.create_index('idx_messages_unified_type', 'messages_unified', ['message_type', 'created_at'])
    op.create_index('idx_messages_unified_created_at', 'messages_unified', ['created_at'])
    
    # Step 3: Migrate data from existing tables
    
    # Migrate direct messages
    op.execute("""
        INSERT INTO messages_unified (
            id, message_type, sender_id, sender_type, recipient_id, subject, content, 
            category, is_read, is_important, read_at, created_at, updated_at
        )
        SELECT 
            id, 'direct', 
            CASE WHEN sender_id IS NOT NULL AND EXISTS(SELECT 1 FROM members WHERE id = sender_id) 
                 THEN sender_id 
                 ELSE NULL END, 
            CASE WHEN sender_id IS NULL THEN 'system' ELSE 'admin' END,
            recipient_id, subject, content, 'general', is_read, is_important, 
            read_at, created_at, updated_at
        FROM messages
    """)
    
    # Migrate message threads (as thread headers)
    op.execute("""
        INSERT INTO messages_unified (
            id, message_type, sender_id, sender_type, recipient_id, subject, content,
            category, status, created_at, updated_at
        )
        SELECT 
            id, 'thread', 
            CASE WHEN EXISTS(SELECT 1 FROM members WHERE id = created_by) 
                 THEN created_by 
                 ELSE NULL END, 
            'member', member_id, subject, 
            'Thread: ' || subject, category, status, created_at, updated_at
        FROM message_threads
    """)
    
    # Migrate thread messages
    op.execute("""
        INSERT INTO messages_unified (
            id, message_type, thread_id, sender_id, sender_type, recipient_id, 
            subject, content, is_read, is_important, read_at, created_at, updated_at
        )
        SELECT 
            tm.id, 'thread', tm.thread_id, 
            CASE WHEN tm.sender_type = 'member' AND EXISTS(SELECT 1 FROM members WHERE id = tm.sender_id) 
                 THEN tm.sender_id 
                 ELSE NULL END,
            tm.sender_type,
            mt.member_id, mt.subject, tm.content, tm.is_read, tm.is_important,
            tm.read_at, tm.created_at, tm.updated_at
        FROM thread_messages tm
        JOIN message_threads mt ON tm.thread_id = mt.id
    """)
    
    # Migrate broadcast messages (as broadcast headers)
    op.execute("""
        INSERT INTO messages_unified (
            id, message_type, sender_id, sender_type, subject, content, category,
            priority, is_broadcast, broadcast_count, sent_at, created_at
        )
        SELECT 
            id, 'broadcast', 
            CASE WHEN EXISTS(SELECT 1 FROM members WHERE id = sender_id) 
                 THEN sender_id 
                 ELSE NULL END, 
            'admin', subject, content, category,
            CASE WHEN is_important = 'true' THEN 'high' ELSE 'normal' END,
            true, recipient_count, sent_at, created_at
        FROM broadcast_messages
    """)
    
    # Migrate broadcast recipients (as individual messages)
    op.execute("""
        INSERT INTO messages_unified (
            id, message_type, parent_id, sender_id, sender_type, recipient_id,
            subject, content, category, priority, is_broadcast, is_read, read_at, created_at
        )
        SELECT 
            gen_random_uuid(), 'broadcast', bm.id, 
            CASE WHEN EXISTS(SELECT 1 FROM members WHERE id = bm.sender_id) 
                 THEN bm.sender_id 
                 ELSE NULL END, 
            'admin', br.member_id,
            bm.subject, bm.content, bm.category,
            CASE WHEN bm.is_important = 'true' THEN 'high' ELSE 'normal' END,
            true, br.is_read, br.read_at, br.created_at
        FROM broadcast_recipients br
        JOIN broadcast_messages bm ON br.broadcast_id = bm.id
    """)
    
    # Step 4: Drop old tables
    op.drop_table('message_attachments')
    op.drop_table('broadcast_attachments') 
    op.drop_table('thread_messages')
    op.drop_table('broadcast_recipients')
    op.drop_table('message_threads')
    op.drop_table('broadcast_messages')
    op.drop_table('messages')
    
    # Step 5: Rename unified table
    op.rename_table('messages_unified', 'messages')


def downgrade() -> None:
    """Split unified messages table back into separate tables."""
    
    # This is a complex downgrade, so we'll create a simplified version
    # that recreates the basic structure
    
    # Recreate original messages table
    op.create_table('messages_old',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=True),
        sa.Column('recipient_id', sa.UUID(), nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_important', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('read_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['recipient_id'], ['members.id'], ondelete='CASCADE'),
    )
    
    # Migrate direct messages back
    op.execute("""
        INSERT INTO messages_old (
            id, sender_id, recipient_id, subject, content, is_read, is_important,
            read_at, created_at, updated_at
        )
        SELECT 
            id, sender_id, recipient_id, subject, content, is_read, is_important,
            read_at, created_at, updated_at
        FROM messages
        WHERE message_type = 'direct'
    """)
    
    # Drop unified table and rename old table
    op.drop_table('messages')
    op.rename_table('messages_old', 'messages')
    
    # Note: Other tables (threads, broadcasts) would need to be recreated
    # but this is a simplified downgrade for demonstration