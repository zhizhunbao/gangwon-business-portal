"""
Logging service.

Unified logging service with consistent API for all log types.
All logs are written to both file and database.

Usage:
    await logging_service.app(AppLogCreate(...))           # -> app.log + DB
    await logging_service.error(ErrorLogCreate(...))       # -> error.log + DB
    await logging_service.audit(AuditLogCreate(...))       # -> audit.log + DB
    await logging_service.performance(PerformanceLogCreate(...))  # -> performance.log + DB
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, TYPE_CHECKING
from uuid import UUID

from .file_writer import file_log_writer
from .db_writer import db_log_writer
from .schemas import (
    AppLogCreate,
    ErrorLogCreate,
    PerformanceLogCreate,
    AuditLogCreate,
    LogListQuery,
    LogListResponse,
    AppLogResponse,
)

# Use TYPE_CHECKING to avoid circular import
if TYPE_CHECKING:
    from ..db.models import AppLog, ErrorLog, AuditLog, PerformanceLog, Member


class LoggingService:
    """
    Unified logging service class.
    
    Provides consistent API for all log types:
    - app(): Application business logs
    - error(): Exception/error logs
    - audit(): Audit trail logs
    - performance(): Performance metrics logs
    
    All methods write to both file and database.
    """

    # =========================================================================
    # Unified Log Methods - 统一日志入口
    # =========================================================================

    async def app(self, schema: AppLogCreate) -> "AppLog":
        """
        Create an application log entry.
        
        Args:
            schema: AppLogCreate schema instance
            
        Returns:
            AppLog: The created log entry object
            
        Example:
            >>> await logging_service.app(AppLogCreate(
            ...     level="INFO",
            ...     message="User logged in",
            ...     layer="Auth",
            ...     user_id=user_id
            ... ))
        """
        # Convert schema to model
        model = schema.to_model()
        
        # Write to file (always, for debugging and backup)
        try:
            file_log_writer.write_app_log(model)
        except Exception:
            pass
        
        # Enqueue for database write (async, non-blocking)
        try:
            db_log_writer.enqueue_app_log(model)
        except Exception:
            pass
        
        return model

    async def error(self, schema: ErrorLogCreate) -> "ErrorLog":
        """
        Create an error log entry.
        
        Args:
            schema: ErrorLogCreate schema instance
            
        Returns:
            ErrorLog: The created log entry object
            
        Example:
            >>> await logging_service.error(ErrorLogCreate(
            ...     error_type="ValidationError",
            ...     error_message="Invalid input",
            ...     stack_trace=traceback_str
            ... ))
        """
        # Convert schema to model
        model = schema.to_model()
        
        # Write to file
        try:
            file_log_writer.write_error_log(model)
        except Exception:
            pass
        
        # Enqueue for database write
        try:
            db_log_writer.enqueue_error_log(model)
        except Exception:
            pass
        
        return model

    async def audit(self, schema: AuditLogCreate) -> "AuditLog":
        """
        Create an audit log entry.
        
        Args:
            schema: AuditLogCreate schema instance
            
        Returns:
            AuditLog: The created log entry object
            
        Example:
            >>> await logging_service.audit(AuditLogCreate(
            ...     action="login",
            ...     user_id=user_id,
            ...     ip_address="127.0.0.1"
            ... ))
        """
        # Convert schema to model
        model = schema.to_model()
        
        # Write to file
        try:
            file_log_writer.write_audit_log(model)
        except Exception:
            pass
        
        # Enqueue for database write
        try:
            db_log_writer.enqueue_audit_log(model)
        except Exception:
            pass
        
        return model

    async def performance(self, schema: PerformanceLogCreate) -> "PerformanceLog":
        """
        Create a performance log entry.
        
        Args:
            schema: PerformanceLogCreate schema instance
            
        Returns:
            PerformanceLog: The created log entry object
            
        Example:
            >>> await logging_service.performance(PerformanceLogCreate(
            ...     metric_name="api_response_time",
            ...     metric_value=150.5,
            ...     metric_unit="ms"
            ... ))
        """
        # Convert schema to model
        model = schema.to_model()
        
        # Write to file
        try:
            file_log_writer.write_performance_log(model)
        except Exception:
            pass
        
        # Enqueue for database write
        try:
            db_log_writer.enqueue_performance_log(model)
        except Exception:
            pass
        
        return model

    # =========================================================================
    # Backward Compatibility - 向后兼容
    # =========================================================================

    async def log(self, schema: AppLogCreate) -> "AppLog":
        """
        Alias for app() method for backward compatibility.
        
        Deprecated: Use app() instead.
        """
        return await self.app(schema)

    # =========================================================================
    # Query Methods - 查询方法
    # =========================================================================

    async def list_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
    ) -> LogListResponse:
        """
        List application logs with filtering and pagination.

        Args:
            db: Database session
            query: Query parameters

        Returns:
            Paginated list of application logs
        """
        # Lazy import to avoid circular dependency
        from ..db.models import AppLog
        
        # Build base query
        base_query = select(AppLog).options(selectinload(AppLog.user))

        # Apply filters
        conditions = []
        if query.source:
            conditions.append(AppLog.source == query.source)
        if query.level:
            conditions.append(AppLog.level == query.level)
        if query.trace_id:
            conditions.append(AppLog.trace_id == query.trace_id)
        if query.user_id:
            conditions.append(AppLog.user_id == query.user_id)
        if query.start_date:
            conditions.append(AppLog.created_at >= query.start_date)
        if query.end_date:
            conditions.append(AppLog.created_at <= query.end_date)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(AppLog)
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        offset = (query.page - 1) * query.page_size
        base_query = base_query.order_by(AppLog.created_at.desc())
        base_query = base_query.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(base_query)
        logs = result.scalars().all()

        # Convert to response models
        items = [
            AppLogResponse(
                id=log.id,
                source=log.source,
                level=log.level,
                message=log.message,
                module=log.module,
                function=log.function,
                line_number=log.line_number,
                trace_id=log.trace_id,
                user_id=log.user_id,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                request_method=log.request_method,
                request_path=log.request_path,
                request_data=log.request_data,
                response_status=log.response_status,
                duration_ms=log.duration_ms,
                extra_data=log.extra_data,
                created_at=log.created_at,
                user_email=log.user.email if log.user else None,
                user_company_name=log.user.company_name if log.user else None,
            )
            for log in logs
        ]

        total_pages = (total + query.page_size - 1) // query.page_size

        return LogListResponse(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages,
        )

    async def get_log(
        self,
        db: AsyncSession,
        log_id: UUID,
    ) -> Optional["AppLog"]:
        """
        Get a single log by ID.

        Args:
            db: Database session
            log_id: Log ID

        Returns:
            AppLog instance or None if not found
        """
        from ..db.models import AppLog
        
        result = await db.execute(
            select(AppLog)
            .options(selectinload(AppLog.user))
            .where(AppLog.id == log_id)
        )
        return result.scalar_one_or_none()


# Create singleton instance
logging_service = LoggingService()
