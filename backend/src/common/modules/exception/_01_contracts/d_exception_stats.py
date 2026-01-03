"""Exception statistics data class.

Defines the data structure for exception statistics.
"""
from typing import Dict, List, Any
from dataclasses import dataclass, field


@dataclass
class DExceptionStats:
    """Statistics for exception monitoring."""
    
    total_count: int
    error_count: int
    critical_count: int
    by_type: Dict[str, int] = field(default_factory=dict)
    by_hour: Dict[str, int] = field(default_factory=dict)
    top_errors: List[Dict[str, Any]] = field(default_factory=list)
