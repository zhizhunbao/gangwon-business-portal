"""
Content management schemas.

Pydantic models for request/response validation.
"""
from pydantic import BaseModel, Field
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
    """Notice list item schema with formatting logic."""
    
    id: UUID
    title: str
    board_type: str
    view_count: int
    created_at: datetime
    
    # Formatted display fields
    board_type_display: str
    created_at_display: str
    view_count_display: str
    
    class Config:
        from_attributes = True
        
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
            "view_count": data["view_count"],
            "created_at": cls._parse_datetime(data["created_at"]),
            
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
    """Press release list item schema with formatting logic."""
    
    id: UUID
    title: str
    image_url: str
    created_at: datetime
    
    # Formatted display fields
    created_at_display: str
    
    class Config:
        from_attributes = True
        
    @classmethod
    def from_db_dict(cls, data: dict, include_admin_fields: bool = False):
        """
        Create PressListItem from database dictionary with all formatting applied.
        
        Args:
            data: Raw database dictionary
            include_admin_fields: Whether to include admin-specific formatted fields
            
        Returns:
            Formatted PressListItem instance
        """
        # Basic fields - let it fail if required fields are missing
        item_data = {
            "id": data["id"],
            "title": data["title"],
            "image_url": data["image_url"],
            "created_at": cls._parse_datetime(data["created_at"]),
            
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
    
    banner_type: str = Field(..., description="Banner type: main_primary, about, projects, performance, support")
    image_url: str = Field(..., max_length=500, description="Banner image URL")
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
