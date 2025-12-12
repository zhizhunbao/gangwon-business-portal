"""
Member service.

Business logic for member management operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from uuid import UUID
from datetime import datetime

from ...common.modules.db.models import Member, MemberProfile
from ...common.modules.exception import NotFoundError, ValidationError
from .schemas import MemberProfileUpdate, MemberListQuery


class MemberService:
    """Member service class."""

    async def get_member_profile(
        self, member_id: UUID, db: AsyncSession
    ) -> tuple[Member, Optional[MemberProfile]]:
        """
        Get member profile with extended information.

        Args:
            member_id: Member UUID
            db: Database session

        Returns:
            Tuple of (Member, MemberProfile)

        Raises:
            NotFoundError: If member not found
        """
        result = await db.execute(select(Member).where(Member.id == member_id))
        member = result.scalar_one_or_none()
        if not member:
            raise NotFoundError("Member")

        result = await db.execute(
            select(MemberProfile).where(MemberProfile.member_id == member_id)
        )
        profile = result.scalar_one_or_none()

        return member, profile

    async def update_member_profile(
        self, member_id: UUID, data: MemberProfileUpdate, db: AsyncSession
    ) -> tuple[Member, Optional[MemberProfile]]:
        """
        Update member profile.

        Args:
            member_id: Member UUID
            data: Update data
            db: Database session

        Returns:
            Updated (Member, MemberProfile)

        Raises:
            NotFoundError: If member not found
        """
        member, profile = await self.get_member_profile(member_id, db)

        # Update member fields
        if data.company_name is not None:
            member.company_name = data.company_name
        if data.email is not None:
            # Check email uniqueness
            result = await db.execute(
                select(Member).where(
                    Member.email == data.email, Member.id != member_id
                )
            )
            if result.scalar_one_or_none():
                raise ValidationError("Email already in use")
            member.email = data.email

        # Update or create profile
        if profile is None:
            profile = MemberProfile(member_id=member_id)
            db.add(profile)

        if data.industry is not None:
            profile.industry = data.industry
        if data.revenue is not None:
            profile.revenue = data.revenue
        if data.employee_count is not None:
            profile.employee_count = data.employee_count
        if data.founding_date is not None:
            profile.founding_date = datetime.strptime(
                data.founding_date, "%Y-%m-%d"
            ).date()
        if data.region is not None:
            profile.region = data.region
        if data.address is not None:
            profile.address = data.address
        if data.website is not None:
            profile.website = data.website

        await db.commit()
        await db.refresh(member)
        await db.refresh(profile)

        return member, profile

    async def list_members(
        self, query: MemberListQuery, db: AsyncSession
    ) -> tuple[list[Member], int]:
        """
        List members with pagination and filtering.

        Args:
            query: Query parameters
            db: Database session

        Returns:
            Tuple of (members list, total count)
        """
        # Build base query
        stmt = select(Member).join(MemberProfile, Member.id == MemberProfile.member_id, isouter=True)

        # Apply filters
        if query.search:
            stmt = stmt.where(
                or_(
                    Member.company_name.ilike(f"%{query.search}%"),
                    Member.business_number.ilike(f"%{query.search}%"),
                )
            )
        if query.industry:
            stmt = stmt.where(MemberProfile.industry == query.industry)
        if query.region:
            stmt = stmt.where(MemberProfile.region == query.region)
        if query.approval_status:
            stmt = stmt.where(Member.approval_status == query.approval_status)
        if query.status:
            stmt = stmt.where(Member.status == query.status)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(Member.created_at.desc())
        stmt = stmt.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(stmt)
        members = result.scalars().all()

        return list(members), total

    async def approve_member(self, member_id: UUID, db: AsyncSession) -> Member:
        """
        Approve a member registration.

        Args:
            member_id: Member UUID
            db: Database session

        Returns:
            Updated member

        Raises:
            NotFoundError: If member not found
        """
        result = await db.execute(select(Member).where(Member.id == member_id))
        member = result.scalar_one_or_none()
        if not member:
            raise NotFoundError("Member")

        member.approval_status = "approved"
        member.status = "active"
        await db.commit()
        await db.refresh(member)

        # Send approval notification email
        try:
            from ...common.modules.email import email_service
            await email_service.send_approval_notification_email(
                to_email=member.email,
                company_name=member.company_name,
                approval_type="회원가입",
                status="approved",
            )
        except Exception:
            # Ignore errors - don't fail approval if email fails
            pass

        return member

    async def reject_member(
        self, member_id: UUID, reason: Optional[str], db: AsyncSession
    ) -> Member:
        """
        Reject a member registration.

        Args:
            member_id: Member UUID
            reason: Rejection reason
            db: Database session

        Returns:
            Updated member

        Raises:
            NotFoundError: If member not found
        """
        result = await db.execute(select(Member).where(Member.id == member_id))
        member = result.scalar_one_or_none()
        if not member:
            raise NotFoundError("Member")

        member.approval_status = "rejected"
        member.status = "suspended"
        await db.commit()
        await db.refresh(member)

        # Send rejection notification email
        try:
            from ...common.modules.email import email_service
            await email_service.send_approval_notification_email(
                to_email=member.email,
                company_name=member.company_name,
                approval_type="회원가입",
                status="rejected",
                comments=reason,
            )
        except Exception:
            # Ignore errors - don't fail rejection if email fails
            pass

        return member

    async def export_members_data(
        self, query: MemberListQuery, db: AsyncSession
    ) -> list[dict]:
        """
        Export members data for download (admin only).

        Args:
            query: Filter parameters
            db: Database session

        Returns:
            List of member records as dictionaries
        """
        # Build query directly without pagination for export
        # Select both Member and MemberProfile to avoid N+1 queries
        stmt = select(Member, MemberProfile).outerjoin(
            MemberProfile, Member.id == MemberProfile.member_id
        )

        # Apply filters
        if query.search:
            stmt = stmt.where(
                or_(
                    Member.company_name.ilike(f"%{query.search}%"),
                    Member.business_number.ilike(f"%{query.search}%"),
                )
            )
        if query.industry:
            stmt = stmt.where(MemberProfile.industry == query.industry)
        if query.region:
            stmt = stmt.where(MemberProfile.region == query.region)
        if query.approval_status:
            stmt = stmt.where(Member.approval_status == query.approval_status)
        if query.status:
            stmt = stmt.where(Member.status == query.status)

        stmt = stmt.order_by(Member.created_at.desc())

        # Execute query to get all matching members with profiles
        result = await db.execute(stmt)
        rows = result.all()

        # Convert to dict format for export
        export_data = []
        for member, profile in rows:
            export_data.append({
                "id": str(member.id),
                "business_number": member.business_number,
                "company_name": member.company_name,
                "email": member.email,
                "status": member.status,
                "approval_status": member.approval_status,
                "industry": profile.industry if profile else None,
                "revenue": float(profile.revenue) if profile and profile.revenue else None,
                "employee_count": profile.employee_count if profile else None,
                "founding_date": profile.founding_date.isoformat() if profile and profile.founding_date else None,
                "region": profile.region if profile else None,
                "address": profile.address if profile else None,
                "website": profile.website if profile else None,
                "logo_url": profile.logo_url if profile else None,
                "created_at": member.created_at.isoformat() if member.created_at else None,
                "updated_at": member.updated_at.isoformat() if member.updated_at else None,
            })

        return export_data

