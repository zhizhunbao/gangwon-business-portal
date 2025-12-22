"""merge_members_and_profiles_tables

Revision ID: merge_members_profiles
Revises: 66311c7f31f0
Create Date: 2025-12-21 22:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'merge_members_profiles'
down_revision = '66311c7f31f0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Merge member_profiles table into members table."""
    
    # Step 1: Add all member_profiles columns to members table
    op.add_column('members', sa.Column('industry', sa.String(length=100), nullable=True))
    op.add_column('members', sa.Column('revenue', sa.DECIMAL(precision=15, scale=2), nullable=True))
    op.add_column('members', sa.Column('employee_count', sa.Integer(), nullable=True))
    op.add_column('members', sa.Column('founding_date', sa.Date(), nullable=True))
    op.add_column('members', sa.Column('region', sa.String(length=100), nullable=True))
    op.add_column('members', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('members', sa.Column('website', sa.String(length=255), nullable=True))
    op.add_column('members', sa.Column('logo_url', sa.String(length=500), nullable=True))
    op.add_column('members', sa.Column('representative', sa.String(length=100), nullable=True))
    op.add_column('members', sa.Column('legal_number', sa.String(length=20), nullable=True))
    op.add_column('members', sa.Column('phone', sa.String(length=20), nullable=True))
    
    # Step 2: Migrate data from member_profiles to members
    op.execute("""
        UPDATE members 
        SET 
            industry = mp.industry,
            revenue = mp.revenue,
            employee_count = mp.employee_count,
            founding_date = mp.founding_date,
            region = mp.region,
            address = mp.address,
            website = mp.website,
            logo_url = mp.logo_url,
            representative = mp.representative,
            legal_number = mp.legal_number,
            phone = mp.phone
        FROM member_profiles mp 
        WHERE members.id = mp.member_id
    """)
    
    # Step 3: Drop member_profiles table
    op.drop_table('member_profiles')


def downgrade() -> None:
    """Split members table back into members and member_profiles."""
    
    # Step 1: Recreate member_profiles table
    op.create_table('member_profiles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=False),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('revenue', sa.DECIMAL(precision=15, scale=2), nullable=True),
        sa.Column('employee_count', sa.Integer(), nullable=True),
        sa.Column('founding_date', sa.Date(), nullable=True),
        sa.Column('region', sa.String(length=100), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('representative', sa.String(length=100), nullable=True),
        sa.Column('legal_number', sa.String(length=20), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('member_id')
    )
    
    # Step 2: Migrate data back to member_profiles
    op.execute("""
        INSERT INTO member_profiles (
            id, member_id, industry, revenue, employee_count, founding_date,
            region, address, website, logo_url, representative, legal_number, phone,
            created_at, updated_at
        )
        SELECT 
            gen_random_uuid(), id, industry, revenue, employee_count, founding_date,
            region, address, website, logo_url, representative, legal_number, phone,
            created_at, updated_at
        FROM members
        WHERE industry IS NOT NULL OR revenue IS NOT NULL OR employee_count IS NOT NULL
           OR founding_date IS NOT NULL OR region IS NOT NULL OR address IS NOT NULL
           OR website IS NOT NULL OR logo_url IS NOT NULL OR representative IS NOT NULL
           OR legal_number IS NOT NULL OR phone IS NOT NULL
    """)
    
    # Step 3: Drop columns from members table
    op.drop_column('members', 'phone')
    op.drop_column('members', 'legal_number')
    op.drop_column('members', 'representative')
    op.drop_column('members', 'logo_url')
    op.drop_column('members', 'website')
    op.drop_column('members', 'address')
    op.drop_column('members', 'region')
    op.drop_column('members', 'founding_date')
    op.drop_column('members', 'employee_count')
    op.drop_column('members', 'revenue')
    op.drop_column('members', 'industry')