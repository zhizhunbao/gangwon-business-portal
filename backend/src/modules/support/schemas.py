"""
Support module schemas.

Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# FAQ Schemas

class FAQCreate(BaseModel):
    """FAQ creation schema."""
    
    category: Optional[str] = Field(None, max_length=100, description="FAQ category")
    question: str = Field(..., min_length=1, description="Question text")
    answer: str = Field(..., min_length=1, description="Answer text")
    display_order: int = Field(default=0, description="Display order for sorting")


class FAQUpdate(BaseModel):
    """FAQ update schema."""
    
    category: Optional[str] = Field(None, max_length=100, description="FAQ category")
    question: Optional[str] = Field(None, min_length=1, description="Question text")
    answer: Optional[str] = Field(None, min_length=1, description="Answer text")
    display_order: Optional[int] = Field(None, description="Display order for sorting")


class FAQResponse(BaseModel):
    """FAQ response schema."""
    
    id: UUID
    category: Optional[str]
    question: str
    answer: str
    display_order: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class FAQListResponse(BaseModel):
    """FAQ list response schema."""
    
    items: List[FAQResponse]


# Inquiry Schemas

class AttachmentItem(BaseModel):
    """Attachment item schema."""
    file_id: str = Field(..., description="File ID from storage")
    file_url: Optional[str] = Field(None, description="File URL")
    original_name: str = Field(..., description="Original file name")
    stored_name: Optional[str] = Field(None, description="Stored file name in storage")
    file_size: Optional[int] = Field(None, description="File size in bytes")


class InquiryCreate(BaseModel):
    """Inquiry creation schema."""
    
    category: Optional[str] = Field(default="general", description="Inquiry category: support, performance, general")
    subject: str = Field(..., min_length=1, max_length=255, description="Inquiry subject")
    content: str = Field(..., min_length=1, description="Inquiry content")
    attachments: Optional[List[AttachmentItem]] = Field(default=None, max_length=3, description="Attachments (max 3)")


class InquiryResponse(BaseModel):
    """Inquiry response schema."""
    
    id: UUID
    member_id: UUID
    member_name: Optional[str] = Field(None, description="Member company name")
    category: Optional[str] = Field(default="general", description="Inquiry category")
    subject: str
    content: str
    status: str
    admin_reply: Optional[str]
    attachments: Optional[List[AttachmentItem]] = Field(default=None, description="Attachments")
    created_at: datetime
    replied_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class InquiryListItem(BaseModel):
    """Inquiry list item schema."""
    
    id: UUID
    member_id: UUID
    member_name: str  # 必填，数据库里没有就报错
    category: str  # 必填，数据库里没有就报错
    subject: str
    status: str
    created_at: datetime
    replied_at: Optional[datetime]  # 这个可以为空，因为可能还没回复
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_db_dict(cls, data: dict, member_name_override: Optional[str] = None):
        """
        Create InquiryListItem from database dictionary.
        
        Args:
            data: Raw database dictionary
            member_name_override: Optional override for member_name (used for member's own inquiries)
            
        Returns:
            InquiryListItem instance
        """
        # Basic fields - let it fail if required fields are missing
        return cls(
            id=data["id"],
            member_id=data["member_id"],
            member_name=member_name_override or data["member_name"],
            category=data["category"],
            subject=data["subject"],
            status=data["status"],
            created_at=data["created_at"],
            replied_at=data.get("replied_at"),  # 可以为空
        )


class InquiryListResponse(BaseModel):
    """Inquiry list response schema."""
    
    items: List[InquiryListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class InquiryReplyRequest(BaseModel):
    """Inquiry reply request schema."""
    
    admin_reply: str = Field(..., min_length=1, description="Admin reply content")

