"""Log formatter for structured logging."""
import json
import logging
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Unified JSON formatter for structured logging across all log types."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON with unified structure."""
        # Use local timezone with milliseconds
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

        # Start with unified base structure
        log_data = {
            "timestamp": timestamp,
            "source": getattr(record, "source", "system"),  # backend/frontend/system
            "level": record.levelname,
            "message": record.getMessage(),
        }

        # Add context fields with unified naming
        if hasattr(record, "layer") or record.module:
            log_data["layer"] = getattr(record, "layer", record.module)
        
        if record.funcName and record.funcName != "<module>":
            log_data["function"] = record.funcName
        
        if record.lineno:
            log_data["line_number"] = record.lineno

        # Add request context fields
        request_fields = [
            "trace_id",
            "request_id", 
            "user_id",
            "ip_address",
            "user_agent",
            "request_method",
            "request_path",
            "request_data",
            "response_status",
            "duration_ms",
        ]
        for field in request_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Add exception info if present
        if record.exc_info:
            log_data["stack_trace"] = self.formatException(record.exc_info)
            # Extract exception type and message
            exc_type, exc_value, exc_tb = record.exc_info
            if exc_type:
                log_data["exception_type"] = exc_type.__name__
            if exc_value:
                log_data["exception_message"] = str(exc_value)

        # Add stack trace for errors without exception info
        elif record.levelno >= logging.ERROR:
            import traceback
            log_data["stack_trace"] = "\n".join(traceback.format_stack())

        # Add system-specific fields
        system_fields = [
            "logger_name",
            "process_id", 
            "thread_name",
            "environment",
            "service",
        ]
        for field in system_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Add logger name for system logs
        if log_data["source"] == "system" and record.name:
            log_data["logger_name"] = record.name

        # Add performance-specific fields
        performance_fields = [
            "metric_name",
            "metric_value", 
            "metric_unit",
            "component_name",
            "threshold",
            "performance_issue",
            "web_vitals",
        ]
        for field in performance_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Add audit-specific fields
        audit_fields = [
            "action",
            "resource_type",
            "resource_id",
        ]
        for field in audit_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Add any remaining custom extra fields
        if hasattr(record, "__dict__"):
            excluded_fields = [
                "name", "msg", "args", "created", "filename", "funcName", 
                "levelname", "levelno", "lineno", "module", "msecs", "message",
                "pathname", "process", "processName", "relativeCreated", 
                "thread", "threadName", "exc_info", "exc_text", "stack_info"
            ] + request_fields + system_fields + performance_fields + audit_fields + ["source", "layer"]
            
            for key, value in record.__dict__.items():
                if key not in excluded_fields and not key.startswith("_") and value is not None:
                    # Add to extra_data to avoid field conflicts
                    if "extra_data" not in log_data:
                        log_data["extra_data"] = {}
                    log_data["extra_data"][key] = value

        return json.dumps(log_data, ensure_ascii=False, default=str)


def create_unified_log_entry(
    level: str,
    message: str,
    source: str = "backend",
    layer: str = None,
    function: str = None,
    line_number: int = None,
    trace_id: str = None,
    request_id: str = None,
    user_id: str = None,
    ip_address: str = None,
    user_agent: str = None,
    request_method: str = None,
    request_path: str = None,
    request_data: dict = None,
    response_status: int = None,
    duration_ms: float = None,
    exception_type: str = None,
    exception_message: str = None,
    stack_trace: str = None,
    extra_data: dict = None,
) -> str:
    """
    Create a unified log entry as JSON string.
    
    This function provides a consistent way to format log entries
    across all log types (app, system, error, audit, performance).
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    
    log_data = {
        "timestamp": timestamp,
        "source": source,
        "level": level.upper(),
        "message": message,
    }
    
    # Add optional fields (exclude None values)
    optional_fields = {
        "layer": layer,
        "function": function,
        "line_number": line_number,
        "trace_id": trace_id,
        "request_id": request_id,
        "user_id": user_id,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "request_method": request_method,
        "request_path": request_path,
        "request_data": request_data,
        "response_status": response_status,
        "duration_ms": duration_ms,
        "exception_type": exception_type,
        "exception_message": exception_message,
        "stack_trace": stack_trace,
        "extra_data": extra_data,
    }
    
    for key, value in optional_fields.items():
        if value is not None:
            log_data[key] = value
    
    return json.dumps(log_data, ensure_ascii=False, default=str)

