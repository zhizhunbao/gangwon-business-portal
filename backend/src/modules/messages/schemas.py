"""
Messages schemas.

Pydantic models for message-related requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class MessageCreate(BaseModel):
    """Message creation schema."""
    
    recipient_id: UUID = Field(..., description="Recipient member ID")
    subject: str = Field(..., min_length=1, max_length=255, description="Message subject")
    content: str = Field(..., min_length=1, description="Message content")
    is_important: bool = Field(default=False, description="Whether message is important")


class MessageUpdate(BaseModel):
    """Message update schema."""
    
    is_read: Optional[bool] = Field(None, description="Mark message as read/unread")
    is_important: Optional[bool] = Field(None, description="Mark message as important")


class MessageResponse(BaseModel):
    """Message response schema."""
    
    id: UUID
    sender_id: Optional[UUID]
    sender_name: Optional[str] = Field(None, description="Sender name (admin or member)")
    recipient_id: UUID
    recipient_name: Optional[str] = Field(None, description="Recipient company name")
    subject: str
    content: str
    is_read: bool
    is_important: bool
    read_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    """Message list response schema."""
    
    items: List[MessageResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    unread_count: int = Field(default=0, description="Total unread messages count")


class UnreadCountResponse(BaseModel):
    """Unread messages count response."""
    
    unread_count: int


# Thread-related schemas

class ThreadCreate(BaseModel):
    """Thread creation schema."""
    
    subject: str = Field(..., min_length=1, max_length=255, description="Thread subject")
    category: str = Field(default="general", description="Thread category")
    content: str = Field(..., min_length=1, description="Initial message content")
    attachments: List[dict] = Field(default=[], description="File attachments")


class ThreadMessageCreate(BaseModel):
    """Thread message creation schema."""
    
    content: str = Field(..., min_length=1, description="Message content")
    is_important: bool = Field(default=False, description="Whether message is important")
    attachments: List[dict] = Field(default=[], description="File attachments")


class ThreadUpdate(BaseModel):
    """Thread update schema."""
    
    status: Optional[str] = Field(None, description="Thread status")
    assigned_to: Optional[UUID] = Field(None, description="Assigned admin ID")


class ThreadMessageResponse(BaseModel):
    """Thread message response schema."""
    
    id: UUID
    thread_id: UUID
    sender_id: UUID
    sender_type: str
    sender_name: Optional[str] = None
    content: str
    is_read: bool
    is_important: bool
    read_at: Optional[datetime]
    created_at: datetime
    attachments: List[dict] = []
    
    class Config:
        from_attributes = True


class ThreadResponse(BaseModel):
    """Thread response schema."""
    
    id: UUID
    subject: str
    category: str
    status: str
    member_id: UUID
    member_name: Optional[str] = None
    created_by: UUID
    assigned_to: Optional[UUID]
    last_message_at: Optional[datetime]
    message_count: int
    unread_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ThreadWithMessagesResponse(BaseModel):
    """Thread with messages response schema."""
    
    thread: ThreadResponse
    messages: List[ThreadMessageResponse]


class ThreadListResponse(BaseModel):
    """Thread list response schema."""
    
    items: List[ThreadResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Broadcast-related schemas

class BroadcastCreate(BaseModel):
    """Broadcast message creation schema."""
    
    subject: str = Field(..., min_length=1, max_length=255, description="Broadcast subject")
    content: str = Field(..., min_length=1, description="Broadcast content")
    category: str = Field(default="general", description="Broadcast category")
    is_important: bool = Field(default=False, description="Whether broadcast is important")
    send_to_all: bool = Field(default=True, description="Send to all members")
    recipient_ids: List[UUID] = Field(default=[], description="Specific recipient IDs")
    attachments: List[dict] = Field(default=[], description="File attachments")


class BroadcastResponse(BaseModel):
    """Broadcast response schema."""
    
    id: UUID
    sender_id: UUID
    sender_name: Optional[str] = None
    subject: str
    content: str
    category: str
    is_important: bool
    send_to_all: bool
    recipient_count: int
    sent_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Analytics schemas

class MessageAnalyticsResponse(BaseModel):
    """Message analytics response schema."""
    
    total_messages: int = 0
    unread_messages: int = 0
    response_time: float = 0.0  # Average response time in minutes
    messages_by_day: List[dict] = []
    messages_by_category: List[dict] = []
    response_time_by_day: List[dict] = []

