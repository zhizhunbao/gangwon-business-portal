"""
Content management schemas.

Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# Import common utilities
from ...common.utils.formatters import (
    parse_datetime,
    format_datetime_display,
    format_date_display,
    format_board_type_display,
    format_view_count_display,
)


# Notice Schemas

class NoticeCreate(BaseModel):
    """Notice creation schema."""
    
    title: str = Field(..., min_length=1, max_length=255, description="Notice title")
    content_html: str = Field(..., description="HTML content (WYSIWYG editor)")
    board_type: Optional[str] = Field(default="notice", max_length=50, description="Board type")
    attachments: Optional[List[dict]] = Field(default=None, description="File attachments")


class NoticeUpdate(BaseModel):
    """Notice update schema."""
    
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Notice title")
    content_html: Optional[str] = Field(None, description="HTML content")
    board_type: Optional[str] = Field(None, max_length=50, description="Board type")
    attachments: Optional[List[dict]] = Field(None, description="File attachments")


class NoticeResponse(BaseModel):
    """Notice response schema."""
    
    id: UUID
    board_type: str
    title: str
    content_html: Optional[str]
    author_id: Optional[UUID]
    author_name: Optional[str] = Field(None, description="Author company name")
    view_count: int
    attachments: Optional[List[dict]] = Field(None, description="File attachments")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class NoticeListItem(BaseModel):
    """Notice list item schema with formatting logic."""
    
    id: UUID
    title: str
    board_type: str
    content_html: Optional[str] = None
    view_count: int
    created_at: datetime
    attachments: Optional[List[dict]] = Field(default=None, description="File attachments")
    
    # Formatted display fields
    board_type_display: str
    created_at_display: str
    view_count_display: str
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "uuid",
                "title": "Notice title",
                "board_type": "notice",
                "content_html": "<p>Content</p>",
                "view_count": 0,
                "created_at": "2024-01-01T00:00:00Z",
                "attachments": [],
                "board_type_display": "公告",
                "created_at_display": "2024.01.01",
                "view_count_display": "0回"
            }
        }
    )
        
    @classmethod
    def from_db_dict(cls, data: dict, include_admin_fields: bool = False):
        """
        Create NoticeListItem from database dictionary with all formatting applied.
        
        Args:
            data: Raw database dictionary
            include_admin_fields: Whether to include admin-specific formatted fields
            
        Returns:
            Formatted NoticeListItem instance
        """
        # Basic fields - let it fail if required fields are missing
        item_data = {
            "id": data["id"],
            "title": data["title"],
            "board_type": data["board_type"],
            "content_html": data.get("content_html"),
            "view_count": data["view_count"],
            "created_at": cls._parse_datetime(data["created_at"]),
            "attachments": data.get("attachments"),
            
            # Formatted display fields
            "board_type_display": cls._format_board_type_display(data["board_type"]),
            "created_at_display": cls._format_datetime_display(data["created_at"]),
            "view_count_display": format_view_count_display(data['view_count']),
        }
        
        return cls(**item_data)
    
    @staticmethod
    def _parse_datetime(dt_str) -> datetime:
        """Parse datetime string to datetime object."""
        return parse_datetime(dt_str)
    
    @staticmethod
    def _format_board_type_display(board_type: str) -> str:
        """Format board type for display."""
        return format_board_type_display(board_type)
    
    @staticmethod
    def _format_datetime_display(dt) -> str:
        """Format datetime for display."""
        return format_date_display(dt)


class NoticeListResponse(BaseModel):
    """Notice list response schema."""
    
    items: List[NoticeListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# Content Project Schemas (for display purposes)

class ContentProjectCreate(BaseModel):
    """Content project creation schema."""
    
    title: str = Field(..., min_length=1, max_length=255, description="Project title")
    image_url: str = Field(..., max_length=500, description="Project image URL")


class ContentProjectUpdate(BaseModel):
    """Content project update schema."""
    
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Project title")
    image_url: Optional[str] = Field(None, max_length=500, description="Project image URL")


class ContentProjectResponse(BaseModel):
    """Content project response schema."""
    
    id: UUID
    title: str
    image_url: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ContentProjectListItem(BaseModel):
    """Content project list item schema with formatting logic."""
    
    id: UUID
    title: str
    image_url: Optional[str] = None
    created_at: datetime
    attachments: Optional[List[dict]] = None
    
    # Formatted display fields
    created_at_display: str
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_db_dict(cls, data: dict, include_admin_fields: bool = False):
        """
        Create ContentProjectListItem from database dictionary with all formatting applied.
        
        Args:
            data: Raw database dictionary
            include_admin_fields: Whether to include admin-specific formatted fields
            
        Returns:
            Formatted ContentProjectListItem instance
        """
        # Basic fields - let it fail if required fields are missing
        item_data = {
            "id": data["id"],
            "title": data["title"],
            "image_url": data.get("image_url"),
            "created_at": cls._parse_datetime(data["created_at"]),
            "attachments": data.get("attachments"),
            
            # Formatted display fields
            "created_at_display": cls._format_datetime_display(data["created_at"]),
        }
        
        return cls(**item_data)
    
    @staticmethod
    def _parse_datetime(dt_str) -> datetime:
        """Parse datetime string to datetime object."""
        return parse_datetime(dt_str)
    
    @staticmethod
    def _format_datetime_display(dt) -> str:
        """Format datetime for display."""
        return format_date_display(dt)


class ContentProjectListResponse(BaseModel):
    """Content project list response schema."""
    
    items: List[ContentProjectListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# Banner Schemas

class BannerCreate(BaseModel):
    """Banner creation schema."""
    
    banner_type: str = Field(..., description="Banner type: main_primary, about, projects, performance, support")
    image_url: str = Field(..., max_length=500, description="Banner image URL")
    mobile_image_url: Optional[str] = Field(None, max_length=500, description="Mobile banner image URL")
    link_url: Optional[str] = Field(None, max_length=500, description="Optional click-through URL")
    title_ko: Optional[str] = Field(None, max_length=200, description="Korean title")
    title_zh: Optional[str] = Field(None, max_length=200, description="Chinese title")
    subtitle_ko: Optional[str] = Field(None, max_length=500, description="Korean subtitle")
    subtitle_zh: Optional[str] = Field(None, max_length=500, description="Chinese subtitle")
    is_active: bool = Field(default=True, description="Whether banner is active")
    display_order: int = Field(default=0, description="Display order for sorting")


class BannerUpdate(BaseModel):
    """Banner update schema."""
    
    banner_type: Optional[str] = Field(None, description="Banner type")
    image_url: Optional[str] = Field(None, max_length=500, description="Banner image URL")
    mobile_image_url: Optional[str] = Field(None, max_length=500, description="Mobile banner image URL")
    link_url: Optional[str] = Field(None, max_length=500, description="Optional click-through URL")
    title_ko: Optional[str] = Field(None, max_length=200, description="Korean title")
    title_zh: Optional[str] = Field(None, max_length=200, description="Chinese title")
    subtitle_ko: Optional[str] = Field(None, max_length=500, description="Korean subtitle")
    subtitle_zh: Optional[str] = Field(None, max_length=500, description="Chinese subtitle")
    is_active: Optional[bool] = Field(None, description="Whether banner is active")
    display_order: Optional[int] = Field(None, description="Display order for sorting")


class BannerResponse(BaseModel):
    """Banner response schema."""
    
    id: UUID
    banner_type: str
    image_url: str
    mobile_image_url: Optional[str] = None
    link_url: Optional[str]
    title_ko: Optional[str]
    title_zh: Optional[str]
    subtitle_ko: Optional[str]
    subtitle_zh: Optional[str]
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


# Popup Schemas

class PopupCreate(BaseModel):
    """Popup creation schema."""
    
    title: str = Field(..., min_length=1, max_length=255, description="Popup title")
    content: str = Field(..., description="Popup content")
    image_url: Optional[str] = Field(None, max_length=500, description="Popup image URL")
    link_url: Optional[str] = Field(None, max_length=500, description="Optional click-through URL")
    width: int = Field(default=600, ge=200, le=1200, description="Popup width in pixels")
    height: int = Field(default=400, ge=200, le=800, description="Popup height in pixels")
    position: str = Field(default="center", description="Popup position: center, left, right")
    is_active: bool = Field(default=True, description="Whether popup is active")
    start_date: Optional[datetime] = Field(None, description="Start date for popup display")
    end_date: Optional[datetime] = Field(None, description="End date for popup display")


class PopupUpdate(BaseModel):
    """Popup update schema."""
    
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Popup title")
    content: Optional[str] = Field(None, description="Popup content")
    image_url: Optional[str] = Field(None, max_length=500, description="Popup image URL")
    link_url: Optional[str] = Field(None, max_length=500, description="Optional click-through URL")
    width: Optional[int] = Field(None, ge=200, le=1200, description="Popup width in pixels")
    height: Optional[int] = Field(None, ge=200, le=800, description="Popup height in pixels")
    position: Optional[str] = Field(None, description="Popup position: center, left, right")
    is_active: Optional[bool] = Field(None, description="Whether popup is active")
    start_date: Optional[datetime] = Field(None, description="Start date for popup display")
    end_date: Optional[datetime] = Field(None, description="End date for popup display")


class PopupResponse(BaseModel):
    """Popup response schema."""
    
    id: UUID
    title: str
    content: str
    image_url: Optional[str]
    link_url: Optional[str]
    width: int
    height: int
    position: str
    is_active: bool
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PopupListResponse(BaseModel):
    """Popup list response schema."""
    
    popups: List[PopupResponse]


# LegalContent Schemas (Terms of Service, Privacy Policy)

class LegalContentUpdate(BaseModel):
    """Legal content update schema."""
    
    content_html: str = Field(..., description="HTML content (WYSIWYG editor)")


class LegalContentResponse(BaseModel):
    """Legal content response schema."""
    
    id: UUID
    content_type: str  # 'terms_of_service' or 'privacy_policy'
    content_html: str
    updated_by: Optional[UUID]
    updated_at: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True
