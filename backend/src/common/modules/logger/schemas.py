"""
Logging schemas.

Pydantic models for application log API requests and responses.
All log creation schemas include to_db_dict() and to_file_dict() methods
for consistent data conversion between database and file writers.

This module provides:
- BaseLogSchema: Abstract base class for all log schemas
- AppLogCreate, ErrorLogCreate, etc.: Concrete log creation schemas
- Response schemas for API responses

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
from abc import ABC
from datetime import datetime
from typing import Optional, Any, Union
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator

from ...utils.formatters import now_utc, now_est


def format_timestamp_db() -> str:
    """Format timestamp in ISO format with UTC timezone for database storage.
    
    Requirements: 4.6
    """
    return now_utc().isoformat()


def format_timestamp_file() -> str:
    """Format timestamp in Ottawa time (EST) for file logging.
    
    Requirements: 4.5
    """
    return now_est().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


# =============================================================================
# Base Log Schema - 统一基类
# =============================================================================

class BaseLogSchema(BaseModel, ABC):
    """Base schema for all log types.
    
    Defines common fields and conversion methods that all log schemas share.
    Subclasses should override _build_extra_data() to add type-specific fields.
    
    按日志规范：
    - 必填字段（9个）：timestamp, source, level, message, layer, module, function, line_number, file_path
    - 追踪字段（4个）：trace_id, request_id（必填）, user_id, duration_ms（选填）
    - 扩展字段：extra_data（各日志类型特有的业务数据）
    
    Requirements: 4.1, 4.2, 4.3, 4.4
    """
    
    # Timestamp (optional - frontend provides, backend generates if not provided)
    timestamp: Optional[str] = Field(None, description="Timestamp (frontend provides, backend generates if not provided)")
    
    # Common fields (9) - 必填 - Requirements 4.1
    source: str = Field(default="backend", description="Source of the log (backend/frontend)")
    level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)")
    message: str = Field(default="", description="Log message")
    layer: str = Field(default="", description="AOP layer (Service, Router, Auth, Database, etc.)")
    module: str = Field(default="", description="Module name/path")
    function: str = Field(default="", description="Function name")
    line_number: int = Field(default=0, description="Line number")
    file_path: str = Field(default="", description="Full file path for debugging")
    
    # Trace fields - trace_id, request_id 必填，user_id, duration_ms 选填
    trace_id: str = Field(default="", description="Request trace ID")
    request_id: str = Field(default="", description="Request ID")
    user_id: Optional[UUID] = Field(None, description="User ID (optional - not available when not logged in)")
    duration_ms: Optional[int] = Field(None, description="Duration in milliseconds (optional - only for HTTP requests)")
    
    # Extra data for type-specific fields
    extra_data: Optional[dict[str, Any]] = Field(None, description="Additional context data")
    
    # Common fields list for from_model extraction
    _COMMON_FIELDS = [
        "source", "level", "message", "layer", "module", "function", 
        "line_number", "file_path", "trace_id", "request_id", "user_id", "duration_ms", "extra_data"
    ]
    
    @classmethod
    def _extract_common_fields(cls, model: Any) -> dict[str, Any]:
        """Extract common fields from a database model.
        
        This helper method extracts all common fields that exist on the model.
        Subclasses can use this to avoid repeating field extraction.
        """
        data = {}
        for field in cls._COMMON_FIELDS:
            value = getattr(model, field, None)
            if value is not None:
                data[field] = value
        return data
    
    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        """Validate and normalize log level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper_v = v.upper()
        if upper_v not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return upper_v
    
    @staticmethod
    def _normalize_ip(ip: Optional[str]) -> Optional[str]:
        """Normalize IPv6 localhost to IPv4.
        
        This is a utility method that can be used by subclasses.
        """
        if ip == "::1":
            return "127.0.0.1"
        return ip
    
    @staticmethod
    def _truncate_user_agent(user_agent: Optional[str], max_length: int = 200) -> Optional[str]:
        """Truncate user agent string to max length.
        
        This is a utility method that can be used by subclasses.
        """
        if user_agent and len(user_agent) > max_length:
            return user_agent[:max_length]
        return user_agent
    
    def _build_extra_data(self) -> dict[str, Any]:
        """Build extra_data dict from type-specific fields.
        
        Override in subclasses to add type-specific fields to extra_data.
        
        Returns:
            Dictionary containing type-specific extra data
        """
        return dict(self.extra_data) if self.extra_data else {}
    
    def _generate_message(self) -> str:
        """Generate message for this log type.
        
        Override in subclasses to provide type-specific message formatting.
        
        Returns:
            Formatted message string
        """
        return self.message
    
    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion (UTC timestamps).
        
        按日志规范输出数据库格式：
        - 使用 UTC 时间戳
        - 包含所有通用字段和追踪字段（始终输出，保持格式一致）
        - extra_data 包含类型特有字段
        
        Requirements: 4.3, 4.6
        
        Returns:
            Dictionary suitable for database insertion
        """
        extra = self._build_extra_data()
        
        # 所有字段始终输出，保持格式一致（无值时为 null）
        return {
            "id": str(uuid4()),
            "source": self.source,
            "level": self.level,
            "message": self._generate_message(),
            "layer": self.layer,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
            "trace_id": self.trace_id,
            "request_id": self.request_id,
            "user_id": str(self.user_id) if self.user_id else None,
            "duration_ms": int(self.duration_ms) if self.duration_ms is not None else None,
            "extra_data": extra if extra else None,
        }
    
    def to_file_dict(self) -> dict:
        """Convert to dictionary for file logging (EST timestamps).
        
        按日志规范输出文件格式：
        - 使用 Ottawa 时间 (EST)
        - 包含所有通用字段（始终输出，保持格式一致）
        - 追踪字段始终输出（无值时为 null）
        - extra_data 包含类型特有字段
        
        Requirements: 4.4, 4.5
        
        Returns:
            Dictionary suitable for file logging
        """
        # 通用字段（始终输出，保持格式一致）
        result = {
            "timestamp": self.timestamp if self.timestamp else format_timestamp_file(),
            "source": self.source,
            "level": self.level,
            "message": self._generate_message(),
            "layer": self.layer,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
            # 追踪字段（始终输出，保持格式一致）
            "trace_id": self.trace_id,
            "request_id": self.request_id,
            "user_id": str(self.user_id) if self.user_id else None,
            "duration_ms": int(self.duration_ms) if self.duration_ms is not None else None,
        }
        
        # 扩展字段
        extra = self._build_extra_data()
        if extra:
            result["extra_data"] = extra
        
        return result
    
    class Config:
        from_attributes = True


# =============================================================================
# Log Creation Schemas - 用于创建日志对象
# =============================================================================

class AppLogCreate(BaseLogSchema):
    """Schema for creating an application log entry.
    
    继承 BaseLogSchema，添加 HTTP 上下文字段到 extra_data。
    
    Requirements: 6.1, 7.2
    """
    
    # Override message to be required
    message: str = Field(..., description="Log message")
    
    # Fields that go into extra_data (for backward compatibility)
    ip_address: Optional[str] = Field(None, description="IP address -> extra_data")
    user_agent: Optional[str] = Field(None, description="User agent -> extra_data")
    request_method: Optional[str] = Field(None, description="HTTP method -> extra_data")
    request_path: Optional[str] = Field(None, description="Request path -> extra_data")
    response_status: Optional[int] = Field(None, description="HTTP response status -> extra_data")

    @field_validator("ip_address", mode="before")
    @classmethod
    def normalize_ip(cls, v: Optional[str]) -> Optional[str]:
        """Normalize IPv6 localhost to IPv4."""
        return BaseLogSchema._normalize_ip(v)

    @classmethod
    def from_model(cls, model: Any) -> "AppLogCreate":
        """Create schema from AppLog database model."""
        data = cls._extract_common_fields(model)
        # Add AppLog-specific fields
        for field in ["ip_address", "user_agent", "request_method", "request_path", "response_status"]:
            value = getattr(model, field, None)
            if value is not None:
                data[field] = value
        return cls(**data)

    def _build_extra_data(self) -> dict[str, Any]:
        """Build extra_data from HTTP context fields."""
        extra = dict(self.extra_data) if self.extra_data else {}
        if self.ip_address:
            extra["ip_address"] = self.ip_address
        if self.user_agent:
            extra["user_agent"] = self._truncate_user_agent(self.user_agent)
        if self.request_method:
            extra["request_method"] = self.request_method
        if self.request_path:
            extra["request_path"] = self.request_path
        if self.response_status:
            extra["response_status"] = self.response_status
        return extra


class ErrorLogCreate(BaseLogSchema):
    """Schema for creating an error log entry.
    
    继承 BaseLogSchema，添加错误字段到 extra_data。
    
    Requirements: 6.2, 6.6
    """
    
    # Override defaults
    level: str = Field(default="ERROR", description="Log level")
    layer: str = Field(default="Router", description="AOP layer")
    
    # Error info (will be stored in extra_data)
    error_type: str = Field(..., description="Exception class name -> extra_data")
    error_message: str = Field(..., description="Exception message -> extra_data")
    error_code: Optional[str] = Field(None, description="Application error code -> extra_data")
    status_code: Optional[int] = Field(None, description="HTTP status code -> extra_data")
    stack_trace: Optional[str] = Field(None, description="Full stack trace -> extra_data")
    
    # HTTP context (will be stored in extra_data)
    ip_address: Optional[str] = Field(None, description="IP address -> extra_data")
    user_agent: Optional[str] = Field(None, description="User agent -> extra_data")
    request_method: Optional[str] = Field(None, description="HTTP method -> extra_data")
    request_path: Optional[str] = Field(None, description="Request path -> extra_data")
    
    # Legacy fields (merged into extra_data)
    error_details: Optional[dict[str, Any]] = Field(None, description="Additional error details -> extra_data")
    context_data: Optional[dict[str, Any]] = Field(None, description="Additional context data -> extra_data")

    @field_validator("ip_address", mode="before")
    @classmethod
    def normalize_ip(cls, v: Optional[str]) -> Optional[str]:
        """Normalize IPv6 localhost to IPv4."""
        return BaseLogSchema._normalize_ip(v)

    def _generate_message(self) -> str:
        """Generate message: `{error_type}: {error_message}`"""
        return f"{self.error_type}: {self.error_message}"

    def _build_extra_data(self) -> dict[str, Any]:
        """Build extra_data from error and HTTP context fields."""
        extra: dict[str, Any] = {
            "error_type": self.error_type,
            "error_message": self.error_message,
        }
        if self.stack_trace:
            extra["stack_trace"] = self.stack_trace
        if self.error_code:
            extra["error_code"] = self.error_code
        if self.status_code:
            extra["status_code"] = self.status_code
        if self.ip_address:
            extra["ip_address"] = self.ip_address
        if self.user_agent:
            extra["user_agent"] = self._truncate_user_agent(self.user_agent)
        if self.request_method:
            extra["request_method"] = self.request_method
        if self.request_path:
            extra["request_path"] = self.request_path
        if self.error_details:
            extra.update(self.error_details)
        if self.context_data:
            extra.update(self.context_data)
        return extra


class PerformanceLogCreate(BaseLogSchema):
    """Schema for creating a performance log entry.
    
    继承 BaseLogSchema，添加性能指标字段到 extra_data。
    
    Requirements: 6.3, 6.6
    """
    
    # Override defaults
    layer: str = Field(default="Performance", description="AOP layer")
    
    # Override duration_ms to accept float
    duration_ms: Optional[float] = Field(None, description="Duration in milliseconds")
    
    # Performance fields (will be stored in extra_data)
    metric_name: str = Field(..., description="Performance metric name -> extra_data")
    metric_value: float = Field(..., description="Metric value -> extra_data")
    metric_unit: str = Field(default="ms", description="Metric unit -> extra_data")
    component_name: Optional[str] = Field(None, description="Component being measured -> extra_data")
    threshold_ms: Optional[float] = Field(None, description="Performance threshold in ms -> extra_data")
    is_slow: bool = Field(default=False, description="Whether threshold was exceeded -> extra_data")
    web_vitals: Optional[dict[str, Any]] = Field(None, description="Web Vitals metrics -> extra_data")

    def _generate_message(self) -> str:
        """Generate message: `Slow {type}: {target} ({duration}ms > {threshold}ms)`"""
        target = self.component_name or self.metric_name
        duration = self.duration_ms if self.duration_ms is not None else self.metric_value
        
        if self.is_slow and self.threshold_ms:
            return f"Slow {self.metric_name}: {target} ({duration:.0f}ms > {self.threshold_ms:.0f}ms)"
        else:
            return f"Perf: {self.metric_name} = {self.metric_value}{self.metric_unit}"

    def _build_extra_data(self) -> dict[str, Any]:
        """Build extra_data from performance fields."""
        extra: dict[str, Any] = {
            "metric_name": self.metric_name,
            "metric_value": self.metric_value,
            "metric_unit": self.metric_unit,
            "is_slow": self.is_slow,
        }
        if self.component_name:
            extra["component_name"] = self.component_name
        if self.threshold_ms is not None:
            extra["threshold_ms"] = self.threshold_ms
        if self.web_vitals:
            extra["web_vitals"] = self.web_vitals
        if self.extra_data:
            extra.update(self.extra_data)
        return extra

    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion.
        
        Override to convert duration_ms float to int for database.
        """
        result = super().to_db_dict()
        if self.duration_ms is not None:
            result["duration_ms"] = int(self.duration_ms)
        return result


class SystemLogCreate(BaseLogSchema):
    """Schema for creating a system log entry.
    
    继承 BaseLogSchema，添加系统字段到 extra_data。
    
    Requirements: 6.5
    """
    
    # Override message to be required
    message: str = Field(..., description="Log message")
    
    # Override defaults
    layer: str = Field(default="System", description="AOP layer")
    
    # Legacy field (will be stored in extra_data)
    logger_name: Optional[str] = Field(None, description="Logger name -> extra_data")

    def _get_effective_module(self) -> str:
        """Get effective module name (module or logger_name fallback)."""
        return self.module or self.logger_name or ""

    def _build_extra_data(self) -> dict[str, Any]:
        """Build extra_data from system fields."""
        extra = dict(self.extra_data) if self.extra_data else {}
        if self.logger_name and self.logger_name != self.module:
            extra["logger_name"] = self.logger_name
        return extra

    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion.
        
        Override to only include columns that exist in system_logs table.
        system_logs has: id, source, level, message, layer, module, function, 
                        line_number, file_path, extra_data, created_at
        """
        extra = self._build_extra_data()
        
        return {
            "id": str(uuid4()),
            "source": self.source,
            "level": self.level,
            "message": self._generate_message(),
            "layer": self.layer,
            "module": self.module or self.logger_name,  # logger_name -> module fallback
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
            "extra_data": extra if extra else None,
        }

    def to_file_dict(self) -> dict:
        """Convert to dictionary for file logging.
        
        Override to only include fields relevant to system logs,
        consistent with to_db_dict().
        """
        extra = self._build_extra_data()
        
        return {
            "timestamp": self.timestamp if self.timestamp else format_timestamp_file(),
            "source": self.source,
            "level": self.level,
            "message": self._generate_message(),
            "layer": self.layer,
            "module": self.module or self.logger_name,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
            "extra_data": extra if extra else None,
        }


class AuditLogCreate(BaseLogSchema):
    """Schema for creating an audit log entry.
    
    继承 BaseLogSchema，添加审计字段到 extra_data。
    
    Requirements: 6.4, 6.6
    """
    
    # Override defaults
    layer: str = Field(default="Auth", description="AOP layer")
    
    # Audit fields (will be stored in extra_data)
    action: str = Field(..., description="Action type -> extra_data")
    result: str = Field(default="SUCCESS", description="Action result -> extra_data")
    resource_type: Optional[str] = Field(None, description="Type of resource -> extra_data")
    resource_id: Optional[UUID] = Field(None, description="Resource ID -> extra_data")
    ip_address: Optional[str] = Field(None, description="IP address -> extra_data")
    user_agent: Optional[str] = Field(None, description="User agent -> extra_data")
    request_method: Optional[str] = Field(None, description="HTTP method -> extra_data")
    request_path: Optional[str] = Field(None, description="Request path -> extra_data")

    @field_validator("ip_address", mode="before")
    @classmethod
    def normalize_ip(cls, v: Optional[str]) -> Optional[str]:
        """Normalize IPv6 localhost to IPv4."""
        return BaseLogSchema._normalize_ip(v)

    @field_validator("action", mode="before")
    @classmethod
    def normalize_action(cls, v: str) -> str:
        """Normalize action to uppercase."""
        return v.upper() if v else v

    def _generate_message(self) -> str:
        """Generate message: `Audit: {action} {result}`"""
        action_desc = self.action.replace("_", " ").title()
        result_desc = "successful" if self.result == "SUCCESS" else "failed"
        return f"Audit: {action_desc} {result_desc}"

    def _build_extra_data(self) -> dict[str, Any]:
        """Build extra_data from audit fields."""
        extra: dict[str, Any] = {
            "action": self.action,
            "result": self.result,
        }
        if self.ip_address:
            extra["ip_address"] = self.ip_address
        if self.user_agent:
            extra["user_agent"] = self._truncate_user_agent(self.user_agent)
        if self.resource_type:
            extra["resource_type"] = self.resource_type
        if self.resource_id:
            extra["resource_id"] = str(self.resource_id)
        if self.request_method:
            extra["request_method"] = self.request_method
        if self.request_path:
            extra["request_path"] = self.request_path
        return extra


# =============================================================================
# Response Schemas - 用于 API 响应
# =============================================================================

class AppLogResponse(BaseModel):
    """Application log response schema (new schema).
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, request_id, user_id, duration_ms
    - 扩展字段：extra_data
    """

    id: UUID
    source: str
    level: str
    message: str
    layer: Optional[str] = None
    module: Optional[str] = None
    function: Optional[str] = None
    line_number: Optional[int] = None
    file_path: Optional[str] = None
    trace_id: Optional[str] = None
    request_id: Optional[str] = None
    user_id: Optional[UUID] = None
    duration_ms: Optional[int] = None
    extra_data: Optional[dict[str, Any]] = None
    created_at: datetime
    # Joined fields for display
    user_email: Optional[str] = None
    user_company_name: Optional[str] = None

    @field_validator("created_at", mode="before")
    @classmethod
    def ensure_timezone(cls, v):
        """Ensure datetime has UTC timezone for proper frontend parsing."""
        from datetime import timezone as tz
        if v is None:
            return v
        if isinstance(v, datetime):
            # If naive datetime, assume UTC
            if v.tzinfo is None:
                return v.replace(tzinfo=tz.utc)
        return v

    model_config = {"from_attributes": True}


class LogListQuery(BaseModel):
    """Query parameters for listing application logs."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=500)
    source: Optional[str] = None
    level: Optional[str] = None  # 支持逗号分隔的多级别，如 "ERROR,CRITICAL"
    layer: Optional[str] = None
    trace_id: Optional[str] = None
    user_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class LogListResponse(BaseModel):
    """Response schema for application log list."""

    items: list[AppLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FrontendLogCreate(BaseModel):
    """Schema for creating a frontend application log entry.
    
    前端传输原始数据，包含 timestamp。
    """

    timestamp: str = Field(..., description="Timestamp from frontend (yyyy-MM-dd HH:mm:ss.SSS)")
    level: str = Field(default="INFO")
    message: str = Field(..., description="Log message")
    layer: Optional[str] = None
    module: Optional[str] = Field(None, description="Module/file name")
    function: Optional[str] = None
    line_number: Optional[int] = Field(None, description="Line number")
    file_path: Optional[str] = Field(None, description="Full file path for debugging")
    
    # 追踪字段
    trace_id: Optional[str] = None
    request_id: Optional[str] = None
    user_id: Optional[Union[str, int]] = None
    duration_ms: Optional[int] = None
    
    # Layer 独有业务数据
    extra_data: Optional[dict[str, Any]] = None
    
    @field_validator("user_id", mode="before")
    @classmethod
    def convert_user_id_to_string(cls, v):
        """Convert user_id from number to string if needed."""
        if v is None:
            return None
        return str(v) if isinstance(v, (int, float)) else v

    def to_app_log_create(self, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> "AppLogCreate":
        """Convert to AppLogCreate for unified processing."""
        return AppLogCreate(
            source="frontend",
            level=self.level,
            message=self.message,
            layer=self.layer,
            module=self.module,
            function=self.function,
            line_number=self.line_number,
            file_path=self.file_path,
            trace_id=self.trace_id,
            request_id=self.request_id,
            user_id=UUID(self.user_id) if self.user_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            duration_ms=self.duration_ms,
            extra_data=self.extra_data,
        )


class FrontendLogBatchCreate(BaseModel):
    """Schema for creating multiple frontend log entries in a batch."""
    
    logs: list[FrontendLogCreate]
    timestamp: Optional[str] = None
    batch_size: Optional[int] = None
