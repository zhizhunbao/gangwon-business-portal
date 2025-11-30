"""Error response models and utilities."""
from typing import Any, Optional
from uuid import uuid4


def create_error_response(
    message: str,
    status_code: int,
    error_code: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    trace_id: Optional[str] = None,
    include_details: bool = True,
) -> dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        message: Human-readable error message
        status_code: HTTP status code
        error_code: Application-specific error code
        details: Additional error details
        trace_id: Request trace ID for error tracking
        include_details: Whether to include details in response (production should be False)

    Returns:
        Standardized error response dictionary
    """
    response: dict[str, Any] = {
        "error": True,
        "message": message,
        "status_code": status_code,
    }

    if error_code:
        response["error_code"] = error_code

    if trace_id:
        response["trace_id"] = trace_id

    # Only include details in development or when explicitly requested
    if include_details and details:
        response["details"] = details

    return response


def get_trace_id(request: Any) -> str:
    """
    Get or create trace ID from request.

    Args:
        request: FastAPI Request object

    Returns:
        Trace ID string
    """
    # Try to get trace_id from request state (set by middleware)
    if hasattr(request.state, "trace_id"):
        return request.state.trace_id

    # Generate new trace_id if not present
    trace_id = str(uuid4())
    if hasattr(request, "state"):
        request.state.trace_id = trace_id
    return trace_id























