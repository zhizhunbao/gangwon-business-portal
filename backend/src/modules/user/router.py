"""
Authentication router.

API endpoints for user authentication and authorization.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ...common.modules.exception import UnauthorizedError
from .schemas import (
    MemberRegisterRequest,
    LoginRequest,
    AdminLoginRequest,
    PasswordResetRequest,
    PasswordReset,
    TokenResponse,
    UserInfo,
)
from .service import AuthService
from .dependencies import get_current_user, get_current_active_user

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

        # TODO: Send email with reset link
        # For now, log the token (DEVELOPMENT ONLY)
        from ...common.modules.logger import logger
        logger.info(f"Password reset requested for {data.business_number}")
        logger.info(f"Reset token: {reset_token}")

        return {
            "message": "If your email is registered, you will receive a password reset link.",
            # Include token in response for development/testing only
            "reset_token": reset_token,  # Remove this in production!
        }
    except Exception as e:
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
        member = await auth_service.reset_password_with_token(
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
    except Exception as e:
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
    current_user: Member = Depends(get_current_active_user),
):
    """
    Logout current user.

    Note: With JWT tokens, logout is typically handled client-side by removing the token.
    This endpoint can be used for audit logging or token blacklisting in the future.
    """
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

