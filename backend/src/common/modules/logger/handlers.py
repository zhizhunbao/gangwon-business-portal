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























