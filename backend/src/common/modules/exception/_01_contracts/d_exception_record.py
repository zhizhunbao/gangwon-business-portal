"""Exception record data class.

Defines the data structure for exception records.
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID


@dataclass
class DExceptionRecord:
    """Record of a captured exception."""
    
    id: UUID
    source: str
    level: str
    layer: str
    message: str
    exception_type: str
    created_at: datetime
    file: Optional[str] = None
    line_number: Optional[int] = None
    function: Optional[str] = None
    trace_id: Optional[UUID] = None
    request_id: Optional[str] = None
    user_id: Optional[UUID] = None
    stack_trace: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    http_status: Optional[int] = None
    resolved: bool = False
    resolution_notes: Optional[str] = None
