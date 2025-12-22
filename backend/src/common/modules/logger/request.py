"""Request utilities for logging and tracing."""
from contextvars import ContextVar
from typing import Any, Optional
from uuid import uuid4
import threading

# Context variables for storing request context in async operations
# These are used to pass request information to SQL logging and other async operations
_request_context: ContextVar[dict[str, Any]] = ContextVar("request_context", default={})

# Thread-safe sequence counter for requestId generation
# Maps traceId -> sequence number
_sequence_counters: dict[str, int] = {}
_sequence_lock = threading.Lock()


def set_request_context(
    trace_id: Optional[str] = None,
    request_id: Optional[str] = None,
    user_id: Optional[Any] = None,  # Can be UUID or str
    request_path: Optional[str] = None,
    request_method: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Set request context variables for the current async context.
    
    This allows SQL logging and other async operations to access request information
    without needing to pass it explicitly.
    
    Args:
        trace_id: Request trace ID
        request_id: Request ID in format {traceId}-{sequence}
        user_id: User ID (UUID or str, will be converted to UUID when needed)
        request_path: Request path
        request_method: HTTP method
        ip_address: IP address
        user_agent: User agent string
    """
    _request_context.set({
        "trace_id": trace_id,
        "request_id": request_id,
        "user_id": user_id,  # Store as-is (UUID or str)
        "request_path": request_path,
        "request_method": request_method,
        "ip_address": ip_address,
        "user_agent": user_agent,
    })


def get_request_context() -> dict[str, Any]:
    """
    Get request context variables from the current async context.
    
    Returns:
        Dictionary containing request context (trace_id, user_id, etc.)
    """
    return _request_context.get({})


def get_trace_id(request: Any) -> Optional[str]:
    """
    Get trace ID from request.

    Priority:
    1. Request state (set by middleware)
    2. X-Trace-Id header (from frontend)
    3. Generate new UUID v4 if not found

    Args:
        request: FastAPI Request object (or None)

    Returns:
        Trace ID string (UUID v4 format)
    """
    # Check if request is None or not a FastAPI Request object
    if request is None:
        # Generate new trace_id if no request context
        return str(uuid4())
    
    # Check if it's a FastAPI Request object (has 'state' and 'headers' attributes)
    if not (hasattr(request, "state") and hasattr(request, "headers")):
        # Generate new trace_id if not a proper request object
        return str(uuid4())
    
    # Try to get trace_id from request state (set by middleware)
    if hasattr(request.state, "trace_id"):
        return request.state.trace_id

    # Try to get trace_id from X-Trace-Id header (from frontend)
    trace_id_header = request.headers.get("X-Trace-Id") or request.headers.get("x-trace-id")
    if trace_id_header:
        trace_id = trace_id_header
        if hasattr(request, "state"):
            request.state.trace_id = trace_id
        return trace_id

    # Generate new trace_id if not found
    trace_id = str(uuid4())
    if hasattr(request, "state"):
        request.state.trace_id = trace_id
    return trace_id


def _get_next_sequence(trace_id: str) -> int:
    """
    Get the next sequence number for a given trace_id.
    
    Thread-safe sequence counter that increments for each request
    within the same trace.
    
    Args:
        trace_id: The trace ID to get sequence for
        
    Returns:
        Next sequence number (starting from 1)
    """
    with _sequence_lock:
        if trace_id not in _sequence_counters:
            _sequence_counters[trace_id] = 0
        _sequence_counters[trace_id] += 1
        return _sequence_counters[trace_id]


def generate_request_id(trace_id: str) -> str:
    """
    Generate a request ID in the format {traceId}-{sequence}.
    
    Args:
        trace_id: The trace ID (UUID v4 format)
        
    Returns:
        Request ID string in format {traceId}-{sequence}
    """
    sequence = _get_next_sequence(trace_id)
    return f"{trace_id}-{sequence}"


def get_request_id(request: Any, trace_id: Optional[str] = None) -> str:
    """
    Get request ID from request headers or generate new one.
    
    Priority:
    1. Request state (set by middleware)
    2. X-Request-Id header (from frontend)
    3. Generate new requestId using trace_id
    
    Args:
        request: FastAPI Request object (or None)
        trace_id: Optional trace_id to use for generation (if not provided, will get from request)
        
    Returns:
        Request ID string in format {traceId}-{sequence}
    """
    # Check if request is None or not a FastAPI Request object
    if request is None:
        # Need trace_id to generate request_id
        if not trace_id:
            trace_id = str(uuid4())
        return generate_request_id(trace_id)
    
    # Check if it's a FastAPI Request object (has 'state' and 'headers' attributes)
    if not (hasattr(request, "state") and hasattr(request, "headers")):
        # Need trace_id to generate request_id
        if not trace_id:
            trace_id = str(uuid4())
        return generate_request_id(trace_id)
    
    # Try to get request_id from request state (set by middleware)
    if hasattr(request.state, "request_id"):
        return request.state.request_id

    # Try to get request_id from X-Request-Id header (from frontend)
    request_id_header = request.headers.get("X-Request-Id") or request.headers.get("x-request-id")
    if request_id_header:
        request_id = request_id_header
        if hasattr(request, "state"):
            request.state.request_id = request_id
        return request_id

    # Generate new request_id
    if not trace_id:
        trace_id = get_trace_id(request)
    
    request_id = generate_request_id(trace_id)
    if hasattr(request, "state"):
        request.state.request_id = request_id
    return request_id

