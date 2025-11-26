"""
Performance service.

Business logic for performance record management operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional
from uuid import UUID
from datetime import datetime

from ...common.modules.db.models import PerformanceRecord, PerformanceReview, Member
from ...common.modules.exception import NotFoundError, ValidationError, ForbiddenError
from ...common.modules.logger import logger
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
        logger.debug(
            "List performance records",
            extra={
                "module": __name__,
                "member_id": str(member_id),
                "year": query.year,
                "quarter": query.quarter,
                "status": query.status,
                "type": query.type,
                "page": query.page,
                "page_size": query.page_size,
            },
        )

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

        logger.debug(
            "List performance records result",
            extra={
                "module": __name__,
                "member_id": str(member_id),
                "total": total,
                "returned": len(records),
            },
        )

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
        logger.debug(
            "Get performance record by id",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "member_id": str(member_id),
            },
        )

        result = await db.execute(
            select(PerformanceRecord).where(PerformanceRecord.id == performance_id)
        )
        record = result.scalar_one_or_none()

        if not record:
            logger.warning(
                "Performance record not found",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                },
            )
            raise NotFoundError("Performance record")

        if record.member_id != member_id:
            logger.warning(
                "Forbidden access to performance record",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                    "owner_member_id": str(record.member_id),
                    "request_member_id": str(member_id),
                },
            )
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
        logger.info(
            "Create performance record request",
            extra={
                "module": __name__,
                "member_id": str(member_id),
                "year": data.year,
                "quarter": data.quarter,
                "type": data.type,
            },
        )

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

        logger.info(
            "Performance record created",
            extra={
                "module": __name__,
                "performance_id": str(record.id),
                "member_id": str(member_id),
            },
        )

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
        logger.info(
            "Update performance record request",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "member_id": str(member_id),
            },
        )

        record = await self.get_performance_by_id(performance_id, member_id, db)

        # Only allow editing draft or revision_requested records
        if record.status not in ["draft", "revision_requested"]:
            logger.warning(
                "Update performance failed: invalid status",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                    "status": record.status,
                },
            )
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

        logger.info(
            "Performance record updated",
            extra={
                "module": __name__,
                "performance_id": str(record.id),
                "member_id": str(member_id),
            },
        )

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
        logger.info(
            "Delete performance record request",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "member_id": str(member_id),
            },
        )

        record = await self.get_performance_by_id(performance_id, member_id, db)

        # Only allow deleting draft records
        if record.status != "draft":
            logger.warning(
                "Delete performance failed: invalid status",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                    "status": record.status,
                },
            )
            raise ValidationError(
                f"Cannot delete performance record with status '{record.status}'. "
                "Only 'draft' records can be deleted."
            )

        await db.delete(record)
        await db.commit()

        logger.info(
            "Performance record deleted",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "member_id": str(member_id),
            },
        )

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
        logger.info(
            "Submit performance record request",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "member_id": str(member_id),
            },
        )

        record = await self.get_performance_by_id(performance_id, member_id, db)

        # Only allow submitting draft or revision_requested records
        if record.status not in ["draft", "revision_requested"]:
            logger.warning(
                "Submit performance failed: invalid status",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                    "status": record.status,
                },
            )
            raise ValidationError(
                f"Cannot submit performance record with status '{record.status}'. "
                "Only 'draft' or 'revision_requested' records can be submitted."
            )

        record.status = "submitted"
        record.submitted_at = datetime.utcnow()

        await db.commit()
        await db.refresh(record)

        logger.info(
            "Performance record submitted",
            extra={
                "module": __name__,
                "performance_id": str(record.id),
                "member_id": str(member_id),
                "status": record.status,
            },
        )

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
        logger.debug(
            "Admin list all performance records",
            extra={
                "module": __name__,
                "member_id": str(query.member_id) if query.member_id else None,
                "year": query.year,
                "quarter": query.quarter,
                "status": query.status,
                "type": query.type,
                "page": query.page,
                "page_size": query.page_size,
            },
        )

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

        logger.debug(
            "Admin list all performance records result",
            extra={
                "module": __name__,
                "total": total,
                "returned": len(records),
            },
        )

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
        logger.debug(
            "Admin get performance record by id",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
            },
        )

        result = await db.execute(
            select(PerformanceRecord).where(PerformanceRecord.id == performance_id)
        )
        record = result.scalar_one_or_none()

        if not record:
            logger.warning(
                "Admin get performance failed: record not found",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                },
            )
            raise NotFoundError("Performance record")

        return record

    async def approve_performance(
        self,
        performance_id: UUID,
        reviewer_id: UUID,
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
        logger.info(
            "Approve performance record request",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "reviewer_id": str(reviewer_id),
            },
        )

        record = await self.get_performance_by_id_admin(performance_id, db)

        # Only allow approving submitted records
        if record.status != "submitted":
            logger.warning(
                "Approve performance failed: invalid status",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                    "status": record.status,
                },
            )
            raise ValidationError(
                f"Cannot approve performance record with status '{record.status}'. "
                "Only 'submitted' records can be approved."
            )

        # Update record status
        record.status = "approved"

        # Create review record
        review = PerformanceReview(
            performance_id=performance_id,
            reviewer_id=reviewer_id,
            status="approved",
            comments=comments,
        )
        db.add(review)

        await db.commit()
        await db.refresh(record)

        logger.info(
            "Performance record approved",
            extra={
                "module": __name__,
                "performance_id": str(record.id),
                "reviewer_id": str(reviewer_id),
                "status": record.status,
            },
        )

        return record

    async def request_fix_performance(
        self,
        performance_id: UUID,
        reviewer_id: UUID,
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
        logger.info(
            "Request fix for performance record",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "reviewer_id": str(reviewer_id),
            },
        )

        record = await self.get_performance_by_id_admin(performance_id, db)

        # Only allow requesting revision for submitted records
        if record.status != "submitted":
            logger.warning(
                "Request fix performance failed: invalid status",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                    "status": record.status,
                },
            )
            raise ValidationError(
                f"Cannot request revision for performance record with status '{record.status}'. "
                "Only 'submitted' records can be sent back for revision."
            )

        # Update record status
        record.status = "revision_requested"

        # Create review record
        review = PerformanceReview(
            performance_id=performance_id,
            reviewer_id=reviewer_id,
            status="revision_requested",
            comments=comments,
        )
        db.add(review)

        await db.commit()
        await db.refresh(record)

        logger.info(
            "Performance record marked as revision_requested",
            extra={
                "module": __name__,
                "performance_id": str(record.id),
                "reviewer_id": str(reviewer_id),
                "status": record.status,
            },
        )

        return record

    async def reject_performance(
        self,
        performance_id: UUID,
        reviewer_id: UUID,
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
        logger.info(
            "Reject performance record request",
            extra={
                "module": __name__,
                "performance_id": str(performance_id),
                "reviewer_id": str(reviewer_id),
            },
        )

        record = await self.get_performance_by_id_admin(performance_id, db)

        # Only allow rejecting submitted records
        if record.status != "submitted":
            logger.warning(
                "Reject performance failed: invalid status",
                extra={
                    "module": __name__,
                    "performance_id": str(performance_id),
                    "status": record.status,
                },
            )
            raise ValidationError(
                f"Cannot reject performance record with status '{record.status}'. "
                "Only 'submitted' records can be rejected."
            )

        # Update record status
        record.status = "rejected"

        # Create review record
        review = PerformanceReview(
            performance_id=performance_id,
            reviewer_id=reviewer_id,
            status="rejected",
            comments=comments,
        )
        db.add(review)

        await db.commit()
        await db.refresh(record)

        logger.info(
            "Performance record rejected",
            extra={
                "module": __name__,
                "performance_id": str(record.id),
                "reviewer_id": str(reviewer_id),
                "status": record.status,
            },
        )

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
        logger.info(
            "Export performance data request",
            extra={
                "module": __name__,
                "year": query.year,
                "quarter": query.quarter,
                "status": query.status,
                "type": query.type,
                "member_id": str(query.member_id) if query.member_id else None,
            },
        )

        # Get all matching records without pagination
        query_no_page = PerformanceListQuery(
            page=1,
            page_size=10000,  # Large limit for export
            year=query.year,
            quarter=query.quarter,
            status=query.status,
            type=query.type,
            member_id=query.member_id,
        )

        records, _ = await self.list_all_performance_records(query_no_page, db)

        # Convert to dict format for export
        export_data = []
        for record in records:
            export_data.append({
                "id": str(record.id),
                "member_id": str(record.member_id),
                "year": record.year,
                "quarter": record.quarter,
                "type": record.type,
                "status": record.status,
                "data_json": record.data_json,
                "submitted_at": record.submitted_at.isoformat() if record.submitted_at else None,
                "created_at": record.created_at.isoformat(),
                    "updated_at": record.updated_at.isoformat(),
            })

        logger.info(
            "Export performance data completed",
            extra={
                "module": __name__,
                "records_count": len(export_data),
            },
        )

        return export_data
