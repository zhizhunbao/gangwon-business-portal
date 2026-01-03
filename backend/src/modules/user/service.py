"""
Authentication service.

Business logic for user authentication and authorization.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from uuid import UUID, uuid4

from ...common.modules.config import settings
from ...common.modules.supabase.service import supabase_service
from ...common.modules.exception import (
    AuthorizationError, 
    AuthenticationError, 
    ValidationError, 
    NotFoundError, 
    ErrorCode,
    CMessageTemplate,
    format_operation_failed,
)
from .schemas import MemberRegisterRequest

from enum import Enum

class UserStatus(str, Enum):
    """User and approval status constants."""
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"
    DELETED = "deleted"
    APPROVED = "approved"
    PENDING_APPROVAL = "pending"


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Authentication service class."""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT access token.

        Args:
            data: Data to encode in the token
            expires_delta: Optional expiration time delta

        Returns:
            Encoded JWT token string
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> dict:
        """
        Decode and verify a JWT token.

        Args:
            token: JWT token string

        Returns:
            Decoded token payload

        Raises:
            UnauthorizedError: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            raise AuthorizationError(CMessageTemplate.AUTH_INVALID_TOKEN)

    async def register_member(
        self, data: MemberRegisterRequest
    ) -> dict:
        """
        Register a new member.

        Args:
            data: Registration data

        Returns:
            Created member dict

        Raises:
            ValidationError: If business number or email already exists
        """
        # Check if business number already exists - use existing method
        existing_member = await supabase_service.get_member_by_business_number(data.business_number)
        if existing_member:
            raise ValidationError(CMessageTemplate.VALIDATION_BUSINESS_NUMBER_IN_USE)

        # Check if email already exists - use existing method
        existing_email = await supabase_service.get_member_by_email(data.email)
        if existing_email:
            raise ValidationError(CMessageTemplate.VALIDATION_EMAIL_IN_USE)

        member_id = str(uuid4())
        
        # Create member record with profile fields (merged schema)
        member_data = {
            "id": member_id,
            "business_number": data.business_number,
            "company_name": data.company_name,
            "email": data.email,
            "password_hash": self.get_password_hash(data.password),
            "status": "pending",
            "approval_status": "pending",
            # Profile fields (merged from member_profiles)
            "industry": data.industry,
            "revenue": data.revenue,
            "employee_count": data.employee_count,
            "founding_date": data.founding_date.isoformat() if data.founding_date else None,
            "region": data.region,
            "address": data.address,
            "representative": data.representative,
            "website": data.website,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        # Use helper method
        member = await supabase_service.create_record('members', member_data)
        if not member:
            raise ValidationError(format_operation_failed("create member"))

        # Send registration confirmation email in background (non-blocking)
        from ...common.modules.email import email_service
        from ...common.modules.email.background import send_email_background
        send_email_background(
            email_service.send_registration_confirmation_email(
                to_email=member["email"],
                company_name=member["company_name"],
                business_number=member["business_number"],
            )
        )

        return member

    async def authenticate(
        self, business_number: str, password: str
    ) -> dict:
        """
        Authenticate a member.

        Args:
            business_number: Business registration number
            password: Plain text password

        Returns:
            Authenticated member dict

        Raises:
            UnauthorizedError: If credentials are invalid or account not approved
        """
        # Find member by business number (normalized comparison handled in service)
        member = await supabase_service.get_member_by_business_number(business_number)

        if not member or not self.verify_password(password, member.get("password_hash", "")):
            raise AuthenticationError(CMessageTemplate.AUTH_INVALID_CREDENTIALS, context={"error_code": ErrorCode.INVALID_CREDENTIALS})

        if member.get("approval_status") == UserStatus.PENDING_APPROVAL.value:
            raise AuthorizationError(CMessageTemplate.USER_ACCOUNT_PENDING, context={"error_code": ErrorCode.ACCOUNT_PENDING_APPROVAL})

        if member.get("status") in [UserStatus.SUSPENDED.value, UserStatus.DELETED.value]:
            raise AuthorizationError(CMessageTemplate.USER_ACCOUNT_SUSPENDED, context={"error_code": ErrorCode.ACCOUNT_SUSPENDED})

        return member

    async def get_member_by_id(self, member_id: str) -> dict:
        """
        Get member by ID.

        Args:
            member_id: Member UUID

        Returns:
            Member dict

        Raises:
            NotFoundError: If member not found
        """
        # Use helper method
        member = await supabase_service.get_by_id('members', member_id)
        if not member:
            raise NotFoundError(resource_type="Member")
        return member

    async def is_admin(self, user_id: str) -> bool:
        """
        Check if a user is an admin by checking admins table.

        Args:
            user_id: User ID (can be admin id or member id)

        Returns:
            True if user is admin, False otherwise
        """
        try:
            # Use helper method
            admin = await supabase_service.get_by_id('admins', user_id)
            if admin and admin.get("is_active") == "true":
                return True
        except (ValueError, TypeError):
            pass
        return False

    async def authenticate_admin(
        self, email: str, password: str
    ) -> dict:
        """
        Authenticate an admin user.

        Args:
            email: Admin email
            password: Plain text password

        Returns:
            Authenticated admin dict

        Raises:
            UnauthorizedError: If credentials are invalid or user is not admin
        """
        # Find admin by email - use existing method
        admin = await supabase_service.get_admin_by_email(email)

        if not admin or not self.verify_password(password, admin.get("password_hash", "")):
            raise AuthorizationError(CMessageTemplate.AUTH_INVALID_CREDENTIALS, context={"error_code": ErrorCode.INVALID_ADMIN_CREDENTIALS})

        if admin.get("is_active") in [UserStatus.SUSPENDED.value, UserStatus.DELETED.value]:
            raise AuthorizationError(CMessageTemplate.USER_ACCOUNT_SUSPENDED, context={"error_code": ErrorCode.ACCOUNT_SUSPENDED})

        return admin

    @staticmethod
    def generate_reset_token() -> str:
        """
        Generate a secure password reset token.

        Returns:
            URL-safe random token string
        """
        import secrets
        return secrets.token_urlsafe(32)

    async def create_password_reset_request(
        self, business_number: str, email: str
    ) -> str:
        """
        Create a password reset request.

        Args:
            business_number: Business registration number
            email: Email address

        Returns:
            Reset token string

        Raises:
            NotFoundError: If member not found or email doesn't match
        """
        # Find member by business number
        member = await supabase_service.get_member_by_business_number(business_number)

        if not member or member.get("email") != email:
            # Don't reveal whether the member exists (security best practice)
            raise NotFoundError(resource_type="Member with matching email")

        # Generate reset token
        reset_token = self.generate_reset_token()

        # Set token expiration to 1 hour from now
        token_expires = datetime.utcnow() + timedelta(hours=1)

        # Update member record - use helper method
        update_data = {
            "reset_token": reset_token,
            "reset_token_expires": token_expires.isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        await supabase_service.update_record('members', member["id"], update_data)

        return reset_token

    async def reset_password_with_token(
        self, token: str, new_password: str
    ) -> dict:
        """
        Reset password using a valid token.

        Args:
            token: Reset token
            new_password: New password

        Returns:
            Updated member dict

        Raises:
            UnauthorizedError: If token is invalid or expired
            ValidationError: If password is invalid
        """
        # Find member by reset token
        member = await supabase_service.get_member_by_reset_token(token)

        if not member:
            raise AuthorizationError(CMessageTemplate.USER_INVALID_RESET_TOKEN)

        # Check if token has expired
        token_expires_str = member.get("reset_token_expires")
        if not token_expires_str:
            raise AuthorizationError(CMessageTemplate.USER_RESET_TOKEN_EXPIRED)
        
        try:
            token_expires = datetime.fromisoformat(token_expires_str.replace('Z', '+00:00'))
            if token_expires < datetime.utcnow():
                raise AuthorizationError(CMessageTemplate.USER_RESET_TOKEN_EXPIRED)
        except (ValueError, AttributeError):
            raise AuthorizationError(CMessageTemplate.USER_RESET_TOKEN_EXPIRED)

        # Update password and clear reset token - use helper method
        update_data = {
            "password_hash": self.get_password_hash(new_password),
            "reset_token": None,
            "reset_token_expires": None,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        updated_member = await supabase_service.update_record('members', member["id"], update_data)
        if not updated_member:
            raise ValidationError(format_operation_failed("update password"))

        return updated_member

    async def change_password(
        self, member: dict, current_password: str, new_password: str
    ) -> dict:
        """
        Change password for authenticated user.

        Args:
            member: Current member dict
            current_password: Current password
            new_password: New password

        Returns:
            Updated member dict

        Raises:
            UnauthorizedError: If current password is incorrect
            ValidationError: If new password is invalid
        """
        # Verify current password
        if not self.verify_password(current_password, member.get("password_hash", "")):
            raise AuthorizationError(CMessageTemplate.USER_CURRENT_PASSWORD_INCORRECT)

        # Update password - use helper method
        update_data = {
            "password_hash": self.get_password_hash(new_password),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        updated_member = await supabase_service.update_record('members', member["id"], update_data)
        if not updated_member:
            raise ValidationError(format_operation_failed("update password"))

        return updated_member

    async def check_business_number(self, business_number: str) -> dict:
        """
        Check if business number is available.

        Args:
            business_number: Business registration number

        Returns:
            dict with 'available' (bool) and 'message' (str)
        """
        # Check if business number already exists (normalized comparison handled in service)
        member = await supabase_service.get_member_by_business_number(business_number)
        
        if member:
            return {
                "available": False,
                "message": "Business number already registered"
            }
        
        return {
            "available": True,
            "message": "Business number is available"
        }

    async def check_email(self, email: str) -> dict:
        """
        Check if email is available.

        Checks both Member and Admin tables.

        Args:
            email: Email address

        Returns:
            dict with 'available' (bool) and 'message' (str)
        """
        # Check if email exists in Member table
        member = await supabase_service.get_member_by_email(email)
        if member:
            return {
                "available": False,
                "message": "Email already registered"
            }
        
        # Check if email exists in Admin table
        admin = await supabase_service.get_admin_by_email(email)
        if admin:
            return {
                "available": False,
                "message": "Email already registered"
            }
        
        return {
            "available": True,
            "message": "Email is available"
        }

