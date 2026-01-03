"""Custom log handlers."""
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any

from ..config import settings


def create_console_handler(
    formatter: logging.Formatter,
    level: int = logging.INFO,
) -> logging.StreamHandler:
    """Create a console log handler.

    Args:
        formatter: Log formatter to use
        level: Log level for the handler

    Returns:
        Configured console handler
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(formatter)
    return handler


def create_file_handler(
    log_file: str,
    formatter: logging.Formatter,
    level: int = logging.INFO,
    max_bytes: int = 10485760,  # 10MB
    backup_count: int = 5,
) -> RotatingFileHandler:
    """Create a rotating file log handler.

    Args:
        log_file: Path to log file
        formatter: Log formatter to use
        level: Log level for the handler
        max_bytes: Maximum size of log file before rotation
        backup_count: Number of backup files to keep

    Returns:
        Configured file handler
    """
    # Ensure log directory exists
    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    handler = RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(formatter)
    return handler


class DatabaseSystemLogHandler(logging.Handler):
    """Custom logging handler that writes system logs to database.
    
    Uses SystemLogCreate schema for consistent formatting with file output.
    """
    
    def __init__(self, level=logging.NOTSET):
        """Initialize database system log handler."""
        super().__init__(level)
        self._enabled = getattr(settings, "LOG_DB_ENABLED", True)
        self._min_level = getattr(settings, "LOG_DB_SYSTEM_MIN_LEVEL", "INFO")
        
        self.log_levels = {
            "DEBUG": 0,
            "INFO": 1,
            "WARNING": 2,
            "ERROR": 3,
            "CRITICAL": 4,
        }
        
    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record to database using SystemLogCreate schema."""
        if not self._enabled:
            return
        
        log_priority = self.log_levels.get(record.levelname, 0)
        min_priority = self.log_levels.get(self._min_level.upper(), 0)
        if log_priority < min_priority:
            return
        
        try:
            from .config import SystemLogFormatter
            from .db_writer import db_log_writer
            
            # Use SystemLogFormatter's helper methods for consistent formatting
            formatter = SystemLogFormatter()
            
            # Build module path (without file name)
            module_path = formatter._get_module_path(record)
            
            # Extract function name
            func_name = ""
            if record.funcName and record.funcName != "<module>":
                func_name = record.funcName
            
            # Extract line number
            line_num = record.lineno if record.lineno and record.lineno > 0 else 0
            
            # Extract file path
            file_path = ""
            if hasattr(record, "pathname") and record.pathname:
                pathname = record.pathname.replace("\\", "/")
                if "/backend/src/" in pathname:
                    file_path = "src/" + pathname.split("/backend/src/")[-1]
                elif "/src/" in pathname:
                    file_path = "src/" + pathname.split("/src/")[-1]
            
            # Build extra_data
            extra_data = {"server": "uvicorn"}
            msg = record.getMessage()
            if "running on" in msg.lower() or "started" in msg.lower():
                if "http://" in msg:
                    try:
                        url_part = msg.split("http://")[1].split()[0].rstrip("()")
                        if ":" in url_part:
                            host, port = url_part.rsplit(":", 1)
                            extra_data["host"] = host
                            extra_data["port"] = int(port)
                    except (IndexError, ValueError):
                        pass
                extra_data["workers"] = 1
            
            # Build message using formatter's method
            message = formatter._build_message(record)
            
            # Write to database
            db_log_writer.write_system_log(
                level=record.levelname,
                message=message,
                logger_name=record.name,
                module=module_path,
                function=func_name,
                line_number=line_num,
                file_path=file_path,
                extra_data=extra_data,
            )
            
        except Exception:
            pass





























