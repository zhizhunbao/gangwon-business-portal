"""
HTTP Logging Middleware.

Provides automatic HTTP request/response logging with trace ID support.
Implements AOP-style logging for all HTTP requests without modifying business logic.

Requirements:
- 6.1: Record request method, path, and client IP address
- 6.2: Record response status code and request duration
- 6.3: Log WARNING level for slow requests (>1s)
- 6.4: Extract or generate traceId and requestId from headers
"""
import logging
import time
import uuid
from typing import Callable, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .request import set_request_context, get_request_context, get_trace_id, get_request_id

# Create module logger
logger = logging.getLogger(__name__)

# Slow request threshold in milliseconds (1 second = 1000ms)
SLOW_REQUEST_THRESHOLD_MS = 1000

# Paths to skip logging (to avoid infinite recursion and noise)
SKIP_PATHS = [
    "/healthz",
    "/readyz",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/favicon.ico",
    "/api/v1/logging",  # Skip logging endpoints to avoid recursion
    "/api/v1/exceptions",  # Skip exception endpoints to avoid recursion
]


def get_client_ip(request: Request) -> Optional[str]:
    """
    Get real client IP address from request.
    
    Checks proxy headers (X-Forwarded-For, X-Real-IP) first,
    then falls back to direct client host.
    Normalizes IPv6 localhost (::1) to IPv4 (127.0.0.1).
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Client IP address string or None
    """
    ip_address = None
    
    # Check X-Forwarded-For header (common for reverse proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain (original client)
        ip_address = forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header (used by some proxies like nginx)
    if not ip_address:
        ip_address = request.headers.get("X-Real-IP")
    
    # Fall back to direct client host
    if not ip_address and request.client:
        ip_address = request.client.host
    
    # Normalize IPv6 localhost to IPv4
    if ip_address == "::1":
        ip_address = "127.0.0.1"
    
    return ip_address


def extract_or_generate_trace_id(request: Request) -> str:
    """
    Extract traceId from request headers or generate a new one.
    
    This function is deprecated. Use get_trace_id from request module instead.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Trace ID string (UUID v4 format)
    """
    return get_trace_id(request)


def extract_or_generate_request_id(request: Request, trace_id: str) -> str:
    """
    Extract requestId from request headers or generate a new one.
    
    This function is deprecated. Use get_request_id from request module instead.
    
    Args:
        request: FastAPI Request object
        trace_id: The trace ID for this request
        
    Returns:
        Request ID string in format {traceId}-{sequence}
    """
    return get_request_id(request, trace_id)


def determine_log_level(status_code: int, duration_ms: float) -> str:
    """
    Determine the appropriate log level based on status code and duration.
    
    Rules:
    - 5xx errors: ERROR
    - 4xx errors: WARNING
    - Slow requests (>1s): WARNING
    - Normal requests: INFO
    
    Args:
        status_code: HTTP response status code
        duration_ms: Request duration in milliseconds
        
    Returns:
        Log level string (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    if status_code >= 500:
        return "ERROR"
    elif status_code >= 400:
        return "WARNING"
    elif duration_ms > SLOW_REQUEST_THRESHOLD_MS:
        return "WARNING"
    else:
        return "INFO"


def should_skip_logging(path: str) -> bool:
    """
    Check if the request path should skip logging.
    
    Args:
        path: Request URL path
        
    Returns:
        True if logging should be skipped, False otherwise
    """
    return any(path.startswith(skip_path) for skip_path in SKIP_PATHS)


class HTTPLoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTP request/response logging middleware.
    
    Automatically logs all HTTP requests with:
    - Request method, path, IP address
    - Response status code and duration
    - TraceId and RequestId for correlation
    - WARNING level for slow requests (>1s)
    
    Requirements:
    - 6.1: Record request method, path, and client IP address
    - 6.2: Record response status code and request duration
    - 6.3: Log WARNING level for slow requests (>1s)
    - 6.4: Extract or generate traceId and requestId from headers
    """
    
    def __init__(self, app: ASGIApp, debug: bool = False):
        """
        Initialize the middleware.
        
        Args:
            app: The ASGI application
            debug: Whether to add trace ID to response headers
        """
        super().__init__(app)
        self.debug = debug
    
    async def dispatch(
        self, 
        request: Request, 
        call_next: Callable
    ) -> Response:
        """
        Process the request and log request/response details.
        
        Args:
            request: FastAPI Request object
            call_next: Next middleware/handler in the chain
            
        Returns:
            Response object
        """
        # Import here to avoid circular imports
        from . import logging_service
        
        # Extract or generate trace IDs
        trace_id = extract_or_generate_trace_id(request)
        request_id = extract_or_generate_request_id(request, trace_id)
        
        # Store trace_id and request_id in request state for downstream use
        request.state.trace_id = trace_id
        request.state.request_id = request_id
        
        # Get client information
        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent")
        
        # Try to get user_id from request state (if authenticated)
        user_id = getattr(request.state, "user_id", None)
        
        # Set request context for SQL logging and other async operations
        set_request_context(
            trace_id=trace_id,
            request_id=request_id,
            user_id=user_id,
            request_path=request.url.path,
            request_method=request.method,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        # Record start time
        start_time = time.time()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Determine log level
        log_level = determine_log_level(response.status_code, duration_ms)
        
        # Check if we should log this request
        should_log = not should_skip_logging(request.url.path)
        
        # Build log message
        is_slow = duration_ms > SLOW_REQUEST_THRESHOLD_MS
        slow_indicator = " [SLOW]" if is_slow else ""
        log_message = (
            f"{request.method} {request.url.path} -> "
            f"{response.status_code} ({duration_ms:.2f}ms){slow_indicator}"
        )
        
        # Console logging (always)
        log_extra = {
            "trace_id": trace_id,
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "ip_address": ip_address,
            "is_slow": is_slow,
        }
        
        if log_level == "ERROR":
            logger.error(log_message, extra=log_extra)
        elif log_level == "WARNING":
            logger.warning(log_message, extra=log_extra)
        else:
            logger.info(log_message, extra=log_extra)
        
        # Business log recording (file + database) - non-blocking
        if should_log:
            try:
                from .schemas import AppLogCreate
                
                # Build extra_data for additional context
                extra_data = {
                    "layer": "Middleware",
                    "request_id": request_id,
                    "is_slow_request": is_slow,
                }
                if is_slow:
                    extra_data["slow_threshold_ms"] = SLOW_REQUEST_THRESHOLD_MS
                
                await logging_service.log(AppLogCreate(
                    source="backend",
                    level=log_level,
                    message=log_message,
                    layer="Middleware",
                    function="HTTPLoggingMiddleware.dispatch",
                    trace_id=trace_id,
                    request_id=request_id,
                    user_id=user_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    request_method=request.method,
                    request_path=request.url.path,
                    response_status=response.status_code,
                    duration_ms=int(duration_ms),
                    extra_data=extra_data,
                ))
            except Exception as e:
                # Don't fail the request if logging fails
                logger.warning(f"Failed to record business log: {str(e)}")
        
        # Add trace IDs to response headers for debugging
        if self.debug:
            response.headers["X-Trace-Id"] = trace_id
            response.headers["X-Request-Id"] = request_id
        
        return response


# Convenience function for creating the middleware
def create_http_logging_middleware(debug: bool = False) -> type:
    """
    Create an HTTP logging middleware class with configuration.
    
    Args:
        debug: Whether to add trace IDs to response headers
        
    Returns:
        Configured HTTPLoggingMiddleware class
    """
    return HTTPLoggingMiddleware
