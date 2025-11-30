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
    # Get IP address (considering proxy headers)
    ip_address = None
    if request.client:
        ip_address = request.client.host

    # Check for X-Forwarded-For header (if behind proxy)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        ip_address = forwarded_for.split(",")[0].strip()

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
            # Import here to avoid circular dependencies
            from sqlalchemy.ext.asyncio import AsyncSession
            from ..db.session import get_db

            # Execute the original function
            result = await func(*args, **kwargs)

            # Try to extract database session and request from kwargs or args
            db: Optional[AsyncSession] = None
            request: Optional[Request] = None
            user_id: Optional[UUID] = None

            # Find db session in kwargs
            if "db" in kwargs:
                db = kwargs["db"]
            else:
                # Try to find in args (usually after self)
                for arg in args:
                    if isinstance(arg, AsyncSession):
                        db = arg
                        break

            # Find request in kwargs
            if "request" in kwargs:
                request = kwargs["request"]
            else:
                # Try to find in args
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

            # Find user_id from current_user or similar
            if "current_user" in kwargs:
                user = kwargs["current_user"]
                if hasattr(user, "id"):
                    user_id = user.id
            else:
                # Try to find user in args
                for arg in args:
                    if hasattr(arg, "id") and hasattr(arg, "email"):
                        # Likely a Member instance
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

            # Create audit log entry (non-blocking, log errors but don't fail)
            if db:
                try:
                    audit_service = AuditLogService()
                    await audit_service.create_audit_log(
                        db=db,
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
                    logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)

            return result

        return wrapper
    return decorator























