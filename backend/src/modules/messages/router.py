"""
Messages router.

API endpoints for internal messaging system.
"""
from fastapi import APIRouter, Depends, Query, status
from typing import Annotated, Optional
from uuid import UUID
from math import ceil

from fastapi import Request

from ...common.modules.db.models import Member
from ...common.modules.audit import audit_log
from ...common.modules.logger import auto_log
from ..user.dependencies import get_current_admin_user, get_current_member_user
from .service import MessageService
from .schemas import (
    MessageCreate,
    MessageUpdate,
    MessageResponse,
    MessageListResponse,
    UnreadCountResponse,
)

router = APIRouter()
service = MessageService()


# Admin Endpoints

@router.get(
    "/api/admin/messages",
    response_model=MessageListResponse,
    tags=["messages", "admin"],
    summary="Get messages (admin)",
)
@auto_log("get_messages", log_result_count=True)
async def get_messages(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_important: Optional[bool] = Query(None, description="Filter by important status"),
    current_user = Depends(get_current_admin_user),
):
    """
    Get paginated list of messages for admin.
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **is_read**: Filter by read status (optional)
    - **is_important**: Filter by important status (optional)
    """
    messages, total, unread_count = await service.get_messages(
        current_user["id"],
        page=page,
        page_size=page_size,
        is_read=is_read,
        is_important=is_important,
    )
    
    return MessageListResponse(
        items=[MessageResponse(**msg) for msg in messages],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
        unread_count=unread_count,
    )


@router.get(
    "/api/admin/messages/unread-count",
    response_model=UnreadCountResponse,
    tags=["messages", "admin"],
    summary="Get unread messages count (admin)",
)
@auto_log("get_unread_count")
async def get_unread_count(
    current_user = Depends(get_current_admin_user),
):
    """Get unread messages count for admin."""
    count = await service.get_unread_count(current_user["id"])
    return UnreadCountResponse(unread_count=count)


@router.get(
    "/api/admin/messages/{message_id}",
    response_model=MessageResponse,
    tags=["messages", "admin"],
    summary="Get message by ID (admin)",
)
@auto_log("get_message", log_resource_id=True)
async def get_message(
    message_id: UUID,
    current_user = Depends(get_current_admin_user),
):
    """Get message detail by ID (admin)."""
    message = await service.get_message_by_id(message_id, current_user["id"])
    return MessageResponse(**message)


@router.post(
    "/api/admin/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages", "admin"],
    summary="Send message to member (admin)",
)
@auto_log("create_message", log_resource_id=True)
@audit_log(action="create", resource_type="message")
async def create_message(
    data: MessageCreate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Send a message to a member (admin only)."""
    message = await service.create_message(data, current_user["id"])
    return MessageResponse(**message)


@router.put(
    "/api/admin/messages/{message_id}",
    response_model=MessageResponse,
    tags=["messages", "admin"],
    summary="Update message (admin)",
)
@auto_log("update_message", log_resource_id=True)
@audit_log(action="update", resource_type="message")
async def update_message(
    message_id: UUID,
    data: MessageUpdate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Update a message (admin only)."""
    message = await service.update_message(message_id, data, current_user["id"])
    return MessageResponse(**message)


@router.delete(
    "/api/admin/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["messages", "admin"],
    summary="Delete message (admin)",
)
@auto_log("delete_message", log_resource_id=True)
@audit_log(action="delete", resource_type="message")
async def delete_message(
    message_id: UUID,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Delete a message (admin only)."""
    await service.delete_message(message_id, current_user["id"])


# Member Endpoints

@router.get(
    "/api/member/messages",
    response_model=MessageListResponse,
    tags=["messages", "member"],
    summary="Get messages (member)",
)
@auto_log("get_member_messages", log_result_count=True)
async def get_member_messages(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    is_important: Optional[bool] = Query(None, description="Filter by important status"),
    current_user: Member = Depends(get_current_member_user),
):
    """
    Get paginated list of messages for member.
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **is_read**: Filter by read status (optional)
    - **is_important**: Filter by important status (optional)
    """
    messages, total, unread_count = await service.get_messages(
        current_user.id,
        page=page,
        page_size=page_size,
        is_read=is_read,
        is_important=is_important,
    )
    
    return MessageListResponse(
        items=[MessageResponse(**msg) for msg in messages],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
        unread_count=unread_count,
    )


@router.get(
    "/api/member/messages/unread-count",
    response_model=UnreadCountResponse,
    tags=["messages", "member"],
    summary="Get unread messages count (member)",
)
@auto_log("get_member_unread_count")
async def get_member_unread_count(
    current_user: Member = Depends(get_current_member_user),
):
    """Get unread messages count for member."""
    count = await service.get_unread_count(current_user.id)
    return UnreadCountResponse(unread_count=count)


@router.get(
    "/api/member/messages/{message_id}",
    response_model=MessageResponse,
    tags=["messages", "member"],
    summary="Get message by ID (member)",
)
@auto_log("get_member_message", log_resource_id=True)
async def get_member_message(
    message_id: UUID,
    current_user: Member = Depends(get_current_member_user),
):
    """Get message detail by ID (member). Automatically marks as read."""
    message = await service.get_message_by_id(message_id, current_user.id)
    return MessageResponse(**message)


@router.put(
    "/api/member/messages/{message_id}",
    response_model=MessageResponse,
    tags=["messages", "member"],
    summary="Update message (member)",
)
@auto_log("update_member_message", log_resource_id=True)
async def update_member_message(
    message_id: UUID,
    data: MessageUpdate,
    request: Request,
    current_user: Member = Depends(get_current_member_user),
):
    """Update a message (mark as read/unread, important)."""
    message = await service.update_message(message_id, data, current_user.id)
    return MessageResponse(**message)


@router.delete(
    "/api/member/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["messages", "member"],
    summary="Delete message (member)",
)
@auto_log("delete_member_message", log_resource_id=True)
async def delete_member_message(
    message_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_member_user),
):
    """Delete a message (member only)."""
    await service.delete_message(message_id, current_user.id)

