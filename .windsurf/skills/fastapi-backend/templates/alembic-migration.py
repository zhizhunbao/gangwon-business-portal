"""{{migration_description}}

Revision ID: {{revision_id}}
Revises: {{parent_revision}}
Create Date: {{create_date}}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '{{revision_id}}'
down_revision: Union[str, None] = '{{parent_revision}}'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create {{feature_name}} table
    op.create_table(
        '{{feature_name}}',
        sa.Column('id', sa.Integer(), nullable=False, comment='主键ID'),
        sa.Column('name', sa.String(length=255), nullable=False, comment='名称'),
        sa.Column('description', sa.Text(), nullable=True, comment='描述'),
        sa.Column('code', sa.String(length=100), nullable=False, comment='编码'),
        sa.Column('status', sa.String(length=20), nullable=False, comment='状态'),
        sa.Column('sort_order', sa.Integer(), nullable=False, comment='排序顺序'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, comment='是否推荐'),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='配置信息'),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='元数据'),
        sa.Column('created_by', sa.Integer(), nullable=True, comment='创建者ID'),
        sa.Column('updated_by', sa.Integer(), nullable=True, comment='更新者ID'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='更新时间'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True, comment='删除时间'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        comment='{{feature_name}}表'
    )
    
    # Create indexes
    op.create_index('ix_{{feature_name}}_id', '{{feature_name}}', ['id'], unique=False)
    op.create_index('ix_{{feature_name}}_name', '{{feature_name}}', ['name'], unique=False)
    op.create_index('ix_{{feature_name}}_code', '{{feature_name}}', ['code'], unique=True)
    op.create_index('ix_{{feature_name}}_status', '{{feature_name}}', ['status'], unique=False)
    op.create_index('ix_{{feature_name}}_created_at', '{{feature_name}}', ['created_at'], unique=False)
    op.create_index('ix_{{feature_name}}_created_by', '{{feature_name}}', ['created_by'], unique=False)
    op.create_index('ix_{{feature_name}}_updated_by', '{{feature_name}}', ['updated_by'], unique=False)
    op.create_index('ix_{{feature_name}}_deleted_at', '{{feature_name}}', ['deleted_at'], unique=False)
    
    # Composite indexes for better query performance
    op.create_index('ix_{{feature_name}}_status_created_at', '{{feature_name}}', ['status', 'created_at'], unique=False)
    
    # Add foreign key constraints if users table exists
    op.create_foreign_key(
        'fk_{{feature_name}}_created_by_users',
        '{{feature_name}}', 'users',
        ['created_by'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_{{feature_name}}_updated_by_users',
        '{{feature_name}}', 'users',
        ['updated_by'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop foreign key constraints first
    op.drop_constraint('fk_{{feature_name}}_created_by_users', '{{feature_name}}', type_='foreignkey')
    op.drop_constraint('fk_{{feature_name}}_updated_by_users', '{{feature_name}}', type_='foreignkey')
    
    # Drop indexes
    op.drop_index('ix_{{feature_name}}_status_created_at', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_deleted_at', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_updated_by', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_created_by', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_created_at', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_status', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_code', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_name', table_name='{{feature_name}}')
    op.drop_index('ix_{{feature_name}}_id', table_name='{{feature_name}}')
    
    # Drop table
    op.drop_table('{{feature_name}}')
