"""
Logging schemas.

Pydantic models for application log API requests and responses.
Exception schemas are in the exception module.
"""
from datetime import datetime
from typing import Optional, Any, Union
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ApplicationLogResponse(BaseModel):
    """Application log response schema."""

    id: UUID
    source: str  # backend, frontend
    level: str  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message: str
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    trace_id: Optional[str] = None
    user_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    request_data: Optional[dict[str, Any]] = None
    response_status: Optional[int] = None
    duration_ms: Optional[int] = None
    extra_data: Optional[dict[str, Any]] = None
    created_at: datetime

    # Related user info
    user_email: Optional[str] = None
    user_company_name: Optional[str] = None

    class Config:
        from_attributes = True


class LogListQuery(BaseModel):
    """Query parameters for listing application logs."""

    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    source: Optional[str] = Field(default=None, description="Filter by source (backend/frontend)")
    level: Optional[str] = Field(default=None, description="Filter by level (DEBUG/INFO/WARNING/ERROR/CRITICAL)")
    trace_id: Optional[str] = Field(default=None, description="Filter by trace ID")
    user_id: Optional[UUID] = Field(default=None, description="Filter by user ID")
    start_date: Optional[datetime] = Field(default=None, description="Start date filter")
    end_date: Optional[datetime] = Field(default=None, description="End date filter")


class LogListResponse(BaseModel):
    """Response schema for application log list."""

    items: list[ApplicationLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FrontendLogCreate(BaseModel):
    """Schema for creating a frontend application log entry."""

    level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)")
    message: str = Field(..., description="Log message")
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    trace_id: Optional[str] = None
    user_id: Optional[Union[str, int]] = None  # Accept string or number, will be converted to string then UUID
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    request_data: Optional[dict[str, Any]] = None
    response_status: Optional[int] = None
    duration_ms: Optional[int] = None
    extra_data: Optional[dict[str, Any]] = None
    
    @field_validator("user_id", mode="before")
    @classmethod
    def convert_user_id_to_string(cls, v):
        """Convert user_id from number to string if needed."""
        if v is None:
            return None
        # Convert number to string, or keep string as is
        return str(v) if isinstance(v, (int, float)) else v
