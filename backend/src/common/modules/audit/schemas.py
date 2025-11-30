"""
Audit log schemas.

Pydantic models for audit log API requests and responses.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    """Audit log response schema."""

    id: UUID
    user_id: Optional[UUID] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    # Related user info
    user_email: Optional[str] = None
    user_company_name: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogListQuery(BaseModel):
    """Query parameters for listing audit logs."""

    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    user_id: Optional[UUID] = Field(default=None, description="Filter by user ID")
    action: Optional[str] = Field(default=None, description="Filter by action type")
    resource_type: Optional[str] = Field(default=None, description="Filter by resource type")
    resource_id: Optional[UUID] = Field(default=None, description="Filter by resource ID")
    start_date: Optional[datetime] = Field(default=None, description="Start date filter")
    end_date: Optional[datetime] = Field(default=None, description="End date filter")


class AuditLogListResponse(BaseModel):
    """Response schema for audit log list."""

    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int























