"""Log writer interfaces.

Defines the contracts that all log writers and schemas must implement.
Uses Python Protocol for structural subtyping (duck typing with type hints).

Architecture:
┌─────────────────────────────────────────────────────────────┐
│  ILogSchema ← BaseLogSchema ← AppLogCreate, ErrorLogCreate  │
│  ILogWriter ← BaseLogWriter ← FileLogWriter, DatabaseLogWriter │
└─────────────────────────────────────────────────────────────┘

Only 2 interfaces needed:
- ILogSchema: Data conversion contract for all log schemas
- ILogWriter: Write contract for all log writers

Requirements: 1.1
"""
from typing import Protocol, runtime_checkable, Any


@runtime_checkable
class ILogSchema(Protocol):
    """Interface for log schemas.
    
    All log schemas must implement these methods for data conversion.
    This ensures consistent data format across file and database writers.
    """
    
    def to_db_dict(self) -> dict[str, Any]:
        """Convert to dictionary for database insertion (UTC timestamps).
        
        Returns:
            Dictionary suitable for database insertion
        """
        ...
    
    def to_file_dict(self) -> dict[str, Any]:
        """Convert to dictionary for file logging (EST timestamps).
        
        Returns:
            Dictionary suitable for file logging
        """
        ...


@runtime_checkable
class ILogWriter(Protocol):
    """Interface for log writers.
    
    Defines the contract that all log writers (file, database) must implement.
    Uses Protocol for structural subtyping - any class with these methods is compatible.
    """
    
    def write(self, schema: ILogSchema, log_type: str = "app") -> None:
        """Write a log entry to the destination.
        
        Args:
            schema: Log schema instance with to_db_dict/to_file_dict methods
            log_type: Type of log (app, error, audit, performance, system)
        """
        ...
    
    def close(self, timeout: float = 5.0) -> None:
        """Close the writer gracefully.
        
        Args:
            timeout: Maximum time to wait for pending writes (seconds)
        """
        ...
    
    def should_write(self, level: str) -> bool:
        """Check if log level meets minimum threshold.
        
        Args:
            level: Log level to check (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            
        Returns:
            True if the log should be written
        """
        ...
