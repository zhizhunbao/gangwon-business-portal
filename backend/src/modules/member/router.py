"""
Member router.

API endpoints for member management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from math import ceil

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ...common.modules.exception import NotFoundError, ValidationError
from .schemas import (
    MemberProfileResponse,
    MemberProfileUpdate,
    MemberListResponse,
    MemberListQuery,
    MemberListResponsePaginated,
)
from .service import MemberService
from ..user.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter()
member_service = MemberService()


# Member self-service endpoints
@router.get("/api/member/profile", response_model=MemberProfileResponse)
async def get_my_profile(
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current member's profile."""
    member, profile = await member_service.get_member_profile(current_user.id, db)

    return MemberProfileResponse(
        id=member.id,
        business_number=member.business_number,
        company_name=member.company_name,
        email=member.email,
        status=member.status,
        approval_status=member.approval_status,
        industry=profile.industry if profile else None,
        revenue=profile.revenue if profile else None,
        employee_count=profile.employee_count if profile else None,
        founding_date=profile.founding_date if profile else None,
        region=profile.region if profile else None,
        address=profile.address if profile else None,
        website=profile.website if profile else None,
        logo_url=profile.logo_url if profile else None,
        created_at=member.created_at,
        updated_at=profile.updated_at if profile else member.updated_at,
    )


@router.put("/api/member/profile", response_model=MemberProfileResponse)
async def update_my_profile(
    data: MemberProfileUpdate,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current member's profile."""
    try:
        member, profile = await member_service.update_member_profile(
            current_user.id, data, db
        )

        return MemberProfileResponse(
            id=member.id,
            business_number=member.business_number,
            company_name=member.company_name,
            email=member.email,
            status=member.status,
            approval_status=member.approval_status,
            industry=profile.industry if profile else None,
            revenue=profile.revenue if profile else None,
            employee_count=profile.employee_count if profile else None,
            founding_date=profile.founding_date if profile else None,
            region=profile.region if profile else None,
            address=profile.address if profile else None,
            website=profile.website if profile else None,
            logo_url=profile.logo_url if profile else None,
            created_at=member.created_at,
            updated_at=profile.updated_at if profile else member.updated_at,
        )
    except (NotFoundError, ValidationError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Admin endpoints
@router.get("/api/admin/members", response_model=MemberListResponsePaginated)
async def list_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List members with pagination and filtering (admin only)."""
    query = MemberListQuery(
        page=page,
        page_size=page_size,
        search=search,
        industry=industry,
        region=region,
        approval_status=approval_status,
        status=status,
    )

    members, total = await member_service.list_members(query, db)

    return MemberListResponsePaginated(
        items=[
            MemberListResponse(
                id=m.id,
                business_number=m.business_number,
                company_name=m.company_name,
                email=m.email,
                status=m.status,
                approval_status=m.approval_status,
                industry=None,  # TODO: Join with profile
                created_at=m.created_at,
            )
            for m in members
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/api/admin/members/{member_id}", response_model=MemberProfileResponse)
async def get_member(
    member_id: str,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get member details (admin only)."""
    from uuid import UUID

    try:
        member, profile = await member_service.get_member_profile(
            UUID(member_id), db
        )

        return MemberProfileResponse(
            id=member.id,
            business_number=member.business_number,
            company_name=member.company_name,
            email=member.email,
            status=member.status,
            approval_status=member.approval_status,
            industry=profile.industry if profile else None,
            revenue=profile.revenue if profile else None,
            employee_count=profile.employee_count if profile else None,
            founding_date=profile.founding_date if profile else None,
            region=profile.region if profile else None,
            address=profile.address if profile else None,
            website=profile.website if profile else None,
            logo_url=profile.logo_url if profile else None,
            created_at=member.created_at,
            updated_at=profile.updated_at if profile else member.updated_at,
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/api/admin/members/{member_id}/approve", response_model=dict)
async def approve_member(
    member_id: str,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve a member registration (admin only)."""
    from uuid import UUID

    try:
        member = await member_service.approve_member(UUID(member_id), db)
        return {
            "message": "Member approved successfully",
            "member_id": str(member.id),
        }
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/api/admin/members/{member_id}/reject", response_model=dict)
async def reject_member(
    member_id: str,
    reason: Optional[str] = Query(None),
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a member registration (admin only)."""
    from uuid import UUID

    try:
        member = await member_service.reject_member(UUID(member_id), reason, db)
        return {
            "message": "Member rejected",
            "member_id": str(member.id),
        }
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

