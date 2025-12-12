"""
Performance service.

Business logic for performance record management operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from datetime import datetime

from ...common.modules.db.models import PerformanceRecord, PerformanceReview, Member
from ...common.modules.exception import NotFoundError, ValidationError, ForbiddenError
from .schemas import PerformanceRecordCreate, PerformanceRecordUpdate, PerformanceListQuery


class PerformanceService:
    """Performance service class."""

    async def list_performance_records(
        self, member_id: UUID, query: PerformanceListQuery, db: AsyncSession
    ) -> tuple[list[PerformanceRecord], int]:
        """
        List performance records for a specific member.

        Args:
            member_id: Member UUID
            query: Query parameters
            db: Database session

        Returns:
            Tuple of (performance records list, total count)
        """
        # Build base query
        stmt = select(PerformanceRecord).where(PerformanceRecord.member_id == member_id)

        # Apply filters
        if query.year:
            stmt = stmt.where(PerformanceRecord.year == query.year)
        if query.quarter:
            stmt = stmt.where(PerformanceRecord.quarter == query.quarter)
        if query.status:
            stmt = stmt.where(PerformanceRecord.status == query.status)
        if query.type:
            stmt = stmt.where(PerformanceRecord.type == query.type)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(PerformanceRecord.created_at.desc())
        stmt = stmt.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(stmt)
        records = result.scalars().all()

        return list(records), total

    async def get_performance_by_id(
        self, performance_id: UUID, member_id: UUID, db: AsyncSession
    ) -> PerformanceRecord:
        """
        Get performance record by ID with authorization check.

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)
            db: Database session

        Returns:
            Performance record with reviews

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
        """
        result = await db.execute(
            select(PerformanceRecord).where(PerformanceRecord.id == performance_id)
        )
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError("Performance record")

        if record.member_id != member_id:
            raise ForbiddenError("You don't have permission to access this record")

        return record

    async def create_performance(
        self, member_id: UUID, data: PerformanceRecordCreate, db: AsyncSession
    ) -> PerformanceRecord:
        """
        Create new performance record.

        Args:
            member_id: Member UUID
            data: Performance data
            db: Database session

        Returns:
            Created performance record

        Raises:
            ValidationError: If validation fails
        """
        # Create performance record
        record = PerformanceRecord(
            member_id=member_id,
            year=data.year,
            quarter=data.quarter,
            type=data.type,
            status="draft",
            data_json=data.data_json,
        )

        db.add(record)
        await db.commit()
        await db.refresh(record)

        return record

    async def update_performance(
        self,
        performance_id: UUID,
        member_id: UUID,
        data: PerformanceRecordUpdate,
        db: AsyncSession,
    ) -> PerformanceRecord:
        """
        Update performance record (draft or revision_requested only).

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)
            data: Update data
            db: Database session

        Returns:
            Updated performance record

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
            ValidationError: If record status doesn't allow editing
        """
        record = await self.get_performance_by_id(performance_id, member_id, db)

        # Only allow editing draft or revision_requested records
        if record.status not in ["draft", "revision_requested"]:
            raise ValidationError(
                f"Cannot edit performance record with status '{record.status}'. "
                "Only 'draft' or 'revision_requested' records can be edited."
            )

        # Update fields
        if data.year is not None:
            record.year = data.year
        if data.quarter is not None:
            record.quarter = data.quarter
        if data.type is not None:
            record.type = data.type
        if data.data_json is not None:
            record.data_json = data.data_json

        await db.commit()
        await db.refresh(record)

        return record

    async def delete_performance(
        self, performance_id: UUID, member_id: UUID, db: AsyncSession
    ) -> None:
        """
        Delete performance record (draft only).

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)
            db: Database session

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
            ValidationError: If record is not draft
        """
        record = await self.get_performance_by_id(performance_id, member_id, db)

        # Only allow deleting draft records
        if record.status != "draft":
            raise ValidationError(
                f"Cannot delete performance record with status '{record.status}'. "
                "Only 'draft' records can be deleted."
            )

        await db.delete(record)
        await db.commit()

    async def submit_performance(
        self, performance_id: UUID, member_id: UUID, db: AsyncSession
    ) -> PerformanceRecord:
        """
        Submit performance record for review.

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)
            db: Database session

        Returns:
            Updated performance record

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
            ValidationError: If record is not draft
        """
        record = await self.get_performance_by_id(performance_id, member_id, db)

        # Only allow submitting draft or revision_requested records
        if record.status not in ["draft", "revision_requested"]:
            raise ValidationError(
                f"Cannot submit performance record with status '{record.status}'. "
                "Only 'draft' or 'revision_requested' records can be submitted."
            )

        record.status = "submitted"
        record.submitted_at = datetime.utcnow()

        await db.commit()
        await db.refresh(record)

        return record

    # Admin operations

    async def list_all_performance_records(
        self, query: PerformanceListQuery, db: AsyncSession
    ) -> tuple[list[PerformanceRecord], int]:
        """
        List all performance records with filtering (admin only).

        Args:
            query: Query parameters
            db: Database session

        Returns:
            Tuple of (performance records list, total count)
        """
        # Build base query
        stmt = select(PerformanceRecord)

        # Apply filters
        if query.member_id:
            stmt = stmt.where(PerformanceRecord.member_id == query.member_id)
        if query.year:
            stmt = stmt.where(PerformanceRecord.year == query.year)
        if query.quarter:
            stmt = stmt.where(PerformanceRecord.quarter == query.quarter)
        if query.status:
            stmt = stmt.where(PerformanceRecord.status == query.status)
        if query.type:
            stmt = stmt.where(PerformanceRecord.type == query.type)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(PerformanceRecord.submitted_at.desc())
        stmt = stmt.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(stmt)
        records = result.scalars().all()

        return list(records), total

    async def get_performance_by_id_admin(
        self, performance_id: UUID, db: AsyncSession
    ) -> PerformanceRecord:
        """
        Get performance record by ID (admin - no ownership check).

        Args:
            performance_id: Performance record UUID
            db: Database session

        Returns:
            Performance record with reviews

        Raises:
            NotFoundError: If record not found
        """
        result = await db.execute(
            select(PerformanceRecord).where(PerformanceRecord.id == performance_id)
        )
        record = result.scalar_one_or_none()

        if not record:
            raise NotFoundError("Performance record")

        return record

    async def approve_performance(
        self,
        performance_id: UUID,
        reviewer_id: Optional[UUID],  # Can be None for admin reviewers
        comments: Optional[str],
        db: AsyncSession,
    ) -> PerformanceRecord:
        """
        Approve performance record (admin only).

        Args:
            performance_id: Performance record UUID
            reviewer_id: Admin member UUID
            comments: Review comments
            db: Database session

        Returns:
            Updated performance record

        Raises:
            NotFoundError: If record not found
            ValidationError: If record is not submitted
        """
        record = await self.get_performance_by_id_admin(performance_id, db)

        # Only allow approving submitted records
        if record.status != "submitted":
            raise ValidationError(
                f"Cannot approve performance record with status '{record.status}'. "
                "Only 'submitted' records can be approved."
            )

        # Update record status
        record.status = "approved"

        # Create review record
        # Note: reviewer_id is set to None because admin is not in members table
        # The reviewer_id foreign key points to members.id, but admins are in admins table
        review = PerformanceReview(
            performance_id=performance_id,
            reviewer_id=None,  # Admin is not a member, so set to None
            status="approved",
            comments=comments,
        )
        db.add(review)

        await db.commit()
        await db.refresh(record)

        # Send approval notification email
        try:
            from ...common.modules.email import email_service
            # Get member email
            member_result = await db.execute(
                select(Member).where(Member.id == record.member_id)
            )
            member = member_result.scalar_one_or_none()
            if member:
                await email_service.send_approval_notification_email(
                    to_email=member.email,
                    company_name=member.company_name,
                    approval_type="성과 데이터",
                    status="approved",
                    comments=comments,
                )
        except Exception:
            # Ignore errors - don't fail approval if email fails
            pass

        return record

    async def request_fix_performance(
        self,
        performance_id: UUID,
        reviewer_id: Optional[UUID],  # Can be None for admin reviewers
        comments: Optional[str],
        db: AsyncSession,
    ) -> PerformanceRecord:
        """
        Request revision of performance record (admin only).

        Args:
            performance_id: Performance record UUID
            reviewer_id: Admin member UUID
            comments: Review comments explaining what needs to be fixed
            db: Database session

        Returns:
            Updated performance record

        Raises:
            NotFoundError: If record not found
            ValidationError: If record is not submitted
        """
        record = await self.get_performance_by_id_admin(performance_id, db)

        # Only allow requesting revision for submitted records
        if record.status != "submitted":
            raise ValidationError(
                f"Cannot request revision for performance record with status '{record.status}'. "
                "Only 'submitted' records can be sent back for revision."
            )

        # Update record status
        record.status = "revision_requested"

        # Create review record
        # Note: reviewer_id is set to None because admin is not in members table
        review = PerformanceReview(
            performance_id=performance_id,
            reviewer_id=None,  # Admin is not a member, so set to None
            status="revision_requested",
            comments=comments,
        )
        db.add(review)

        await db.commit()
        await db.refresh(record)

        # Send revision request email
        try:
            from ...common.modules.email import email_service
            # Get member email
            member_result = await db.execute(
                select(Member).where(Member.id == record.member_id)
            )
            member = member_result.scalar_one_or_none()
            if member and comments:
                from ...common.modules.config.settings import settings
                revision_url = f"{settings.FRONTEND_URL}/member/performance/{record.id}"
                await email_service.send_revision_request_email(
                    to_email=member.email,
                    company_name=member.company_name,
                    request_type="성과 데이터",
                    comments=comments,
                    revision_url=revision_url,
                )
        except Exception:
            # Ignore errors - don't fail if email fails
            pass

        return record

    async def reject_performance(
        self,
        performance_id: UUID,
        reviewer_id: Optional[UUID],  # Can be None for admin reviewers
        comments: Optional[str],
        db: AsyncSession,
    ) -> PerformanceRecord:
        """
        Reject performance record (admin only).

        Args:
            performance_id: Performance record UUID
            reviewer_id: Admin member UUID
            comments: Rejection reason
            db: Database session

        Returns:
            Updated performance record

        Raises:
            NotFoundError: If record not found
            ValidationError: If record is not submitted
        """
        record = await self.get_performance_by_id_admin(performance_id, db)

        # Only allow rejecting submitted records
        if record.status != "submitted":
            raise ValidationError(
                f"Cannot reject performance record with status '{record.status}'. "
                "Only 'submitted' records can be rejected."
            )

        # Update record status
        record.status = "rejected"

        # Create review record
        # Note: reviewer_id is set to None because admin is not in members table
        review = PerformanceReview(
            performance_id=performance_id,
            reviewer_id=None,  # Admin is not a member, so set to None
            status="rejected",
            comments=comments,
        )
        db.add(review)

        await db.commit()
        await db.refresh(record)

        return record

    async def export_performance_data(
        self, query: PerformanceListQuery, db: AsyncSession
    ) -> list[dict]:
        """
        Export performance data for download (admin only).

        Args:
            query: Filter parameters
            db: Database session

        Returns:
            List of performance records as dictionaries
        """
        # Build query directly to avoid page_size validation limit
        # Export needs to get all records, not just paginated subset
        stmt = select(PerformanceRecord)

        # Apply filters from query
        if query.member_id:
            stmt = stmt.where(PerformanceRecord.member_id == query.member_id)
        if query.year:
            stmt = stmt.where(PerformanceRecord.year == query.year)
        if query.quarter:
            stmt = stmt.where(PerformanceRecord.quarter == query.quarter)
        if query.status:
            stmt = stmt.where(PerformanceRecord.status == query.status)
        if query.type:
            stmt = stmt.where(PerformanceRecord.type == query.type)

        # Order by submitted_at descending
        stmt = stmt.order_by(PerformanceRecord.submitted_at.desc())

        # Execute query - no pagination limit for export
        result = await db.execute(stmt)
        records = result.scalars().all()

        # Convert to dict format for export
        import json
        export_data = []
        for record in records:
            export_data.append({
                "id": str(record.id),
                "member_id": str(record.member_id),
                "year": record.year,
                "quarter": record.quarter,
                "type": record.type,
                "status": record.status,
                "data_json": json.dumps(record.data_json, ensure_ascii=False) if record.data_json else "",
                "submitted_at": record.submitted_at.isoformat() if record.submitted_at else None,
                "created_at": record.created_at.isoformat(),
                "updated_at": record.updated_at.isoformat(),
            })

        return export_data
