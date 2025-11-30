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
from fastapi import HTTPException, status

from ...common.modules.config import settings
from ...common.modules.db.models import Member, MemberProfile
from ...common.modules.exception import UnauthorizedError, ValidationError, NotFoundError
from ...common.modules.logger import logger
from .schemas import MemberRegisterRequest, LoginRequest

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
        logger.info(
            "Register member request received",
            extra={
                "module_name": __name__,
                "business_number": data.business_number,
                "email": data.email,
            },
        )

        # Check if business number already exists
        result = await db.execute(
            select(Member).where(Member.business_number == data.business_number)
        )
        if result.scalar_one_or_none():
            logger.warning(
                "Registration failed: business number already registered",
                extra={
                    "module_name": __name__,
                    "business_number": data.business_number,
                },
            )
            raise ValidationError("Business number already registered")

        # Check if email already exists
        result = await db.execute(select(Member).where(Member.email == data.email))
        if result.scalar_one_or_none():
            logger.warning(
                "Registration failed: email already registered",
                extra={
                    "module_name": __name__,
                    "email": data.email,
                },
            )
            raise ValidationError("Email already registered")

        # Verify company information with Nice D&B API (optional, non-blocking)
        # This helps ensure data accuracy but doesn't block registration if API is unavailable
        try:
            from ...common.modules.integrations.nice_dnb import nice_dnb_client
            
            # Attempt to verify company information
            verified = await nice_dnb_client.verify_company(
                data.business_number, data.company_name
            )
            
            if not verified:
                logger.warning(
                    "Company verification failed with Nice D&B API",
                    extra={
                        "module_name": __name__,
                        "business_number": data.business_number,
                        "company_name": data.company_name,
                    },
                )
                # Note: We don't raise an error here - registration can still proceed
                # The admin will review the registration during approval
            else:
                logger.info(
                    "Company verified successfully with Nice D&B API",
                    extra={
                        "module_name": __name__,
                        "business_number": data.business_number,
                        "company_name": data.company_name,
                    },
                )
        except Exception as e:
            # Log error but don't block registration
            logger.warning(
                "Nice D&B API verification failed (non-blocking)",
                extra={
                    "module_name": __name__,
                    "business_number": data.business_number,
                    "error": str(e),
                },
            )

        # Create member record
        member = Member(
            business_number=data.business_number,
            company_name=data.company_name,
            email=data.email,
            password_hash=self.get_password_hash(data.password),
            status="pending",
            approval_status="pending",
        )
        db.add(member)
        await db.flush()

        # Create member profile
        profile = MemberProfile(
            member_id=member.id,
            industry=data.industry,
            revenue=data.revenue,
            employee_count=data.employee_count,
            founding_date=datetime.strptime(data.founding_date, "%Y-%m-%d").date()
            if data.founding_date
            else None,
            region=data.region,
            address=data.address,
            website=data.website,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(member)

        logger.info(
            "Member registered successfully",
            extra={
                "module_name": __name__,
                "member_id": str(member.id),
                "business_number": member.business_number,
            },
        )

        # Send registration confirmation email
        try:
            from ...common.modules.email import email_service
            await email_service.send_registration_confirmation_email(
                to_email=member.email,
                company_name=member.company_name,
                business_number=member.business_number,
            )
        except Exception as e:
            # Log error but don't fail registration if email fails
            logger.warning(
                "Failed to send registration confirmation email",
                extra={
                    "module_name": __name__,
                    "member_id": str(member.id),
                    "email": member.email,
                    "error": str(e),
                },
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
        logger.info(
            "Authentication attempt",
            extra={
                "module_name": __name__,
                "business_number": business_number,
            },
        )

        # Find member by business number
        result = await db.execute(
            select(Member).where(Member.business_number == business_number)
        )
        member = result.scalar_one_or_none()

        if not member or not self.verify_password(password, member.password_hash):
            logger.warning(
                "Authentication failed: invalid credentials",
                extra={
                    "module_name": __name__,
                    "business_number": business_number,
                },
            )
            raise UnauthorizedError("Invalid credentials")

        if member.approval_status != "approved":
            logger.warning(
                "Authentication failed: account pending approval",
                extra={
                    "module_name": __name__,
                    "member_id": str(member.id),
                    "business_number": member.business_number,
                },
            )
            raise UnauthorizedError("Account pending approval")

        if member.status != "active":
            logger.warning(
                "Authentication failed: account suspended",
                extra={
                    "module_name": __name__,
                    "member_id": str(member.id),
                    "business_number": member.business_number,
                },
            )
            raise UnauthorizedError("Account is suspended")

        logger.info(
            "Authentication successful",
            extra={
                "module_name": __name__,
                "member_id": str(member.id),
                "business_number": member.business_number,
            },
        )

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

    @staticmethod
    def is_admin(member: Member) -> bool:
        """
        Check if a member is an admin.

        Args:
            member: Member object

        Returns:
            True if member is admin, False otherwise
        """
        # Admin is identified by special business number
        return member.business_number == "000-00-00000"

    async def authenticate_admin(
        self, username: str, password: str, db: AsyncSession
    ) -> Member:
        """
        Authenticate an admin user.

        Args:
            username: Admin username (business_number)
            password: Plain text password
            db: Database session

        Returns:
            Authenticated admin member object

        Raises:
            UnauthorizedError: If credentials are invalid or user is not admin
        """
        logger.info(
            "Admin authentication attempt",
            extra={
                "module_name": __name__,
                "username": username,
            },
        )

        # Find member by business number or email (username)
        # Try business_number first, then email
        result = await db.execute(
            select(Member).where(
                (Member.business_number == username) | (Member.email == username)
            )
        )
        member = result.scalar_one_or_none()

        if not member or not self.verify_password(password, member.password_hash):
            logger.warning(
                "Admin authentication failed: invalid credentials",
                extra={
                    "module_name": __name__,
                    "username": username,
                },
            )
            raise UnauthorizedError("Invalid admin credentials")

        # Verify user is admin
        if not self.is_admin(member):
            logger.warning(
                "Admin authentication failed: not an admin account",
                extra={
                    "module_name": __name__,
                    "member_id": str(member.id),
                    "business_number": member.business_number,
                },
            )
            raise UnauthorizedError("Admin access required")

        if member.status != "active":
            logger.warning(
                "Admin authentication failed: account suspended",
                extra={
                    "module_name": __name__,
                    "member_id": str(member.id),
                    "business_number": member.business_number,
                },
            )
            raise UnauthorizedError("Account is suspended")

        logger.info(
            "Admin authentication successful",
            extra={
                "module_name": __name__,
                "member_id": str(member.id),
                "business_number": member.business_number,
            },
        )

        return member

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
        logger.info(
            "Password reset request received",
            extra={
                "module_name": __name__,
                "business_number": business_number,
                "email": email,
            },
        )

        # Find member by business number
        result = await db.execute(
            select(Member).where(Member.business_number == business_number)
        )
        member = result.scalar_one_or_none()

        if not member or member.email != email:
            # Don't reveal whether the member exists (security best practice)
            logger.warning(
                "Password reset request failed: member not found or email mismatch",
                extra={
                    "module_name": __name__,
                    "business_number": business_number,
                    "email": email,
                },
            )
            raise NotFoundError("Member with matching email")

        # Generate reset token
        reset_token = self.generate_reset_token()

        # Set token expiration to 1 hour from now
        token_expires = datetime.utcnow() + timedelta(hours=1)

        # Update member record
        member.reset_token = reset_token
        member.reset_token_expires = token_expires
        await db.commit()

        logger.info(
            "Password reset token generated",
            extra={
                "module_name": __name__,
                "member_id": str(member.id),
                "business_number": member.business_number,
            },
        )

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
        logger.info(
            "Password reset with token attempt",
            extra={
                "module_name": __name__,
            },
        )

        # Find member by reset token
        result = await db.execute(
            select(Member).where(Member.reset_token == token)
        )
        member = result.scalar_one_or_none()

        if not member:
            logger.warning(
                "Password reset failed: invalid reset token",
                extra={"module": __name__},
            )
            raise UnauthorizedError("Invalid reset token")

        # Check if token has expired
        if not member.reset_token_expires or member.reset_token_expires < datetime.utcnow():
            logger.warning(
                "Password reset failed: token expired",
                extra={
                    "module_name": __name__,
                    "member_id": str(member.id),
                },
            )
            raise UnauthorizedError("Reset token has expired")

        # Update password
        member.password_hash = self.get_password_hash(new_password)
        
        # Clear reset token
        member.reset_token = None
        member.reset_token_expires = None
        
        await db.commit()
        await db.refresh(member)

        logger.info(
            "Password reset successful",
            extra={
                "module_name": __name__,
                "member_id": str(member.id),
                "business_number": member.business_number,
            },
        )

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
        logger.info(
            "Password change request received",
            extra={
                "module_name": __name__,
                "member_id": str(member.id),
            },
        )

        # Verify current password
        if not self.verify_password(current_password, member.password_hash):
            logger.warning(
                "Password change failed: incorrect current password",
                extra={
                    "module_name": __name__,
                    "member_id": str(member.id),
                },
            )
            raise UnauthorizedError("Current password is incorrect")

        # Update password
        member.password_hash = self.get_password_hash(new_password)
        await db.commit()
        await db.refresh(member)

        logger.info(
            "Password changed successfully",
            extra={
                "module_name": __name__,
                "member_id": str(member.id),
                "business_number": member.business_number,
            },
        )

        return member

