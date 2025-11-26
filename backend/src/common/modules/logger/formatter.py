"""Log formatter for structured logging."""
import json
import logging
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Use UTC timezone with explicit timezone info
        timestamp = datetime.now(timezone.utc).isoformat()

        log_data = {
            "timestamp": timestamp,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add stack trace for errors
        if record.levelno >= logging.ERROR and record.exc_info is None:
            import traceback
            log_data["stack_trace"] = traceback.format_stack()

        # Add extra fields (request context, user info, etc.)
        extra_fields = [
            "request_id",
            "user_id",
            "ip_address",
            "user_agent",
            "environment",
            "service",
            "trace_id",
        ]
        for field in extra_fields:
            if hasattr(record, field):
                value = getattr(record, field)
                if value is not None:
                    log_data[field] = value

        # Add any custom extra fields
        if hasattr(record, "__dict__"):
            for key, value in record.__dict__.items():
                if key not in [
                    "name",
                    "msg",
                    "args",
                    "created",
                    "filename",
                    "funcName",
                    "levelname",
                    "levelno",
                    "lineno",
                    "module",
                    "msecs",
                    "message",
                    "pathname",
                    "process",
                    "processName",
                    "relativeCreated",
                    "thread",
                    "threadName",
                    "exc_info",
                    "exc_text",
                    "stack_info",
                ] + extra_fields:
                    if not key.startswith("_"):
                        log_data[key] = value

        return json.dumps(log_data, ensure_ascii=False, default=str)

