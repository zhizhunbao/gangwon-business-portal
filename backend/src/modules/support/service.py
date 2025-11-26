"""
Support service.

Business logic for support management (FAQs and inquiries).
"""
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from uuid import UUID
from datetime import datetime

from ...common.modules.db.models import FAQ, Inquiry, Member
from ...common.modules.exception import NotFoundError, ForbiddenError
from .schemas import FAQCreate, FAQUpdate, InquiryCreate, InquiryReplyRequest


class SupportService:
    """Support service class."""

    # FAQ Management

    async def get_faqs(
        self, category: Optional[str] = None, db: AsyncSession = None
    ) -> List[FAQ]:
        """
        Get FAQs, optionally filtered by category.

        Args:
            category: Optional category filter
            db: Database session

        Returns:
            List of FAQ objects ordered by display_order
        """
        query = select(FAQ)

        if category:
            query = query.where(FAQ.category == category)

        query = query.order_by(FAQ.display_order, FAQ.created_at)

        result = await db.execute(query)
        return result.scalars().all()

    async def create_faq(self, data: FAQCreate, db: AsyncSession) -> FAQ:
        """
        Create a new FAQ.

        Args:
            data: FAQ creation data
            db: Database session

        Returns:
            Created FAQ object
        """
        faq = FAQ(
            category=data.category,
            question=data.question,
            answer=data.answer,
            display_order=data.display_order,
        )
        db.add(faq)
        await db.commit()
        await db.refresh(faq)
        return faq

    async def update_faq(
        self, faq_id: UUID, data: FAQUpdate, db: AsyncSession
    ) -> FAQ:
        """
        Update an FAQ.

        Args:
            faq_id: FAQ UUID
            data: FAQ update data
            db: Database session

        Returns:
            Updated FAQ object

        Raises:
            NotFoundError: If FAQ not found
        """
        query = select(FAQ).where(FAQ.id == faq_id)
        result = await db.execute(query)
        faq = result.scalar_one_or_none()

        if not faq:
            raise NotFoundError("FAQ")

        # Update fields
        if data.category is not None:
            faq.category = data.category
        if data.question is not None:
            faq.question = data.question
        if data.answer is not None:
            faq.answer = data.answer
        if data.display_order is not None:
            faq.display_order = data.display_order

        await db.commit()
        await db.refresh(faq)
        return faq

    async def delete_faq(self, faq_id: UUID, db: AsyncSession) -> None:
        """
        Delete an FAQ.

        Args:
            faq_id: FAQ UUID
            db: Database session

        Raises:
            NotFoundError: If FAQ not found
        """
        query = select(FAQ).where(FAQ.id == faq_id)
        result = await db.execute(query)
        faq = result.scalar_one_or_none()

        if not faq:
            raise NotFoundError("FAQ")

        await db.delete(faq)
        await db.commit()

    # Inquiry Management

    async def create_inquiry(
        self, data: InquiryCreate, member_id: UUID, db: AsyncSession
    ) -> Inquiry:
        """
        Create a new inquiry.

        Args:
            data: Inquiry creation data
            member_id: Member UUID
            db: Database session

        Returns:
            Created inquiry object
        """
        inquiry = Inquiry(
            member_id=member_id,
            subject=data.subject,
            content=data.content,
            status="pending",
        )
        db.add(inquiry)
        await db.commit()
        await db.refresh(inquiry)
        return inquiry

    async def get_member_inquiries(
        self,
        member_id: UUID,
        page: int = 1,
        page_size: int = 20,
        db: AsyncSession = None,
    ) -> Tuple[List[Inquiry], int]:
        """
        Get member's own inquiries with pagination.

        Args:
            member_id: Member UUID
            page: Page number (1-indexed)
            page_size: Items per page
            db: Database session

        Returns:
            Tuple of (inquiries list, total count)
        """
        # Get total count
        count_query = select(func.count()).select_from(
            select(Inquiry).where(Inquiry.member_id == member_id).subquery()
        )
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = (
            select(Inquiry)
            .where(Inquiry.member_id == member_id)
            .order_by(desc(Inquiry.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        inquiries = result.scalars().all()

        return inquiries, total

    async def get_inquiry_by_id(
        self, inquiry_id: UUID, member_id: Optional[UUID] = None, db: AsyncSession = None
    ) -> Inquiry:
        """
        Get inquiry by ID with ownership verification.

        Args:
            inquiry_id: Inquiry UUID
            member_id: Optional member ID for ownership check (if None, admin access)
            db: Database session

        Returns:
            Inquiry object

        Raises:
            NotFoundError: If inquiry not found
            ForbiddenError: If member tries to access another member's inquiry
        """
        query = select(Inquiry).where(Inquiry.id == inquiry_id)
        result = await db.execute(query)
        inquiry = result.scalar_one_or_none()

        if not inquiry:
            raise NotFoundError("Inquiry")

        # If member_id is provided, verify ownership
        if member_id is not None and inquiry.member_id != member_id:
            raise ForbiddenError("You can only access your own inquiries")

        return inquiry

    async def get_all_inquiries_admin(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        db: AsyncSession = None,
    ) -> Tuple[List[Inquiry], int]:
        """
        Get all inquiries for admin with pagination and filtering.

        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            status: Optional status filter (pending, replied, closed)
            db: Database session

        Returns:
            Tuple of (inquiries list, total count)
        """
        query = select(Inquiry)

        # Apply status filter
        if status:
            query = query.where(Inquiry.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = (
            query.order_by(desc(Inquiry.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        inquiries = result.scalars().all()

        return inquiries, total

    async def reply_to_inquiry(
        self, inquiry_id: UUID, reply_data: InquiryReplyRequest, db: AsyncSession
    ) -> Inquiry:
        """
        Reply to an inquiry (admin only).

        Args:
            inquiry_id: Inquiry UUID
            reply_data: Reply content
            db: Database session

        Returns:
            Updated inquiry object

        Raises:
            NotFoundError: If inquiry not found
        """
        query = select(Inquiry).where(Inquiry.id == inquiry_id)
        result = await db.execute(query)
        inquiry = result.scalar_one_or_none()

        if not inquiry:
            raise NotFoundError("Inquiry")

        # Update inquiry with reply
        inquiry.admin_reply = reply_data.admin_reply
        inquiry.status = "replied"
        inquiry.replied_at = datetime.utcnow()

        await db.commit()
        await db.refresh(inquiry)
        return inquiry

