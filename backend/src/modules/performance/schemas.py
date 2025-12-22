"""
Performance schemas.

Pydantic models for performance-related requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from uuid import UUID

# Import common utilities
from ...common.utils.formatters import (
    parse_datetime,
    format_datetime_display,
    format_performance_status_display,
    format_performance_type_display,
    format_period_display,
)


class PerformanceRecordCreate(BaseModel):
    """Create performance record schema."""

    year: int = Field(..., ge=2000, le=2100, description="Performance year")
    quarter: Optional[int] = Field(None, ge=1, le=4, description="Quarter (1-4), null for annual")
    type: str = Field(..., pattern="^(sales|support|ip)$", description="Record type: sales, support, or ip")
    data_json: dict[str, Any] = Field(..., description="Performance data in JSON format")


class PerformanceRecordUpdate(BaseModel):
    """Update performance record schema (for draft/revision_requested only)."""

    year: Optional[int] = Field(None, ge=2000, le=2100, description="Performance year")
    quarter: Optional[int] = Field(None, ge=1, le=4, description="Quarter (1-4)")
    type: Optional[str] = Field(None, pattern="^(sales|support|ip)$", description="Record type")
    data_json: Optional[dict[str, Any]] = Field(None, description="Performance data in JSON format")


class PerformanceRecordResponse(BaseModel):
    """Performance record response schema."""

    id: UUID
    member_id: UUID
    year: int
    quarter: Optional[int]
    type: str
    status: str
    data_json: dict[str, Any]
    submitted_at: Optional[datetime]
    
    # Review fields (merged from performance_reviews)
    reviewer_id: Optional[UUID]
    review_status: Optional[str]
    review_comments: Optional[str]
    reviewed_at: Optional[datetime]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Legacy field for backward compatibility
    reviews: list = Field(default_factory=list, description="Deprecated: reviews are now integrated")
    attachments: list[dict[str, Any]] = Field(default_factory=list)

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_without_reviews(cls, obj):
        """Create response from ORM object without loading reviews."""
        return cls(
            id=obj.id,
            member_id=obj.member_id,
            year=obj.year,
            quarter=obj.quarter,
            type=obj.type,
            status=obj.status,
            data_json=obj.data_json,
            submitted_at=obj.submitted_at,
            reviewer_id=obj.reviewer_id,
            review_status=obj.review_status,
            review_comments=obj.review_comments,
            reviewed_at=obj.reviewed_at,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            reviews=[],
            attachments=[],
        )


class AttachmentListItem(BaseModel):
    """Attachment item for list view."""
    id: UUID
    original_name: str
    file_size: int


class PerformanceListItem(BaseModel):
    """Performance list item schema with formatting logic."""

    id: UUID
    member_id: UUID
    year: int
    quarter: Optional[int]  # 可以为空，因为年度记录没有季度
    type: str
    status: str
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    data_json: dict[str, Any]
    
    # Review fields (merged from performance_reviews)
    reviewer_id: Optional[UUID]
    review_status: Optional[str]
    review_comments: Optional[str]
    reviewed_at: Optional[datetime]
    
    # Legacy field for backward compatibility
    reviews: list = Field(default_factory=list, description="Deprecated: reviews are now integrated")
    attachments: list[AttachmentListItem]
    member_company_name: str
    member_business_number: str
    
    # Formatted display fields
    status_display: str
    type_display: str
    period_display: str
    submitted_at_display: str
    created_at_display: str
    updated_at_display: str
    review_status_display: Optional[str] = None

    class Config:
        from_attributes = True
        
    @classmethod
    def from_db_dict(cls, data: dict, include_admin_fields: bool = False):
        """
        Create PerformanceListItem from database dictionary with all formatting applied.
        
        Args:
            data: Raw database dictionary
            include_admin_fields: Whether to include admin-specific formatted fields
            
        Returns:
            Formatted PerformanceListItem instance
        """
        # Basic fields - let it fail if required fields are missing
        item_data = {
            "id": data["id"],
            "member_id": data["member_id"],
            "year": data["year"],
            "quarter": data.get("quarter"),  # 可以为空，用 get() 方法
            "type": data["type"],
            "status": data["status"],
            "submitted_at": cls._parse_datetime(data["submitted_at"]) if data.get("submitted_at") else None,
            "created_at": cls._parse_datetime(data["created_at"]),
            "updated_at": cls._parse_datetime(data["updated_at"]),
            "data_json": data["data_json"],
            
            # Review fields (merged from performance_reviews)
            "reviewer_id": data.get("reviewer_id"),
            "review_status": data.get("review_status"),
            "review_comments": data.get("review_comments"),
            "reviewed_at": cls._parse_datetime(data["reviewed_at"]) if data.get("reviewed_at") else None,
            
            # Legacy and other fields
            "reviews": [],  # Empty for backward compatibility
            "attachments": data.get("attachments", []),
            "member_company_name": data["member_company_name"],
            "member_business_number": data["member_business_number"],
            
            # Formatted display fields
            "status_display": cls._format_status_display(data["status"]),
            "type_display": cls._format_type_display(data["type"]),
            "period_display": cls._format_period_display(data["year"], data.get("quarter")),
            "submitted_at_display": cls._format_datetime_display(data["submitted_at"]) if data.get("submitted_at") else "",
            "created_at_display": cls._format_datetime_display(data["created_at"]),
            "review_status_display": cls._format_review_status_display(data.get("review_status")) if data.get("review_status") else None,
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
    def _format_status_display(status: str) -> str:
        """Format status for display."""
        return format_performance_status_display(status)
    
    @staticmethod
    def _format_type_display(type_str: str) -> str:
        """Format type for display."""
        return format_performance_type_display(type_str)
    
    @staticmethod
    def _format_period_display(year: int, quarter: Optional[int]) -> str:
        """Format period for display."""
        return format_period_display(year, quarter)
    
    @staticmethod
    def _format_datetime_display(dt) -> str:
        """Format datetime for display."""
        return format_datetime_display(dt)
    
    @staticmethod
    def _format_review_status_display(review_status: str) -> str:
        """Format review status for display."""
        review_status_map = {
            "approved": "승인됨",
            "rejected": "거부됨", 
            "revision_requested": "수정요청",
        }
        return review_status_map.get(review_status, review_status)


class PerformanceListQuery(BaseModel):
    """Performance list query parameters."""

    year: Optional[int] = Field(None, description="Filter by year")
    quarter: Optional[int] = Field(None, ge=1, le=4, description="Filter by quarter")
    status: Optional[str] = Field(None, description="Filter by status")
    type: Optional[str] = Field(None, description="Filter by type (sales/support/ip)")
    member_id: Optional[UUID] = Field(None, description="Filter by member (admin only)")
    search_keyword: Optional[str] = Field(None, description="Search keyword for company name, business number, or year")


class PerformanceListResponsePaginated(BaseModel):
    """Paginated performance list response."""

    items: list[PerformanceListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class PerformanceApprovalRequest(BaseModel):
    """Admin approval/rejection request schema."""

    comments: Optional[str] = Field(None, max_length=1000, description="Review comments")
