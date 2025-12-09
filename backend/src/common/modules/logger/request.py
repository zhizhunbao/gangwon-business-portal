"""Request utilities for logging and tracing."""
from contextvars import ContextVar
from typing import Any, Optional

# Context variables for storing request context in async operations
# These are used to pass request information to SQL logging and other async operations
_request_context: ContextVar[dict[str, Any]] = ContextVar("request_context", default={})


def set_request_context(
    trace_id: Optional[str] = None,
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
        user_id: User ID (UUID or str, will be converted to UUID when needed)
        request_path: Request path
        request_method: HTTP method
        ip_address: IP address
        user_agent: User agent string
    """
    _request_context.set({
        "trace_id": trace_id,
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

    Note: This function does NOT generate a new trace_id if not found.
    Trace ID must be provided by the frontend via X-Trace-Id header.

    Args:
        request: FastAPI Request object

    Returns:
        Trace ID string if found, None otherwise
    """
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

    # No trace_id found - return None (no fallback generation)
    return None

