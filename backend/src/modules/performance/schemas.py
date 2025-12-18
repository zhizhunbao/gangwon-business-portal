"""
Performance schemas.

Pydantic models for performance-related requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


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


class PerformanceReviewResponse(BaseModel):
    """Performance review response schema."""

    id: UUID
    performance_id: UUID
    reviewer_id: Optional[UUID]
    status: str
    comments: Optional[str]
    reviewed_at: datetime

    class Config:
        from_attributes = True


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
    created_at: datetime
    updated_at: datetime
    reviews: list[PerformanceReviewResponse] = Field(default_factory=list)
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
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            reviews=[],
        )


class AttachmentListItem(BaseModel):
    """Attachment item for list view."""
    id: UUID
    original_name: Optional[str] = None
    file_size: Optional[int] = None


class PerformanceListItem(BaseModel):
    """Performance list item schema (simplified for list view)."""

    id: UUID
    member_id: UUID
    year: int
    quarter: Optional[int]
    type: str
    status: str
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    data_json: Optional[dict[str, Any]] = None
    reviews: list[PerformanceReviewResponse] = Field(default_factory=list)
    attachments: list[AttachmentListItem] = Field(default_factory=list)
    member_company_name: Optional[str] = None
    member_business_number: Optional[str] = None

    class Config:
        from_attributes = True


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
