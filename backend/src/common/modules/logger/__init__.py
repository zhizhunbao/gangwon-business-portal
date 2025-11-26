"""Logging module.

This module provides structured logging functionality for the application.
It exports a configured logger instance and logging utilities.

Usage:
    from ...common.modules.logger import logger
    
    logger.info("Application started")
    logger.error("Error occurred", exc_info=True)
"""
import logging

from .config import setup_logging
from .formatter import JSONFormatter

# Initialize logging on import
setup_logging()

# Create module logger
logger = logging.getLogger(__name__)

__all__ = ["logger", "setup_logging", "JSONFormatter"]

