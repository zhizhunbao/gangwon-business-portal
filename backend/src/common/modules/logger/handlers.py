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
    
    This handler writes logs from Python's standard logging module
    (system.log) to the system_logs table in Supabase.
    """
    
    def __init__(self, level=logging.NOTSET):
        """Initialize database system log handler."""
        super().__init__(level)
        self._enabled = getattr(settings, "LOG_DB_ENABLED", True)
        # System logs: INFO and above (consistent with system.log file)
        self._min_level = getattr(settings, "LOG_DB_SYSTEM_MIN_LEVEL", "INFO")
        
        # Log level priority (higher = more important)
        self.log_levels = {
            "DEBUG": 0,
            "INFO": 1,
            "WARNING": 2,
            "ERROR": 3,
            "CRITICAL": 4,
        }
        
    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record to database.
        
        Args:
            record: Log record to emit
        """
        if not self._enabled:
            return
        
        # Check if log level should be written to database
        log_priority = self.log_levels.get(record.levelname, 0)
        min_priority = self.log_levels.get(self._min_level.upper(), 0)
        if log_priority < min_priority:
            return
        
        try:
            from ..logger.db_writer import db_log_writer
            
            # Extract module path - convert to relative path or use logger name
            module_path = self._get_module_path(record)
            
            # Extract function name
            func_name = None
            if hasattr(record, "funcName") and record.funcName and record.funcName != "<module>":
                func_name = record.funcName
            
            # Extract line number
            line_num = None
            if hasattr(record, "lineno") and record.lineno and record.lineno > 0:
                line_num = record.lineno
            
            # Build extra_data (same as SystemLogFormatter)
            extra_data = {
                "server": "uvicorn",
            }
            
            # Parse uvicorn startup messages for extra_data
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
            
            # Extract file path
            file_path = None
            if hasattr(record, "pathname") and record.pathname:
                pathname = record.pathname.replace("\\", "/")
                if "/backend/src/" in pathname:
                    file_path = "src/" + pathname.split("/backend/src/")[-1]
                elif "/src/" in pathname:
                    file_path = "src/" + pathname.split("/src/")[-1]
            
            # Write to system_logs table using unified db_log_writer
            # Use getMessage() for raw message, not format() which returns JSON
            db_log_writer.write_system_log(
                level=record.levelname,
                message=record.getMessage(),
                logger_name=record.name,
                module=module_path,
                function=func_name,
                line_number=line_num,
                file_path=file_path,
                extra_data=extra_data,
            )
            
        except Exception:
            # Don't fail if database write fails (graceful degradation)
            # Don't log here to avoid infinite recursion
            pass
    
    def _get_module_path(self, record: logging.LogRecord) -> str:
        """Get module path from record, converting to relative path format.
        
        优先使用 logger 名称（如 src.modules.member.router），
        因为它反映了实际调用模块。
        """
        # 优先使用 logger 名称
        if record.name and record.name != "root":
            name = record.name
            # 确保有 src. 前缀
            if not name.startswith("src.") and not name.startswith("uvicorn") and not name.startswith("sqlalchemy"):
                name = "src." + name
            return name
        
        # Fallback: 从 pathname 提取相对路径
        if hasattr(record, "pathname") and record.pathname:
            pathname = record.pathname.replace("\\", "/")
            # 查找 backend/src 或 src 开头的路径
            if "/backend/src/" in pathname:
                return "src." + pathname.split("/backend/src/")[-1].replace("/", ".").replace(".py", "")
            elif "/src/" in pathname:
                return "src." + pathname.split("/src/")[-1].replace("/", ".").replace(".py", "")
            # 第三方包（site-packages）
            if "site-packages/" in pathname:
                parts = pathname.split("site-packages/")
                if len(parts) > 1:
                    return parts[1].replace("/", ".").replace(".py", "")
        
        return record.name or "unknown"





























