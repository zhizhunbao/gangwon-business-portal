"""
Authentication router.

API endpoints for user authentication and authorization.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ...common.modules.exception import UnauthorizedError
from ...common.modules.audit import audit_log_service, get_client_info
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
async def register(
    data: MemberRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new member.

    This endpoint handles the complete member registration process including
    account creation, profile setup, and file attachments.
    """
    try:
        member = await auth_service.register_member(data, db)
        return {
            "message": "Registration successful. Please wait for admin approval.",
            "member_id": str(member.id),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Member login.

    Authenticates a member and returns a JWT access token.
    """
    try:
        member = await auth_service.authenticate(data.business_number, data.password, db)

        # Create access token
        access_token = auth_service.create_access_token(
            data={"sub": str(member.id), "role": "member"}
        )

        # Record audit log for successful login
        try:
            ip_address, user_agent = get_client_info(request)
            await audit_log_service.create_audit_log(
                db=db,
                action="login",
                user_id=member.id,
                resource_type="member",
                resource_id=member.id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as e:
            # Log error but don't fail the login
            from ...common.modules.logger import logger
            logger.error(f"Failed to create audit log for login: {str(e)}", exc_info=True)

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
            },
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(
    data: AdminLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Admin login.

    Authenticates an admin user and returns a JWT access token.
    """
    try:
        member = await auth_service.authenticate_admin(data.username, data.password, db)

        # Create access token with admin role
        access_token = auth_service.create_access_token(
            data={"sub": str(member.id), "role": "admin"}
        )

        # Record audit log for successful admin login
        try:
            ip_address, user_agent = get_client_info(request)
            await audit_log_service.create_audit_log(
                db=db,
                action="admin_login",
                user_id=member.id,
                resource_type="member",
                resource_id=member.id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as e:
            # Log error but don't fail the login
            from ...common.modules.logger import logger
            logger.error(f"Failed to create audit log for admin login: {str(e)}", exc_info=True)

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
            },
        )
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post("/password-reset-request", response_model=dict)
async def password_reset_request(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request password reset.

    Sends a password reset email to the user.
    """
    try:
        reset_token = await auth_service.create_password_reset_request(
            data.business_number, data.email, db
        )

        # Send password reset email
        from ...common.modules.email import email_service
        email_sent = await email_service.send_password_reset_email(
            to_email=data.email,
            reset_token=reset_token,
            business_number=data.business_number,
        )

        if not email_sent:
            from ...common.modules.logger import logger
            logger.warning(
                "Password reset email failed to send",
                extra={
                    "module_name": __name__,
                    "business_number": data.business_number,
                    "email": data.email,
                },
            )

        return {
            "message": "If your email is registered, you will receive a password reset link.",
        }
    except Exception:
        # Don't reveal whether email exists (security best practice)
        # Always return the same message
        return {
            "message": "If your email is registered, you will receive a password reset link."
        }


@router.post("/password-reset", response_model=dict)
async def password_reset(
    data: PasswordReset,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password with token.

    Resets the user's password using a valid reset token.
    """
    try:
        await auth_service.reset_password_with_token(
            data.token, data.new_password, db
        )

        return {
            "message": "Password reset successful. You can now login with your new password."
        }
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset password. Please try again.",
        )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: Member = Depends(get_current_active_user),
):
    """
    Get current user information.

    Returns the authenticated user's information.
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
    # Record audit log for logout
    try:
        ip_address, user_agent = get_client_info(request)
        await audit_log_service.create_audit_log(
            db=db,
            action="logout",
            user_id=current_user.id,
            resource_type="member",
            resource_id=current_user.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        # Log error but don't fail the logout
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log for logout: {str(e)}", exc_info=True)

    # TODO: Implement token blacklisting if needed
    return {"message": "Logged out successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
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
    
    try:
        member, profile = await member_service.update_member_profile(
            current_user.id, profile_update, db
        )

        # Record audit log
        try:
            ip_address, user_agent = get_client_info(request)
            await audit_log_service.create_audit_log(
                db=db,
                action="update",
                user_id=current_user.id,
                resource_type="member",
                resource_id=member.id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as e:
            from ...common.modules.logger import logger
            logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)

        return UserInfo(
            id=member.id,
            business_number=member.business_number,
            company_name=member.company_name,
            email=member.email,
            status=member.status,
            approval_status=member.approval_status,
            created_at=member.created_at,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/change-password", response_model=dict)
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
    try:
        await auth_service.change_password(
            current_user, data.current_password, data.new_password, db
        )

        # Record audit log
        try:
            ip_address, user_agent = get_client_info(request)
            await audit_log_service.create_audit_log(
                db=db,
                action="change_password",
                user_id=current_user.id,
                resource_type="member",
                resource_id=current_user.id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        except Exception as e:
            from ...common.modules.logger import logger
            logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)

        return {"message": "Password changed successfully"}
    except UnauthorizedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

