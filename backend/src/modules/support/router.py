"""
Support router.

API endpoints for support management (FAQs and inquiries).
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Annotated
from uuid import UUID
from math import ceil

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ..user.dependencies import get_current_active_user, get_current_admin_user
from .service import SupportService
from .schemas import (
    FAQCreate,
    FAQUpdate,
    FAQResponse,
    FAQListResponse,
    InquiryCreate,
    InquiryResponse,
    InquiryListItem,
    InquiryListResponse,
    InquiryReplyRequest,
)

router = APIRouter()
service = SupportService()


# Public FAQ Endpoints

@router.get(
    "/api/faqs",
    response_model=FAQListResponse,
    tags=["support"],
    summary="List FAQs",
)
async def list_faqs(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
):
    """
    List FAQs, optionally filtered by category.

    - **category**: Optional category filter
    """
    faqs = await service.get_faqs(category, db)
    return FAQListResponse(items=[FAQResponse.model_validate(f) for f in faqs])


# Admin FAQ Endpoints

@router.post(
    "/api/admin/faqs",
    response_model=FAQResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["support", "admin"],
    summary="Create FAQ",
)
async def create_faq(
    data: FAQCreate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new FAQ (admin only)."""
    faq = await service.create_faq(data, db)
    return FAQResponse.model_validate(faq)


@router.put(
    "/api/admin/faqs/{faq_id}",
    response_model=FAQResponse,
    tags=["support", "admin"],
    summary="Update FAQ",
)
async def update_faq(
    faq_id: UUID,
    data: FAQUpdate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an FAQ (admin only)."""
    faq = await service.update_faq(faq_id, data, db)
    return FAQResponse.model_validate(faq)


@router.delete(
    "/api/admin/faqs/{faq_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["support", "admin"],
    summary="Delete FAQ",
)
async def delete_faq(
    faq_id: UUID,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an FAQ (admin only)."""
    await service.delete_faq(faq_id, db)


# Member Inquiry Endpoints

@router.post(
    "/api/inquiries",
    response_model=InquiryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["support"],
    summary="Submit inquiry",
)
async def create_inquiry(
    data: InquiryCreate,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new 1:1 inquiry (member only)."""
    inquiry = await service.create_inquiry(data, current_user.id, db)
    
    return InquiryResponse(
        id=inquiry.id,
        member_id=inquiry.member_id,
        member_name=current_user.company_name,
        subject=inquiry.subject,
        content=inquiry.content,
        status=inquiry.status,
        admin_reply=inquiry.admin_reply,
        created_at=inquiry.created_at,
        replied_at=inquiry.replied_at,
    )


@router.get(
    "/api/inquiries",
    response_model=InquiryListResponse,
    tags=["support"],
    summary="List my inquiries",
)
async def list_my_inquiries(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List member's own inquiries with pagination.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    inquiries, total = await service.get_member_inquiries(
        current_user.id, page, page_size, db
    )

    # Get member names for each inquiry
    inquiry_items = []
    for inquiry in inquiries:
        inquiry_items.append(InquiryListItem(
            id=inquiry.id,
            member_id=inquiry.member_id,
            member_name=current_user.company_name,
            subject=inquiry.subject,
            status=inquiry.status,
            created_at=inquiry.created_at,
            replied_at=inquiry.replied_at,
        ))

    return InquiryListResponse(
        items=inquiry_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.get(
    "/api/inquiries/{inquiry_id}",
    response_model=InquiryResponse,
    tags=["support"],
    summary="Get inquiry detail",
)
async def get_inquiry(
    inquiry_id: UUID,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get inquiry detail by ID.

    Only the owner can access their own inquiries.
    """
    inquiry = await service.get_inquiry_by_id(inquiry_id, current_user.id, db)
    
    return InquiryResponse(
        id=inquiry.id,
        member_id=inquiry.member_id,
        member_name=current_user.company_name,
        subject=inquiry.subject,
        content=inquiry.content,
        status=inquiry.status,
        admin_reply=inquiry.admin_reply,
        created_at=inquiry.created_at,
        replied_at=inquiry.replied_at,
    )


# Admin Inquiry Endpoints

@router.get(
    "/api/admin/inquiries",
    response_model=InquiryListResponse,
    tags=["support", "admin"],
    summary="List all inquiries (admin)",
)
async def list_all_inquiries(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: Optional[str] = Query(default=None, description="Filter by status: pending, replied, closed"),
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all inquiries with pagination and filtering (admin only).

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Optional status filter (pending, replied, closed)
    """
    inquiries, total = await service.get_all_inquiries_admin(page, page_size, status, db)

    # Get member names for each inquiry
    inquiry_items = []
    for inquiry in inquiries:
        # Get member name
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        result = await db.execute(select(Member).where(Member.id == inquiry.member_id))
        member = result.scalar_one_or_none()
        member_name = member.company_name if member else None

        inquiry_items.append(InquiryListItem(
            id=inquiry.id,
            member_id=inquiry.member_id,
            member_name=member_name,
            subject=inquiry.subject,
            status=inquiry.status,
            created_at=inquiry.created_at,
            replied_at=inquiry.replied_at,
        ))

    return InquiryListResponse(
        items=inquiry_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.put(
    "/api/admin/inquiries/{inquiry_id}/reply",
    response_model=InquiryResponse,
    tags=["support", "admin"],
    summary="Reply to inquiry",
)
async def reply_to_inquiry(
    inquiry_id: UUID,
    data: InquiryReplyRequest,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Reply to an inquiry (admin only)."""
    inquiry = await service.reply_to_inquiry(inquiry_id, data, db)
    
    # Get member name
    from sqlalchemy import select
    from ...common.modules.db.models import Member
    result = await db.execute(select(Member).where(Member.id == inquiry.member_id))
    member = result.scalar_one_or_none()
    member_name = member.company_name if member else None
    
    return InquiryResponse(
        id=inquiry.id,
        member_id=inquiry.member_id,
        member_name=member_name,
        subject=inquiry.subject,
        content=inquiry.content,
        status=inquiry.status,
        admin_reply=inquiry.admin_reply,
        created_at=inquiry.created_at,
        replied_at=inquiry.replied_at,
    )

