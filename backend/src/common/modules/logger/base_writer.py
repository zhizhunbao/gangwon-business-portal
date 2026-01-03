"""Base log writer abstract class for unified logging infrastructure.

This module provides the abstract base class for all log writers (file and database).
It implements common functionality:
- Log level filtering with configurable minimum levels
- Log level priority mapping
- Graceful shutdown support

Architecture:
- ILogWriter (interfaces.py) - Interface/Protocol defining the contract
- BaseLogWriter (this file) - Abstract base class with shared implementation
- FileLogWriter / DatabaseLogWriter - Concrete implementations

All log writers (FileLogWriter, DatabaseLogWriter) should inherit from this class
to ensure consistent behavior across all log types.

Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
"""
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from .interfaces import ILogWriter, ILogSchema

if TYPE_CHECKING:
    from .schemas import BaseLogSchema


class BaseLogWriter(ABC):
    """Abstract base class for all log writers.
    
    Implements ILogWriter interface and provides common functionality:
    - Log level filtering with configurable minimum levels
    - Log level priority mapping (DEBUG < INFO < WARNING < ERROR < CRITICAL)
    - Graceful shutdown support
    
    Subclasses must implement:
    - write(): Write a log entry to the destination
    - close(): Close the writer gracefully
    
    Attributes:
        LOG_LEVELS: Class-level mapping of log level names to numeric priorities
        min_level: Minimum log level to write (default: INFO)
        enabled: Whether the writer is enabled (default: True)
    """
    
    # Log level priority mapping (higher = more important)
    LOG_LEVELS = {
        "DEBUG": 0,
        "INFO": 1,
        "WARNING": 2,
        "WARN": 2,  # Alias for WARNING
        "ERROR": 3,
        "CRITICAL": 4,
    }
    
    def __init__(self, min_level: str = "INFO", enabled: bool = True):
        """Initialize base log writer.
        
        Args:
            min_level: Minimum log level to write (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            enabled: Whether the writer is enabled
        """
        self.min_level = min_level.upper()
        self.enabled = enabled
        self._enabled = enabled  # Alias for backward compatibility
        self._initialized = False
    
    # =========================================================================
    # ILogWriter interface implementation
    # =========================================================================
    
    def should_write(self, level: str) -> bool:
        """Check if log level meets minimum threshold.
        
        Args:
            level: The log level to check (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            
        Returns:
            True if the log should be written, False otherwise
            
        Requirements: 1.2, 1.4
        """
        if not self.enabled:
            return False
        
        log_priority = self.LOG_LEVELS.get(level.upper(), 0)
        min_priority = self.LOG_LEVELS.get(self.min_level, 1)
        return log_priority >= min_priority
    
    @abstractmethod
    def write(self, schema: "BaseLogSchema", log_type: str = "app") -> None:
        """Write a log entry to the destination.
        
        Must be implemented by subclasses to handle the actual writing
        to file, database, or other destinations.
        
        Args:
            schema: The log schema instance containing log data
            log_type: Type of log (app, error, audit, performance, system)
            
        Requirements: 1.3
        """
        pass
    
    @abstractmethod
    def close(self, timeout: float = 5.0) -> None:
        """Close the writer gracefully.
        
        Must be implemented by subclasses to handle cleanup,
        flushing pending writes, and releasing resources.
        
        Args:
            timeout: Maximum time to wait for pending writes (seconds)
        """
        pass
    
    # =========================================================================
    # Extended functionality (not in interface)
    # =========================================================================
    
    def should_write_with_level(self, level: str, min_level: str) -> bool:
        """Check if log level meets a specific minimum threshold.
        
        This method allows checking against a different minimum level
        than the writer's default, useful for per-file or per-type
        log level configuration.
        
        Args:
            level: The log level to check
            min_level: The minimum level to compare against
            
        Returns:
            True if the log should be written, False otherwise
        """
        if not self.enabled:
            return False
        
        log_priority = self.LOG_LEVELS.get(level.upper(), 0)
        min_priority = self.LOG_LEVELS.get(min_level.upper(), 1)
        return log_priority >= min_priority
    
    @classmethod
    def get_level_priority(cls, level: str) -> int:
        """Get numeric priority for a log level string.
        
        Args:
            level: Log level name (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            
        Returns:
            Numeric priority (0-4), defaults to 1 (INFO) for unknown levels
        """
        return cls.LOG_LEVELS.get(level.upper(), 1)
