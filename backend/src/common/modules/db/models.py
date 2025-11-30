"""
Database models for the application.

This module defines all SQLAlchemy models for the database schema.
"""
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    TIMESTAMP,
    DECIMAL,
    Date,
    ForeignKey,
    CheckConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from .session import Base

__all__ = [
    "Member",
    "MemberProfile",
    "PerformanceRecord",
    "PerformanceReview",
    "Project",
    "ProjectApplication",
    "Attachment",
    "Notice",
    "PressRelease",
    "Banner",
    "SystemInfo",
    "FAQ",
    "Inquiry",
    "AuditLog",
    "ApplicationLog",
    "ApplicationException",
]


class Member(Base):
    """Member (company) account table."""

    __tablename__ = "members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_number = Column(String(12), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")  # pending, active, suspended
    approval_status = Column(String(50), default="pending")  # pending, approved, rejected
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    profile = relationship("MemberProfile", back_populates="member", uselist=False, cascade="all, delete-orphan")
    performance_records = relationship("PerformanceRecord", back_populates="member", cascade="all, delete-orphan")
    project_applications = relationship("ProjectApplication", back_populates="member", cascade="all, delete-orphan")
    inquiries = relationship("Inquiry", back_populates="member", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Member(id={self.id}, business_number={self.business_number}, company_name={self.company_name})>"


class MemberProfile(Base):
    """Extended company profile information."""

    __tablename__ = "member_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), unique=True, nullable=False)
    industry = Column(String(100))
    revenue = Column(DECIMAL(15, 2))
    employee_count = Column(Integer)
    founding_date = Column(Date)
    region = Column(String(100))
    address = Column(Text)
    website = Column(String(255))
    logo_url = Column(String(500))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    member = relationship("Member", back_populates="profile")

    def __repr__(self):
        return f"<MemberProfile(id={self.id}, member_id={self.member_id})>"


class PerformanceRecord(Base):
    """Performance data submission records."""

    __tablename__ = "performance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    quarter = Column(Integer, CheckConstraint("quarter BETWEEN 1 AND 4"))
    type = Column(String(50), nullable=False)  # sales, support, ip
    status = Column(String(50), default="draft")  # draft, submitted, approved, rejected, revision_requested
    data_json = Column(JSONB, nullable=False)
    submitted_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    member = relationship("Member", back_populates="performance_records")
    reviews = relationship("PerformanceReview", back_populates="performance_record", cascade="all, delete-orphan")
    # Note: attachments are queried via Attachment.resource_type='performance' and Attachment.resource_id=self.id

    # Indexes
    __table_args__ = (
        Index("idx_performance_member_year", "member_id", "year", "quarter"),
    )

    def __repr__(self):
        return f"<PerformanceRecord(id={self.id}, member_id={self.member_id}, year={self.year}, quarter={self.quarter})>"


class PerformanceReview(Base):
    """Performance data review/approval records."""

    __tablename__ = "performance_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    performance_id = Column(UUID(as_uuid=True), ForeignKey("performance_records.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("members.id"))  # Admin member ID
    status = Column(String(50), nullable=False)  # approved, rejected, revision_requested
    comments = Column(Text)
    reviewed_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    performance_record = relationship("PerformanceRecord", back_populates="reviews")
    reviewer = relationship("Member", foreign_keys=[reviewer_id])

    def __repr__(self):
        return f"<PerformanceReview(id={self.id}, performance_id={self.performance_id}, status={self.status})>"


class Project(Base):
    """Program/project announcements."""

    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    target_audience = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    image_url = Column(String(500))
    status = Column(String(50), default="active")  # active, inactive, archived
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    applications = relationship("ProjectApplication", back_populates="project", cascade="all, delete-orphan")
    # Note: attachments are queried via Attachment.resource_type='project' and Attachment.resource_id=self.id

    def __repr__(self):
        return f"<Project(id={self.id}, title={self.title})>"


class ProjectApplication(Base):
    """Program application records."""

    __tablename__ = "project_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="submitted")  # submitted, under_review, approved, rejected
    application_reason = Column(Text)
    submitted_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    reviewed_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    member = relationship("Member", back_populates="project_applications")
    project = relationship("Project", back_populates="applications")
    # Note: attachments are queried via Attachment.resource_type='project_application' and Attachment.resource_id=self.id

    def __repr__(self):
        return f"<ProjectApplication(id={self.id}, member_id={self.member_id}, project_id={self.project_id})>"


class Attachment(Base):
    """File attachment metadata.
    
    This model uses a polymorphic pattern where resource_type and resource_id
    together identify the parent resource. Query attachments like:
    
        attachments = await db.execute(
            select(Attachment).where(
                Attachment.resource_type == 'performance',
                Attachment.resource_id == performance_record_id
            )
        )
    """

    __tablename__ = "attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    resource_type = Column(String(50), nullable=False)  # performance, project, project_application, etc.
    resource_id = Column(UUID(as_uuid=True), nullable=False)
    file_type = Column(String(50))  # image, document, etc.
    file_url = Column(String(500), nullable=False)
    original_name = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    uploaded_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Note: This model uses polymorphic relationships.
    # Parent models (PerformanceRecord, Project, ProjectApplication) should query
    # attachments via resource_type and resource_id instead of using ORM relationships.

    # Indexes
    __table_args__ = (
        Index("idx_attachments_resource", "resource_type", "resource_id"),
    )

    def __repr__(self):
        return f"<Attachment(id={self.id}, resource_type={self.resource_type}, resource_id={self.resource_id})>"


class Notice(Base):
    """Announcement/notice board."""

    __tablename__ = "notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_type = Column(String(50), default="notice")  # notice, announcement, etc.
    title = Column(String(255), nullable=False)
    content_html = Column(Text)
    author_id = Column(UUID(as_uuid=True), ForeignKey("members.id"))  # Admin member ID
    view_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    author = relationship("Member", foreign_keys=[author_id])

    # Indexes
    __table_args__ = (
        Index("idx_notices_created", "created_at"),
    )

    def __repr__(self):
        return f"<Notice(id={self.id}, title={self.title})>"


class PressRelease(Base):
    """Press release/news articles."""

    __tablename__ = "press_releases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    image_url = Column(String(500), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("members.id"))  # Admin member ID
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    author = relationship("Member", foreign_keys=[author_id])

    def __repr__(self):
        return f"<PressRelease(id={self.id}, title={self.title})>"


class Banner(Base):
    """Banner images for different pages."""

    __tablename__ = "banners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    banner_type = Column(String(50), nullable=False)  # MAIN, INTRO, PROGRAM, PERFORMANCE, SUPPORT
    image_url = Column(String(500), nullable=False)
    link_url = Column(String(500))  # Optional click-through URL
    is_active = Column(String(10), default="true")  # "true" or "false" as string
    display_order = Column(Integer, default=0)  # For sorting banners
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_banners_type_active", "banner_type", "is_active", "display_order"),
    )

    def __repr__(self):
        return f"<Banner(id={self.id}, banner_type={self.banner_type}, is_active={self.is_active})>"


class SystemInfo(Base):
    """System introduction content (singleton)."""

    __tablename__ = "system_info"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_html = Column(Text, nullable=False)  # WYSIWYG editor content
    image_url = Column(String(500))  # Optional image
    updated_by = Column(UUID(as_uuid=True), ForeignKey("members.id"))  # Admin member ID
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    updater = relationship("Member", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<SystemInfo(id={self.id}, updated_at={self.updated_at})>"


class FAQ(Base):
    """Frequently asked questions."""

    __tablename__ = "faqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(100))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<FAQ(id={self.id}, category={self.category})>"


class Inquiry(Base):
    """1:1 consultation/inquiry records."""

    __tablename__ = "inquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(50), default="pending")  # pending, replied, closed
    admin_reply = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    replied_at = Column(TIMESTAMP(timezone=True))

    # Relationships
    member = relationship("Member", back_populates="inquiries")

    def __repr__(self):
        return f"<Inquiry(id={self.id}, member_id={self.member_id}, subject={self.subject})>"


class AuditLog(Base):
    """Audit trail for system actions."""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("members.id"))
    action = Column(String(100), nullable=False)  # login, create, update, delete, etc.
    resource_type = Column(String(50))  # member, performance, project, etc.
    resource_id = Column(UUID(as_uuid=True))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("Member", foreign_keys=[user_id])

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, resource_type={self.resource_type})>"


class ApplicationLog(Base):
    """Application logs for debugging and monitoring."""

    __tablename__ = "application_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(20), nullable=False)  # backend, frontend
    level = Column(String(20), nullable=False)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message = Column(Text, nullable=False)
    module = Column(String(255))  # Module name (e.g., module path)
    function = Column(String(255))  # Function name
    line_number = Column(Integer)  # Line number
    trace_id = Column(String(100))  # Request trace ID
    user_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_method = Column(String(10))  # GET, POST, etc.
    request_path = Column(String(500))  # Request path
    request_data = Column(JSONB)  # Request payload (sanitized)
    response_status = Column(Integer)  # HTTP status code
    duration_ms = Column(Integer)  # Request duration in milliseconds
    extra_data = Column(JSONB)  # Additional context data
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("Member", foreign_keys=[user_id])

    # Indexes
    __table_args__ = (
        Index("idx_app_logs_source_level", "source", "level", "created_at"),
        Index("idx_app_logs_trace_id", "trace_id"),
        Index("idx_app_logs_user_id", "user_id", "created_at"),
        Index("idx_app_logs_created", "created_at"),
    )

    def __repr__(self):
        return f"<ApplicationLog(id={self.id}, source={self.source}, level={self.level}, created_at={self.created_at})>"


class ApplicationException(Base):
    """Application exceptions for debugging and monitoring."""

    __tablename__ = "application_exceptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(20), nullable=False)  # backend, frontend
    exception_type = Column(String(255), nullable=False)  # Exception class name
    exception_message = Column(Text, nullable=False)
    error_code = Column(String(100))  # Application error code
    status_code = Column(Integer)  # HTTP status code
    trace_id = Column(String(100))  # Request trace ID
    user_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=True)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    request_method = Column(String(10))  # GET, POST, etc.
    request_path = Column(String(500))  # Request path
    request_data = Column(JSONB)  # Request payload (sanitized)
    stack_trace = Column(Text)  # Full stack trace
    exception_details = Column(JSONB)  # Additional exception details
    context_data = Column(JSONB)  # Additional context data
    resolved = Column(String(10), default="false")  # "true" or "false" as string
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=True)
    resolution_notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("Member", foreign_keys=[user_id])
    resolver = relationship("Member", foreign_keys=[resolved_by])

    # Indexes
    __table_args__ = (
        Index("idx_app_exceptions_source_type", "source", "exception_type", "created_at"),
        Index("idx_app_exceptions_trace_id", "trace_id"),
        Index("idx_app_exceptions_user_id", "user_id", "created_at"),
        Index("idx_app_exceptions_resolved", "resolved", "created_at"),
        Index("idx_app_exceptions_created", "created_at"),
    )

    def __repr__(self):
        return f"<ApplicationException(id={self.id}, source={self.source}, exception_type={self.exception_type}, created_at={self.created_at})>"

