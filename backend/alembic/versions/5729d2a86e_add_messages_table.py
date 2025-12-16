"""add_messages_table

Revision ID: 5729d2a86e
Revises: b0817b4203ef
Create Date: 2025-12-14 20:09:08.654803

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5729d2a86e'
down_revision: Union[str, Sequence[str], None] = 'b0817b4203ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create messages table."""
    op.create_table(
        'messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sender_id', sa.UUID(), nullable=True, comment='Admin or member ID who sent the message'),
        sa.Column('recipient_id', sa.UUID(), nullable=False, comment='Member ID who receives the message'),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.String(length=10), nullable=False, server_default='false'),
        sa.Column('is_important', sa.String(length=10), nullable=False, server_default='false'),
        sa.Column('read_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['recipient_id'], ['members.id'], ondelete='CASCADE'),
    )
    # Create indexes for better query performance
    op.create_index('idx_messages_recipient', 'messages', ['recipient_id', 'is_read'], unique=False)
    op.create_index('idx_messages_sender', 'messages', ['sender_id'], unique=False)
    op.create_index('idx_messages_created_at', 'messages', ['created_at'], unique=False)


def downgrade() -> None:
    """Drop messages table."""
    op.drop_index('idx_messages_created_at', table_name='messages')
    op.drop_index('idx_messages_sender', table_name='messages')
    op.drop_index('idx_messages_recipient', table_name='messages')
    op.drop_table('messages')

