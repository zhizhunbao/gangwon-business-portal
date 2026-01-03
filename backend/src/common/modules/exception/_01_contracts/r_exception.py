"""Exception repository interface.

Defines the data access contract for exception records.
"""
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

from .d_exception_record import DExceptionRecord


class IExceptionRepository(ABC):
    """Repository interface for exception record persistence."""
    
    @abstractmethod
    async def save(self, record: DExceptionRecord) -> DExceptionRecord:
        """Save an exception record."""
        ...
    
    @abstractmethod
    async def find_by_id(self, id: int) -> Optional[DExceptionRecord]:
        """Find an exception record by ID."""
        ...
    
    @abstractmethod
    async def find_all(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[DExceptionRecord]:
        """Find all exception records with pagination."""
        ...
    
    @abstractmethod
    async def find_by_filters(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100
    ) -> List[DExceptionRecord]:
        """Find exception records by filters."""
        ...
    
    @abstractmethod
    async def find_by_type(
        self,
        exception_type: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[DExceptionRecord]:
        """Find exception records by exception type."""
        ...
    
    @abstractmethod
    async def find_by_source(
        self,
        source: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[DExceptionRecord]:
        """Find exception records by source (frontend/backend)."""
        ...
    
    @abstractmethod
    async def update(
        self,
        id: int,
        data: Dict[str, Any]
    ) -> Optional[DExceptionRecord]:
        """Update an exception record."""
        ...
    
    @abstractmethod
    async def delete(self, id: int) -> bool:
        """Delete an exception record by ID."""
        ...
    
    @abstractmethod
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count exception records with optional filters."""
        ...
    
    @abstractmethod
    async def count_by_type(self) -> Dict[str, int]:
        """Count exception records grouped by type."""
        ...
    
    @abstractmethod
    async def count_by_source(self) -> Dict[str, int]:
        """Count exception records grouped by source."""
        ...
