"""
Performance service.

Business logic for performance record management operations.
"""
from typing import Optional
from uuid import UUID
import uuid
from datetime import datetime
import json

from ...common.modules.supabase.service import supabase_service
from ...common.modules.exception import NotFoundError, ValidationError, ForbiddenError
from .schemas import PerformanceRecordCreate, PerformanceRecordUpdate, PerformanceListQuery


class PerformanceService:
    """Performance service class."""

    async def list_performance_records(
        self, member_id: UUID, query: PerformanceListQuery
    ) -> tuple[list[dict], int]:
        """
        List performance records for a specific member.

        Args:
            member_id: Member UUID
            query: Query parameters

        Returns:
            Tuple of (performance records list, total count)
        """
        records, total = await supabase_service.list_performance_records_with_filters(
            order_by="created_at",
            order_desc=True,
        )
        return records, total

    async def get_performance_by_id(
        self, performance_id: UUID, member_id: UUID
    ) -> dict:
        """
        Get performance record by ID with authorization check.

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)

        Returns:
            Performance record dict

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
        """
        record = await supabase_service.get_performance_record_by_id(str(performance_id))

        if not record:
            raise NotFoundError("Performance record")

        # Compare as strings to handle both UUID objects and string IDs
        if str(record["member_id"]) != str(member_id):
            raise ForbiddenError("You don't have permission to access this record")

        return record

    async def create_performance(
        self, member_id: UUID, data: PerformanceRecordCreate
    ) -> dict:
        """
        Create new performance record.

        Args:
            member_id: Member UUID
            data: Performance data

        Returns:
            Created performance record dict

        Raises:
            ValidationError: If validation fails
        """
        record_data = {
            "id": str(uuid.uuid4()),
            "member_id": str(member_id),
            "year": data.year,
            "quarter": data.quarter,
            "type": data.type,
            "status": "draft",
            "data_json": data.data_json,
        }
        return await supabase_service.create_performance_record(record_data)

    async def update_performance(
        self,
        performance_id: UUID,
        member_id: UUID,
        data: PerformanceRecordUpdate,
    ) -> dict:
        """
        Update performance record (draft or revision_requested only).

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)
            data: Update data

        Returns:
            Updated performance record dict

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
            ValidationError: If record status doesn't allow editing
        """
        record = await self.get_performance_by_id(performance_id, member_id)

        # Only allow editing draft or revision_requested records
        if record["status"] not in ["draft", "revision_requested"]:
            raise ValidationError(
                f"Cannot edit performance record with status '{record['status']}'. "
                "Only 'draft' or 'revision_requested' records can be edited."
            )

        # Build update data
        update_data = {}
        if data.year is not None:
            update_data["year"] = data.year
        if data.quarter is not None:
            update_data["quarter"] = data.quarter
        if data.type is not None:
            update_data["type"] = data.type
        if data.data_json is not None:
            update_data["data_json"] = data.data_json

        return await supabase_service.update_performance_record(str(performance_id), update_data)

    async def delete_performance(
        self, performance_id: UUID, member_id: UUID
    ) -> None:
        """
        Delete performance record (draft only).

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
            ValidationError: If record is not draft
        """
        record = await self.get_performance_by_id(performance_id, member_id)

        # Only allow deleting draft records
        if record["status"] != "draft":
            raise ValidationError(
                f"Cannot delete performance record with status '{record['status']}'. "
                "Only 'draft' records can be deleted."
            )

        await supabase_service.delete_performance_record(str(performance_id))

    async def submit_performance(
        self, performance_id: UUID, member_id: UUID
    ) -> dict:
        """
        Submit performance record for review.

        Args:
            performance_id: Performance record UUID
            member_id: Member UUID (for authorization)

        Returns:
            Updated performance record dict

        Raises:
            NotFoundError: If record not found
            ForbiddenError: If member doesn't own the record
            ValidationError: If record is not draft
        """
        record = await self.get_performance_by_id(performance_id, member_id)

        # Only allow submitting draft or revision_requested records
        if record["status"] not in ["draft", "revision_requested"]:
            raise ValidationError(
                f"Cannot submit performance record with status '{record['status']}'. "
                "Only 'draft' or 'revision_requested' records can be submitted."
            )

        update_data = {
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        }
        return await supabase_service.update_performance_record(str(performance_id), update_data)

    # Admin operations

    async def list_all_performance_records(
        self, query: PerformanceListQuery
    ) -> tuple[list[dict], int]:
        """
        List all performance records with filtering (admin only).

        Args:
            query: Query parameters

        Returns:
            Tuple of (performance records list, total count)
        """
        # 现在 list_performance_records_with_filters 已经包含了 member 信息的批量获取
        records, total = await supabase_service.list_performance_records_with_filters(
            order_by="updated_at",  # 按更新时间倒序，最新的在前面
            order_desc=True,
        )
        
        return records, total

    async def get_performance_by_id_admin(
        self, performance_id: UUID
    ) -> dict:
        """
        Get performance record by ID (admin - no ownership check).

        Args:
            performance_id: Performance record UUID

        Returns:
            Performance record dict with attachments and reviews

        Raises:
            NotFoundError: If record not found
        """
        record = await supabase_service.get_performance_record_by_id(str(performance_id))

        if not record:
            raise NotFoundError("Performance record")

        # Get attachments from Attachment table
        attachments = await supabase_service.get_attachments_by_resource(
            'performance', str(performance_id)
        )
        record['attachments'] = attachments

        # Get reviews
        reviews = await supabase_service.get_performance_reviews_by_performance_id(str(performance_id))
        record['reviews'] = reviews

        return record

    async def approve_performance(
        self,
        performance_id: UUID,
        reviewer_id: Optional[UUID],  # Can be None for admin reviewers
        comments: Optional[str],
    ) -> dict:
        """
        Approve performance record (admin only).

        Args:
            performance_id: Performance record UUID
            reviewer_id: Admin member UUID
            comments: Review comments

        Returns:
            Updated performance record dict

        Raises:
            NotFoundError: If record not found
            ValidationError: If record is not submitted
        """
        record = await self.get_performance_by_id_admin(performance_id)

        # Only allow approving submitted records
        if record["status"] != "submitted":
            raise ValidationError(
                f"Cannot approve performance record with status '{record['status']}'. "
                "Only 'submitted' records can be approved."
            )

        # Update record status
        await supabase_service.update_performance_record(
            str(performance_id),
            {"status": "approved"}
        )

        # Create review record
        # Note: reviewer_id is set to None because admin is not in members table
        review_data = {
            "performance_id": str(performance_id),
            "reviewer_id": None,  # Admin is not a member, so set to None
            "status": "approved",
            "comments": comments,
        }
        await supabase_service.create_performance_review(review_data)

        # Get updated record
        updated_record = await supabase_service.get_performance_record_by_id(str(performance_id))

        # Send approval notification email
        try:
            from ...common.modules.email import email_service
            # Get member email
            member = await supabase_service.get_member_by_id(str(record["member_id"]))
            if member:
                await email_service.send_approval_notification_email(
                    to_email=member["email"],
                    company_name=member["company_name"],
                    approval_type="성과 데이터",
                    status="approved",
                    comments=comments,
                )
        except Exception:
            # Ignore errors - don't fail approval if email fails
            pass

        return updated_record

    async def request_fix_performance(
        self,
        performance_id: UUID,
        reviewer_id: Optional[UUID],  # Can be None for admin reviewers
        comments: Optional[str],
    ) -> dict:
        """
        Request revision of performance record (admin only).

        Args:
            performance_id: Performance record UUID
            reviewer_id: Admin member UUID
            comments: Review comments explaining what needs to be fixed

        Returns:
            Updated performance record dict

        Raises:
            NotFoundError: If record not found
            ValidationError: If record is not submitted
        """
        record = await self.get_performance_by_id_admin(performance_id)

        # Only allow requesting revision for submitted records
        if record["status"] != "submitted":
            raise ValidationError(
                f"Cannot request revision for performance record with status '{record['status']}'. "
                "Only 'submitted' records can be sent back for revision."
            )

        # Update record status
        await supabase_service.update_performance_record(
            str(performance_id),
            {"status": "revision_requested"}
        )

        # Create review record
        review_data = {
            "performance_id": str(performance_id),
            "reviewer_id": None,  # Admin is not a member, so set to None
            "status": "revision_requested",
            "comments": comments,
        }
        await supabase_service.create_performance_review(review_data)

        # Get updated record
        updated_record = await supabase_service.get_performance_record_by_id(str(performance_id))

        # Send revision request email
        try:
            from ...common.modules.email import email_service
            # Get member email
            member = await supabase_service.get_member_by_id(str(record["member_id"]))
            if member and comments:
                from ...common.modules.config.settings import settings
                revision_url = f"{settings.FRONTEND_URL}/member/performance/{performance_id}"
                await email_service.send_revision_request_email(
                    to_email=member["email"],
                    company_name=member["company_name"],
                    request_type="성과 데이터",
                    comments=comments,
                    revision_url=revision_url,
                )
        except Exception:
            # Ignore errors - don't fail if email fails
            pass

        return updated_record

    async def reject_performance(
        self,
        performance_id: UUID,
        reviewer_id: Optional[UUID],  # Can be None for admin reviewers
        comments: Optional[str],
    ) -> dict:
        """
        Reject performance record (admin only).

        Args:
            performance_id: Performance record UUID
            reviewer_id: Admin member UUID
            comments: Rejection reason

        Returns:
            Updated performance record dict

        Raises:
            NotFoundError: If record not found
            ValidationError: If record is not submitted
        """
        record = await self.get_performance_by_id_admin(performance_id)

        # Only allow rejecting submitted records
        if record["status"] != "submitted":
            raise ValidationError(
                f"Cannot reject performance record with status '{record['status']}'. "
                "Only 'submitted' records can be rejected."
            )

        # Update record status
        await supabase_service.update_performance_record(
            str(performance_id),
            {"status": "rejected"}
        )

        # Create review record
        review_data = {
            "performance_id": str(performance_id),
            "reviewer_id": None,  # Admin is not a member, so set to None
            "status": "rejected",
            "comments": comments,
        }
        await supabase_service.create_performance_review(review_data)

        # Get updated record
        return await supabase_service.get_performance_record_by_id(str(performance_id))

    async def export_performance_data(
        self, query: PerformanceListQuery
    ) -> list[dict]:
        """
        Export performance data for download (admin only).

        Args:
            query: Filter parameters

        Returns:
            List of performance records as dictionaries
        """
        records = await supabase_service.export_performance_records(
            member_id=str(query.member_id) if query.member_id else None,
            year=query.year,
            quarter=query.quarter,
            status=query.status,
            type=query.type,
        )

        # Convert to export format
        export_data = []
        for record in records:
            export_data.append({
                "id": str(record["id"]),
                "member_id": str(record["member_id"]),
                "year": record["year"],
                "quarter": record["quarter"],
                "type": record["type"],
                "status": record["status"],
                "data_json": json.dumps(record["data_json"], ensure_ascii=False) if record.get("data_json") else "",
                "submitted_at": record.get("submitted_at"),
                "created_at": record.get("created_at"),
                "updated_at": record.get("updated_at"),
            })

        return export_data
