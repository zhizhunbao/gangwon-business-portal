"""
Logging schemas.

Pydantic models for application log API requests and responses.
Exception schemas are in the exception module.
"""
from datetime import datetime
from typing import Optional, Any, Union
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator, model_validator


# =============================================================================
# Log Creation Schemas - 用于创建日志对象
# =============================================================================

class AppLogCreate(BaseModel):
    """Schema for creating an application log entry."""
    
    # Required fields
    source: str = Field(default="backend", description="Source of the log (backend/frontend)")
    level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)")
    message: str = Field(..., description="Log message")
    
    # Context fields
    layer: Optional[str] = Field(None, description="AOP layer (Service, Router, Auth, Database, etc.)")
    module: Optional[str] = Field(None, description="Module name/path")
    function: Optional[str] = Field(None, description="Function name")
    line_number: Optional[int] = Field(None, description="Line number")
    
    # Request context
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    request_id: Optional[str] = Field(None, description="Request ID")
    user_id: Optional[UUID] = Field(None, description="User ID")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    
    # HTTP context
    request_method: Optional[str] = Field(None, description="HTTP method")
    request_path: Optional[str] = Field(None, description="Request path")
    request_data: Optional[dict[str, Any]] = Field(None, description="Request data")
    response_status: Optional[int] = Field(None, description="HTTP response status")
    duration_ms: Optional[int] = Field(None, description="Duration in milliseconds")
    
    # Extra data
    extra_data: Optional[dict[str, Any]] = Field(None, description="Additional context data")
    
    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        """Validate and normalize log level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper_v = v.upper()
        if upper_v not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return upper_v
    
    def to_model(self) -> "AppLog":
        """Convert schema to AppLog model instance."""
        from ..db.models import AppLog
        return AppLog(
            id=uuid4(),
            source=self.source,
            level=self.level,
            message=self.message,
            layer=self.layer,
            module=self.module,
            function=self.function,
            line_number=self.line_number,
            trace_id=self.trace_id,
            request_id=self.request_id,
            user_id=self.user_id,
            ip_address=self.ip_address,
            user_agent=self.user_agent,
            request_method=self.request_method,
            request_path=self.request_path,
            request_data=self.request_data,
            response_status=self.response_status,
            duration_ms=self.duration_ms,
            extra_data=self.extra_data,
        )
    
    class Config:
        from_attributes = True


class ErrorLogCreate(BaseModel):
    """Schema for creating an error log entry."""
    
    # Required fields
    source: str = Field(default="backend", description="Source of the error (backend/frontend)")
    error_type: str = Field(..., description="Exception class name")
    error_message: str = Field(..., description="Exception message")
    
    # Error details
    error_code: Optional[str] = Field(None, description="Application error code")
    status_code: Optional[int] = Field(None, description="HTTP status code")
    stack_trace: Optional[str] = Field(None, description="Full stack trace")
    
    # Context fields
    layer: Optional[str] = Field(None, description="AOP layer")
    module: Optional[str] = Field(None, description="Module name")
    function: Optional[str] = Field(None, description="Function name")
    line_number: Optional[int] = Field(None, description="Line number")
    
    # Request context
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    user_id: Optional[UUID] = Field(None, description="User ID")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    
    # HTTP context
    request_method: Optional[str] = Field(None, description="HTTP method")
    request_path: Optional[str] = Field(None, description="Request path")
    request_data: Optional[dict[str, Any]] = Field(None, description="Request data")
    
    # Extra data
    error_details: Optional[dict[str, Any]] = Field(None, description="Additional error details")
    context_data: Optional[dict[str, Any]] = Field(None, description="Additional context data")
    
    def to_model(self) -> "ErrorLog":
        """Convert schema to ErrorLog model instance."""
        from ..db.models import ErrorLog
        return ErrorLog(
            id=uuid4(),
            source=self.source,
            error_type=self.error_type,
            error_message=self.error_message,
            error_code=self.error_code,
            status_code=self.status_code,
            stack_trace=self.stack_trace,
            layer=self.layer,
            module=self.module,
            function=self.function,
            line_number=self.line_number,
            trace_id=self.trace_id,
            user_id=self.user_id,
            ip_address=self.ip_address,
            user_agent=self.user_agent,
            request_method=self.request_method,
            request_path=self.request_path,
            request_data=self.request_data,
            error_details=self.error_details,
            context_data=self.context_data,
        )
    
    class Config:
        from_attributes = True


class PerformanceLogCreate(BaseModel):
    """Schema for creating a performance log entry."""
    
    # Required fields
    source: str = Field(default="backend", description="Source (backend/frontend)")
    metric_name: str = Field(..., description="Performance metric name")
    metric_value: float = Field(..., description="Metric value")
    metric_unit: str = Field(default="ms", description="Metric unit")
    
    # Context fields
    layer: Optional[str] = Field(default="Performance", description="AOP layer")
    module: Optional[str] = Field(None, description="Module name")
    component_name: Optional[str] = Field(None, description="Component being measured")
    
    # Request context
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    request_id: Optional[str] = Field(None, description="Request ID")
    user_id: Optional[UUID] = Field(None, description="User ID")
    
    # Performance details
    threshold: Optional[float] = Field(None, description="Performance threshold")
    performance_issue: Optional[str] = Field(None, description="Performance issue type")
    web_vitals: Optional[dict[str, Any]] = Field(None, description="Web Vitals metrics")
    
    # Extra data
    extra_data: Optional[dict[str, Any]] = Field(None, description="Additional context data")
    
    def to_model(self) -> "PerformanceLog":
        """Convert schema to PerformanceLog model instance."""
        from ..db.models import PerformanceLog
        return PerformanceLog(
            id=uuid4(),
            source=self.source,
            metric_name=self.metric_name,
            metric_value=self.metric_value,
            metric_unit=self.metric_unit,
            layer=self.layer,
            module=self.module,
            component_name=self.component_name,
            trace_id=self.trace_id,
            request_id=self.request_id,
            user_id=self.user_id,
            threshold=self.threshold,
            performance_issue=self.performance_issue,
            web_vitals=self.web_vitals,
            extra_data=self.extra_data,
        )
    
    class Config:
        from_attributes = True


class AuditLogCreate(BaseModel):
    """Schema for creating an audit log entry."""
    
    # Required fields
    action: str = Field(..., description="Action type (login, create, update, delete, approve, etc.)")
    
    # Context fields
    user_id: Optional[UUID] = Field(None, description="User ID who performed the action")
    resource_type: Optional[str] = Field(None, description="Type of resource (member, performance, project, etc.)")
    resource_id: Optional[UUID] = Field(None, description="Resource ID")
    
    # Request context
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    
    # Extra data
    extra_data: Optional[dict[str, Any]] = Field(None, description="Additional context data")
    
    def to_model(self) -> "AuditLog":
        """Convert schema to AuditLog model instance."""
        from ..db.models import AuditLog
        return AuditLog(
            id=uuid4(),
            action=self.action,
            user_id=self.user_id,
            resource_type=self.resource_type,
            resource_id=self.resource_id,
            ip_address=self.ip_address,
            user_agent=self.user_agent,
        )
    
    class Config:
        from_attributes = True


# =============================================================================
# Response Schemas - 用于 API 响应
# =============================================================================


class AppLogResponse(BaseModel):
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

    items: list[AppLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FrontendLogCreate(BaseModel):
    """Schema for creating a frontend application log entry."""

    level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)")
    message: str = Field(..., description="Log message")
    layer: Optional[str] = Field(None, description="AOP layer (Service, Router, Auth, Performance, etc.)")
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


class FrontendLogBatchCreate(BaseModel):
    """Schema for creating multiple frontend log entries in a batch."""
    
    logs: list[FrontendLogCreate] = Field(..., description="List of log entries")
    timestamp: Optional[str] = Field(None, description="Batch timestamp")
    batch_size: Optional[int] = Field(None, description="Number of logs in batch")
