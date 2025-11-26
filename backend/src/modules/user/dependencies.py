"""
Authentication dependencies.

FastAPI dependencies for authentication and authorization.
"""
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ...common.modules.exception import UnauthorizedError, ForbiddenError
from .service import AuthService

# NOTE:
# FastAPI's HTTPBearer raises 403 when credentials are missing by default.
# Our tests expect 401 for "no token" scenarios, so we disable auto_error
# and handle the missing-credentials case ourselves by raising UnauthorizedError.
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Member:
    """
    Get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials
        db: Database session

    Returns:
        Current authenticated member

    Raises:
        UnauthorizedError: If token is invalid or user not found
    """
    auth_service = AuthService()

    # When no Authorization header is provided, return 401 instead of the
    # default 403 from HTTPBearer, to match API contract & tests.
    if credentials is None:
        raise UnauthorizedError("Not authenticated")

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise UnauthorizedError("Invalid token payload")
    except Exception as e:
        raise UnauthorizedError(f"Could not validate credentials: {str(e)}")

    # Get user from database
    from uuid import UUID

    try:
        result = await db.execute(select(Member).where(Member.id == UUID(user_id)))
        user = result.scalar_one_or_none()
        if user is None:
            raise UnauthorizedError("User not found")
        return user
    except ValueError:
        raise UnauthorizedError("Invalid user ID format")


async def get_current_active_user(
    current_user: Member = Depends(get_current_user),
) -> Member:
    """
    Get current active user.

    Args:
        current_user: Current authenticated user

    Returns:
        Active member

    Raises:
        UnauthorizedError: If user is not active
    """
    if current_user.status != "active":
        raise UnauthorizedError("Inactive user")
    return current_user


async def get_current_admin_user(
    current_user: Member = Depends(get_current_user),
) -> Member:
    """
    Get current admin user.

    Args:
        current_user: Current authenticated user

    Returns:
        Admin member

    Raises:
        UnauthorizedError: If user is not an admin
    """
    if current_user.status != "active":
        # Inactive accounts are treated as unauthorized (no valid session)
        raise UnauthorizedError("Inactive user")

    # Check if user is admin – non-admins are authenticated but forbidden
    # from accessing admin endpoints, so we raise ForbiddenError (HTTP 403).
    auth_service = AuthService()
    if not auth_service.is_admin(current_user):
        raise ForbiddenError("Admin access required")

    return current_user

