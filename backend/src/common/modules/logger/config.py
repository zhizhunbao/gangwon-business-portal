"""Logging configuration and setup."""
import logging
from pathlib import Path

from ..config import settings
from .filters import SensitiveDataFilter, ContextFilter
from .formatter import JSONFormatter
from .handlers import create_console_handler, create_file_handler


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


def setup_logging() -> None:
    """Setup application logging configuration.

    Configures logging based on settings:
    - Log level from LOG_LEVEL or DEBUG setting
    - Console logging (always enabled in debug mode)
    - File logging (if LOG_ENABLE_FILE is True)
    - Sensitive data filtering
    - Structured JSON formatting (production) or plain text (debug)
    """
    # Determine log level
    if settings.DEBUG:
        level = logging.DEBUG
    else:
        level = get_log_level(getattr(settings, "LOG_LEVEL", "INFO"))

    # Choose formatter based on environment
    if settings.DEBUG:
        # Human-readable format for development
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    else:
        # JSON format for production (structured logging)
        formatter = JSONFormatter()

    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []

    # Add filters
    sensitive_filter = SensitiveDataFilter(
        getattr(settings, "LOG_SENSITIVE_FIELDS", [])
    )
    context_filter = ContextFilter()

    # Console handler (for development and debugging)
    if getattr(settings, "LOG_ENABLE_CONSOLE", True) or settings.DEBUG:
        console_handler = create_console_handler(formatter, level)
        console_handler.addFilter(sensitive_filter)
        console_handler.addFilter(context_filter)
        root_logger.addHandler(console_handler)

    # File handler (for production logging)
    if getattr(settings, "LOG_ENABLE_FILE", False) and not settings.DEBUG:
        log_file = getattr(settings, "LOG_FILE", None)
        if not log_file:
            # Default log file location
            log_file = Path("logs") / "app.log"

        file_handler = create_file_handler(
            str(log_file),
            formatter,
            level,
            max_bytes=getattr(settings, "LOG_FILE_MAX_BYTES", 10485760),
            backup_count=getattr(settings, "LOG_FILE_BACKUP_COUNT", 5),
        )
        file_handler.addFilter(sensitive_filter)
        file_handler.addFilter(context_filter)
        root_logger.addHandler(file_handler)

    # Suppress noisy third-party loggers in production
    if not settings.DEBUG:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)

