"""
Automatic business logging decorator.

This module provides decorators for automatically logging business operations
without requiring manual logging_service.create_log() calls in router functions.
"""
from functools import wraps
from typing import Any, Callable, Optional

from fastapi import Request
from fastapi.responses import Response

from .request import get_request_context, get_trace_id


def extract_resource_id(result: Any) -> Optional[str]:
    """
    Extract resource ID from function result.
    
    Supports various result types:
    - Pydantic models with `id` attribute
    - Dict with `id` key
    - Objects with `id` attribute
    - List of items (extracts first item's ID)
    
    Args:
        result: Function return value
        
    Returns:
        Resource ID as string, or None if not found
    """
    if result is None:
        return None
    
    # Handle list results (e.g., list of items)
    if isinstance(result, (list, tuple)):
        if len(result) > 0:
            result = result[0]
        else:
            return None
    
    # Handle dict results
    if isinstance(result, dict):
        if "id" in result:
            return str(result["id"])
        # Check for nested result (e.g., {"items": [...], "total": 10})
        if "items" in result and isinstance(result["items"], list) and len(result["items"]) > 0:
            return extract_resource_id(result["items"][0])
        return None
    
    # Handle Pydantic models and objects with id attribute
    if hasattr(result, "id"):
        return str(result.id)
    
    # Handle objects with model_dump (Pydantic v2)
    if hasattr(result, "model_dump"):
        data = result.model_dump()
        if isinstance(data, dict) and "id" in data:
            return str(data["id"])
    
    return None


def extract_result_count(result: Any) -> Optional[int]:
    """
    Extract result count from function result.
    
    Supports:
    - List length
    - Dict with "total" or "count" key
    - Tuple with (items, total) format
    
    Args:
        result: Function return value
        
    Returns:
        Result count, or None if not found
    """
    if result is None:
        return None
    
    # Handle list results
    if isinstance(result, list):
        return len(result)
    
    # Handle tuple results (e.g., (items, total))
    if isinstance(result, tuple) and len(result) >= 2:
        if isinstance(result[1], int):
            return result[1]
        if isinstance(result[0], list):
            return len(result[0])
    
    # Handle dict results
    if isinstance(result, dict):
        if "total" in result:
            return result["total"]
        if "count" in result:
            return result["count"]
        if "items" in result and isinstance(result["items"], list):
            return len(result["items"])
    
    return None


def auto_log(
    operation_name: str,
    success_message: Optional[str] = None,
    error_message: Optional[str] = None,
    log_resource_id: bool = True,
    log_result_count: bool = False,
    log_level: str = "INFO",
):
    """
    Decorator for automatically logging business operations.
    
    Automatically logs:
    - Operation success with resource ID and result count (if applicable)
    - Operation errors with error details
    
    Args:
        operation_name: Name of the operation (e.g., "create_member", "list_projects")
        success_message: Custom success message (default: "{operation_name} succeeded")
        error_message: Custom error message (default: "{operation_name} failed")
        log_resource_id: Whether to extract and log resource ID from result
        log_result_count: Whether to extract and log result count (for list operations)
        log_level: Log level for success logs (default: "INFO")
    
    Example:
        @router.post("/api/members")
        @auto_log("create_member", log_resource_id=True)
        async def create_member(data: MemberCreate, request: Request, db: AsyncSession):
            member = await service.create_member(data, db)
            return MemberResponse.model_validate(member)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Lazy import to avoid circular dependency
            from . import logging_service
            
            # Find Request object in args/kwargs
            request: Optional[Request] = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if request is None:
                request = kwargs.get("request")
            
            # Get trace_id and request context
            trace_id = get_trace_id(request) if request else None
            request_ctx = get_request_context()
            
            # Get user_id from request context or request state
            user_id = request_ctx.get("user_id")
            if request and not user_id:
                user_id = getattr(request.state, "user_id", None)
            
            # Get request info
            request_path = request.url.path if request else request_ctx.get("request_path")
            request_method = request.method if request else request_ctx.get("request_method")
            ip_address = request_ctx.get("ip_address")
            user_agent = request_ctx.get("user_agent")
            
            try:
                # Execute the function
                result = await func(*args, **kwargs)
                
                # Build success message
                if success_message:
                    message = success_message
                else:
                    message = f"{operation_name} succeeded"
                
                # Extract additional info from result
                extra_data = {}
                
                if log_resource_id:
                    resource_id = extract_resource_id(result)
                    if resource_id:
                        extra_data["resource_id"] = resource_id
                        message += f": id={resource_id}"
                
                if log_result_count:
                    count = extract_result_count(result)
                    if count is not None:
                        extra_data["result_count"] = count
                        message += f", count={count}"
                
                # Determine response status
                response_status = 200
                if hasattr(result, "status_code"):
                    response_status = result.status_code
                elif isinstance(result, Response):
                    response_status = result.status_code
                elif request_method == "POST":
                    response_status = 201
                
                # Log success
                logging_service.create_log(
                    source="backend",
                    level=log_level,
                    message=message,
                    module=func.__module__,
                    function=func.__name__,
                    trace_id=trace_id,
                    user_id=user_id,
                    request_path=request_path,
                    request_method=request_method,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    response_status=response_status,
                    extra_data=extra_data,
                )
                
                return result
                
            except Exception as e:
                # Build error message
                if error_message:
                    message = f"{error_message}: {str(e)}"
                else:
                    message = f"{operation_name} failed: {str(e)}"
                
                # Determine response status from exception
                response_status = 500
                if hasattr(e, "status_code"):
                    response_status = e.status_code
                elif hasattr(e, "status"):
                    response_status = e.status
                
                # Log error
                logging_service.create_log(
                    source="backend",
                    level="ERROR",
                    message=message,
                    module=func.__module__,
                    function=func.__name__,
                    trace_id=trace_id,
                    user_id=user_id,
                    request_path=request_path,
                    request_method=request_method,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    response_status=response_status,
                    extra_data={
                        "error": str(e),
                        "error_type": type(e).__name__,
                    },
                )
                
                # Re-raise exception for global exception handler
                raise
        
        return wrapper
    return decorator

