"""
Authentication service.

Business logic for user authentication and authorization.
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...common.modules.config import settings
from ...common.modules.db.models import Member, MemberProfile, Admin
from ...common.modules.exception import UnauthorizedError, ValidationError, NotFoundError
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
            raise UnauthorizedError("Invalid or expired token")

    async def register_member(
        self, data: MemberRegisterRequest, db: AsyncSession
    ) -> Member:
        """
        Register a new member.

        Args:
            data: Registration data
            db: Database session

        Returns:
            Created member object

        Raises:
            ValidationError: If business number or email already exists
        """
        # Check if business number already exists
        result = await db.execute(
            select(Member).where(Member.business_number == data.business_number)
        )
        if result.scalar_one_or_none():
            raise ValidationError("Business number already registered")

        # Check if email already exists
        result = await db.execute(select(Member).where(Member.email == data.email))
        if result.scalar_one_or_none():
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
        
        member = Member(
            business_number=data.business_number,
            company_name=company_name,
            email=data.email,
            password_hash=self.get_password_hash(data.password),
            status="pending",
            approval_status="pending",
        )
        db.add(member)
        await db.flush()

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
        
        profile = MemberProfile(
            member_id=member.id,
            industry=profile_industry,
            revenue=data.revenue,
            employee_count=data.employee_count,
            founding_date=profile_founding_date,
            region=data.region,
            address=profile_address,
            website=data.website,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(member)

        # Send registration confirmation email
        from ...common.modules.email import email_service
        await email_service.send_registration_confirmation_email(
            to_email=member.email,
            company_name=member.company_name,
            business_number=member.business_number,
        )

        return member

    async def authenticate(
        self, business_number: str, password: str, db: AsyncSession
    ) -> Member:
        """
        Authenticate a member.

        Args:
            business_number: Business registration number
            password: Plain text password
            db: Database session

        Returns:
            Authenticated member object

        Raises:
            UnauthorizedError: If credentials are invalid or account not approved
        """
        # Normalize business number (remove dashes for comparison)
        # Database may store with dashes (999-99-99999) but user may input without (9999999999)
        normalized_input = business_number.replace("-", "").replace(" ", "")
        
        # Find member by business number (compare normalized versions)
        # Use func.replace to normalize database values for comparison
        from sqlalchemy import func
        result = await db.execute(
            select(Member).where(
                func.replace(func.replace(Member.business_number, "-", ""), " ", "") == normalized_input
            )
        )
        member = result.scalar_one_or_none()

        if not member or not self.verify_password(password, member.password_hash):
            raise UnauthorizedError("Invalid credentials")

        if member.approval_status != "approved":
            raise UnauthorizedError("Account pending approval")

        if member.status != "active":
            raise UnauthorizedError("Account is suspended")

        return member

    async def get_member_by_id(self, member_id: str, db: AsyncSession) -> Member:
        """
        Get member by ID.

        Args:
            member_id: Member UUID
            db: Database session

        Returns:
            Member object

        Raises:
            NotFoundError: If member not found
        """
        from uuid import UUID

        result = await db.execute(select(Member).where(Member.id == UUID(member_id)))
        member = result.scalar_one_or_none()
        if not member:
            raise NotFoundError("Member")
        return member

    async def is_admin(self, user_id: str, db: AsyncSession) -> bool:
        """
        Check if a user is an admin by checking admins table.

        Args:
            user_id: User ID (can be admin id or member id)
            db: Database session

        Returns:
            True if user is admin, False otherwise
        """
        from uuid import UUID
        try:
            admin_id = UUID(user_id)
            result = await db.execute(
                select(Admin).where(Admin.id == admin_id)
            )
            admin = result.scalar_one_or_none()
            if admin and admin.is_active == "true":
                return True
        except (ValueError, TypeError):
            pass
        return False

    async def authenticate_admin(
        self, email: str, password: str, db: AsyncSession
    ) -> Admin:
        """
        Authenticate an admin user.

        Args:
            email: Admin email
            password: Plain text password
            db: Database session

        Returns:
            Authenticated admin object

        Raises:
            UnauthorizedError: If credentials are invalid or user is not admin
        """
        # Find admin by email
        result = await db.execute(
            select(Admin).where(Admin.email == email)
        )
        admin = result.scalar_one_or_none()

        if not admin or not self.verify_password(password, admin.password_hash):
            raise UnauthorizedError("Invalid admin credentials")

        if admin.is_active != "true":
            raise UnauthorizedError("Account is suspended")

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
        self, business_number: str, email: str, db: AsyncSession
    ) -> str:
        """
        Create a password reset request.

        Args:
            business_number: Business registration number
            email: Email address
            db: Database session

        Returns:
            Reset token string

        Raises:
            NotFoundError: If member not found or email doesn't match
        """
        # Find member by business number
        result = await db.execute(
            select(Member).where(Member.business_number == business_number)
        )
        member = result.scalar_one_or_none()

        if not member or member.email != email:
            # Don't reveal whether the member exists (security best practice)
            raise NotFoundError("Member with matching email")

        # Generate reset token
        reset_token = self.generate_reset_token()

        # Set token expiration to 1 hour from now
        token_expires = datetime.utcnow() + timedelta(hours=1)

        # Update member record
        member.reset_token = reset_token
        member.reset_token_expires = token_expires
        await db.commit()

        return reset_token

    async def reset_password_with_token(
        self, token: str, new_password: str, db: AsyncSession
    ) -> Member:
        """
        Reset password using a valid token.

        Args:
            token: Reset token
            new_password: New password
            db: Database session

        Returns:
            Updated member object

        Raises:
            UnauthorizedError: If token is invalid or expired
            ValidationError: If password is invalid
        """
        # Find member by reset token
        result = await db.execute(
            select(Member).where(Member.reset_token == token)
        )
        member = result.scalar_one_or_none()

        if not member:
            raise UnauthorizedError("Invalid reset token")

        # Check if token has expired
        if not member.reset_token_expires or member.reset_token_expires < datetime.utcnow():
            raise UnauthorizedError("Reset token has expired")

        # Update password
        member.password_hash = self.get_password_hash(new_password)
        
        # Clear reset token
        member.reset_token = None
        member.reset_token_expires = None
        
        await db.commit()
        await db.refresh(member)

        return member

    async def change_password(
        self, member: Member, current_password: str, new_password: str, db: AsyncSession
    ) -> Member:
        """
        Change password for authenticated user.

        Args:
            member: Current member object
            current_password: Current password
            new_password: New password
            db: Database session

        Returns:
            Updated member object

        Raises:
            UnauthorizedError: If current password is incorrect
            ValidationError: If new password is invalid
        """
        # Verify current password
        if not self.verify_password(current_password, member.password_hash):
            raise UnauthorizedError("Current password is incorrect")

        # Update password
        member.password_hash = self.get_password_hash(new_password)
        await db.commit()
        await db.refresh(member)

        return member

    async def check_business_number(self, business_number: str, db: AsyncSession) -> dict:
        """
        Check if business number is available.

        Args:
            business_number: Business registration number
            db: Database session

        Returns:
            dict with 'available' (bool) and 'message' (str)
        """
        # Normalize business number (remove dashes for comparison)
        from sqlalchemy import func
        normalized_input = business_number.replace("-", "").replace(" ", "")
        
        # Check if business number already exists
        result = await db.execute(
            select(Member).where(
                func.replace(func.replace(Member.business_number, "-", ""), " ", "") == normalized_input
            )
        )
        member = result.scalar_one_or_none()
        
        if member:
            return {
                "available": False,
                "message": "Business number already registered"
            }
        
        return {
            "available": True,
            "message": "Business number is available"
        }

    async def check_email(self, email: str, db: AsyncSession) -> dict:
        """
        Check if email is available.

        Checks both Member and Admin tables.

        Args:
            email: Email address
            db: Database session

        Returns:
            dict with 'available' (bool) and 'message' (str)
        """
        # Check if email exists in Member table
        result = await db.execute(
            select(Member).where(Member.email == email)
        )
        if result.scalar_one_or_none():
            return {
                "available": False,
                "message": "Email already registered"
            }
        
        # Check if email exists in Admin table
        result = await db.execute(
            select(Admin).where(Admin.email == email)
        )
        if result.scalar_one_or_none():
            return {
                "available": False,
                "message": "Email already registered"
            }
        
        return {
            "available": True,
            "message": "Email is available"
        }

