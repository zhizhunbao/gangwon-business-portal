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
from typing import Optional, TYPE_CHECKING, Type, Any, List
from uuid import UUID
import logging

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

logger = logging.getLogger(__name__)

# Use TYPE_CHECKING to avoid circular import
if TYPE_CHECKING:
    from ..db.models import AppLog, ErrorLog, AuditLog, PerformanceLog, SystemLog, Member


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

    async def app(self, schema: AppLogCreate) -> dict:
        """
        Create an application log entry.
        
        Args:
            schema: AppLogCreate schema instance
            
        Returns:
            dict: The log entry data
        """
        # Write to file (always, for debugging and backup)
        try:
            file_log_writer.write_app_log_from_schema(schema)
        except Exception:
            pass
        
        # Enqueue for database write (async, non-blocking)
        try:
            db_log_writer.enqueue_app_log_from_schema(schema)
        except Exception:
            pass
        
        return schema.to_db_dict()

    async def error(self, schema: ErrorLogCreate) -> dict:
        """
        Create an error log entry.
        
        Args:
            schema: ErrorLogCreate schema instance
            
        Returns:
            dict: The log entry data
        """
        # Write to file
        try:
            file_log_writer.write_error_log_from_schema(schema)
        except Exception:
            pass
        
        # Enqueue for database write
        try:
            db_log_writer.enqueue_error_log_from_schema(schema)
        except Exception:
            pass
        
        return schema.to_db_dict()

    async def audit(self, schema: AuditLogCreate) -> dict:
        """
        Create an audit log entry.
        
        Args:
            schema: AuditLogCreate schema instance
            
        Returns:
            dict: The log entry data
        """
        # Write to file
        try:
            file_log_writer.write_audit_log_from_schema(schema)
        except Exception:
            pass
        
        # Enqueue for database write
        try:
            db_log_writer.enqueue_audit_log_from_schema(schema)
        except Exception:
            pass
        
        return schema.to_db_dict()

    async def performance(self, schema: PerformanceLogCreate) -> dict:
        """
        Create a performance log entry.
        
        Args:
            schema: PerformanceLogCreate schema instance
            
        Returns:
            dict: The log entry data
        """
        # Write to file
        try:
            file_log_writer.write_performance_log_from_schema(schema)
        except Exception:
            pass
        
        # Enqueue for database write
        try:
            db_log_writer.enqueue_performance_log_from_schema(schema)
        except Exception:
            pass
        
        return schema.to_db_dict()

    # =========================================================================
    # Backward Compatibility - 向后兼容
    # =========================================================================

    async def log(self, schema: AppLogCreate) -> dict:
        """
        Alias for app() method for backward compatibility.
        
        Deprecated: Use app() instead.
        """
        return await self.app(schema)

    # =========================================================================
    # Query Methods - 查询方法
    # =========================================================================

    def _get_model_for_type(self, log_type: str) -> Type[Any]:
        """Get the database model class for a given log type."""
        from ..db.models import AppLog, ErrorLog, PerformanceLog, SystemLog, AuditLog
        return {
            "app": AppLog,
            "error": ErrorLog,
            "performance": PerformanceLog,
            "system": SystemLog,
            "audit": AuditLog,
        }.get(log_type, AppLog)

    def _build_conditions(self, model: Type[Any], query: LogListQuery, log_type: str) -> List[Any]:
        """Build query conditions based on log type and query parameters.
        
        Args:
            model: The database model class
            query: Query parameters
            log_type: Type of log (app, error, performance, system, audit)
            
        Returns:
            List of SQLAlchemy conditions
        """
        conditions = []
        
        # Common filters available on most log types
        if query.level and hasattr(model, 'level'):
            levels = [l.strip() for l in query.level.split(',')]
            if len(levels) == 1:
                conditions.append(model.level == levels[0])
            else:
                conditions.append(model.level.in_(levels))
        
        if query.trace_id and hasattr(model, 'trace_id'):
            conditions.append(model.trace_id == query.trace_id)
        
        if query.user_id and hasattr(model, 'user_id'):
            conditions.append(model.user_id == query.user_id)
        
        if query.start_date and hasattr(model, 'created_at'):
            conditions.append(model.created_at >= query.start_date)
        
        if query.end_date and hasattr(model, 'created_at'):
            conditions.append(model.created_at <= query.end_date)
        
        # Type-specific filters
        if log_type in ("app", "performance"):
            if query.source and hasattr(model, 'source'):
                conditions.append(model.source == query.source)
        
        if log_type == "app":
            if query.layer and hasattr(model, 'layer'):
                conditions.append(model.layer == query.layer)
        
        return conditions

    def _to_response(self, log: Any, log_type: str) -> AppLogResponse:
        """Convert a log model to AppLogResponse.
        
        Args:
            log: The log model instance
            log_type: Type of log (app, error, performance, system, audit)
            
        Returns:
            AppLogResponse instance
        """
        return AppLogResponse(
            id=log.id,
            source=getattr(log, 'source', None) or log_type,
            level=getattr(log, 'level', None) or "INFO",
            message=getattr(log, 'message', None) or "",
            layer=getattr(log, 'layer', None),
            module=getattr(log, 'module', None),
            function=getattr(log, 'function', None),
            line_number=getattr(log, 'line_number', None),
            file_path=getattr(log, 'file_path', None),
            trace_id=getattr(log, 'trace_id', None),
            user_id=getattr(log, 'user_id', None),
            duration_ms=getattr(log, 'duration_ms', None),
            extra_data=getattr(log, 'extra_data', None),
            created_at=log.created_at,
            user_email=None,
            user_company_name=None,
        )

    async def _list_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
        log_type: str,
    ) -> LogListResponse:
        """Unified method to list logs with filtering and pagination.
        
        Args:
            db: Database session
            query: Query parameters
            log_type: Type of log (app, error, performance, system, audit)
            
        Returns:
            Paginated list of logs
        """
        model = self._get_model_for_type(log_type)
        
        # Build base query
        base_query = select(model)
        
        # Build and apply conditions
        conditions = self._build_conditions(model, query, log_type)
        if conditions:
            base_query = base_query.where(and_(*conditions))
        
        # Get total count
        count_query = select(func.count()).select_from(model)
        if conditions:
            count_query = count_query.where(and_(*conditions))
        
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        offset = (query.page - 1) * query.page_size
        base_query = base_query.order_by(model.created_at.desc())
        base_query = base_query.offset(offset).limit(query.page_size)
        
        # Execute query
        result = await db.execute(base_query)
        logs = result.scalars().all()
        
        # Convert to response models
        items = [self._to_response(log, log_type) for log in logs]
        
        total_pages = (total + query.page_size - 1) // query.page_size
        
        return LogListResponse(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages,
        )

    async def list_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
    ) -> LogListResponse:
        """List application logs with filtering and pagination."""
        return await self._list_logs(db, query, "app")

    async def list_error_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
    ) -> LogListResponse:
        """List error logs with filtering and pagination."""
        return await self._list_logs(db, query, "error")

    async def list_performance_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
    ) -> LogListResponse:
        """List performance logs with filtering and pagination."""
        return await self._list_logs(db, query, "performance")

    async def list_system_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
    ) -> LogListResponse:
        """List system logs with filtering and pagination."""
        return await self._list_logs(db, query, "system")

    async def list_audit_logs(
        self,
        db: AsyncSession,
        query: LogListQuery,
    ) -> LogListResponse:
        """List audit logs with filtering and pagination."""
        return await self._list_logs(db, query, "audit")

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
