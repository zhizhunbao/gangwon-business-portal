"""
Audit log decorator.

Decorator for automatically logging operations to audit log.
"""
from functools import wraps
from typing import Optional, Callable, Any
from uuid import UUID
from fastapi import Request

from .service import AuditLogService


def get_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Extract client IP address and user agent from request.

    Args:
        request: FastAPI Request object

    Returns:
        Tuple of (ip_address, user_agent)
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

    # Get user agent
    user_agent = request.headers.get("user-agent")

    return ip_address, user_agent


def audit_log(
    action: str,
    resource_type: Optional[str] = None,
    get_resource_id: Optional[Callable[[Any], Optional[UUID]]] = None,
):
    """
    Decorator to automatically log operations to audit log.

    Args:
        action: Action type (e.g., 'create', 'update', 'delete', 'approve')
        resource_type: Type of resource (e.g., 'member', 'performance', 'project')
        get_resource_id: Optional function to extract resource_id from function result

    Usage:
        @audit_log(action="create", resource_type="member")
        async def create_member(...):
            ...

        @audit_log(
            action="update",
            resource_type="performance",
            get_resource_id=lambda result: result.id if result else None
        )
        async def update_performance(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        # 在装饰时获取被装饰函数的信息
        import inspect
        func_module = func.__module__ or ""
        func_name = func.__name__ or ""
        try:
            source_file = inspect.getfile(func)
            source_file = source_file.replace("\\", "/")
            if "/backend/src/" in source_file:
                func_file_path = source_file.split("/backend/")[-1]
                func_module_path = "src." + source_file.split("/backend/src/")[-1].replace("/", ".").replace(".py", "")
            elif "/src/" in source_file:
                func_file_path = "src/" + source_file.split("/src/")[-1]
                func_module_path = "src." + source_file.split("/src/")[-1].replace("/", ".").replace(".py", "")
            else:
                func_file_path = source_file
                func_module_path = func_module
            
            # 获取函数定义的行号
            func_line_number = inspect.getsourcelines(func)[1]
        except (TypeError, OSError):
            func_file_path = ""
            func_module_path = func_module
            func_line_number = 0
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute the original function
            # Exceptions will be handled by global exception handlers
            result = await func(*args, **kwargs)

            # Try to extract request from kwargs or args
            request: Optional[Request] = None
            user_id: Optional[UUID] = None

            # Find request in kwargs
            if "request" in kwargs:
                request = kwargs["request"]
            else:
                # Try to find in args
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            # Helper function to check if user object is an Admin (not a Member)
            def is_admin_user(user_obj) -> bool:
                """Check if user object is an Admin (not a Member)."""
                if user_obj is None:
                    return False
                # Admin has 'username' attribute, Member has 'business_number'
                return hasattr(user_obj, "username") and not hasattr(user_obj, "business_number")

            # Find user_id from current_user, current_admin, or similar
            # Now we can store both member ID and admin ID (no FK constraint)
            if "current_user" in kwargs:
                user = kwargs["current_user"]
                if user is not None:
                    # Handle dict (from get_current_user_optional) or object
                    if isinstance(user, dict) and "id" in user:
                        uid = user["id"]
                        user_id = UUID(uid) if isinstance(uid, str) else uid
                    elif hasattr(user, "id"):
                        user_id = user.id
            elif "current_admin" in kwargs:
                admin = kwargs["current_admin"]
                if admin is not None:
                    if isinstance(admin, dict) and "id" in admin:
                        uid = admin["id"]
                        user_id = UUID(uid) if isinstance(uid, str) else uid
                    elif hasattr(admin, "id"):
                        user_id = admin.id
            else:
                # Try to find user in args
                for arg in args:
                    if hasattr(arg, "id") and hasattr(arg, "email"):
                        user_id = arg.id
                        break
            
            # For login actions, extract user_id from result (TokenResponse.user.id)
            if user_id is None and action in ("login", "admin_login") and result:
                try:
                    # Handle Pydantic model TokenResponse
                    if hasattr(result, "user"):
                        user_data = result.user
                        if isinstance(user_data, dict) and "id" in user_data:
                            user_id = UUID(user_data["id"]) if isinstance(user_data["id"], str) else user_data["id"]
                        elif hasattr(user_data, "id"):
                            user_id = UUID(user_data.id) if isinstance(user_data.id, str) else user_data.id
                except (ValueError, TypeError):
                    pass

            # Extract resource_id
            resource_id: Optional[UUID] = None
            
            # 1. Try get_resource_id callback if provided
            if get_resource_id and result:
                try:
                    resource_id = get_resource_id(result)
                except Exception:
                    pass
            
            # 2. Auto-extract from path parameters (e.g., message_id, thread_id, member_id)
            if resource_id is None:
                # Common path parameter names for resource IDs
                id_param_names = [
                    f"{resource_type}_id" if resource_type else None,  # e.g., message_id, thread_id
                    "id",
                    "message_id",
                    "thread_id",
                    "member_id",
                    "project_id",
                    "performance_id",
                    "notice_id",
                    "inquiry_id",
                    "application_id",
                ]
                for param_name in id_param_names:
                    if param_name and param_name in kwargs:
                        try:
                            value = kwargs[param_name]
                            if isinstance(value, UUID):
                                resource_id = value
                                break
                            elif isinstance(value, str):
                                resource_id = UUID(value)
                                break
                        except (ValueError, TypeError):
                            pass
            
            # 3. Try to extract from result object (for create operations)
            # Skip for login/logout actions (they don't have resource_id)
            if resource_id is None and result and action not in ("login", "admin_login", "logout"):
                try:
                    # Handle dict result with direct id
                    if isinstance(result, dict):
                        rid = None
                        # Check for direct id field
                        if "id" in result:
                            rid = result["id"]
                        # Check for member_id field (e.g., register response)
                        elif "member_id" in result:
                            rid = result["member_id"]
                        
                        if rid:
                            if isinstance(rid, UUID):
                                resource_id = rid
                            elif isinstance(rid, str):
                                resource_id = UUID(rid)
                    
                    # Handle object with direct id attribute
                    elif hasattr(result, "id"):
                        rid = result.id
                        if isinstance(rid, UUID):
                            resource_id = rid
                        elif isinstance(rid, str):
                            resource_id = UUID(rid)
                except (ValueError, TypeError):
                    pass

            # Get IP and user agent from request
            ip_address: Optional[str] = None
            user_agent: Optional[str] = None
            trace_id: Optional[str] = None
            request_id: Optional[str] = None
            request_method: Optional[str] = None
            request_path: Optional[str] = None
            if request:
                ip_address, user_agent = get_client_info(request)
                # Extract trace_id from request headers (X-Trace-ID) or state
                trace_id = request.headers.get("X-Trace-ID")
                if not trace_id and hasattr(request.state, "trace_id"):
                    trace_id = request.state.trace_id
                # Extract request_id from request state if available
                if hasattr(request.state, "request_id"):
                    request_id = request.state.request_id
                # Extract request method and path
                request_method = request.method
                request_path = str(request.url.path)

            # Create audit log entry using dual-write service (database + file)
            # Implements Requirement 8.3: write to both audit_logs table and audit.log file
            # Non-blocking, log errors but don't fail
            # Only log if function succeeded (exceptions are handled by global handlers)
            try:
                audit_service = AuditLogService()
                await audit_service.create_audit_log_via_api(
                    action=action,
                    user_id=user_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    trace_id=trace_id,
                    request_id=request_id,
                    request_method=request_method,
                    request_path=request_path,
                    module=func_module_path,
                    function=func_name,
                    line_number=func_line_number,
                    file_path=func_file_path,
                )
            except Exception as e:
                # Log error but don't fail the operation
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to create audit log: {str(e)}", exc_info=False)

            return result

        return wrapper
    return decorator























