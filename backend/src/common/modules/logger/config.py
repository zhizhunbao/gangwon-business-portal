"""Logging configuration and setup."""
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from ..config import settings
from .filters import SensitiveDataFilter, ContextFilter
from .formatter import JSONFormatter
from .handlers import create_file_handler, DatabaseSystemLogHandler, create_console_handler


# =============================================================================
# LogConfig - 统一日志配置类
# =============================================================================

@dataclass
class LogConfig:
    """Unified log configuration class.
    
    Centralizes all log-related configuration with environment-based defaults.
    
    Attributes:
        # Log level configuration (per log type)
        level_app: Minimum level for app.log
        level_error: Minimum level for error.log
        level_audit: Minimum level for audit.log
        level_performance: Minimum level for performance.log
        level_system: Minimum level for system.log
        
        # Batch settings (for database writer)
        batch_size: Number of logs to batch before writing
        batch_interval: Seconds to wait before flushing batch
        
        # Queue settings
        max_queue_size: Maximum queue size before dropping logs
        
        # Feature flags
        db_enabled: Whether database logging is enabled
        file_enabled: Whether file logging is enabled
        
    Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
    """
    
    # Log level configuration (per log type)
    level_app: str = "INFO"
    level_error: str = "INFO"
    level_audit: str = "INFO"
    level_performance: str = "INFO"
    level_system: str = "INFO"
    
    # Database log level configuration
    db_level_app: str = "INFO"
    db_level_system: str = "INFO"
    
    # Batch settings (for database writer)
    batch_size: int = 50
    batch_interval: float = 5.0
    
    # Queue settings
    max_queue_size: int = 10000
    
    # Feature flags
    db_enabled: bool = True
    file_enabled: bool = True
    
    # Sensitive fields to mask
    sensitive_fields: List[str] = field(default_factory=lambda: [
        "password", "token", "secret", "api_key", "authorization"
    ])
    
    @classmethod
    def from_settings(cls) -> "LogConfig":
        """Create LogConfig from application settings.
        
        Reads configuration from environment variables via settings module.
        Applies environment-based defaults (DEBUG mode vs production).
        
        Returns:
            LogConfig instance with values from settings
        """
        is_debug = getattr(settings, "DEBUG", False)
        
        # Environment-based defaults
        # Production: INFO for app/audit/error, WARNING for system/performance
        # Development: DEBUG for app/audit/error, INFO for system/performance
        default_app_level = "DEBUG" if is_debug else "INFO"
        default_system_level = "INFO" if is_debug else "WARNING"
        
        return cls(
            # File log levels
            level_app=getattr(settings, "LOG_LEVEL_APP", None) or default_app_level,
            level_error=getattr(settings, "LOG_LEVEL_ERROR", None) or default_app_level,
            level_audit=getattr(settings, "LOG_LEVEL_AUDIT", None) or default_app_level,
            level_performance=getattr(settings, "LOG_LEVEL_PERFORMANCE", None) or default_system_level,
            level_system=getattr(settings, "LOG_LEVEL_SYSTEM", None) or default_system_level,
            
            # Database log levels
            db_level_app=getattr(settings, "LOG_DB_APP_MIN_LEVEL", "INFO"),
            db_level_system=getattr(settings, "LOG_DB_SYSTEM_MIN_LEVEL", "INFO"),
            
            # Batch settings
            batch_size=getattr(settings, "LOG_DB_BATCH_SIZE", 50),
            batch_interval=getattr(settings, "LOG_DB_BATCH_INTERVAL", 5.0),
            
            # Queue settings
            max_queue_size=10000,  # Fixed default, not in settings
            
            # Feature flags
            db_enabled=getattr(settings, "LOG_DB_ENABLED", True),
            file_enabled=getattr(settings, "LOG_ENABLE_FILE", True),
            
            # Sensitive fields
            sensitive_fields=getattr(settings, "LOG_SENSITIVE_FIELDS", [
                "password", "token", "secret", "api_key", "authorization"
            ]),
        )
    
    def get_level_for_type(self, log_type: str) -> str:
        """Get the file log level for a given log type.
        
        Args:
            log_type: Type of log (app, error, audit, performance, system)
            
        Returns:
            Log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        return {
            "app": self.level_app,
            "error": self.level_error,
            "audit": self.level_audit,
            "performance": self.level_performance,
            "system": self.level_system,
        }.get(log_type, "INFO")
    
    def get_db_level_for_type(self, log_type: str) -> str:
        """Get the database log level for a given log type.
        
        Args:
            log_type: Type of log (app, error, audit, performance, system)
            
        Returns:
            Log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        return {
            "app": self.db_level_app,
            "system": self.db_level_system,
            # Error, audit, performance don't have level filtering in DB
            "error": "DEBUG",
            "audit": "DEBUG",
            "performance": "DEBUG",
        }.get(log_type, "INFO")


# Global config instance (lazy initialization)
_log_config: Optional[LogConfig] = None


def get_log_config() -> LogConfig:
    """Get the global LogConfig instance.
    
    Creates the instance on first call (lazy initialization).
    
    Returns:
        LogConfig instance
    """
    global _log_config
    if _log_config is None:
        _log_config = LogConfig.from_settings()
    return _log_config


# =============================================================================
# Helper functions
# =============================================================================

def get_log_level(level_name: str) -> int:
    """Convert log level name to logging constant.

    Args:
        level_name: Log level name (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Logging level constant
    """
    level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    return level_map.get(level_name.upper(), logging.INFO)


class SystemLogFormatter(logging.Formatter):
    """Formatter for system.log that follows LOGS_GUIDELINES.md specification.
    
    Uses SystemLogCreate schema for consistent formatting with database output.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON using SystemLogCreate schema."""
        from .schemas import SystemLogCreate
        
        # Build module path
        module_path = self._get_module_path(record) or ""
        
        # Extract function name
        func_name = ""
        if record.funcName and record.funcName != "<module>":
            func_name = record.funcName
        
        # Extract line number
        line_num = record.lineno if record.lineno and record.lineno > 0 else 0
        
        # Build extra_data
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
        
        # Extract file path from pathname
        file_path = ""
        if hasattr(record, "pathname") and record.pathname:
            pathname = record.pathname.replace("\\", "/")
            if "/backend/src/" in pathname:
                file_path = "src/" + pathname.split("/backend/src/")[-1]
            elif "/src/" in pathname:
                file_path = "src/" + pathname.split("/src/")[-1]
        
        # Create schema and use to_file_dict() for consistent output
        schema = SystemLogCreate(
            level=record.levelname,
            message=self._build_message(record),
            logger_name=record.name,
            module=module_path,
            function=func_name,
            line_number=line_num,
            file_path=file_path,
            extra_data=extra_data,
        )
        
        return json.dumps(schema.to_file_dict(), ensure_ascii=False, default=str)
    
    def _get_module_path(self, record: logging.LogRecord) -> str:
        """Get module path from record, converting to relative path format.
        
        返回模块级别路径（不包含文件名），如 src.common.modules.logger
        """
        # 优先使用 logger 名称
        if record.name and record.name != "root":
            module_name = record.name
            # 确保项目内代码有 src. 前缀
            if module_name.startswith("common.") or module_name.startswith("modules."):
                module_name = "src." + module_name
            # 移除最后一级（文件名），保留模块路径
            parts = module_name.rsplit(".", 1)
            if len(parts) > 1:
                return parts[0]
            return module_name
        
        # Fallback: 从 pathname 提取相对路径
        if record.pathname:
            pathname = record.pathname.replace("\\", "/")
            if "/backend/src/" in pathname:
                rel_path = pathname.split("/backend/src/")[-1].replace("/", ".").replace(".py", "")
            elif "/src/" in pathname:
                rel_path = pathname.split("/src/")[-1].replace("/", ".").replace(".py", "")
            elif "site-packages" in pathname:
                parts = pathname.split("site-packages/")
                if len(parts) > 1:
                    rel_path = parts[1].replace("/", ".").replace(".py", "")
                else:
                    return record.name or ""
            else:
                return record.name or ""
            
            # 移除最后一级（文件名），保留模块路径
            parts = ("src." + rel_path).rsplit(".", 1)
            if len(parts) > 1:
                return parts[0]
            return "src." + rel_path
        
        return record.name or ""
    
    def _build_message(self, record: logging.LogRecord) -> str:
        """Build message following System layer format: Server {event}: {detail}"""
        msg = record.getMessage()
        logger_name = record.name
        
        # SQLAlchemy 日志
        if logger_name.startswith("sqlalchemy"):
            if "pool" in logger_name:
                return f"Database pool: {msg}"
            elif "engine" in logger_name:
                return f"Database engine: {msg}"
            else:
                return f"Database: {msg}"
        
        # Map common uvicorn messages to specification format
        if "Application startup complete" in msg:
            return "Server started: application ready"
        elif "Uvicorn running on" in msg or "running on" in msg.lower():
            # Extract URL from message
            if "http://" in msg:
                try:
                    url = "http://" + msg.split("http://")[1].split()[0].rstrip("()")
                    return f"Server started: {url}"
                except IndexError:
                    pass
            return f"Server started: {msg}"
        elif "Shutting down" in msg or "shutdown" in msg.lower():
            return f"Server shutdown: {msg}"
        elif "Started" in msg:
            return f"Server event: {msg}"
        elif "Waiting for application" in msg:
            return f"Server waiting: {msg}"
        
        # Default: prefix with Server event
        return f"Server event: {msg}"


def setup_logging() -> None:
    """Setup application logging configuration.

    Configures logging based on settings:
    - Log level from LOG_LEVEL or DEBUG setting
    - File logging only (no console output)
    - Sensitive data filtering
    - Structured JSON formatting (following LOGS_GUIDELINES.md)
    
    日志级别规则：
    - App/Audit/Error: 生产 INFO, 开发 DEBUG
    - System/Performance: 生产 WARNING, 开发 INFO
    """
    # System/Performance 日志级别
    if settings.DEBUG:
        system_level = logging.INFO  # 开发环境 INFO
    else:
        system_level = logging.WARNING  # 生产环境 WARNING

    # Always use SystemLogFormatter for system.log (follows LOGS_GUIDELINES.md)
    formatter = SystemLogFormatter()

    # Setup root logger (for system.log)
    root_logger = logging.getLogger()
    root_logger.setLevel(system_level)

    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []

    # Add filters
    sensitive_filter = SensitiveDataFilter(
        getattr(settings, "LOG_SENSITIVE_FIELDS", [])
    )
    context_filter = ContextFilter()

    # Add console handler for development
    console_handler = create_console_handler(formatter, system_level)
    console_handler.addFilter(sensitive_filter)
    console_handler.addFilter(context_filter)
    root_logger.addHandler(console_handler)

    # File handler for system logs (Python standard logging)
    # Note: 
    # - system.log: Standard Python logging (logging.error, logging.info, etc.) - system/framework logs
    # - app.log: Application business logs via logging_service.log(AppLogCreate(...)) - business logic logs
    # - error.log: Application exceptions via exception service
    # - audit.log: Audit logs for compliance
    enable_file = getattr(settings, "LOG_ENABLE_FILE", True)  # Default to True (write to system.log)
    if enable_file:
        log_file = getattr(settings, "LOG_FILE", None)
        if not log_file:
            # Determine backend directory path (go up from src/common/modules/logger)
            # backend/src/common/modules/logger/config.py -> backend/
            backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
            log_file = backend_dir / "logs" / "system.log"  # Changed from app.log to system.log

        file_handler = create_file_handler(
            str(log_file),
            formatter,
            system_level,
            max_bytes=getattr(settings, "LOG_FILE_MAX_BYTES", 10485760),
            backup_count=getattr(settings, "LOG_FILE_BACKUP_COUNT", 5),
        )
        file_handler.addFilter(sensitive_filter)
        file_handler.addFilter(context_filter)
        root_logger.addHandler(file_handler)
    
    # Database handler for system logs (if enabled)
    if getattr(settings, "LOG_DB_ENABLED", True):
        db_handler = DatabaseSystemLogHandler(level=system_level)
        db_handler.addFilter(sensitive_filter)
        db_handler.addFilter(context_filter)
        root_logger.addHandler(db_handler)

    # Suppress noisy third-party loggers (but keep uvicorn.error for startup logs)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    # uvicorn.error 包含启动日志，保持 INFO 级别
    uvicorn_error_logger = logging.getLogger("uvicorn.error")
    uvicorn_error_logger.setLevel(logging.INFO)
    uvicorn_error_logger.propagate = True  # 确保日志传播到 root logger
    
    # uvicorn 主 logger 也需要传播
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(logging.INFO)
    uvicorn_logger.propagate = True
    
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # SQLAlchemy 日志 - 统一纳入系统日志管理
    # 设置为 WARNING 级别，只记录警告和错误（不记录 SQL 语句）
    # 如需调试 SQL，可临时改为 INFO 或 DEBUG
    for sa_logger_name in ["sqlalchemy.engine", "sqlalchemy.pool", "sqlalchemy.dialects", "sqlalchemy.orm"]:
        sa_logger = logging.getLogger(sa_logger_name)
        sa_logger.setLevel(logging.WARNING)
        sa_logger.propagate = True  # 传播到 root logger，使用统一的 SystemLogFormatter

