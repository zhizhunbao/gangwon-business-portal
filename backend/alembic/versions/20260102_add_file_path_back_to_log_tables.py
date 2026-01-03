"""add file_path back to log tables

Revision ID: 20260102_file_path
Revises: f556d4c228a4
Create Date: 2026-01-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260102_file_path'
down_revision: Union[str, Sequence[str], None] = 'f556d4c228a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add file_path column back to all log tables."""
    op.add_column('app_logs', sa.Column('file_path', sa.String(length=500), nullable=True))
    op.add_column('error_logs', sa.Column('file_path', sa.String(length=500), nullable=True))
    op.add_column('system_logs', sa.Column('file_path', sa.String(length=500), nullable=True))
    op.add_column('performance_logs', sa.Column('file_path', sa.String(length=500), nullable=True))
    op.add_column('audit_logs', sa.Column('file_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Remove file_path column from all log tables."""
    op.drop_column('audit_logs', 'file_path')
    op.drop_column('performance_logs', 'file_path')
    op.drop_column('system_logs', 'file_path')
    op.drop_column('error_logs', 'file_path')
    op.drop_column('app_logs', 'file_path')
