"""
Authentication router.

API endpoints for user authentication and authorization.
"""
from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ...common.modules.audit import audit_log
from ...common.modules.logger import auto_log
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
)
from .service import AuthService
from .dependencies import get_current_active_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])

auth_service = AuthService()


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@auto_log("register_member", log_resource_id=True)
@audit_log(action="create", resource_type="member")
async def register(
    data: MemberRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new member.

    This endpoint handles the complete member registration process including
    account creation, profile setup, and file attachments.
    """
    member = await auth_service.register_member(data, db)
    return {
        "message": "Registration successful. Please wait for admin approval.",
        "member_id": str(member.id),
    }


@router.post("/login", response_model=TokenResponse)
@auto_log("login_member", log_resource_id=True)
@audit_log(action="login", resource_type="member")
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Member login.

    Authenticates a member and returns a JWT access token.
    """
    member = await auth_service.authenticate(data.business_number, data.password, db)

    # Create access token
    access_token = auth_service.create_access_token(
        data={"sub": str(member.id), "role": "member"}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": str(member.id),
            "business_number": member.business_number,
            "company_name": member.company_name,
            "email": member.email,
            "status": member.status,
            "approval_status": member.approval_status,
            "role": "member",  # Add role field for frontend authorization
        },
    )


@router.post("/admin-login", response_model=TokenResponse)
@auto_log("admin_login", log_resource_id=True)
@audit_log(action="admin_login", resource_type="admin")
async def admin_login(
    data: AdminLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Admin login.

    Authenticates an admin user and returns a JWT access token.
    """
    admin = await auth_service.authenticate_admin(data.email, data.password, db)

    # Create access token with admin role
    access_token = auth_service.create_access_token(
        data={"sub": str(admin.id), "role": "admin"}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": str(admin.id),
            "username": admin.username,
            "email": admin.email,
            "full_name": admin.full_name,
            "is_active": admin.is_active,
            "role": "admin",  # Admin login always returns admin role
        },
    )


@router.post("/password-reset-request", response_model=dict)
@auto_log("password_reset_request")
async def password_reset_request(
    data: PasswordResetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Request password reset.

    Sends a password reset email to the user.
    """
    reset_token = await auth_service.create_password_reset_request(
        data.business_number, data.email, db
    )

    # Send password reset email
    from ...common.modules.email import email_service
    await email_service.send_password_reset_email(
        to_email=data.email,
        reset_token=reset_token,
        business_number=data.business_number,
    )

    return {
        "message": "If your email is registered, you will receive a password reset link.",
    }


@router.post("/password-reset", response_model=dict)
@auto_log("password_reset")
async def password_reset(
    data: PasswordReset,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password with token.

    Resets the user's password using a valid reset token.
    """
    await auth_service.reset_password_with_token(
        data.token, data.new_password, db
    )

    return {
        "message": "Password reset successful. You can now login with your new password."
    }


@router.get("/me", response_model=UserInfo)
@auto_log("get_current_user_info")
async def get_current_user_info(
    request: Request,
    current_user: Member = Depends(get_current_active_user),
):
    """
    Get current user information.

    Returns the authenticated member's information.
    """
    return UserInfo(
        id=current_user.id,
        business_number=current_user.business_number,
        company_name=current_user.company_name,
        email=current_user.email,
        status=current_user.status,
        approval_status=current_user.approval_status,
        created_at=current_user.created_at,
    )


@router.post("/logout", response_model=dict)
@auto_log("logout", log_resource_id=True)
@audit_log(action="logout", resource_type="member")
async def logout(
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Logout current user.

    Note: With JWT tokens, logout is typically handled client-side by removing the token.
    This endpoint can be used for audit logging or token blacklisting in the future.
    """
    # TODO: Implement token blacklisting if needed
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
@auto_log("refresh_token")
async def refresh_token(
    request: Request,
    current_user: Member = Depends(get_current_active_user),
):
    """
    Refresh access token.

    Generates a new access token for the current user.
    """
    access_token = auth_service.create_access_token(
        data={"sub": str(current_user.id), "role": "member"}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": str(current_user.id),
            "business_number": current_user.business_number,
            "company_name": current_user.company_name,
            "email": current_user.email,
            "status": current_user.status,
            "approval_status": current_user.approval_status,
        },
    )


@router.put("/profile", response_model=UserInfo)
@auto_log("update_profile", log_resource_id=True)
@audit_log(action="update", resource_type="member")
async def update_profile(
    data: ProfileUpdateRequest,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user's profile.

    Updates the authenticated user's profile information.
    """
    from ..member.service import MemberService
    from ..member.schemas import MemberProfileUpdate
    
    member_service = MemberService()
    
    # Convert ProfileUpdateRequest to MemberProfileUpdate
    profile_update = MemberProfileUpdate(
        company_name=data.company_name,
        email=data.email,
        industry=data.industry,
        revenue=data.revenue,
        employee_count=data.employee_count,
        founding_date=data.founding_date,
        region=data.region,
        address=data.address,
        website=data.website,
    )
    
    member, profile = await member_service.update_member_profile(
        current_user.id, profile_update, db
    )

    return UserInfo(
        id=member.id,
        business_number=member.business_number,
        company_name=member.company_name,
        email=member.email,
        status=member.status,
        approval_status=member.approval_status,
        created_at=member.created_at,
    )


@router.post("/change-password", response_model=dict)
@auto_log("change_password", log_resource_id=True)
@audit_log(action="change_password", resource_type="member")
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user: Member = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change password.

    Changes the authenticated user's password.
    """
    await auth_service.change_password(
        current_user, data.current_password, data.new_password, db
    )

    return {"message": "Password changed successfully"}

