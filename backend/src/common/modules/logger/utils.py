"""Logger utility functions.

Provides common utilities for logging module.
"""
from datetime import datetime


def format_timestamp() -> str:
    """
    Format timestamp in unified format: YYYY-MM-DD HH:MM:SS.mmm (local time).
    
    Returns:
        str: Formatted timestamp string
        
    Example:
        >>> format_timestamp()
        '2025-12-21 20:02:50.115'
    """
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
