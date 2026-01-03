"""
Authentication dependencies.

FastAPI dependencies for authentication and authorization.
"""
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from ...common.modules.supabase.service import supabase_service
from ...common.modules.exception import (
    AuthorizationError, 
    AuthenticationError,
    CMessageTemplate,
    format_auth_user_not_found,
    format_auth_user_inactive,
    format_permission_required,
)
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
        raise AuthenticationError(CMessageTemplate.AUTH_NOT_AUTHENTICATED)

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise AuthenticationError(CMessageTemplate.AUTH_INVALID_PAYLOAD)
    except Exception as e:
        raise AuthenticationError(CMessageTemplate.AUTH_CREDENTIAL_VALIDATION_FAILED.format(error=str(e)))

    try:
        if role == "admin":
            user = await supabase_service.get_by_id('admins', user_id)
        else:
            user = await supabase_service.get_by_id('members', user_id)
        
        if user is None:
            raise AuthenticationError(format_auth_user_not_found("User"))
        
        user["role"] = role
        return user
    except ValueError:
        raise AuthenticationError(CMessageTemplate.AUTH_INVALID_ID_FORMAT.format(user_type="User"))


async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Get current active user."""
    role = current_user.get("role", "member")
    
    if role == "admin":
        if current_user.get("is_active") != "true":
            raise AuthenticationError(format_auth_user_inactive("User"))
    else:
        if current_user.get("status") != "active":
            raise AuthenticationError(format_auth_user_inactive("User"))
    
    return current_user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Get current user if authenticated, otherwise return None.
    
    This is useful for endpoints that work with or without authentication,
    like logout which should succeed even if the token is expired.
    """
    if credentials is None:
        return None

    auth_service = AuthService()
    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            return None
            
        if role == "admin":
            user = await supabase_service.get_by_id('admins', user_id)
        else:
            user = await supabase_service.get_by_id('members', user_id)
        
        if user is None:
            return None
        
        user["role"] = role
        return user
    except Exception:
        # Token invalid or expired, return None instead of raising
        return None


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
        raise AuthorizationError(format_permission_required("Member"))
    
    if current_user.get("status") != "active":
        raise AuthenticationError(format_auth_user_inactive("User"))
    
    return MemberCompat(current_user)


async def get_current_member_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> MemberCompat:
    """Get current member user."""
    auth_service = AuthService()

    if credentials is None:
        raise AuthenticationError(CMessageTemplate.AUTH_NOT_AUTHENTICATED)

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise AuthenticationError(CMessageTemplate.AUTH_INVALID_PAYLOAD)
        
        if role == "member" or role is None:
            try:
                member = await supabase_service.get_by_id('members', user_id)
                if member is None:
                    raise AuthenticationError(format_auth_user_not_found("Member"))
                
                if member.get("status") != "active":
                    raise AuthenticationError(format_auth_user_inactive("Member"))
                
                return MemberCompat(member)
            except ValueError:
                raise AuthenticationError(CMessageTemplate.AUTH_INVALID_ID_FORMAT.format(user_type="Member"))
        else:
            raise AuthorizationError(format_permission_required("Member"))
            
    except AuthorizationError:
        raise
    except Exception as e:
        raise AuthenticationError(CMessageTemplate.AUTH_CREDENTIAL_VALIDATION_FAILED.format(error=str(e)))


async def get_current_admin_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Get current admin user."""
    auth_service = AuthService()

    if credentials is None:
        raise AuthenticationError(CMessageTemplate.AUTH_NOT_AUTHENTICATED)

    token = credentials.credentials

    try:
        payload = auth_service.decode_token(token)
        user_id: str = payload.get("sub")
        role: str = payload.get("role", "member")
        
        if user_id is None:
            raise AuthenticationError(CMessageTemplate.AUTH_INVALID_PAYLOAD)
        
        if role == "admin":
            try:
                admin = await supabase_service.get_by_id('admins', user_id)
                if admin is None:
                    raise AuthenticationError(format_auth_user_not_found("Admin"))
                
                if admin.get("is_active") != "true":
                    raise AuthenticationError(format_auth_user_inactive("Admin"))
                
                return admin
            except ValueError:
                raise AuthenticationError(CMessageTemplate.AUTH_INVALID_ID_FORMAT.format(user_type="Admin"))
        else:
            raise AuthorizationError(format_permission_required("Admin"))
            
    except AuthorizationError:
        raise
    except Exception as e:
        raise AuthenticationError(CMessageTemplate.AUTH_CREDENTIAL_VALIDATION_FAILED.format(error=str(e)))
