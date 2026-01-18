"""
Database models for the application.

This module defines all SQLAlchemy models for the database schema.
Models只负责数据库字段定义，格式化逻辑在formatters.py中处理。
"""
from sqlalchemy import (
    Boolean,
    Column,
    String,
    Integer,
    Text,
    TIMESTAMP,
    DECIMAL,
    Date,
    Float,
    ForeignKey,
    CheckConstraint,
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from .session import Base

__all__ = [
    "Member",
    "PerformanceRecord", 
    "Project",
    "ProjectApplication",
    "ApplicationStatusHistory",
    "Notification",
    "Notice",
    "Banner",
    "SystemInfo",
    "LegalContent",
    "FAQ",
    "Inquiry",
    "AuditLog",
    "AppLog", 
    "ErrorLog",
    "SystemLog",
    "PerformanceLog",
    "Admin",
    "Message",
    "NiceDnbCompanyInfo",
]


class Member(Base):
    """Member (company) account table with integrated profile information."""

    __tablename__ = "members"

    # Basic member fields
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_number = Column(String(12), unique=True, nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")  # pending, active, suspended
    approval_status = Column(String(50), default="pending")  # pending, approved, rejected
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Profile fields (merged from member_profiles table)
    industry = Column(String(100))
    revenue = Column(DECIMAL(15, 2))
    employee_count = Column(Integer)
    founding_date = Column(Date)
    region = Column(String(100))
    address = Column(Text)
    representative = Column(String(100))
    representative_birth_date = Column(Date)  # 代表者出生日期
    representative_gender = Column(String(10))  # 代表者性别 (male/female)
    representative_phone = Column(String(20))  # 代表者电话号码
    legal_number = Column(String(20))
    phone = Column(String(20))  # 企业电话号码
    website = Column(String(255))
    logo_url = Column(String(500))
    
    # Contact person fields (担当者信息 - 登录系统的经办人员)
    contact_person_name = Column(String(100))
    contact_person_department = Column(String(100))
    contact_person_position = Column(String(100))
    contact_person_phone = Column(String(20))  # 担当者电话号码
    
    # Business info fields
    main_business = Column(Text)  # 主要事业及产品
    description = Column(Text)  # 企业介绍
    cooperation_fields = Column(Text)  # 产业合作希望领域 (JSON array as text)
    
    # New business info fields (Task 5) - 창업구분, 한국표준산업분류코드
    startup_type = Column(String(50))  # 창업구분: preliminary, startup_under_3years, growth_over_7years, restart
    ksic_major = Column(String(10))  # 한국표준산업분류코드[대분류]: A-U
    ksic_sub = Column(String(10))  # 지역주력산업코드[중분류]: 2-digit code
    category = Column(String(50))  # 기업 유형: tech, manufacturing, service, retail, other
    
    # New fields for Task 6 - 참여 프로그램, 투자 유치
    participation_programs = Column(Text)  # 참여 프로그램 (JSON array as text)
    investment_status = Column(Text)  # 투자 유치 (JSON object as text)
    
    # Soft delete field
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships (removed profile relationship since it's merged)
    performance_records = relationship("PerformanceRecord", back_populates="member", foreign_keys="PerformanceRecord.member_id", cascade="all, delete-orphan")
    project_applications = relationship("ProjectApplication", back_populates="member", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_members_deleted_at", "deleted_at"),
    )

    def __repr__(self):
        return f"<Member(id={self.id}, business_number={self.business_number}, company_name={self.company_name})>"


class PerformanceRecord(Base):
    """Performance data submission records with integrated review information."""

    __tablename__ = "performance_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    quarter = Column(Integer, CheckConstraint("quarter BETWEEN 1 AND 4"))
    type = Column(String(50), nullable=False)  # sales, support, ip
    status = Column(String(50), default="draft")  # draft, submitted, approved, rejected, revision_requested
    data_json = Column(JSONB, nullable=False)
    submitted_at = Column(TIMESTAMP(timezone=True))
    
    # Export fields (Task 4: HSK code and export countries)
    hsk_code = Column(String(10), nullable=True)  # 海关税则商品分类代码 (10位数字)
    export_country1 = Column(String(100), nullable=True)  # 出口国家1
    export_country2 = Column(String(100), nullable=True)  # 出口国家2
    
    # Review fields (merged from performance_reviews table)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    review_status = Column(String(50), nullable=True)  # approved, rejected, revision_requested
    review_comments = Column(Text, nullable=True)
    reviewed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Soft delete field
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Attachments stored as JSONB
    attachments = Column(JSONB, nullable=True)
    
    # Relationships (removed reviews relationship since it's merged)
    member = relationship("Member", back_populates="performance_records", foreign_keys=[member_id])
    reviewer = relationship("Admin", foreign_keys=[reviewer_id])

    # Indexes
    __table_args__ = (
        Index("idx_performance_member_year", "member_id", "year", "quarter"),
        Index("idx_performance_records_deleted_at", "deleted_at"),
    )

    def __repr__(self):
        return f"<PerformanceRecord(id={self.id}, member_id={self.member_id}, year={self.year}, quarter={self.quarter}, status={self.status})>"


class Project(Base):
    """Program/project announcements."""

    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    target_company_name = Column(String(255), nullable=True)  # 受理企业名称
    target_business_number = Column(String(12), nullable=True)  # 受理企业营业执照号
    start_date = Column(Date)
    end_date = Column(Date)
    image_url = Column(String(500))
    status = Column(String(50), default="active")  # active, inactive, archived
    attachments = Column(JSONB, nullable=True)  # Store file attachments as JSON array
    
    # Soft delete field
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    applications = relationship("ProjectApplication", back_populates="project", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_projects_deleted_at", "deleted_at"),
    )

    def __repr__(self):
        return f"<Project(id={self.id}, title={self.title})>"


class ProjectApplication(Base):
    """Program application records."""

    __tablename__ = "project_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="submitted")  # submitted, under_review, approved, rejected, needs_supplement, cancelled
    application_reason = Column(Text)
    submitted_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    reviewed_at = Column(TIMESTAMP(timezone=True))
    
    # Review fields
    review_note = Column(Text, nullable=True)  # 审核备注/拒绝原因
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)  # 审核人 (admin id)
    material_request = Column(Text, nullable=True)  # 补充材料请求
    material_response = Column(Text, nullable=True)  # 会员补充材料回复
    
    # Attachments stored as JSONB
    attachments = Column(JSONB, nullable=True)
    
    # Soft delete field
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    member = relationship("Member", back_populates="project_applications")
    project = relationship("Project", back_populates="applications")

    # Indexes
    __table_args__ = (
        Index("idx_project_applications_deleted_at", "deleted_at"),
        Index("idx_project_applications_reviewed_by", "reviewed_by"),
    )

    def __repr__(self):
        return f"<ProjectApplication(id={self.id}, member_id={self.member_id}, project_id={self.project_id})>"


class ApplicationStatusHistory(Base):
    """Application status change history for audit trail."""

    __tablename__ = "application_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), nullable=False)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(UUID(as_uuid=True), nullable=True)
    changed_by_type = Column(String(20), nullable=False)  # admin, member, system
    note = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_status_history_application_id", "application_id"),
        Index("idx_status_history_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<ApplicationStatusHistory(id={self.id}, application_id={self.application_id}, new_status={self.new_status})>"


class Notification(Base):
    """Member notifications."""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), nullable=False)
    type = Column(String(50), nullable=False)  # application_status, message, system
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=True)
    related_id = Column(UUID(as_uuid=True), nullable=True)
    related_type = Column(String(50), nullable=True)  # application, message, etc.
    is_read = Column(Boolean, nullable=False, server_default="false")
    read_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_notifications_member_id", "member_id"),
        Index("idx_notifications_is_read", "is_read"),
        Index("idx_notifications_created_at", "created_at"),
        Index("idx_notifications_member_unread", "member_id", "is_read", "created_at"),
    )

    def __repr__(self):
        return f"<Notification(id={self.id}, member_id={self.member_id}, type={self.type})>"


class Notice(Base):
    """Announcement/notice board."""

    __tablename__ = "notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_type = Column(String(50), default="notice")  # notice, announcement, etc.
    title = Column(String(255), nullable=False)
    content_html = Column(Text)
    author_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=True)  # Can be NULL for admin-created content
    view_count = Column(Integer, default=0)
    attachments = Column(JSONB, nullable=True)  # Store file attachments as JSON array
    
    # Soft delete field
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    author = relationship("Member", foreign_keys=[author_id])

    # Indexes
    __table_args__ = (
        Index("idx_notices_created", "created_at"),
        Index("idx_notices_deleted_at", "deleted_at"),
    )

    def __repr__(self):
        return f"<Notice(id={self.id}, title={self.title})>"


class Banner(Base):
    """Banner images for different pages."""

    __tablename__ = "banners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    banner_type = Column(String(50), nullable=False)  # MAIN, INTRO, PROGRAM, PERFORMANCE, SUPPORT
    image_url = Column(String(500), nullable=False)
    mobile_image_url = Column(String(500), nullable=True)  # Mobile banner image URL
    link_url = Column(String(500))  # Optional click-through URL
    # Multilingual title and subtitle (ko=Korean, zh=Chinese)
    title_ko = Column(String(200))
    title_zh = Column(String(200))
    subtitle_ko = Column(String(500))
    subtitle_zh = Column(String(500))
    is_active = Column(String(10), default="true")  # "true" or "false" as string
    display_order = Column(Integer, default=0)  # For sorting banners
    
    # Soft delete field
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_banners_type_active", "banner_type", "is_active", "display_order"),
        Index("idx_banners_deleted_at", "deleted_at"),
    )

    def __repr__(self):
        return f"<Banner(id={self.id}, banner_type={self.banner_type}, is_active={self.is_active})>"


class SystemInfo(Base):
    """System introduction content (singleton)."""

    __tablename__ = "system_info"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_html = Column(Text, nullable=False)  # WYSIWYG editor content
    image_url = Column(String(500))  # Optional image
    updated_by = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=True)  # Member ID (NULL for admin updates)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    updater = relationship("Member", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<SystemInfo(id={self.id}, updated_at={self.updated_at})>"


class LegalContent(Base):
    """Legal content for terms of service and privacy policy."""

    __tablename__ = "legal_content"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    content_type = Column(String(50), unique=True, nullable=False)  # 'terms_of_service' or 'privacy_policy'
    content_html = Column(Text, nullable=False)  # WYSIWYG editor content
    updated_by = Column(UUID(as_uuid=True), nullable=True)  # Admin ID (no FK - admins table)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_legal_content_type", "content_type"),
    )

    def __repr__(self):
        return f"<LegalContent(id={self.id}, content_type={self.content_type})>"


class FAQ(Base):
    """Frequently asked questions."""

    __tablename__ = "faqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String(100))
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    display_order = Column(Integer, default=0)
    
    # Soft delete field
    deleted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_faqs_deleted_at", "deleted_at"),
    )

    def __repr__(self):
        return f"<FAQ(id={self.id}, category={self.category})>"


class AuditLog(Base):
    """Audit trail for system actions.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, request_id, user_id, duration_ms
    - 扩展字段：extra_data (包含 action, result, ip_address, user_agent, resource_type, resource_id)
    """

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Common fields (9)
    source = Column(String(20), nullable=False, default="backend")
    level = Column(String(20), nullable=False, default="INFO")
    message = Column(Text, nullable=False)  # Format: "Audit: {action} {result}"
    layer = Column(String(100), default="Auth")
    module = Column(String(255))
    function = Column(String(255))
    line_number = Column(Integer)
    file_path = Column(String(500))  # Full file path for debugging
    
    # Trace fields
    trace_id = Column(String(100))
    request_id = Column(String(100))
    user_id = Column(UUID(as_uuid=True), nullable=True)  # No FK - can be admin or member
    duration_ms = Column(Integer)
    
    # Extension field
    extra_data = Column(JSONB)  # action, result, ip_address, user_agent, resource_type, resource_id
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Indexes
    __table_args__ = (
        Index("idx_audit_logs_trace_id", "trace_id"),
        Index("idx_audit_logs_user_id", "user_id", "created_at"),
        Index("idx_audit_logs_created", "created_at"),
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, message={self.message[:50] if self.message else ''})>"


class AppLog(Base):
    """Application logs for debugging and monitoring.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number
    - 追踪字段：trace_id, request_id, user_id, duration_ms
    - 扩展字段：extra_data (包含 ip_address, user_agent, request_method, request_path, response_status 等)
    """

    __tablename__ = "app_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Common fields (9)
    source = Column(String(20), nullable=False)  # backend, frontend
    level = Column(String(20), nullable=False)   # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message = Column(Text, nullable=False)
    layer = Column(String(100))  # Router, Auth, Service, Database, etc.
    module = Column(String(255))  # Module path (e.g., common.modules.interceptor)
    function = Column(String(255))
    line_number = Column(Integer)
    file_path = Column(String(500))  # Full file path for debugging
    
    # Trace fields (4)
    trace_id = Column(String(100))
    request_id = Column(String(100))
    user_id = Column(UUID(as_uuid=True), nullable=True)  # No FK - user may be deleted
    duration_ms = Column(Integer)
    
    # Extension field
    extra_data = Column(JSONB)  # ip_address, user_agent, request_method, request_path, response_status, etc.
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Indexes (no relationship - user_id has no FK)
    __table_args__ = (
        Index("idx_app_logs_source_level", "source", "level", "created_at"),
        Index("idx_app_logs_trace_id", "trace_id"),
        Index("idx_app_logs_user_id", "user_id", "created_at"),
        Index("idx_app_logs_created", "created_at"),
    )

    def __repr__(self):
        return f"<AppLog(id={self.id}, source={self.source}, level={self.level}, created_at={self.created_at})>"


class ErrorLog(Base):
    """Error logs for exception tracking and debugging.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, request_id, user_id
    - 扩展字段：extra_data (包含 error_type, error_message, stack_trace, request_method, request_path 等)
    """

    __tablename__ = "error_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Common fields (9)
    source = Column(String(20), nullable=False)
    level = Column(String(20), nullable=False, default="ERROR")
    message = Column(Text, nullable=False)  # Format: "{error_type}: {error_message}"
    layer = Column(String(100))
    module = Column(String(255))
    function = Column(String(255))
    line_number = Column(Integer)
    file_path = Column(String(500))  # Full file path for debugging
    
    # Trace fields
    trace_id = Column(String(100))
    request_id = Column(String(100))
    user_id = Column(UUID(as_uuid=True), nullable=True)  # No FK - user may be deleted
    
    # Extension field
    extra_data = Column(JSONB)  # error_type, error_message, stack_trace, error_code, status_code, request_method, request_path, ip_address
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Indexes (no relationship - user_id has no FK)
    __table_args__ = (
        Index("idx_error_logs_source_level", "source", "level", "created_at"),
        Index("idx_error_logs_trace_id", "trace_id"),
        Index("idx_error_logs_user_id", "user_id", "created_at"),
        Index("idx_error_logs_created", "created_at"),
    )

    def __repr__(self):
        return f"<ErrorLog(id={self.id}, source={self.source}, level={self.level}, created_at={self.created_at})>"


class SystemLog(Base):
    """System logs for infrastructure and operational monitoring.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 扩展字段：extra_data (包含 server, host, port, workers 等)
    """

    __tablename__ = "system_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Common fields (9)
    source = Column(String(20), nullable=False, default="backend")
    level = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    layer = Column(String(100), default="System")
    module = Column(String(255))  # Logger name (uvicorn, sqlalchemy, etc.)
    function = Column(String(255))
    line_number = Column(Integer)
    file_path = Column(String(500))  # Full file path for debugging
    
    # Extension field
    extra_data = Column(JSONB)  # server, host, port, workers
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Indexes
    __table_args__ = (
        Index("idx_system_logs_level", "level", "created_at"),
        Index("idx_system_logs_created", "created_at"),
    )

    def __repr__(self):
        return f"<SystemLog(id={self.id}, level={self.level}, created_at={self.created_at})>"


class PerformanceLog(Base):
    """Performance logs for monitoring application and system performance.
    
    按日志规范：
    - 通用字段：source, level, message, layer, module, function, line_number, file_path
    - 追踪字段：trace_id, request_id, user_id, duration_ms
    - 扩展字段：extra_data (包含 metric_name, metric_value, metric_unit, threshold_ms, is_slow 等)
    """

    __tablename__ = "performance_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Common fields (9)
    source = Column(String(20), nullable=False)
    level = Column(String(20), nullable=False, default="INFO")
    message = Column(Text, nullable=False)  # Format: "Slow {type}: {target} ({duration}ms > {threshold}ms)"
    layer = Column(String(100), default="Performance")
    module = Column(String(255))
    function = Column(String(255))
    line_number = Column(Integer)
    file_path = Column(String(500))  # Full file path for debugging
    
    # Trace fields
    trace_id = Column(String(100))
    request_id = Column(String(100))
    user_id = Column(UUID(as_uuid=True), nullable=True)  # No FK - user may be deleted
    duration_ms = Column(Integer)
    
    # Extension field
    extra_data = Column(JSONB)  # metric_name, metric_value, metric_unit, threshold_ms, is_slow, component_name, web_vitals
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Indexes (no relationship - user_id has no FK)
    __table_args__ = (
        Index("idx_performance_logs_source", "source", "created_at"),
        Index("idx_performance_logs_trace_id", "trace_id"),
        Index("idx_performance_logs_user_id", "user_id", "created_at"),
        Index("idx_performance_logs_created", "created_at"),
    )

    def __repr__(self):
        return f"<PerformanceLog(id={self.id}, source={self.source}, created_at={self.created_at})>"


class Admin(Base):
    """Admin user table."""

    __tablename__ = "admins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    admin_type = Column(String(20), nullable=False, server_default="admin")  # admin, developer
    is_active = Column(String(10), default="true")  # "true" or "false" as string
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Admin(id={self.id}, username={self.username}, email={self.email})>"


class Message(Base):
    """Unified message table for all types of messages."""

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_type = Column(String(20), nullable=False, server_default="direct")  # direct, thread, broadcast
    thread_id = Column(UUID(as_uuid=True), nullable=True)  # For grouping (no FK constraint)
    parent_id = Column(UUID(as_uuid=True), nullable=True)  # For replies (no FK constraint)
    sender_id = Column(UUID(as_uuid=True), nullable=True)  # No FK constraint
    sender_type = Column(String(20), nullable=True)  # admin, member, system
    recipient_id = Column(UUID(as_uuid=True), nullable=True)  # No FK constraint
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, server_default="general")
    status = Column(String(20), nullable=False, server_default="sent")  # sent, delivered, read
    priority = Column(String(20), nullable=False, server_default="normal")  # low, normal, high, urgent
    is_read = Column(Boolean, nullable=False, server_default="false")
    is_important = Column(Boolean, nullable=False, server_default="false")
    is_broadcast = Column(Boolean, nullable=False, server_default="false")
    broadcast_count = Column(Integer, nullable=True)  # For broadcast messages
    read_at = Column(TIMESTAMP(timezone=True), nullable=True)
    sent_at = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Attachments stored as JSONB
    attachments = Column(JSONB, nullable=True)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Indexes
    __table_args__ = (
        Index("idx_messages_unified_recipient", "recipient_id", "is_read"),
        Index("idx_messages_unified_sender", "sender_id"),
        Index("idx_messages_unified_thread", "thread_id", "created_at"),
        Index("idx_messages_unified_type", "message_type", "created_at"),
        Index("idx_messages_unified_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<Message(id={self.id}, type={self.message_type}, subject={self.subject})>"


class NiceDnbCompanyInfo(Base):
    """Snapshot of Nice D&B company info responses."""

    __tablename__ = "nice_dnb_company_info"

    biz_no = Column(String(20), primary_key=True)  # business registration number
    corp_no = Column(String(30), nullable=True)
    cmp_nm = Column(String(255), nullable=True)
    cmp_enm = Column(String(255), nullable=True)
    ceo_nm = Column(String(255), nullable=True)
    emp_cnt = Column(Integer, nullable=True)
    emp_acc_ym = Column(String(6), nullable=True)
    ind_cd1 = Column(String(20), nullable=True)
    ind_nm = Column(String(255), nullable=True)
    cmp_scl_nm = Column(String(100), nullable=True)
    cmp_typ_nm = Column(String(100), nullable=True)
    bzcnd_nm = Column(Text, nullable=True)
    estb_date = Column(String(8), nullable=True)
    eml_adr = Column(String(255), nullable=True)
    tel_no = Column(String(50), nullable=True)
    fax_tel_no = Column(String(50), nullable=True)
    zip = Column(String(20), nullable=True)
    addr1 = Column(String(255), nullable=True)
    addr2 = Column(String(255), nullable=True)
    stt = Column(String(50), nullable=True)
    stt_ymd = Column(String(8), nullable=True)
    up_ymd = Column(String(8), nullable=True)
    cri_grd = Column(String(10), nullable=True)
    cr_date = Column(String(8), nullable=True)
    stt_date = Column(String(8), nullable=True)
    sales_amt = Column(DECIMAL(20, 2), nullable=True)
    opr_ic_amt = Column(DECIMAL(20, 2), nullable=True)
    sh_eq_amt = Column(DECIMAL(20, 2), nullable=True)
    debt_amt = Column(DECIMAL(20, 2), nullable=True)
    asset_amt = Column(DECIMAL(20, 2), nullable=True)
    res_cd = Column(String(10), nullable=True)
    msg_guid = Column(String(64), nullable=True)
    msg_req_dttm = Column(String(20), nullable=True)
    msg_res_dttm = Column(String(20), nullable=True)
    raw_json = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<NiceDnbCompanyInfo(biz_no={self.biz_no}, cmp_nm={self.cmp_nm})>"

