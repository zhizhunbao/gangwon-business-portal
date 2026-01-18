"""
Authentication router.

API endpoints for user authentication and authorization.
"""
from fastapi import APIRouter, Depends, status, Request

from ...common.modules.audit import audit_log
from .schemas import (
    MemberRegisterRequest,
    LoginRequest,
    AdminLoginRequest,
    PasswordResetRequest,
    PasswordReset,
    TokenResponse,
    UserInfo,
    ChangePasswordRequest,
    ProfileUpdateRequest,
    CheckAvailabilityResponse,
)
from .service import AuthService
from .dependencies import get_current_active_user, get_current_user_optional
from ...common.modules.exception import (
    AuthenticationError,
    AuthorizationError,
    CMessageTemplate,
    format_auth_user_inactive,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

auth_service = AuthService()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@audit_log(action="create", resource_type="member")
async def register(
    data: MemberRegisterRequest,
    request: Request,
):
    """Register a new member."""
    member = await auth_service.register_member(data)
    return {
        "message": "Registration successful. Please wait for admin approval.",
        "member_id": str(member["id"]),
    }


@router.post("/login", response_model=TokenResponse)
@audit_log(action="login", resource_type="member")
async def login(
    data: LoginRequest,
    request: Request,
):
    """Member login."""
    member = await auth_service.authenticate(data.business_number, data.password)

    token_data = {"sub": str(member["id"]), "role": "member"}
    access_token = auth_service.create_access_token(data=token_data)
    refresh_token = auth_service.create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=3600,  # 1 hour
        user={
            "id": str(member["id"]),
            "business_number": member["business_number"],
            "company_name": member["company_name"],
            "email": member["email"],
            "status": member["status"],
            "approval_status": member["approval_status"],
            "role": "member",
        },
    )


@router.post("/admin-login", response_model=TokenResponse)
@audit_log(action="admin_login", resource_type="admin")
async def admin_login(
    data: AdminLoginRequest,
    request: Request,
):
    """Admin login."""
    admin = await auth_service.authenticate_admin(data.email, data.password)

    token_data = {"sub": str(admin["id"]), "role": "admin"}
    access_token = auth_service.create_access_token(data=token_data)
    refresh_token = auth_service.create_refresh_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=3600,  # 1 hour
        user={
            "id": str(admin["id"]),
            "username": admin["username"],
            "email": admin["email"],
            "full_name": admin["full_name"],
            "is_active": admin["is_active"],
            "role": "admin",
        },
    )


@router.post("/password-reset-request", response_model=dict)
@audit_log(action="password_reset_request", resource_type="member")
async def password_reset_request(
    data: PasswordResetRequest,
    request: Request,
):
    """Request password reset."""
    reset_token = await auth_service.create_password_reset_request(
        data.business_number, data.email
    )

    # Send password reset email in background (non-blocking)
    from ...common.modules.email import email_service
    from ...common.modules.email.background import send_email_background
    send_email_background(
        email_service.send_password_reset_email(
            to_email=data.email,
            reset_token=reset_token,
            business_number=data.business_number,
        )
    )

    return {
        "message": "If your email is registered, you will receive a password reset link.",
    }


@router.post("/password-reset", response_model=dict)
@audit_log(action="password_reset", resource_type="member")
async def password_reset(
    data: PasswordReset,
    request: Request,
):
    """Reset password with token."""
    await auth_service.reset_password_with_token(
        data.token, data.new_password
    )

    return {
        "message": "Password reset successful. You can now login with your new password."
    }


@router.get("/me")
async def get_current_user_info(
    request: Request,
    current_user = Depends(get_current_active_user),
):
    """Get current user information."""
    role = current_user.get("role", "member")
    
    if role == "admin":
        return {
            "id": str(current_user["id"]),
            "username": current_user.get("username"),
            "email": current_user["email"],
            "full_name": current_user.get("full_name"),
            "is_active": current_user.get("is_active"),
            "role": "admin",
            "created_at": current_user.get("created_at"),
        }
    else:
        return UserInfo(
            id=current_user["id"],
            business_number=current_user["business_number"],
            company_name=current_user["company_name"],
            email=current_user["email"],
            status=current_user["status"],
            approval_status=current_user["approval_status"],
            created_at=current_user["created_at"],
        )


@router.post("/logout", response_model=dict)
@audit_log(action="logout", resource_type="member")
async def logout(
    request: Request,
    current_user = Depends(get_current_user_optional),
):
    """Logout current user.
    
    This endpoint accepts both valid and expired tokens.
    If the token is valid, it logs the user out.
    If the token is expired or missing, it still returns success
    (the user is effectively already logged out).
    """
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
):
    """Refresh access token using refresh token."""
    try:
        # 从请求体获取refresh token
        body = await request.json()
        refresh_token = body.get("refresh_token")
        
        if not refresh_token:
            raise AuthenticationError(CMessageTemplate.AUTH_NOT_AUTHENTICATED)
        
        # 解码refresh token
        payload = auth_service.decode_token(refresh_token)
        
        # 验证token类型
        if payload.get("type") != "refresh":
            raise AuthenticationError(CMessageTemplate.AUTH_INVALID_TOKEN)
        
        user_id = payload.get("sub")
        role = payload.get("role", "member")
        
        if not user_id:
            raise AuthenticationError(CMessageTemplate.AUTH_INVALID_PAYLOAD)
        
        # 根据角色获取用户信息
        if role == "admin":
            from ...common.modules.supabase.service import supabase_service
            user = await supabase_service.get_by_id('admins', user_id)
            if not user or user.get("is_active") != "true":
                raise AuthenticationError(format_auth_user_inactive("Admin"))
        else:
            from ...common.modules.supabase.service import supabase_service
            user = await supabase_service.get_by_id('members', user_id)
            if not user or user.get("status") != "active":
                raise AuthenticationError(format_auth_user_inactive("Member"))
        
        # 创建新的token对
        token_data = {"sub": user_id, "role": role}
        new_access_token = auth_service.create_access_token(data=token_data)
        new_refresh_token = auth_service.create_refresh_token(data=token_data)
        
        # 根据角色返回用户信息
        if role == "admin":
            user_info = {
                "id": str(user["id"]),
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "is_active": user["is_active"],
                "role": "admin",
            }
        else:
            user_info = {
                "id": str(user["id"]),
                "business_number": user["business_number"],
                "company_name": user["company_name"],
                "email": user["email"],
                "status": user["status"],
                "approval_status": user["approval_status"],
                "role": "member",
            }
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=3600,
            user=user_info,
        )
        
    except Exception as e:
        if isinstance(e, (AuthenticationError, AuthorizationError)):
            raise
        raise AuthenticationError(CMessageTemplate.AUTH_CREDENTIAL_VALIDATION_FAILED.format(error=str(e)))


@router.put("/profile", response_model=UserInfo)
@audit_log(action="update", resource_type="member")
async def update_profile(
    data: ProfileUpdateRequest,
    request: Request,
    current_user = Depends(get_current_active_user),
):
    """Update current user's profile."""
    return UserInfo(
        id=current_user["id"],
        business_number=current_user["business_number"],
        company_name=current_user["company_name"],
        email=current_user["email"],
        status=current_user["status"],
        approval_status=current_user["approval_status"],
        created_at=current_user["created_at"],
    )


@router.post("/change-password", response_model=dict)
@audit_log(action="change_password", resource_type="member")
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user = Depends(get_current_active_user),
):
    """Change password."""
    await auth_service.change_password(
        current_user, data.current_password, data.new_password
    )

    return {"message": "Password changed successfully"}


@router.get("/check-business-number/{business_number}", response_model=CheckAvailabilityResponse)
async def check_business_number(
    business_number: str,
    request: Request,
):
    """Check if business number is available."""
    result = await auth_service.check_business_number(business_number)
    return CheckAvailabilityResponse(**result)


@router.get("/check-email/{email}", response_model=CheckAvailabilityResponse)
async def check_email(
    email: str,
    request: Request,
):
    """Check if email is available."""
    result = await auth_service.check_email(email)
    return CheckAvailabilityResponse(**result)
