"""add_layer_column_to_all_log_tables

Revision ID: c2ece9031415
Revises: 613e7dbe34d8
Create Date: 2025-12-21 19:11:33.786751

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2ece9031415'
down_revision: Union[str, Sequence[str], None] = '613e7dbe34d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add layer column to error_logs table
    op.add_column('error_logs', sa.Column('layer', sa.String(100), nullable=True))
    
    # Add layer column to system_logs table
    op.add_column('system_logs', sa.Column('layer', sa.String(100), nullable=True))
    
    # Add layer column to audit_logs table
    op.add_column('audit_logs', sa.Column('layer', sa.String(100), nullable=True))
    
    # Note: app_logs already has layer column from previous migration


def downgrade() -> None:
    """Downgrade schema."""
    # Remove layer column from error_logs table
    op.drop_column('error_logs', 'layer')
    
    # Remove layer column from system_logs table
    op.drop_column('system_logs', 'layer')
    
    # Remove layer column from audit_logs table
    op.drop_column('audit_logs', 'layer')
