"""Logging module.

This module provides unified structured logging functionality for the application.
All log types use the same API pattern and write to both file and database.

Usage:
    from ...common.modules.logger import logging_service
    from ...common.modules.logger.schemas import (
        AppLogCreate, ErrorLogCreate, AuditLogCreate, PerformanceLogCreate
    )
    
    # Application logs -> app.log + DB
    await logging_service.app(AppLogCreate(
        level="INFO",
        message="User logged in",
        layer="Auth"
    ))
    
    # Error logs -> error.log + DB
    await logging_service.error(ErrorLogCreate(
        error_type="ValidationError",
        error_message="Invalid input"
    ))
    
    # Audit logs -> audit.log + DB
    await logging_service.audit(AuditLogCreate(
        action="login",
        user_id=user_id
    ))
    
    # Performance logs -> performance.log + DB
    await logging_service.performance(PerformanceLogCreate(
        metric_name="api_response_time",
        metric_value=150.5
    ))
"""
import logging

from .config import setup_logging, LogConfig, get_log_config
from .formatter import JSONFormatter
from .base_writer import BaseLogWriter
from .file_writer import file_log_writer
from .db_writer import db_log_writer
from .service import LoggingService
# NOTE: router is imported lazily to avoid circular import with db.session
# Use get_logging_router() instead of logging_router directly
from .request import get_trace_id, set_request_context, get_request_context

# HTTP Logging Middleware - 从 interceptor 模块导入
from ..interceptor.router import (
    HTTPLoggingMiddleware,
    get_client_ip,
    determine_log_level,
    should_skip_logging,
    SLOW_REQUEST_THRESHOLD_MS,
)

# 兼容旧 API
def extract_or_generate_trace_id(request):
    return get_trace_id(request)

def extract_or_generate_request_id(request, trace_id):
    from .request import get_request_id
    return get_request_id(request, trace_id)

# Initialize logging on import
setup_logging()


def get_logger(name: str = None) -> logging.Logger:
    """Get a logger instance with the given name.
    
    Each module should call this with __name__ to get a properly named logger:
        logger = get_logger(__name__)
    
    This ensures the module path is correctly recorded in system logs.
    """
    return logging.getLogger(name or __name__)


# Create service instance
logging_service = LoggingService()


def get_logging_router():
    """Lazy import of logging router to avoid circular import."""
    from .router import router
    return router


__all__ = [
    "get_logger",
    "setup_logging",
    "LogConfig",
    "get_log_config",
    "JSONFormatter",
    "BaseLogWriter",
    "file_log_writer",
    "db_log_writer",
    "LoggingService",
    "logging_service",
    "get_logging_router",
    "get_trace_id",
    "set_request_context",
    "get_request_context",
    # HTTP Logging Middleware
    "HTTPLoggingMiddleware",
    "get_client_ip",
    "extract_or_generate_trace_id",
    "extract_or_generate_request_id",
    "determine_log_level",
    "should_skip_logging",
    "SLOW_REQUEST_THRESHOLD_MS",
]

