"""Logging module.

This module provides structured logging functionality for the application.
It exports a configured logger instance, logging utilities, and application log services.
Exception services are in the exception module.

Usage:
    from ...common.modules.logger import logger, logging_service
    
    # Standard logging
    logger.info("Application started")
    logger.error("Error occurred", exc_info=True)
    
    # Application log recording
    await logging_service.create_log(
        db=db,
        source="backend",
        level="ERROR",
        message="Something went wrong",
        trace_id=trace_id,
    )
"""
import logging

from .config import setup_logging
from .formatter import JSONFormatter
from .file_writer import file_log_writer
from .service import LoggingService
from .router import router as logging_router

# Initialize logging on import
setup_logging()

# Create module logger
logger = logging.getLogger(__name__)

# Create service instance
logging_service = LoggingService()

__all__ = [
    "logger",
    "setup_logging",
    "JSONFormatter",
    "file_log_writer",
    "LoggingService",
    "logging_service",
    "logging_router",
]

