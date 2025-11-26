"""
Project API schemas.

Pydantic models for project and project application requests/responses.
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime
from enum import Enum


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


# Project Schemas
class ProjectCreate(BaseModel):
    """Schema for creating a new project (admin only)."""
    title: str = Field(..., max_length=255, description="Project title")
    description: Optional[str] = Field(None, description="Project description")
    target_audience: Optional[str] = Field(None, description="Target audience description")
    start_date: Optional[date] = Field(None, description="Project start date")
    end_date: Optional[date] = Field(None, description="Project end date")
    image_url: Optional[str] = Field(None, max_length=500, description="Project image URL")
    status: Optional[ProjectStatus] = Field(ProjectStatus.active, description="Project status")


class ProjectUpdate(BaseModel):
    """Schema for updating a project (admin only)."""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    target_audience: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    image_url: Optional[str] = Field(None, max_length=500)
    status: Optional[ProjectStatus] = None


class ProjectResponse(BaseModel):
    """Schema for project response."""
    id: UUID
    title: str
    description: Optional[str]
    target_audience: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    image_url: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime
    applications_count: Optional[int] = Field(None, description="Number of applications (computed)")

    class Config:
        from_attributes = True


class ProjectListItem(BaseModel):
    """Simplified schema for project list items."""
    id: UUID
    title: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    image_url: Optional[str]
    status: str
    applications_count: Optional[int] = None

    class Config:
        from_attributes = True


class ProjectListQuery(BaseModel):
    """Query parameters for listing projects."""
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")
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


class ProjectApplicationResponse(BaseModel):
    """Schema for project application response."""
    id: UUID
    member_id: UUID
    project_id: UUID
    project: Optional[ProjectResponse] = Field(None, description="Nested project details")
    status: str
    application_reason: str
    submitted_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ProjectApplicationListItem(BaseModel):
    """Simplified schema for application list items."""
    id: UUID
    member_id: UUID
    project_id: UUID
    project_title: Optional[str] = Field(None, description="Project title for convenience")
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ApplicationListQuery(BaseModel):
    """Query parameters for listing applications."""
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    status: Optional[ApplicationStatus] = Field(None, description="Filter by status")


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
