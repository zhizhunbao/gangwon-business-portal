"""Add multilingual fields to banners table

Revision ID: add_banner_i18n_fields
Revises: fb6b4ef9db06
Create Date: 2024-12-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_banner_i18n_fields'
down_revision: Union[str, None] = '2c7628776b91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add multilingual title and subtitle fields to banners table
    op.add_column('banners', sa.Column('title_ko', sa.String(200), nullable=True))
    op.add_column('banners', sa.Column('title_zh', sa.String(200), nullable=True))
    op.add_column('banners', sa.Column('subtitle_ko', sa.String(500), nullable=True))
    op.add_column('banners', sa.Column('subtitle_zh', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('banners', 'subtitle_zh')
    op.drop_column('banners', 'subtitle_ko')
    op.drop_column('banners', 'title_zh')
    op.drop_column('banners', 'title_ko')
