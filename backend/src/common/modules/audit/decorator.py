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
            if "current_user" in kwargs:
                user = kwargs["current_user"]
                if hasattr(user, "id"):
                    # Check if it's actually an Admin object (even though param name is current_user)
                    if is_admin_user(user):
                        # Admin operations should have user_id = None
                        # because audit_logs.user_id FK only references members.id
                        user_id = None
                    else:
                        # It's a Member, use member id
                        user_id = user.id
            elif "current_admin" in kwargs:
                admin = kwargs["current_admin"]
                if hasattr(admin, "id"):
                    # For admin operations, we can't set user_id to admin.id
                    # because audit_logs.user_id FK only references members.id
                    # So we set it to None for admin operations
                    user_id = None
            else:
                # Try to find user in args
                for arg in args:
                    if hasattr(arg, "id") and hasattr(arg, "email"):
                        # Check if it's an admin (has username) or member (has business_number)
                        if is_admin_user(arg):
                            # Admin - set user_id to None
                            user_id = None
                        elif hasattr(arg, "business_number"):
                            # Member - use member id
                            user_id = arg.id
                        else:
                            # Default to member id (safer assumption)
                            user_id = arg.id
                        break

            # Extract resource_id if function provided
            resource_id: Optional[UUID] = None
            if get_resource_id and result:
                try:
                    resource_id = get_resource_id(result)
                except Exception:
                    pass

            # Get IP and user agent from request
            ip_address: Optional[str] = None
            user_agent: Optional[str] = None
            if request:
                ip_address, user_agent = get_client_info(request)

            # Create audit log entry using Supabase API (no db session required)
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
                )
            except Exception as e:
                # Log error but don't fail the operation
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to create audit log: {str(e)}", exc_info=False)

            return result

        return wrapper
    return decorator























