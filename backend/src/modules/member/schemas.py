"""
Member schemas.

Pydantic models for member-related requests and responses.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


class MemberProfileResponse(BaseModel):
    """Member profile response schema."""

    id: UUID
    business_number: str
    company_name: str
    email: str
    status: str
    approval_status: str
    industry: Optional[str] = None
    revenue: Optional[Decimal] = None
    employee_count: Optional[int] = None
    founding_date: Optional[date] = None
    region: Optional[str] = None
    address: Optional[str] = None
    representative: Optional[str] = None
    legal_number: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MemberProfileUpdate(BaseModel):
    """Member profile update schema."""

    company_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    industry: Optional[str] = Field(None, max_length=100)
    revenue: Optional[float] = Field(None, ge=0)
    employee_count: Optional[int] = Field(None, ge=0)
    founding_date: Optional[date] = Field(None, description="YYYY-MM-DD format")
    region: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = None
    representative_name: Optional[str] = Field(None, max_length=100)
    corporation_number: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)

    class Config:
        extra = 'forbid'  # 禁止额外字段，接收到未定义字段时抛出异常


class MemberListResponse(BaseModel):
    """Member list item schema."""

    id: UUID
    business_number: str
    company_name: str
    email: str
    status: str
    approval_status: str
    industry: Optional[str] = None
    representative: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        # 确保 None 值也会被包含在 JSON 响应中
        json_encoders = {
            type(None): lambda x: None
        }


class MemberListQuery(BaseModel):
    """Member list query parameters."""

    search: Optional[str] = Field(None, description="Search by company name")
    industry: Optional[str] = Field(None, description="Filter by industry")
    region: Optional[str] = Field(None, description="Filter by region")
    approval_status: Optional[str] = Field(None, description="Filter by approval status")
    status: Optional[str] = Field(None, description="Filter by status")


class MemberListResponsePaginated(BaseModel):
    """Paginated member list response."""

    items: list[MemberListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CompanyVerifyRequest(BaseModel):
    """Company verification request schema."""

    business_number: str = Field(..., min_length=10, max_length=20, description="Business registration number")
    company_name: Optional[str] = Field(None, max_length=255, description="Company name to verify (optional)")


class CompanyVerifyResponse(BaseModel):
    """Company verification response schema."""

    verified: bool = Field(..., description="Whether the company is verified")
    business_number: str = Field(..., description="Business registration number")
    company_name: Optional[str] = Field(None, description="Company name from Nice D&B")
    message: str = Field(..., description="Verification message")
    data: Optional[dict] = Field(None, description="Additional company data from Nice D&B (if available)")
