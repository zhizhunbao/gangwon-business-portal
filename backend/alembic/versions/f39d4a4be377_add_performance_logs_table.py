"""add_performance_logs_table

Revision ID: f39d4a4be377
Revises: c2ece9031415
Create Date: 2025-12-21 19:12:45.564748

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f39d4a4be377'
down_revision: Union[str, Sequence[str], None] = 'c2ece9031415'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create performance_logs table
    op.create_table(
        'performance_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('source', sa.String(20), nullable=False),
        sa.Column('metric_name', sa.String(255), nullable=False),
        sa.Column('metric_value', sa.Float(), nullable=False),
        sa.Column('metric_unit', sa.String(20), server_default='ms'),
        sa.Column('layer', sa.String(100), nullable=True),
        sa.Column('module', sa.String(255), nullable=True),
        sa.Column('component_name', sa.String(255), nullable=True),
        sa.Column('trace_id', sa.String(100), nullable=True),
        sa.Column('request_id', sa.String(100), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('threshold', sa.Float(), nullable=True),
        sa.Column('performance_issue', sa.String(100), nullable=True),
        sa.Column('web_vitals', sa.JSON(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_performance_logs_metric', 'performance_logs', ['metric_name', 'created_at'])
    op.create_index('idx_performance_logs_source', 'performance_logs', ['source', 'created_at'])
    op.create_index('idx_performance_logs_component', 'performance_logs', ['component_name', 'created_at'])
    op.create_index('idx_performance_logs_trace_id', 'performance_logs', ['trace_id'])
    op.create_index('idx_performance_logs_user_id', 'performance_logs', ['user_id', 'created_at'])
    op.create_index('idx_performance_logs_created', 'performance_logs', ['created_at'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('idx_performance_logs_created', 'performance_logs')
    op.drop_index('idx_performance_logs_user_id', 'performance_logs')
    op.drop_index('idx_performance_logs_trace_id', 'performance_logs')
    op.drop_index('idx_performance_logs_component', 'performance_logs')
    op.drop_index('idx_performance_logs_source', 'performance_logs')
    op.drop_index('idx_performance_logs_metric', 'performance_logs')
    
    # Drop table
    op.drop_table('performance_logs')
