"""
HTTP Exception Middleware for FastAPI.

This middleware wraps all HTTP requests with exception handling, ensuring that
all exceptions are properly captured, classified, and logged with full context.
"""
import time
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from ..logger.request import get_trace_id, get_request_id, generate_request_id
from .service import exception_service, ExceptionContext
from .exceptions import BaseCustomException, InternalError


class ExceptionMiddleware(BaseHTTPMiddleware):
    """
    Middleware that wraps HTTP requests with comprehensive exception handling.
    
    This middleware:
    - Wraps all requests in try-catch logic
    - Captures full request context for exceptions
    - Determines appropriate HTTP status codes
    - Includes correlation IDs in responses
    - Records exceptions via the exception service
    """
    
    def __init__(self, app, debug: bool = False):
        """
        Initialize the exception middleware.
        
        Args:
            app: The ASGI application
            debug: Whether to include debug information in responses
        """
        super().__init__(app)
        self.debug = debug
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and handle any exceptions that occur.
        
        Args:
            request: The incoming HTTP request
            call_next: The next middleware/handler in the chain
        
        Returns:
            Response: The HTTP response
        """
        start_time = time.time()
        
        # Ensure request has trace_id and request_id
        trace_id = get_trace_id(request)
        request_id = get_request_id(request)
        
        if not request_id:
            request_id = generate_request_id(trace_id)
            # Store in request state for other middleware/handlers
            request.state.request_id = request_id
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Add correlation headers to successful responses
            if hasattr(response, 'headers'):
                response.headers['X-Trace-Id'] = str(trace_id) if trace_id else ''
                response.headers['X-Request-Id'] = request_id or ''
            
            return response
            
        except Exception as exc:
            # Calculate request duration
            duration = time.time() - start_time
            
            # Build exception context
            context = await self._build_exception_context(request, exc, duration)
            
            # Handle the exception
            return await self._handle_exception(request, exc, context)
    
    async def _build_exception_context(
        self,
        request: Request,
        exception: Exception,
        duration: float
    ) -> ExceptionContext:
        """
        Build comprehensive context information for the exception.
        
        Args:
            request: The HTTP request
            exception: The exception that occurred
            duration: Request processing duration in seconds
        
        Returns:
            ExceptionContext: Complete context information
        """
        # Extract user information if available
        user_id = None
        if hasattr(request.state, 'user_id'):
            user_id = request.state.user_id
        elif hasattr(request.state, 'current_user'):
            user = request.state.current_user
            if hasattr(user, 'id'):
                user_id = user.id
        
        # Get client IP address
        client_ip = None
        if request.client:
            client_ip = request.client.host
        
        # Check for forwarded headers
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            client_ip = forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            client_ip = real_ip
        
        # Build additional context data
        additional_data = {
            'url': str(request.url),
            'method': request.method,
            'path': request.url.path,
            'query_params': dict(request.query_params),
            'client_ip': client_ip,
            'user_agent': request.headers.get('User-Agent'),
            'content_type': request.headers.get('Content-Type'),
            'duration_seconds': duration,
            'request_size': request.headers.get('Content-Length'),
        }
        
        # Add request body for certain content types (be careful with size)
        content_type = request.headers.get('Content-Type', '')
        if ('application/json' in content_type or 
            'application/x-www-form-urlencoded' in content_type):
            try:
                # Only capture small request bodies to avoid memory issues
                content_length = int(request.headers.get('Content-Length', 0))
                if content_length > 0 and content_length < 10000:  # 10KB limit
                    # Note: This is tricky because request body might already be consumed
                    # In practice, you might need to implement this at the application level
                    pass
            except (ValueError, TypeError):
                pass
        
        return ExceptionContext(
            trace_id=get_trace_id(request),
            request_id=get_request_id(request),
            user_id=user_id,
            additional_data=additional_data
        )
    
    async def _handle_exception(
        self,
        request: Request,
        exception: Exception,
        context: ExceptionContext
    ) -> JSONResponse:
        """
        Handle the exception and return appropriate response.
        
        Args:
            request: The HTTP request
            exception: The exception that occurred
            context: Exception context information
        
        Returns:
            JSONResponse: Error response
        """
        try:
            # Record the exception
            await exception_service.record_exception(exception, context, source="backend")
        except Exception as log_exc:
            # Don't let logging failures break error handling
            import logging
            logging.error(f"Failed to record exception in middleware: {log_exc}", exc_info=True)
        
        # Classify the exception
        if isinstance(exception, BaseCustomException):
            classified_exc = exception
        else:
            classified_exc = exception_service.classify_exception(exception)
        
        # Determine if we should include debug information
        include_debug = self.debug and classified_exc.http_status_code >= 500
        
        # Build error response
        error_response = {
            "error": classified_exc.to_dict(),
            "trace_id": str(context.trace_id) if context.trace_id else None,
            "request_id": context.request_id,
            "timestamp": context.additional_data.get('timestamp') if context.additional_data else None,
        }
        
        # Add debug information for server errors in debug mode
        if include_debug:
            error_response["debug"] = {
                "exception_type": type(exception).__name__,
                "stack_trace": str(exception.__traceback__) if hasattr(exception, '__traceback__') else None,
                "request_info": {
                    "method": context.additional_data.get('method'),
                    "path": context.additional_data.get('path'),
                    "duration": context.additional_data.get('duration_seconds'),
                }
            }
        
        # Create JSON response with appropriate status code
        response = JSONResponse(
            status_code=classified_exc.http_status_code,
            content=error_response
        )
        
        # Add correlation headers
        response.headers['X-Trace-Id'] = str(context.trace_id) if context.trace_id else ''
        response.headers['X-Request-Id'] = context.request_id or ''
        
        # Add CORS headers if needed (you might want to configure this)
        response.headers['Access-Control-Expose-Headers'] = 'X-Trace-Id, X-Request-Id'
        
        return response
    
    def _should_capture_request_body(self, request: Request) -> bool:
        """
        Determine if request body should be captured for logging.
        
        Args:
            request: The HTTP request
        
        Returns:
            bool: Whether to capture the request body
        """
        # Only capture for certain content types
        content_type = request.headers.get('Content-Type', '')
        if not ('application/json' in content_type or 
                'application/x-www-form-urlencoded' in content_type):
            return False
        
        # Check content length
        try:
            content_length = int(request.headers.get('Content-Length', 0))
            return 0 < content_length < 10000  # 10KB limit
        except (ValueError, TypeError):
            return False
    
    def _sanitize_headers(self, headers: dict) -> dict:
        """
        Sanitize headers by removing sensitive information.
        
        Args:
            headers: Original headers dictionary
        
        Returns:
            dict: Sanitized headers
        """
        sensitive_headers = {
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token',
            'authentication',
        }
        
        sanitized = {}
        for key, value in headers.items():
            if key.lower() in sensitive_headers:
                sanitized[key] = '[FILTERED]'
            else:
                sanitized[key] = value
        
        return sanitized


def create_exception_middleware(debug: bool = False) -> ExceptionMiddleware:
    """
    Factory function to create exception middleware.
    
    Args:
        debug: Whether to include debug information in error responses
    
    Returns:
        ExceptionMiddleware: Configured middleware instance
    """
    return ExceptionMiddleware(None, debug=debug)


# Middleware configuration helper
def add_exception_middleware(app, debug: bool = False):
    """
    Add exception middleware to FastAPI application.
    
    Args:
        app: FastAPI application instance
        debug: Whether to enable debug mode
    """
    app.add_middleware(ExceptionMiddleware, debug=debug)