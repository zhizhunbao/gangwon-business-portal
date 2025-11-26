"""
Content management schemas.

Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# Notice Schemas

class NoticeCreate(BaseModel):
    """Notice creation schema."""
    
    title: str = Field(..., min_length=1, max_length=255, description="Notice title")
    content_html: str = Field(..., description="HTML content (WYSIWYG editor)")
    board_type: Optional[str] = Field(default="notice", max_length=50, description="Board type")


class NoticeUpdate(BaseModel):
    """Notice update schema."""
    
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Notice title")
    content_html: Optional[str] = Field(None, description="HTML content")
    board_type: Optional[str] = Field(None, max_length=50, description="Board type")


class NoticeResponse(BaseModel):
    """Notice response schema."""
    
    id: UUID
    board_type: str
    title: str
    content_html: Optional[str]
    author_id: Optional[UUID]
    author_name: Optional[str] = Field(None, description="Author company name")
    view_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class NoticeListItem(BaseModel):
    """Notice list item schema."""
    
    id: UUID
    title: str
    board_type: str
    view_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class NoticeListResponse(BaseModel):
    """Notice list response schema."""
    
    items: List[NoticeListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# Press Release Schemas

class PressReleaseCreate(BaseModel):
    """Press release creation schema."""
    
    title: str = Field(..., min_length=1, max_length=255, description="Press release title")
    image_url: str = Field(..., max_length=500, description="Press release image URL")


class PressReleaseUpdate(BaseModel):
    """Press release update schema."""
    
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Press release title")
    image_url: Optional[str] = Field(None, max_length=500, description="Press release image URL")


class PressReleaseResponse(BaseModel):
    """Press release response schema."""
    
    id: UUID
    title: str
    image_url: str
    author_id: Optional[UUID]
    author_name: Optional[str] = Field(None, description="Author company name")
    created_at: datetime
    
    class Config:
        from_attributes = True


class PressListItem(BaseModel):
    """Press release list item schema."""
    
    id: UUID
    title: str
    image_url: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class PressListResponse(BaseModel):
    """Press release list response schema."""
    
    items: List[PressListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# Banner Schemas

class BannerCreate(BaseModel):
    """Banner creation schema."""
    
    banner_type: str = Field(..., description="Banner type: MAIN, INTRO, PROGRAM, PERFORMANCE, SUPPORT")
    image_url: str = Field(..., max_length=500, description="Banner image URL")
    link_url: Optional[str] = Field(None, max_length=500, description="Optional click-through URL")
    is_active: bool = Field(default=True, description="Whether banner is active")
    display_order: int = Field(default=0, description="Display order for sorting")


class BannerUpdate(BaseModel):
    """Banner update schema."""
    
    banner_type: Optional[str] = Field(None, description="Banner type")
    image_url: Optional[str] = Field(None, max_length=500, description="Banner image URL")
    link_url: Optional[str] = Field(None, max_length=500, description="Optional click-through URL")
    is_active: Optional[bool] = Field(None, description="Whether banner is active")
    display_order: Optional[int] = Field(None, description="Display order for sorting")


class BannerResponse(BaseModel):
    """Banner response schema."""
    
    id: UUID
    banner_type: str
    image_url: str
    link_url: Optional[str]
    is_active: bool
    display_order: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class BannerListResponse(BaseModel):
    """Banner list response schema."""
    
    items: List[BannerResponse]


# SystemInfo Schemas

class SystemInfoUpdate(BaseModel):
    """System info update schema."""
    
    content_html: str = Field(..., description="HTML content (WYSIWYG editor)")
    image_url: Optional[str] = Field(None, max_length=500, description="Optional image URL")


class SystemInfoResponse(BaseModel):
    """System info response schema."""
    
    id: UUID
    content_html: str
    image_url: Optional[str]
    updated_by: Optional[UUID]
    updater_name: Optional[str] = Field(None, description="Updater company name")
    updated_at: datetime
    
    class Config:
        from_attributes = True

