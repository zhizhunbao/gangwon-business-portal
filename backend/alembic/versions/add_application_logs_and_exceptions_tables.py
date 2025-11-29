"""add_application_logs_and_exceptions_tables

Revision ID: a1b2c3d4e5f6
Revises: fb6b4ef9db06
Create Date: 2025-01-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'fb6b4ef9db06'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create application_logs and application_exceptions tables."""
    
    # Create application_logs table
    op.create_table(
        'application_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('logger_name', sa.String(length=255), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('module', sa.String(length=255), nullable=True),
        sa.Column('function', sa.String(length=255), nullable=True),
        sa.Column('line_number', sa.Integer(), nullable=True),
        sa.Column('trace_id', sa.String(length=100), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('request_data', postgresql.JSONB(), nullable=True),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for application_logs
    op.create_index('idx_app_logs_source_level', 'application_logs', ['source', 'level', 'created_at'], unique=False)
    op.create_index('idx_app_logs_trace_id', 'application_logs', ['trace_id'], unique=False)
    op.create_index('idx_app_logs_user_id', 'application_logs', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_app_logs_created', 'application_logs', ['created_at'], unique=False)
    
    # Create application_exceptions table
    op.create_table(
        'application_exceptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False),
        sa.Column('exception_type', sa.String(length=255), nullable=False),
        sa.Column('exception_message', sa.Text(), nullable=False),
        sa.Column('error_code', sa.String(length=100), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('trace_id', sa.String(length=100), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('request_path', sa.String(length=500), nullable=True),
        sa.Column('request_data', postgresql.JSONB(), nullable=True),
        sa.Column('stack_trace', sa.Text(), nullable=True),
        sa.Column('exception_details', postgresql.JSONB(), nullable=True),
        sa.Column('context_data', postgresql.JSONB(), nullable=True),
        sa.Column('resolved', sa.String(length=10), server_default='false', nullable=True),
        sa.Column('resolved_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('resolved_by', sa.UUID(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['members.id'], ),
        sa.ForeignKeyConstraint(['resolved_by'], ['members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for application_exceptions
    op.create_index('idx_app_exceptions_source_type', 'application_exceptions', ['source', 'exception_type', 'created_at'], unique=False)
    op.create_index('idx_app_exceptions_trace_id', 'application_exceptions', ['trace_id'], unique=False)
    op.create_index('idx_app_exceptions_user_id', 'application_exceptions', ['user_id', 'created_at'], unique=False)
    op.create_index('idx_app_exceptions_resolved', 'application_exceptions', ['resolved', 'created_at'], unique=False)
    op.create_index('idx_app_exceptions_created', 'application_exceptions', ['created_at'], unique=False)


def downgrade() -> None:
    """Drop application_logs and application_exceptions tables."""
    
    # Drop indexes first
    op.drop_index('idx_app_exceptions_created', table_name='application_exceptions')
    op.drop_index('idx_app_exceptions_resolved', table_name='application_exceptions')
    op.drop_index('idx_app_exceptions_user_id', table_name='application_exceptions')
    op.drop_index('idx_app_exceptions_trace_id', table_name='application_exceptions')
    op.drop_index('idx_app_exceptions_source_type', table_name='application_exceptions')
    op.drop_index('idx_app_logs_created', table_name='application_logs')
    op.drop_index('idx_app_logs_user_id', table_name='application_logs')
    op.drop_index('idx_app_logs_trace_id', table_name='application_logs')
    op.drop_index('idx_app_logs_source_level', table_name='application_logs')
    
    # Drop tables
    op.drop_table('application_exceptions')
    op.drop_table('application_logs')

