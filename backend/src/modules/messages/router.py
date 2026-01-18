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
from ..user.dependencies import get_current_admin_user, get_current_member_user
from .service import MessageService
from .schemas import (
    MessageCreate,
    MessageUpdate,
    MessageResponse,
    MessageListResponse,
    UnreadCountResponse,
    ThreadCreate,
    ThreadMessageCreate,
    ThreadUpdate,
    ThreadResponse,
    ThreadWithMessagesResponse,
    ThreadMessageResponse,
    ThreadListResponse,
    BroadcastCreate,
    BroadcastResponse,
    MessageAnalyticsResponse,
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
async def get_messages(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=1000)] = 20,
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
        is_admin=True,
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
async def get_unread_count(
    current_user = Depends(get_current_admin_user),
):
    """Get unread messages count for admin."""
    # 直接调用 unified 方法，跳过不必要的 _is_admin 查询
    result = await service.get_unread_count_unified(current_user["id"], is_admin=True)
    return UnreadCountResponse(unread_count=result.get('unread_count', 0))


@router.get(
    "/api/admin/messages/analytics",
    response_model=MessageAnalyticsResponse,
    tags=["messages", "analytics", "admin"],
    summary="Get message analytics (admin)",
)
async def get_message_analytics(
    time_range: str = Query("7d", regex="^(7d|30d|90d|all)$", description="Time range for analytics (7d, 30d, 90d, or all)"),
    current_user = Depends(get_current_admin_user),
):
    """Get message analytics data (admin only)."""
    analytics = await service.get_analytics(time_range)
    return MessageAnalyticsResponse(**analytics)


@router.get(
    "/api/admin/messages/threads",
    response_model=ThreadListResponse,
    tags=["messages", "threads", "admin"],
    summary="List all threads (admin)",
)
async def list_admin_threads(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=1000)] = 20,
    status: Optional[str] = Query(None, description="Filter by status: open, resolved, closed"),
    has_unread: Optional[bool] = Query(None, description="Filter threads with unread messages"),
    current_user = Depends(get_current_admin_user),
):
    """
    List all threads for admin with pagination.
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Optional status filter (open, resolved, closed)
    - **has_unread**: Optional filter for threads with unread messages
    """
    threads, total = await service.get_admin_threads(
        page=page,
        page_size=page_size,
        status=status,
        has_unread=has_unread,
    )
    
    return ThreadListResponse(
        items=[ThreadResponse(**thread) for thread in threads],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.get(
    "/api/admin/messages/{message_id}",
    response_model=MessageResponse,
    tags=["messages", "admin"],
    summary="Get message by ID (admin)",
)
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
async def get_member_messages(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=1000)] = 20,
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
async def get_member_unread_count(
    current_user: Member = Depends(get_current_member_user),
):
    """Get unread messages count for member."""
    # 直接调用 unified 方法，跳过不必要的 _is_admin 查询
    result = await service.get_unread_count_unified(current_user.id, is_admin=False)
    return UnreadCountResponse(unread_count=result.get('unread_count', 0))


# Thread Endpoints (must be before /{message_id} to avoid route conflicts)

@router.get(
    "/api/member/messages/threads",
    response_model=ThreadListResponse,
    tags=["messages", "threads", "member"],
    summary="List member threads",
)
async def list_member_threads(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=1000)] = 20,
    status: Optional[str] = Query(None, description="Filter by status: open, resolved, closed"),
    current_user: Member = Depends(get_current_member_user),
):
    """
    List member's threads with pagination.
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status**: Optional status filter (open, resolved, closed)
    """
    threads, total = await service.get_member_threads(
        current_user.id,
        page=page,
        page_size=page_size,
        status=status,
    )
    
    return ThreadListResponse(
        items=[ThreadResponse(**thread) for thread in threads],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.post(
    "/api/member/messages/threads",
    response_model=ThreadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages", "threads", "member"],
    summary="Create message thread (member)",
)
@audit_log(action="create", resource_type="thread")
async def create_thread(
    data: ThreadCreate,
    request: Request,
    current_user: Member = Depends(get_current_member_user),
):
    """Create a new message thread (member)."""
    thread = await service.create_thread(data, current_user.id)
    return ThreadResponse(**thread)


@router.get(
    "/api/member/messages/threads/{thread_id}",
    response_model=ThreadWithMessagesResponse,
    tags=["messages", "threads", "member"],
    summary="Get thread with messages (member)",
)
async def get_member_thread(
    thread_id: UUID,
    current_user: Member = Depends(get_current_member_user),
):
    """Get thread with all messages (member)."""
    result = await service.get_thread_with_messages(thread_id, current_user.id)
    return ThreadWithMessagesResponse(
        thread=ThreadResponse(**result['thread']),
        messages=[ThreadMessageResponse(**msg) for msg in result['messages']]
    )


@router.post(
    "/api/member/messages/threads/{thread_id}/messages",
    response_model=ThreadMessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages", "threads", "member"],
    summary="Send message in thread (member)",
)
@audit_log(action="reply", resource_type="thread")
async def create_member_thread_message(
    thread_id: UUID,
    data: ThreadMessageCreate,
    request: Request,
    current_user: Member = Depends(get_current_member_user),
):
    """Send a message in an existing thread (member)."""
    message = await service.create_thread_message(thread_id, data, current_user.id, "member")
    return ThreadMessageResponse(**message)


@router.post(
    "/api/member/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages", "member"],
    summary="Send message to admin (member)",
)
@audit_log(action="create", resource_type="message")
async def create_member_message(
    data: MessageCreate,
    request: Request,
    current_user: Member = Depends(get_current_member_user),
):
    """Send a message to an admin (member only)."""
    message = await service.create_message(data, current_user.id)
    return MessageResponse(**message)


@router.get(
    "/api/member/messages/{message_id}",
    response_model=MessageResponse,
    tags=["messages", "member"],
    summary="Get message by ID (member)",
)
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
@audit_log(action="delete", resource_type="message")
async def delete_member_message(
    message_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_member_user),
):
    """Delete a message (member only)."""
    await service.delete_message(message_id, current_user.id)


# Thread Endpoints (Admin) - threads/{thread_id} routes

@router.get(
    "/api/admin/messages/threads/{thread_id}",
    response_model=ThreadWithMessagesResponse,
    tags=["messages", "threads", "admin"],
    summary="Get thread with messages (admin)",
)
async def get_thread(
    thread_id: UUID,
    current_user = Depends(get_current_admin_user),
):
    """Get thread with all messages (admin)."""
    result = await service.get_thread_with_messages(thread_id, current_user["id"])
    return ThreadWithMessagesResponse(
        thread=ThreadResponse(**result['thread']),
        messages=[ThreadMessageResponse(**msg) for msg in result['messages']]
    )


@router.post(
    "/api/admin/messages/threads/{thread_id}/messages",
    response_model=ThreadMessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages", "threads", "admin"],
    summary="Send message in thread (admin)",
)
@audit_log(action="reply", resource_type="thread")
async def create_thread_message(
    thread_id: UUID,
    data: ThreadMessageCreate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Send a message in an existing thread (admin)."""
    message = await service.create_thread_message(thread_id, data, current_user["id"], "admin")
    return ThreadMessageResponse(**message)


@router.put(
    "/api/admin/messages/threads/{thread_id}",
    response_model=ThreadResponse,
    tags=["messages", "threads", "admin"],
    summary="Update thread (admin)",
)
@audit_log(action="update", resource_type="thread")
async def update_thread(
    thread_id: UUID,
    data: ThreadUpdate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Update thread status or assignment (admin)."""
    thread = await service.update_thread(thread_id, data, current_user["id"])
    return ThreadResponse(**thread)


# Broadcast Endpoints

@router.post(
    "/api/admin/messages/broadcast",
    response_model=BroadcastResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages", "broadcast", "admin"],
    summary="Send broadcast message (admin)",
)
@audit_log(action="broadcast", resource_type="message")
async def create_broadcast(
    data: BroadcastCreate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Send a broadcast message to multiple members (admin only)."""
    broadcast = await service.create_broadcast(data, current_user["id"])
    return BroadcastResponse(**broadcast)


# Analytics endpoint moved above to fix route ordering issue

