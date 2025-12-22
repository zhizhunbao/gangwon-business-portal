"""
Authentication dependencies.

FastAPI dependencies for authentication and authorization.
"""
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from ...common.modules.supabase.service import supabase_service
from ...common.modules.exception import AuthorizationError, AuthenticationError
from .service import AuthService

# NOTE:
# FastAPI's HTTPBearer raises 403 when credentials are missing by default.
# Our tests expect 401 for "no token" scenarios, so we disable auto_error
# and handle the missing-credentials case ourselves by raising AuthenticationError.
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Get current authenticated user from JWT token."""
    auth_service = AuthService()

    if credentials is None:
        raise AuthenticationError("Not authenticated")

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
    except Exception as e:
        raise AuthenticationError(f"Could not validate credentials: {str(e)}")

    try:
        if role == "admin":
            user = await supabase_service.get_admin_by_id(user_id)
        else:
            user = await supabase_service.get_member_by_id(user_id)
        
        if user is None:
            raise AuthenticationError("User not found")
        
        user["role"] = role
        return user
    except ValueError:
        raise AuthenticationError("Invalid user ID format")


async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Get current active user."""
    role = current_user.get("role", "member")
    
    if role == "admin":
        if current_user.get("is_active") != "true":
            raise AuthenticationError("Inactive user")
    else:
        if current_user.get("status") != "active":
            raise AuthenticationError("Inactive user")
    
    return current_user


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


async def get_current_active_user_compat(
    current_user: dict = Depends(get_current_user),
) -> MemberCompat:
    """Get current active user (compatibility version)."""
    role = current_user.get("role", "member")
    
    if role != "member":
        raise AuthorizationError("Member access required")
    
    if current_user.get("status") != "active":
        raise AuthenticationError("Inactive user")
    
    return MemberCompat(current_user)


async def get_current_member_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> MemberCompat:
    """Get current member user."""
    auth_service = AuthService()

    if credentials is None:
        raise AuthenticationError("Not authenticated")

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
        if role == "member" or role is None:
            try:
                member = await supabase_service.get_member_by_id(user_id)
                if member is None:
                    raise AuthenticationError("Member not found")
                
                if member.get("status") != "active":
                    raise AuthenticationError("Member account is inactive")
                
                return MemberCompat(member)
            except ValueError:
                raise AuthenticationError("Invalid member ID format")
        else:
            raise AuthorizationError("Member access required")
            
    except AuthorizationError:
        raise
    except Exception as e:
        raise AuthenticationError(f"Could not validate credentials: {str(e)}")


async def get_current_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Get current admin user."""
    auth_service = AuthService()

    if credentials is None:
        raise AuthenticationError("Not authenticated")

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise AuthenticationError("Invalid token payload")
        
        if role == "admin":
            try:
                admin = await supabase_service.get_admin_by_id(user_id)
                if admin is None:
                    raise AuthenticationError("Admin not found")
                
                if admin.get("is_active") != "true":
                    raise AuthenticationError("Admin account is inactive")
                
                return admin
            except ValueError:
                raise AuthenticationError("Invalid admin ID format")
        else:
            raise AuthorizationError("Admin access required")
            
    except AuthorizationError:
        raise
    except Exception as e:
        raise AuthenticationError(f"Could not validate credentials: {str(e)}")
