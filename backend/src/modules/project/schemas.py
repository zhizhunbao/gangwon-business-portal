"""
Project API schemas.

Pydantic models for project and project application requests/responses.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from enum import Enum

# Import common utilities
from ...common.utils.formatters import (
    parse_date,
    parse_datetime,
    format_datetime_display,
    format_status_display,
    format_date_range_display,
    format_count_display,
)


# Enums
class ProjectStatus(str, Enum):
    """Project status enumeration."""
    active = "active"
    inactive = "inactive"
    archived = "archived"


class ApplicationStatus(str, Enum):
    """Application status enumeration."""
    submitted = "submitted"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


# Project Schemas
class ProjectCreate(BaseModel):
    """Schema for creating a new project (admin only)."""
    title: str = Field(..., max_length=255, description="Project title")
    description: Optional[str] = Field(None, description="Project description")
    target_company_name: Optional[str] = Field(None, max_length=255, description="Target company name")
    target_business_number: Optional[str] = Field(None, max_length=12, description="Target company business number")
    start_date: Optional[date] = Field(None, description="Project start date")
    end_date: Optional[date] = Field(None, description="Project end date")
    image_url: Optional[str] = Field(None, max_length=500, description="Project image URL")
    status: Optional[ProjectStatus] = Field(ProjectStatus.active, description="Project status")
    attachments: Optional[list] = Field(None, description="File attachments")


class ProjectUpdate(BaseModel):
    """Schema for updating a project (admin only)."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    target_company_name: Optional[str] = Field(None, max_length=255)
    target_business_number: Optional[str] = Field(None, max_length=12)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    image_url: Optional[str] = Field(None, max_length=500)
    status: Optional[ProjectStatus] = None
    attachments: Optional[list] = None


class ProjectResponse(BaseModel):
    """Schema for project response."""
    id: UUID
    title: str
    description: Optional[str]
    target_company_name: Optional[str]
    target_business_number: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    image_url: Optional[str]
    status: str
    attachments: Optional[list] = None
    created_at: datetime
    updated_at: datetime
    applications_count: Optional[int] = Field(None, description="Number of applications (computed)")

    class Config:
        from_attributes = True


class ProjectListItem(BaseModel):
    """Simplified schema for project list items with formatting logic."""
    id: UUID
    title: str
    description: Optional[str]
    target_company_name: Optional[str]
    target_business_number: Optional[str]
    start_date: date
    end_date: date
    image_url: Optional[str]
    status: str
    attachments: Optional[list] = None
    applications_count: int
    
    # Formatted display fields
    status_display: str
    date_range_display: str
    applications_count_display: str
    created_at_display: str
    updated_at_display: str

    class Config:
        from_attributes = True
        
    @classmethod
    def from_db_dict(cls, data: dict, include_admin_fields: bool = False):
        """
        Create ProjectListItem from database dictionary with all formatting applied.
        
        Args:
            data: Raw database dictionary
            include_admin_fields: Whether to include admin-specific formatted fields
            
        Returns:
            Formatted ProjectListItem instance
        """
        # Handle legacy target_audience field
        if 'target_audience' in data:
            data = data.copy()
            data.pop('target_audience')
        
        # Basic fields - use .get() for optional fields with safe defaults
        # application_count may come as 'application_count' or 'applications_count'
        app_count = data.get("application_count", data.get("applications_count", 0))
        
        item_data = {
            "id": data["id"],
            "title": data["title"],
            "description": data.get("description", ""),
            "target_company_name": data.get("target_company_name", ""),
            "target_business_number": data.get("target_business_number", ""),
            "start_date": cls._parse_date(data["start_date"]),
            "end_date": cls._parse_date(data["end_date"]),
            "image_url": data.get("image_url", ""),
            "status": data["status"],
            "attachments": data.get("attachments", []),
            "applications_count": app_count,
            
            # Formatted display fields
            "status_display": cls._format_status_display(data["status"]),
            "date_range_display": cls._format_date_range(
                data["start_date"], 
                data["end_date"]
            ),
        }
        
        # Add admin-specific fields if requested
        if include_admin_fields:
            item_data.update({
                "applications_count_display": format_count_display(app_count),
                "created_at_display": format_datetime_display(data["created_at"]),
                "updated_at_display": format_datetime_display(data["updated_at"]),
            })
        else:
            # For non-admin, provide default values for required fields
            item_data.update({
                "applications_count_display": format_count_display(app_count),
                "created_at_display": format_datetime_display(data["created_at"]),
                "updated_at_display": format_datetime_display(data.get("updated_at", data["created_at"])),
            })
        
        return cls(**item_data)
    
    @staticmethod
    def _parse_date(date_str) -> date:
        """Parse date string to date object."""
        return parse_date(date_str)
    
    @staticmethod
    def _format_status_display(status: str) -> str:
        """Format status for display."""
        return format_status_display(status, "project")
    
    @staticmethod
    def _format_date_range(start_date, end_date) -> str:
        """Format date range for display."""
        return format_date_range_display(start_date, end_date)
    
    @staticmethod
    def _format_datetime_display(dt) -> str:
        """Format datetime for display."""
        return format_datetime_display(dt)
        
    @classmethod
    def model_validate(cls, obj):
        """Custom validation to handle legacy target_audience field."""
        if isinstance(obj, dict):
            return cls.from_db_dict(obj)
        return super().model_validate(obj)


class ProjectListQuery(BaseModel):
    """Query parameters for listing projects."""
    status: Optional[ProjectStatus] = Field(None, description="Filter by status")
    search: Optional[str] = Field(None, description="Search in title and description")


class ProjectListResponsePaginated(BaseModel):
    """Paginated response for project list."""
    items: list[ProjectListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# Project Application Schemas
class ProjectApplicationCreate(BaseModel):
    """Schema for creating a project application (member)."""
    application_reason: str = Field(..., min_length=10, description="Reason for applying")
    attachments: Optional[list] = Field(None, description="File attachments")


class ProjectApplicationResponse(BaseModel):
    """Schema for project application response."""
    id: UUID
    member_id: UUID
    project_id: UUID
    project: Optional[ProjectResponse] = Field(None, description="Nested project details")
    status: str
    application_reason: str
    attachments: Optional[list] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProjectApplicationListItem(BaseModel):
    """Simplified schema for application list items."""
    id: UUID
    member_id: UUID
    project_id: UUID
    project_title: str  # 必填，数据库里没有就报错
    company_name: str  # 必填，数据库里没有就报错
    status: str
    application_reason: str  # 必填，数据库里没有就报错
    attachments: Optional[list] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime]  # 这个可以为空，因为可能还没审核
    review_note: Optional[str] = None  # 审核备注/拒绝原因
    material_request: Optional[str] = None  # 补充材料请求

    class Config:
        from_attributes = True


class ApplicationListQuery(BaseModel):
    """Query parameters for listing applications."""
    status: Optional[ApplicationStatus] = Field(None, description="Filter by status")
    search: Optional[str] = Field(None, description="Search in project title")
    page: Optional[int] = Field(1, ge=1, description="Page number")
    page_size: Optional[int] = Field(10, ge=1, le=1000, description="Items per page")


class ApplicationListResponsePaginated(BaseModel):
    """Paginated response for application list."""
    items: list[ProjectApplicationListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ApplicationStatusUpdate(BaseModel):
    """Schema for updating application status (admin)."""
    status: ApplicationStatus = Field(..., description="New status")
    review_notes: Optional[str] = Field(None, description="Admin review notes")
