"""Exception context data class.

Defines the data structure for exception context.
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass
from uuid import UUID


@dataclass
class DExceptionContext:
    """Context data for exception recording."""
    
    trace_id: Optional[UUID] = None
    request_id: Optional[str] = None
    user_id: Optional[UUID] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    function_name: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None
