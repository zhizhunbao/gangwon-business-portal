"""merge_performance_tables

Revision ID: merge_performance_tables
Revises: merge_attachment_tables
Create Date: 2025-12-21 22:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'merge_performance_tables'
down_revision = 'merge_attachment_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Merge performance_reviews table into performance_records table."""
    
    # Step 1: Add review fields to performance_records table
    op.add_column('performance_records', sa.Column('reviewer_id', sa.UUID(), nullable=True))
    op.add_column('performance_records', sa.Column('review_status', sa.String(50), nullable=True))
    op.add_column('performance_records', sa.Column('review_comments', sa.Text(), nullable=True))
    op.add_column('performance_records', sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Step 2: Add foreign key constraint for reviewer_id
    op.create_foreign_key(
        'fk_performance_records_reviewer_id', 
        'performance_records', 
        'members', 
        ['reviewer_id'], 
        ['id'],
        ondelete='SET NULL'
    )
    
    # Step 3: Migrate data from performance_reviews to performance_records
    # Get the latest review for each performance record
    op.execute("""
        UPDATE performance_records 
        SET 
            reviewer_id = latest_review.reviewer_id,
            review_status = latest_review.status,
            review_comments = latest_review.comments,
            reviewed_at = latest_review.reviewed_at
        FROM (
            SELECT DISTINCT ON (performance_id) 
                performance_id,
                reviewer_id,
                status,
                comments,
                reviewed_at
            FROM performance_reviews 
            ORDER BY performance_id, reviewed_at DESC
        ) AS latest_review
        WHERE performance_records.id = latest_review.performance_id
    """)
    
    # Step 4: Drop performance_reviews table
    op.drop_table('performance_reviews')


def downgrade() -> None:
    """Split performance_records table back into separate tables."""
    
    # Step 1: Recreate performance_reviews table
    op.create_table('performance_reviews',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('performance_id', sa.UUID(), nullable=False),
        sa.Column('reviewer_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['performance_id'], ['performance_records.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['members.id'], ondelete='SET NULL'),
    )
    
    # Step 2: Migrate review data back to performance_reviews
    op.execute("""
        INSERT INTO performance_reviews (
            id, performance_id, reviewer_id, status, comments, reviewed_at
        )
        SELECT 
            gen_random_uuid(), id, reviewer_id, review_status, review_comments, reviewed_at
        FROM performance_records
        WHERE review_status IS NOT NULL
    """)
    
    # Step 3: Drop review columns from performance_records
    op.drop_constraint('fk_performance_records_reviewer_id', 'performance_records', type_='foreignkey')
    op.drop_column('performance_records', 'reviewed_at')
    op.drop_column('performance_records', 'review_comments')
    op.drop_column('performance_records', 'review_status')
    op.drop_column('performance_records', 'reviewer_id')