"""
Logging schemas.

Pydantic models for application log API requests and responses.
All log creation schemas include to_db_dict() and to_file_dict() methods
for consistent data conversion between database and file writers.
"""
from datetime import datetime
from typing import Optional, Any, Union
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator

from ...utils.formatters import now_utc, now_est


def format_timestamp_db() -> str:
    """Format timestamp in ISO format with UTC timezone for database storage."""
    return now_utc().isoformat()


def format_timestamp_file() -> str:
    """Format timestamp in Ottawa time (EST) for file logging."""
    return now_est().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


# =============================================================================
# Log Creation Schemas - 用于创建日志对象
# =============================================================================

class AppLogCreate(BaseModel):
    """Schema for creating an application log entry.
    
    按日志规范：
    - 通用字段（9个）：timestamp, source, level, message, layer, module, function, line_number, file_path
    - 追踪字段（4个）：trace_id, request_id, user_id, duration_ms
    - 扩展字段：extra_data（包含 ip_address, user_agent, request_method, request_path, response_status 等）
    """
    
    # Timestamp (optional - frontend provides, backend generates if not provided)
    timestamp: Optional[str] = Field(None, description="Timestamp (frontend provides, backend generates if not provided)")
    
    # Common fields (9)
    source: str = Field(default="backend", description="Source of the log (backend/frontend)")
    level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)")
    message: str = Field(..., description="Log message")
    layer: Optional[str] = Field(None, description="AOP layer (Service, Router, Auth, Database, etc.)")
    module: Optional[str] = Field(None, description="Module name/path")
    function: Optional[str] = Field(None, description="Function name")
    line_number: Optional[int] = Field(None, description="Line number")
    file_path: Optional[str] = Field(None, description="Full file path for debugging")
    
    # Trace fields (4)
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    request_id: Optional[str] = Field(None, description="Request ID")
    user_id: Optional[UUID] = Field(None, description="User ID")
    duration_ms: Optional[int] = Field(None, description="Duration in milliseconds")
    
    # Fields that go into extra_data (for backward compatibility, accepted but stored in extra_data)
    ip_address: Optional[str] = Field(None, description="IP address -> extra_data")
    user_agent: Optional[str] = Field(None, description="User agent -> extra_data")
    request_method: Optional[str] = Field(None, description="HTTP method -> extra_data")
    request_path: Optional[str] = Field(None, description="Request path -> extra_data")
    response_status: Optional[int] = Field(None, description="HTTP response status -> extra_data")
    
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

    @field_validator("ip_address", mode="before")
    @classmethod
    def normalize_ip(cls, v: Optional[str]) -> Optional[str]:
        """Normalize IPv6 localhost to IPv4."""
        if v == "::1":
            return "127.0.0.1"
        return v

    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion (new schema)."""
        # Build extra_data from HTTP context fields
        extra = dict(self.extra_data) if self.extra_data else {}
        if self.ip_address:
            extra["ip_address"] = self.ip_address
        if self.user_agent:
            extra["user_agent"] = self.user_agent[:200] if len(self.user_agent) > 200 else self.user_agent
        if self.request_method:
            extra["request_method"] = self.request_method
        if self.request_path:
            extra["request_path"] = self.request_path
        if self.response_status:
            extra["response_status"] = self.response_status
        
        data = {
            "id": str(uuid4()),
            "source": self.source,
            "level": self.level,
            "message": self.message,
            "layer": self.layer,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
            "trace_id": self.trace_id,
            "request_id": self.request_id,
            "user_id": str(self.user_id) if self.user_id else None,
            "duration_ms": self.duration_ms,
            "extra_data": extra if extra else None,
        }
        return {k: v for k, v in data.items() if v is not None}

    def to_file_dict(self) -> dict:
        """Convert to dictionary for file logging.
        
        按规范格式输出：
        - 通用字段（8个）：timestamp, source, level, message, layer, module, function, line_number
        - 追踪字段（4个）：trace_id, request_id, user_id, duration_ms
        - 扩展字段：extra_data（包含 Layer 独有业务数据）
        """
        # 构建 extra_data（合并 HTTP 字段和原有 extra_data）
        extra = {}
        if self.ip_address:
            extra["ip_address"] = self.ip_address
        if self.user_agent:
            extra["user_agent"] = self.user_agent[:100] if self.user_agent else None
        if self.request_method:
            extra["request_method"] = self.request_method
        if self.request_path:
            extra["request_path"] = self.request_path
        if self.response_status:
            extra["response_status"] = self.response_status
        if self.extra_data:
            extra.update(self.extra_data)
        
        result = {
            # 通用字段（使用前端 timestamp 或后端生成）
            "timestamp": self.timestamp if self.timestamp else format_timestamp_file(),
            "source": self.source,
            "level": self.level,
            "message": self.message,
            "layer": self.layer,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
        }
        
        # 追踪字段（只在有值时添加）
        if self.trace_id:
            result["trace_id"] = self.trace_id
        if self.request_id:
            result["request_id"] = self.request_id
        if self.user_id:
            result["user_id"] = str(self.user_id)
        if self.duration_ms is not None:
            result["duration_ms"] = self.duration_ms
        
        # 扩展字段
        if extra:
            result["extra_data"] = extra
        
        return result

    class Config:
        from_attributes = True


class ErrorLogCreate(BaseModel):
    """Schema for creating an error log entry.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, request_id, user_id
    - 扩展字段：extra_data (包含 error_type, error_message, stack_trace, error_code, status_code, request_method, request_path, ip_address)
    """
    
    # Common fields
    source: str = Field(default="backend", description="Source of the error (backend/frontend)")
    level: str = Field(default="ERROR", description="Log level")
    layer: str = Field(default="Router", description="AOP layer")
    module: str = Field(default="", description="Module path relative to project root")
    function: str = Field(default="", description="Function name")
    line_number: int = Field(default=0, description="Line number")
    file_path: Optional[str] = Field(None, description="Full file path for debugging")
    
    # Error info (will be stored in extra_data)
    error_type: str = Field(..., description="Exception class name -> extra_data")
    error_message: str = Field(..., description="Exception message -> extra_data")
    error_code: Optional[str] = Field(None, description="Application error code -> extra_data")
    status_code: Optional[int] = Field(None, description="HTTP status code -> extra_data")
    stack_trace: Optional[str] = Field(None, description="Full stack trace -> extra_data")
    
    # Trace fields
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    request_id: Optional[str] = Field(None, description="Request ID")
    user_id: Optional[UUID] = Field(None, description="User ID")
    
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
        if v == "::1":
            return "127.0.0.1"
        return v

    def _generate_message(self) -> str:
        """Generate message according to log specification.
        
        规范格式: `{error_type}: {error_message}`
        """
        return f"{self.error_type}: {self.error_message}"

    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion (new schema)."""
        # Build extra_data from error and HTTP context fields
        extra: dict[str, Any] = {}
        extra["error_type"] = self.error_type
        extra["error_message"] = self.error_message
        if self.stack_trace:
            extra["stack_trace"] = self.stack_trace
        if self.error_code:
            extra["error_code"] = self.error_code
        if self.status_code:
            extra["status_code"] = self.status_code
        if self.ip_address:
            extra["ip_address"] = self.ip_address
        if self.user_agent:
            extra["user_agent"] = self.user_agent[:200] if len(self.user_agent) > 200 else self.user_agent
        if self.request_method:
            extra["request_method"] = self.request_method
        if self.request_path:
            extra["request_path"] = self.request_path
        if self.error_details:
            extra.update(self.error_details)
        if self.context_data:
            extra.update(self.context_data)
        
        data = {
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
            "extra_data": extra,
        }
        return {k: v for k, v in data.items() if v is not None}

    def to_file_dict(self) -> dict:
        """Convert to dictionary for file logging.
        
        按照日志规范输出:
        - timestamp, source, level, message, layer, module, function, line_number, file_path (必需)
        - trace_id, request_id, user_id (追踪字段，按需)
        - extra_data: error_type, error_message, stack_trace (Error 层独有)
        """
        # Build extra_data according to spec
        error_extra_data: dict[str, Any] = {
            "error_type": self.error_type,
            "error_message": self.error_message,
        }
        if self.stack_trace:
            error_extra_data["stack_trace"] = self.stack_trace
        if self.error_code:
            error_extra_data["error_code"] = self.error_code
        if self.status_code:
            error_extra_data["status_code"] = self.status_code
        if self.request_method:
            error_extra_data["request_method"] = self.request_method
        if self.request_path:
            error_extra_data["request_path"] = self.request_path
        if self.ip_address:
            error_extra_data["ip_address"] = self.ip_address
        if self.error_details:
            error_extra_data.update(self.error_details)
        
        result: dict[str, Any] = {
            "timestamp": format_timestamp_file(),
            "source": self.source,
            "level": self.level,
            "message": self._generate_message(),
            "layer": self.layer,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
        }
        
        # Add trace fields only if present
        if self.trace_id:
            result["trace_id"] = self.trace_id
        if self.request_id:
            result["request_id"] = self.request_id
        if self.user_id:
            result["user_id"] = str(self.user_id)
        
        result["extra_data"] = error_extra_data
        return result

    class Config:
        from_attributes = True


class PerformanceLogCreate(BaseModel):
    """Schema for creating a performance log entry.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, request_id, user_id, duration_ms
    - 扩展字段：extra_data (包含 metric_name, metric_value, metric_unit, threshold_ms, is_slow, component_name, web_vitals)
    """
    
    # Common fields
    source: str = Field(default="backend", description="Source (backend/frontend)")
    level: str = Field(default="INFO", description="Log level")
    layer: str = Field(default="Performance", description="AOP layer")
    module: str = Field(default="", description="Module path relative to project root")
    function: str = Field(default="", description="Function name")
    line_number: int = Field(default=0, description="Line number")
    file_path: Optional[str] = Field(None, description="Full file path for debugging")
    
    # Trace fields
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    request_id: Optional[str] = Field(None, description="Request ID")
    user_id: Optional[UUID] = Field(None, description="User ID")
    duration_ms: Optional[float] = Field(None, description="Duration in milliseconds")
    
    # Performance fields (will be stored in extra_data)
    metric_name: str = Field(..., description="Performance metric name -> extra_data")
    metric_value: float = Field(..., description="Metric value -> extra_data")
    metric_unit: str = Field(default="ms", description="Metric unit -> extra_data")
    component_name: Optional[str] = Field(None, description="Component being measured -> extra_data")
    threshold_ms: Optional[float] = Field(None, description="Performance threshold in ms -> extra_data")
    is_slow: bool = Field(default=False, description="Whether threshold was exceeded -> extra_data")
    web_vitals: Optional[dict[str, Any]] = Field(None, description="Web Vitals metrics -> extra_data")
    
    # Extra data
    extra_data: Optional[dict[str, Any]] = Field(None, description="Additional context data")

    def _generate_message(self) -> str:
        """Generate message according to log specification.
        
        规范格式: `Slow {type}: {target} ({duration}ms > {threshold}ms)`
        """
        target = self.component_name or self.metric_name
        duration = self.duration_ms if self.duration_ms is not None else self.metric_value
        
        if self.is_slow and self.threshold_ms:
            return f"Slow {self.metric_name}: {target} ({duration:.0f}ms > {self.threshold_ms:.0f}ms)"
        else:
            return f"Perf: {self.metric_name} = {self.metric_value}{self.metric_unit}"

    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion (new schema)."""
        # Build extra_data from performance fields
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
        
        data = {
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
            "extra_data": extra,
        }
        return {k: v for k, v in data.items() if v is not None}

    def to_file_dict(self) -> dict:
        """Convert to dictionary for file logging.
        
        按照日志规范输出:
        - timestamp, source, level, message, layer, module, function, line_number, file_path (必需)
        - trace_id, request_id, user_id, duration_ms (追踪字段，按需)
        - extra_data: threshold_ms, is_slow (Performance 层独有)
        """
        # Build extra_data according to spec
        perf_extra_data: dict[str, Any] = {
            "metric_name": self.metric_name,
            "metric_value": self.metric_value,
            "metric_unit": self.metric_unit,
        }
        if self.threshold_ms is not None:
            perf_extra_data["threshold_ms"] = self.threshold_ms
        perf_extra_data["is_slow"] = self.is_slow
        if self.component_name:
            perf_extra_data["component_name"] = self.component_name
        if self.web_vitals:
            perf_extra_data["web_vitals"] = self.web_vitals
        if self.extra_data:
            perf_extra_data.update(self.extra_data)
        
        result: dict[str, Any] = {
            "timestamp": format_timestamp_file(),
            "source": self.source,
            "level": self.level,
            "message": self._generate_message(),
            "layer": self.layer,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
        }
        
        # Add trace fields only if present
        if self.trace_id:
            result["trace_id"] = self.trace_id
        if self.request_id:
            result["request_id"] = self.request_id
        if self.user_id:
            result["user_id"] = str(self.user_id)
        if self.duration_ms is not None:
            result["duration_ms"] = self.duration_ms
        
        result["extra_data"] = perf_extra_data
        return result

    class Config:
        from_attributes = True


class SystemLogCreate(BaseModel):
    """Schema for creating a system log entry.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 扩展字段：extra_data (包含 server, host, port, workers, logger_name)
    """
    
    # Common fields
    source: str = Field(default="backend", description="Source (backend)")
    level: str = Field(default="INFO", description="Log level")
    message: str = Field(..., description="Log message")
    layer: str = Field(default="System", description="AOP layer")
    module: str = Field(default="", description="Module name")
    function: str = Field(default="", description="Function name")
    line_number: int = Field(default=0, description="Line number")
    file_path: Optional[str] = Field(None, description="Full file path for debugging")
    
    # Legacy field (will be stored in extra_data)
    logger_name: Optional[str] = Field(None, description="Logger name -> extra_data")
    
    # Extra data
    extra_data: Optional[dict[str, Any]] = Field(None, description="Additional system data")

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        """Validate and normalize log level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper_v = v.upper()
        if upper_v not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return upper_v

    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion (new schema)."""
        # Build extra_data - merge provided extra_data with logger_name
        extra = dict(self.extra_data) if self.extra_data else {}
        if self.logger_name and self.logger_name != self.module:
            # Only add logger_name if different from module
            extra["logger_name"] = self.logger_name
        
        data = {
            "id": str(uuid4()),
            "source": self.source,
            "level": self.level,
            "message": self.message,
            "layer": self.layer,
            "file_path": self.file_path,
        }
        
        # Add optional fields only if they have meaningful values
        if self.module:
            data["module"] = self.module
        elif self.logger_name:
            data["module"] = self.logger_name
        
        if self.function:
            data["function"] = self.function
        
        if self.line_number and self.line_number > 0:
            data["line_number"] = self.line_number
        
        if extra:
            data["extra_data"] = extra
        
        return data

    def to_file_dict(self) -> dict:
        """Convert to dictionary for file logging.
        
        按照日志规范输出:
        - timestamp, source, level, message, layer, module, function, line_number, file_path (必需)
        - extra_data: server, host, port, workers (System 层独有)
        """
        result: dict[str, Any] = {
            "timestamp": format_timestamp_file(),
            "source": self.source,
            "level": self.level,
            "message": self.message,
            "layer": self.layer,
            "module": self.module or self.logger_name or "",
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
        }
        
        if self.extra_data:
            result["extra_data"] = self.extra_data
        
        return result

    class Config:
        from_attributes = True


class AuditLogCreate(BaseModel):
    """Schema for creating an audit log entry.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, user_id
    - 扩展字段：extra_data (包含 action, result, ip_address, user_agent, resource_type, resource_id)
    """
    
    # Common fields
    source: str = Field(default="backend", description="Source (backend)")
    level: str = Field(default="INFO", description="Log level")
    layer: str = Field(default="Auth", description="AOP layer")
    module: str = Field(default="", description="Module path relative to project root")
    function: str = Field(default="", description="Function name")
    line_number: int = Field(default=0, description="Line number")
    file_path: Optional[str] = Field(None, description="Full file path for debugging")
    
    # Trace fields
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    user_id: Optional[UUID] = Field(None, description="User ID who performed the action")
    
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
        if v == "::1":
            return "127.0.0.1"
        return v

    @field_validator("action", mode="before")
    @classmethod
    def normalize_action(cls, v: str) -> str:
        """Normalize action to uppercase."""
        return v.upper() if v else v

    def _generate_message(self) -> str:
        """Generate message according to log specification.
        
        规范格式: `Audit: {action} {result}`
        """
        action_desc = self.action.replace("_", " ").title()
        result_desc = "successful" if self.result == "SUCCESS" else "failed"
        return f"Audit: {action_desc} {result_desc}"

    def to_db_dict(self) -> dict:
        """Convert to dictionary for database insertion (new schema)."""
        # Build extra_data from audit fields
        extra: dict[str, Any] = {
            "action": self.action,
            "result": self.result,
        }
        if self.ip_address:
            extra["ip_address"] = self.ip_address
        if self.user_agent:
            extra["user_agent"] = self.user_agent[:200] if len(self.user_agent) > 200 else self.user_agent
        if self.resource_type:
            extra["resource_type"] = self.resource_type
        if self.resource_id:
            extra["resource_id"] = str(self.resource_id)
        if self.request_method:
            extra["request_method"] = self.request_method
        if self.request_path:
            extra["request_path"] = self.request_path
        
        data = {
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
            "user_id": str(self.user_id) if self.user_id else None,
            "extra_data": extra,
        }
        return {k: v for k, v in data.items() if v is not None}

    def to_file_dict(self) -> dict:
        """Convert to dictionary for file logging.
        
        按照日志规范输出:
        - timestamp, source, level, message, layer, module, function, line_number, file_path (必需)
        - trace_id, user_id (追踪字段，按需)
        - extra_data: action, result, ip_address, user_agent (Audit 层独有)
        """
        # Build extra_data according to spec
        audit_extra_data: dict[str, Any] = {
            "action": self.action,
            "result": self.result,
        }
        if self.ip_address:
            audit_extra_data["ip_address"] = self.ip_address
        if self.user_agent:
            audit_extra_data["user_agent"] = self.user_agent
        if self.resource_type:
            audit_extra_data["resource_type"] = self.resource_type
        if self.resource_id:
            audit_extra_data["resource_id"] = str(self.resource_id)
        
        result: dict[str, Any] = {
            "timestamp": format_timestamp_file(),
            "source": self.source,
            "level": self.level,
            "message": self._generate_message(),
            "layer": self.layer,
            "module": self.module,
            "function": self.function,
            "line_number": self.line_number,
            "file_path": self.file_path,
        }
        
        # Add trace fields only if present
        if self.trace_id:
            result["trace_id"] = self.trace_id
        if self.user_id:
            result["user_id"] = str(self.user_id)
        
        result["extra_data"] = audit_extra_data
        return result

    class Config:
        from_attributes = True


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
