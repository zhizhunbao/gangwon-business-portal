"""Log formatter for structured logging."""
import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from ...utils.formatters import now_est


def format_timestamp() -> str:
    """格式化为渥太华时间 (EST UTC-5)，用于文件日志"""
    return now_est().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


class JSONFormatter(logging.Formatter):
    """Unified JSON formatter for structured logging across all log types."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON with unified structure."""
        timestamp = format_timestamp()

        log_data = {
            "timestamp": timestamp,
            "source": getattr(record, "source", "system"),
            "level": record.levelname,
            "message": record.getMessage(),
        }

        if hasattr(record, "layer") or record.module:
            log_data["layer"] = getattr(record, "layer", record.module)
        
        if record.funcName and record.funcName != "<module>":
            log_data["function"] = record.funcName
        
        if record.lineno:
            log_data["line_number"] = record.lineno
        
        if record.pathname:
            log_data["file_path"] = record.pathname

        # Request context fields
        context_fields = [
            "trace_id", "request_id", "user_id", "ip_address", "user_agent",
            "request_method", "request_path", "request_data", "response_status", "duration_ms",
        ]
        for field in context_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Exception info
        if record.exc_info:
            log_data["stack_trace"] = self.formatException(record.exc_info)
            exc_type, exc_value, _ = record.exc_info
            if exc_type:
                log_data["exception_type"] = exc_type.__name__
            if exc_value:
                log_data["exception_message"] = str(exc_value)

        # System log fields
        if log_data["source"] == "system":
            if record.name:
                log_data["logger_name"] = record.name
            if hasattr(record, "process") and record.process:
                log_data["process_id"] = record.process
            if hasattr(record, "threadName") and record.threadName:
                log_data["thread_name"] = record.threadName

        # Performance fields
        perf_fields = ["metric_name", "metric_value", "metric_unit", "component_name", "threshold", "web_vitals"]
        for field in perf_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Audit fields
        audit_fields = ["action", "resource_type", "resource_id"]
        for field in audit_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Extra fields -> extra_data
        excluded = {
            "name", "msg", "args", "created", "filename", "funcName", 
            "levelname", "levelno", "lineno", "module", "msecs", "message",
            "pathname", "process", "processName", "relativeCreated", 
            "thread", "threadName", "exc_info", "exc_text", "stack_info",
            "source", "layer"
        } | set(context_fields) | set(perf_fields) | set(audit_fields)
        
        for key, value in record.__dict__.items():
            if key not in excluded and not key.startswith("_") and value is not None:
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
    extra_data: dict = None,
    **kwargs,
) -> str:
    """Create a unified log entry as JSON string for file logging."""
    log_data = {
        "timestamp": format_timestamp(),
        "source": source,
        "level": level.upper(),
        "message": message,
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
        "extra_data": extra_data,
    }
    
    return json.dumps(log_data, ensure_ascii=False, default=str)
