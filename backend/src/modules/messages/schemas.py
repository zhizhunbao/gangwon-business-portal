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

