"""add_applicant_fields_to_project_applications

Revision ID: 5a2e21fac597
Revises: 20260119222343
Create Date: 2026-01-27 19:52:15.570925

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a2e21fac597'
down_revision: Union[str, Sequence[str], None] = '20260119222343'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """添加申请人姓名和电话字段到 project_applications 表"""
    op.add_column('project_applications', sa.Column('applicant_name', sa.String(length=100), nullable=True))
    op.add_column('project_applications', sa.Column('applicant_phone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """删除申请人姓名和电话字段"""
    op.drop_column('project_applications', 'applicant_phone')
    op.drop_column('project_applications', 'applicant_name')
