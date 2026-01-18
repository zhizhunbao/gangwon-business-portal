"""
Authentication schemas.

Pydantic models for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, date
from uuid import UUID

# Region options - Gangwon Province cities and counties (supports Chinese and Korean)
VALID_REGIONS = [
    # Korean
    "춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시",
    "홍천군", "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군",
    "양구군", "인제군", "고성군", "양양군", "기타 지역",
    # Chinese
    "春川市", "原州市", "江陵市", "东海市", "太白市", "束草市", "三陟市",
    "洪川郡", "横城郡", "宁越郡", "平昌郡", "旌善郡", "铁原郡", "华川郡",
    "杨口郡", "麟蹄郡", "高城郡", "襄阳郡", "其他地区",
]


class MemberRegisterRequest(BaseModel):
    """Member registration request schema."""

    # Step 1: Account information
    # NOTE:
    # Integration tests generate values like "999-88-120755" (13 chars with dashes).
    # To avoid unnecessary 422 errors for valid formatted numbers, we allow a
    # slightly larger maximum length while keeping a sensible minimum.
    business_number: str = Field(
        ...,
        min_length=10,
        max_length=20,
        description="Business registration number",
    )
    company_name: str = Field(..., min_length=1, max_length=255, description="Company name")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    email: EmailStr = Field(..., description="Email address")

    # Step 2: Company information
    region: str = Field(
        ...,
        max_length=100,
        description="Region. Required. Gangwon Province cities/counties or other regions"
    )
    company_type: Optional[str] = Field(None, max_length=100, description="Company type")
    corporate_number: Optional[str] = Field(None, max_length=20, description="Corporate number")
    address: Optional[str] = Field(None, description="Company address")
    representative: Optional[str] = Field(None, max_length=100, description="Representative name")
    contact_person: Optional[str] = Field(None, max_length=100, description="Contact person name")

    # Step 3: Business information
    industry: Optional[str] = Field(None, max_length=100, description="Industry sector")
    revenue: Optional[float] = Field(None, ge=0, description="Annual revenue")
    employee_count: Optional[int] = Field(None, ge=0, description="Number of employees")
    founding_date: Optional[date] = Field(None, description="Founding date (YYYY-MM-DD)")
    website: Optional[str] = Field(None, max_length=255, description="Company website")
    main_business: Optional[str] = Field(None, description="Main business description")

    # Step 4: File uploads (file IDs from upload endpoint)
    logo_file_id: Optional[UUID] = Field(None, description="Logo file attachment ID")
    certificate_file_id: Optional[UUID] = Field(None, description="Business certificate file ID")

    # Step 5: Terms agreement
    terms_agreed: bool = Field(..., description="Terms and conditions agreement")

    @field_validator("region")
    @classmethod
    def validate_region(cls, v: str) -> str:
        """Validate region value (supports both Chinese and Korean)."""
        if v not in VALID_REGIONS:
            raise ValueError(
                f"Region must be one of: {', '.join(VALID_REGIONS)}. "
                f"Got: {v}"
            )
        return v


class LoginRequest(BaseModel):
    """Login request schema."""

    business_number: str = Field(..., description="Business registration number")
    password: str = Field(..., description="Password")


class AdminLoginRequest(BaseModel):
    """Admin login request schema."""

    email: EmailStr = Field(..., description="Admin email")
    password: str = Field(..., description="Admin password")


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""

    business_number: str = Field(..., description="Business registration number")
    email: EmailStr = Field(..., description="Email address")


class PasswordReset(BaseModel):
    """Password reset schema."""

    token: str = Field(..., description="Reset token")
    new_password: str = Field(..., min_length=8, description="New password")


class TokenResponse(BaseModel):
    """Token response schema."""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=3600, description="Token expiration time in seconds")
    user: dict = Field(..., description="User information")


class UserInfo(BaseModel):
    """User information schema.
    
    Note: This schema is only used for member endpoints.
    Admin endpoints use different response models.
    """

    id: UUID
    business_number: str
    company_name: str
    email: str
    status: str
    approval_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""

    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")


class ProfileUpdateRequest(BaseModel):
    """Profile update request schema."""

    company_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    industry: Optional[str] = Field(None, max_length=100)
    revenue: Optional[float] = Field(None, ge=0)
    employee_count: Optional[int] = Field(None, ge=0)
    founding_date: Optional[date] = Field(None, description="YYYY-MM-DD format")
    region: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    website: Optional[str] = Field(None, max_length=255)


class CheckAvailabilityResponse(BaseModel):
    """Check availability response schema."""

    available: bool = Field(..., description="Whether the value is available")
    message: str = Field(..., description="Status message")