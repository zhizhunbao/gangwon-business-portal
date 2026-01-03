"""
Audit log schemas.

Pydantic models for audit log API requests and responses.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class AuditLogResponse(BaseModel):
    """Audit log response schema.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, request_id, user_id, duration_ms
    - 扩展字段：extra_data
    """

    id: UUID
    source: str = ""
    level: str = "INFO"
    message: str = ""
    layer: str = ""
    module: str = ""
    function: str = ""
    line_number: int = 0
    file_path: str = ""
    trace_id: str = ""
    request_id: str = ""
    user_id: Optional[UUID] = None
    duration_ms: Optional[int] = None
    extra_data: Optional[dict] = None
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def ensure_timezone(cls, v):
        """Ensure datetime has UTC timezone for proper frontend parsing."""
        if v is None:
            return v
        if isinstance(v, datetime):
            # If naive datetime, assume UTC
            if v.tzinfo is None:
                return v.replace(tzinfo=timezone.utc)
        return v

    model_config = {"from_attributes": True}


class AuditLogListQuery(BaseModel):
    """Query parameters for listing audit logs."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    user_id: Optional[UUID] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AuditLogListResponse(BaseModel):
    """Response schema for audit log list."""

    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
