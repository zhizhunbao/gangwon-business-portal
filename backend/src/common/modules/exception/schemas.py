"""
Exception schemas.

Pydantic models for application exception API requests and responses.
"""
from datetime import datetime
from typing import Optional, Any, Union
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ApplicationExceptionResponse(BaseModel):
    """Application exception response schema."""

    id: UUID
    source: str  # backend, frontend
    exception_type: str
    exception_message: str
    error_code: Optional[str] = None
    status_code: Optional[int] = None
    trace_id: Optional[str] = None
    user_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    request_data: Optional[dict[str, Any]] = None
    stack_trace: Optional[str] = None
    exception_details: Optional[dict[str, Any]] = None
    context_data: Optional[dict[str, Any]] = None
    resolved: str  # "true" or "false"
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolution_notes: Optional[str] = None
    created_at: datetime

    # Related user info
    user_email: Optional[str] = None
    user_company_name: Optional[str] = None
    resolver_email: Optional[str] = None
    resolver_company_name: Optional[str] = None

    class Config:
        from_attributes = True


class ExceptionListQuery(BaseModel):
    """Query parameters for listing application exceptions."""

    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    source: Optional[str] = Field(default=None, description="Filter by source (backend/frontend)")
    exception_type: Optional[str] = Field(default=None, description="Filter by exception type")
    resolved: Optional[str] = Field(default=None, description="Filter by resolved status (true/false)")
    trace_id: Optional[str] = Field(default=None, description="Filter by trace ID")
    user_id: Optional[UUID] = Field(default=None, description="Filter by user ID")
    start_date: Optional[datetime] = Field(default=None, description="Start date filter")
    end_date: Optional[datetime] = Field(default=None, description="End date filter")


class ExceptionListResponse(BaseModel):
    """Response schema for application exception list."""

    items: list[ApplicationExceptionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ExceptionResolveRequest(BaseModel):
    """Request schema for resolving an exception."""

    resolution_notes: Optional[str] = Field(default=None, description="Notes about the resolution")


class FrontendExceptionCreate(BaseModel):
    """Schema for creating a frontend application exception entry."""

    exception_type: str = Field(..., description="Exception type/class name")
    exception_message: str = Field(..., description="Exception message")
    error_code: Optional[str] = None
    status_code: Optional[int] = None
    trace_id: Optional[str] = None
    user_id: Optional[Union[str, int]] = None  # Accept string or number, will be converted to UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    request_data: Optional[dict[str, Any]] = None
    stack_trace: Optional[str] = None
    exception_details: Optional[dict[str, Any]] = None
    context_data: Optional[dict[str, Any]] = None
    
    @field_validator("user_id", mode="before")
    @classmethod
    def convert_user_id_to_string(cls, v):
        """Convert user_id from number to string if needed."""
        if v is None:
            return None
        # Convert number to string, or keep string as is
        return str(v) if isinstance(v, (int, float)) else v

