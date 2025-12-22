"""
Member schemas.

Pydantic models for member-related requests and responses.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

# Import common utilities
from ...common.utils.formatters import (
    parse_datetime,
    format_datetime_display,
    format_approval_status_display,
    format_member_status_display,
)


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
    representative: Optional[str] = Field(None, max_length=100)
    corporation_number: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)

    class Config:
        extra = 'forbid'  # 禁止额外字段，接收到未定义字段时抛出异常


class MemberListItem(BaseModel):
    """Member list item schema with formatting logic."""
    
    id: UUID
    business_number: str
    company_name: str
    email: str
    status: str
    approval_status: str
    industry: Optional[str]
    representative: Optional[str]
    address: Optional[str]
    created_at: datetime
    
    # Formatted display fields
    approval_status_display: str
    status_display: str
    created_at_display: str
    updated_at_display: str
    industry_display: str
    region_display: str

    class Config:
        from_attributes = True
        
    @classmethod
    def from_db_dict(cls, data: dict, include_admin_fields: bool = False):
        """
        Create MemberListItem from database dictionary with all formatting applied.
        
        Args:
            data: Raw database dictionary
            include_admin_fields: Whether to include admin-specific formatted fields
            
        Returns:
            Formatted MemberListItem instance
        """
        # Basic fields - let it fail if required fields are missing
        item_data = {
            "id": data["id"],
            "business_number": data["business_number"],
            "company_name": data["company_name"],
            "email": data["email"],
            "status": data["status"],
            "approval_status": data["approval_status"],
            "industry": data.get("industry", ""),  # 可以为空，提供默认值
            "representative": data.get("representative", ""),  # 可以为空，提供默认值
            "address": data.get("address", ""),  # 可以为空，提供默认值
            "created_at": cls._parse_datetime(data["created_at"]),
            
            # Formatted display fields
            "approval_status_display": cls._format_approval_status_display(data["approval_status"]),
            "status_display": cls._format_member_status_display(data["status"]),
            "created_at_display": cls._format_datetime_display(data["created_at"]),
            "industry_display": data.get("industry", ""),
            "region_display": data.get("region", ""),  # 可以为空，提供默认值
        }
        
        # Add admin-specific fields if requested
        if include_admin_fields:
            item_data.update({
                "updated_at_display": cls._format_datetime_display(data["updated_at"]),
            })
        else:
            # For non-admin, provide default values for required fields
            item_data.update({
                "updated_at_display": cls._format_datetime_display(data.get("updated_at", data["created_at"])),
            })
        
        return cls(**item_data)
    
    @staticmethod
    def _parse_datetime(dt_str) -> datetime:
        """Parse datetime string to datetime object."""
        return parse_datetime(dt_str)
    
    @staticmethod
    def _format_approval_status_display(status: str) -> str:
        """Format approval status for display."""
        return format_approval_status_display(status)
    
    @staticmethod
    def _format_member_status_display(status: str) -> str:
        """Format member status for display."""
        return format_member_status_display(status)
    
    @staticmethod
    def _format_datetime_display(dt) -> str:
        """Format datetime for display."""
        return format_datetime_display(dt)


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

    items: list[MemberListItem]
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
