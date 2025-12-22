"""
Support router.

API endpoints for support management (FAQs and inquiries).
"""
from fastapi import APIRouter, Depends, Query, status
from typing import Optional, Annotated
from uuid import UUID
from math import ceil

from fastapi import Request

from ...common.modules.db.models import Member
from ...common.modules.audit import audit_log
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
):
    """List FAQs, optionally filtered by category."""
    faqs = await service.get_faqs(category)
    return FAQListResponse(items=[FAQResponse(**f) for f in faqs])


# Admin FAQ Endpoints

@router.post(
    "/api/admin/faqs",
    response_model=FAQResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["support", "admin"],
    summary="Create FAQ",
)
@audit_log(action="create", resource_type="faq")
async def create_faq(
    data: FAQCreate,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Create a new FAQ (admin only)."""
    faq = await service.create_faq(data)
    return FAQResponse(**faq)


@router.put(
    "/api/admin/faqs/{faq_id}",
    response_model=FAQResponse,
    tags=["support", "admin"],
    summary="Update FAQ",
)
@audit_log(action="update", resource_type="faq")
async def update_faq(
    faq_id: UUID,
    data: FAQUpdate,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Update an FAQ (admin only)."""
    faq = await service.update_faq(faq_id, data)
    return FAQResponse(**faq)


@router.delete(
    "/api/admin/faqs/{faq_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["support", "admin"],
    summary="Delete FAQ",
)
@audit_log(action="delete", resource_type="faq")
async def delete_faq(
    faq_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Delete an FAQ (admin only)."""
    await service.delete_faq(faq_id)


# Member Inquiry Endpoints

@router.post(
    "/api/inquiries",
    response_model=InquiryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["support"],
    summary="Submit inquiry",
)
@audit_log(action="create", resource_type="inquiry")
async def create_inquiry(
    data: InquiryCreate,
    request: Request,
    current_user: dict = Depends(get_current_active_user),
):
    """Submit a new 1:1 inquiry (member only)."""
    inquiry = await service.create_inquiry(data, current_user["id"])
    
    return InquiryResponse(
        **inquiry,
        member_name=current_user["company_name"],
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
    current_user: dict = Depends(get_current_active_user),
):
    """List member's own inquiries with pagination."""
    inquiries, total = await service.get_member_inquiries(
        current_user["id"], page, page_size
    )

    inquiry_items = []
    for inquiry in inquiries:
        inquiry_items.append(InquiryListItem.from_db_dict(
            inquiry,
            member_name_override=current_user["company_name"]
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
    current_user: dict = Depends(get_current_active_user),
):
    """Get inquiry detail by ID."""
    inquiry = await service.get_inquiry_by_id(inquiry_id, current_user["id"])
    
    return InquiryResponse(
        **inquiry,
        member_name=current_user["company_name"],
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
):
    """List all inquiries with pagination and filtering (admin only)."""
    inquiries, total = await service.get_all_inquiries_admin(page, page_size, status)

    inquiry_items = []
    for inquiry in inquiries:
        inquiry_items.append(InquiryListItem.from_db_dict(inquiry))

    return InquiryListResponse(
        items=inquiry_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.post(
    "/api/admin/inquiries/{inquiry_id}/reply",
    response_model=InquiryResponse,
    tags=["support", "admin"],
    summary="Reply to inquiry",
)
@audit_log(action="reply", resource_type="inquiry")
async def reply_to_inquiry(
    inquiry_id: UUID,
    data: InquiryReplyRequest,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Reply to an inquiry (admin only)."""
    inquiry = await service.reply_to_inquiry(inquiry_id, data)
    
    return InquiryResponse(**inquiry)
