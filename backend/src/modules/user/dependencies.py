"""
Authentication dependencies.

FastAPI dependencies for authentication and authorization.
"""
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from ...common.modules.supabase.service import supabase_service
from ...common.modules.exception import UnauthorizedError, ForbiddenError
from ...common.modules.logger import auto_log
from .service import AuthService

# NOTE:
# FastAPI's HTTPBearer raises 403 when credentials are missing by default.
# Our tests expect 401 for "no token" scenarios, so we disable auto_error
# and handle the missing-credentials case ourselves by raising UnauthorizedError.
security = HTTPBearer(auto_error=False)


@auto_log("get_current_user", log_resource_id=True)
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        Current authenticated user dict (member or admin)

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
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise UnauthorizedError("Invalid token payload")
    except Exception as e:
        raise UnauthorizedError(f"Could not validate credentials: {str(e)}")

    # Get user from database based on role
    try:
        if role == "admin":
            user = await supabase_service.get_admin_by_id(user_id)
        else:
            user = await supabase_service.get_member_by_id(user_id)
        
        if user is None:
            raise UnauthorizedError("User not found")
        
        # Add role to user dict for consistency
        user["role"] = role
        
        return user
    except ValueError:
        raise UnauthorizedError("Invalid user ID format")


@auto_log("get_current_active_user", log_resource_id=True)
async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Get current active user.

    Args:
        current_user: Current authenticated user dict

    Returns:
        Active user dict (member or admin)

    Raises:
        UnauthorizedError: If user is not active
    """
    role = current_user.get("role", "member")
    
    # Check active status based on user type
    if role == "admin":
        # Admins use is_active field (string "true" or "false")
        if current_user.get("is_active") != "true":
            raise UnauthorizedError("Inactive user")
    else:
        # Members use status field
        if current_user.get("status") != "active":
            raise UnauthorizedError("Inactive user")
    
    return current_user


# Temporary compatibility layer for modules that haven't been migrated yet
class MemberCompat:
    """Compatibility wrapper to make dict behave like Member object"""
    def __init__(self, data: dict):
        self._data = data
    
    def __getattr__(self, name):
        if name in self._data:
            return self._data[name]
        raise AttributeError(f"'MemberCompat' object has no attribute '{name}'")
    
    @property
    def id(self):
        return self._data.get("id")
    
    @property
    def business_number(self):
        return self._data.get("business_number")
    
    @property
    def company_name(self):
        return self._data.get("company_name")
    
    @property
    def email(self):
        return self._data.get("email")
    
    @property
    def status(self):
        return self._data.get("status")
    
    @property
    def approval_status(self):
        return self._data.get("approval_status")


@auto_log("get_current_active_user_compat", log_resource_id=True)
async def get_current_active_user_compat(
    current_user: dict = Depends(get_current_user),
) -> MemberCompat:
    """
    Get current active user (compatibility version for non-migrated modules).
    
    This returns a MemberCompat object that behaves like the old Member SQLAlchemy object.
    Use get_current_active_user for migrated modules.

    Args:
        current_user: Current authenticated user dict

    Returns:
        Active member compatibility object

    Raises:
        UnauthorizedError: If user is not active
    """
    if current_user.get("status") != "active":
        raise UnauthorizedError("Inactive user")
    return MemberCompat(current_user)


@auto_log("get_current_member_user", log_resource_id=True)
async def get_current_member_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> MemberCompat:
    """
    Get current member user.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        Member compatibility object

    Raises:
        UnauthorizedError: If user is not authenticated or not a member
        ForbiddenError: If user is authenticated but not a member
    """
    auth_service = AuthService()

    # When no Authorization header is provided, return 401
    if credentials is None:
        raise UnauthorizedError("Not authenticated")

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise UnauthorizedError("Invalid token payload")
        
        # Check if role is member in token (or default to member)
        if role == "member" or role is None:
            # Get member from database
            try:
                member = await supabase_service.get_member_by_id(user_id)
                if member is None:
                    raise UnauthorizedError("Member not found")
                
                if member.get("status") != "active":
                    raise UnauthorizedError("Member account is inactive")
                
                return MemberCompat(member)
            except ValueError:
                raise UnauthorizedError("Invalid member ID format")
        else:
            # User is authenticated but not a member (e.g., admin)
            raise ForbiddenError("Member access required")
            
    except ForbiddenError:
        raise
    except Exception as e:
        raise UnauthorizedError(f"Could not validate credentials: {str(e)}")


@auto_log("get_current_admin_user", log_resource_id=True)
async def get_current_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Get current admin user.

    Args:
        credentials: HTTP Bearer token credentials

    Returns:
        Admin user dict

    Raises:
        UnauthorizedError: If user is not authenticated or not an admin
        ForbiddenError: If user is authenticated but not an admin
    """
    auth_service = AuthService()

    # When no Authorization header is provided, return 401
    if credentials is None:
        raise UnauthorizedError("Not authenticated")

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise UnauthorizedError("Invalid token payload")
        
        # Check if role is admin in token
        if role == "admin":
            # Get admin from database
            try:
                admin = await supabase_service.get_admin_by_id(user_id)
                if admin is None:
                    raise UnauthorizedError("Admin not found")
                
                if admin.get("is_active") != "true":
                    raise UnauthorizedError("Admin account is inactive")
                
                return admin
            except ValueError:
                raise UnauthorizedError("Invalid admin ID format")
        else:
            # User is authenticated but not an admin
            raise ForbiddenError("Admin access required")
            
    except ForbiddenError:
        raise
    except Exception as e:
        raise UnauthorizedError(f"Could not validate credentials: {str(e)}")

