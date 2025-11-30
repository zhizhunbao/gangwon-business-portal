"""Log filters for security and data sanitization."""
import logging
import re
from typing import Any


class SensitiveDataFilter(logging.Filter):
    """Filter to mask sensitive information in log messages."""

    def __init__(self, sensitive_fields: list[str] | None = None):
        """
        Initialize the filter.

        Args:
            sensitive_fields: List of field names to mask (case-insensitive)
        """
        super().__init__()
        self.sensitive_fields = sensitive_fields or []
        # Create regex pattern to match sensitive fields
        self.patterns = [
            re.compile(
                rf'({field})\s*[:=]\s*["\']?([^"\'\s,}}]+)["\']?',
                re.IGNORECASE,
            )
            for field in self.sensitive_fields
        ]

    def filter(self, record: logging.LogRecord) -> bool:
        """Filter and sanitize log record."""
        # Sanitize message
        if hasattr(record, "msg") and isinstance(record.msg, str):
            record.msg = self._mask_sensitive_data(record.msg)

        # Sanitize args
        if hasattr(record, "args") and record.args:
            record.args = tuple(
                self._mask_sensitive_data(str(arg)) if isinstance(arg, str) else arg
                for arg in record.args
            )

        return True

    def _mask_sensitive_data(self, text: str) -> str:
        """Mask sensitive data in text."""
        result = text
        for pattern in self.patterns:
            result = pattern.sub(r"\1=***MASKED***", result)
        return result


class ContextFilter(logging.Filter):
    """Filter to add context information to log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Add context information to log record."""
        # Add environment info if not present
        if not hasattr(record, "environment"):
            record.environment = "production"  # Can be set from settings

        return True























