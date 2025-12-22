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
from ...common.modules.exception import AuthorizationError, ValidationError, NotFoundError
from .schemas import MemberRegisterRequest

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
            raise AuthorizationError("Invalid or expired token")

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
        # Check if business number already exists
        existing_member = await supabase_service.get_member_by_business_number(data.business_number)
        if existing_member:
            raise ValidationError("Business number already registered")

        # Check if email already exists
        existing_email = await supabase_service.get_member_by_email(data.email)
        if existing_email:
            raise ValidationError("Email already registered")

        # Verify company information with Nice D&B API
        # This helps ensure data accuracy and can auto-fill company information
        nice_dnb_data = None
        from ...common.modules.integrations.nice_dnb import nice_dnb_client
        
        # Search for company information using Nice D&B API
        response = await nice_dnb_client.search_company(data.business_number)
        
        if response and response.success:
            nice_dnb_data = response.data
            
            # Optionally verify company name matches (if provided)
            # Note: Name mismatch is silently ignored - registration can still proceed
            # The admin will review the registration during approval
            if data.company_name and nice_dnb_data.company_name:
                # Case-insensitive comparison
                if nice_dnb_data.company_name.lower().strip() != data.company_name.lower().strip():
                    # Name mismatch detected but don't block registration
                    pass

        # Create member record
        # Use Nice D&B company name if available and more accurate
        company_name = data.company_name
        if nice_dnb_data and nice_dnb_data.company_name:
            # Use Nice D&B company name as it's from official records
            # This ensures consistency with official business registration
            company_name = nice_dnb_data.company_name
        
        member_id = str(uuid4())
        member_data = {
            "id": member_id,
            "business_number": data.business_number,
            "company_name": company_name,
            "email": data.email,
            "password_hash": self.get_password_hash(data.password),
            "status": "pending",
            "approval_status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        member = await supabase_service.create_member(member_data)
        if not member:
            raise ValidationError("Failed to create member")

        # Create member profile
        # Use Nice D&B data to auto-fill fields if available and not provided by user
        profile_industry = data.industry
        profile_address = data.address
        profile_founding_date = None
        
        if nice_dnb_data:
            # Auto-fill industry if not provided by user
            if not profile_industry and nice_dnb_data.industry:
                profile_industry = nice_dnb_data.industry
            
            # Auto-fill address if not provided by user
            if not profile_address and nice_dnb_data.address:
                profile_address = nice_dnb_data.address
            
            # Auto-fill founding date if not provided by user
            if not data.founding_date and nice_dnb_data.established_date:
                profile_founding_date = nice_dnb_data.established_date
            elif data.founding_date:
                profile_founding_date = data.founding_date
        elif data.founding_date:
            profile_founding_date = data.founding_date
        
        profile_data = {
            "id": str(uuid4()),
            "member_id": member_id,
            "industry": profile_industry,
            "revenue": data.revenue,
            "employee_count": data.employee_count,
            "founding_date": profile_founding_date.isoformat() if profile_founding_date else None,
            "region": data.region,
            "address": profile_address,
            "representative": data.representative,
            "website": data.website,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        profile = await supabase_service.create_member_profile(profile_data)
        if not profile:
            raise ValidationError("Failed to create member profile")

        # Send registration confirmation email
        from ...common.modules.email import email_service
        await email_service.send_registration_confirmation_email(
            to_email=member["email"],
            company_name=member["company_name"],
            business_number=member["business_number"],
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
            raise AuthorizationError("Invalid credentials", error_code="INVALID_CREDENTIALS")

        if member.get("approval_status") != "approved":
            raise AuthorizationError("Account pending approval", error_code="ACCOUNT_PENDING_APPROVAL")

        if member.get("status") != "active":
            raise AuthorizationError("Account is suspended", error_code="ACCOUNT_SUSPENDED")

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
        member = await supabase_service.get_member_by_id(member_id)
        if not member:
            raise NotFoundError("Member")
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
            admin = await supabase_service.get_admin_by_id(user_id)
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
        # Find admin by email
        admin = await supabase_service.get_admin_by_email(email)

        if not admin or not self.verify_password(password, admin.get("password_hash", "")):
            raise AuthorizationError("Invalid admin credentials", error_code="INVALID_ADMIN_CREDENTIALS")

        if admin.get("is_active") != "true":
            raise AuthorizationError("Account is suspended", error_code="ACCOUNT_SUSPENDED")

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
            raise NotFoundError("Member with matching email")

        # Generate reset token
        reset_token = self.generate_reset_token()

        # Set token expiration to 1 hour from now
        token_expires = datetime.utcnow() + timedelta(hours=1)

        # Update member record
        update_data = {
            "reset_token": reset_token,
            "reset_token_expires": token_expires.isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        await supabase_service.update_member(member["id"], update_data)

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
            raise AuthorizationError("Invalid reset token")

        # Check if token has expired
        token_expires_str = member.get("reset_token_expires")
        if not token_expires_str:
            raise AuthorizationError("Reset token has expired")
        
        try:
            token_expires = datetime.fromisoformat(token_expires_str.replace('Z', '+00:00'))
            if token_expires < datetime.utcnow():
                raise AuthorizationError("Reset token has expired")
        except (ValueError, AttributeError):
            raise AuthorizationError("Reset token has expired")

        # Update password and clear reset token
        update_data = {
            "password_hash": self.get_password_hash(new_password),
            "reset_token": None,
            "reset_token_expires": None,
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        updated_member = await supabase_service.update_member(member["id"], update_data)
        if not updated_member:
            raise ValidationError("Failed to update password")

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
            raise AuthorizationError("Current password is incorrect")

        # Update password
        update_data = {
            "password_hash": self.get_password_hash(new_password),
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        updated_member = await supabase_service.update_member(member["id"], update_data)
        if not updated_member:
            raise ValidationError("Failed to update password")

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

