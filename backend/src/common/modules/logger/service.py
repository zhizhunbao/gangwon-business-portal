"""
Logging service.

Business logic for application log operations.
Exception operations are in the exception module.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, Any
from uuid import UUID

from ..db.models import ApplicationLog, Member
from .file_writer import file_log_writer
from .schemas import (
    LogListQuery,
    LogListResponse,
    ApplicationLogResponse,
)


class LoggingService:
    """Logging service class."""

    async def create_log(
        self,
        db: AsyncSession,
        source: str,  # backend, frontend
        level: str,  # DEBUG, INFO, WARNING, ERROR, CRITICAL
        message: str,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[dict[str, Any]] = None,
        response_status: Optional[int] = None,
        duration_ms: Optional[int] = None,
        extra_data: Optional[dict[str, Any]] = None,
    ) -> ApplicationLog:
        """
        Create an application log entry.

        Args:
            db: Database session
            source: Source of the log (backend/frontend)
            level: Log level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
            message: Log message
            module: Module name
            function: Function name
            line_number: Line number
            trace_id: Request trace ID
            user_id: User ID
            ip_address: IP address
            user_agent: User agent string
            request_method: HTTP method
            request_path: Request path
            request_data: Request payload (sanitized)
            response_status: HTTP status code
            duration_ms: Request duration in milliseconds
            extra_data: Additional context data

        Returns:
            Created ApplicationLog instance
        """
        app_log = ApplicationLog(
            source=source,
            level=level,
            message=message,
            module=module,
            function=function,
            line_number=line_number,
            trace_id=trace_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            request_data=request_data,
            response_status=response_status,
            duration_ms=duration_ms,
            extra_data=extra_data,
        )

        db.add(app_log)
        await db.commit()
        await db.refresh(app_log)

        # Write to file log
        try:
            file_log_writer.write_log(
                source=source,
                level=level,
                message=message,
                module=module,
                function=function,
                line_number=line_number,
                trace_id=trace_id,
                user_id=str(user_id) if user_id else None,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                request_data=request_data,
                response_status=response_status,
                duration_ms=duration_ms,
                extra_data=extra_data,
            )
        except Exception:
            # Don't fail if file write fails
            pass

        return app_log

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
        # Build base query
        base_query = select(ApplicationLog).options(selectinload(ApplicationLog.user))

        # Apply filters
        conditions = []

        if query.source:
            conditions.append(ApplicationLog.source == query.source)

        if query.level:
            conditions.append(ApplicationLog.level == query.level)

        if query.trace_id:
            conditions.append(ApplicationLog.trace_id == query.trace_id)

        if query.user_id:
            conditions.append(ApplicationLog.user_id == query.user_id)

        if query.start_date:
            conditions.append(ApplicationLog.created_at >= query.start_date)

        if query.end_date:
            conditions.append(ApplicationLog.created_at <= query.end_date)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(ApplicationLog)
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        offset = (query.page - 1) * query.page_size
        base_query = base_query.order_by(ApplicationLog.created_at.desc())
        base_query = base_query.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(base_query)
        logs = result.scalars().all()

        # Convert to response models
        items = []
        for log in logs:
            user_email = None
            user_company_name = None

            if log.user:
                user_email = log.user.email
                user_company_name = log.user.company_name

            items.append(
                ApplicationLogResponse(
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
                    user_email=user_email,
                    user_company_name=user_company_name,
                )
            )

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
    ) -> Optional[ApplicationLog]:
        """
        Get a single log by ID.

        Args:
            db: Database session
            log_id: Log ID

        Returns:
            ApplicationLog instance or None if not found
        """
        result = await db.execute(
            select(ApplicationLog)
            .options(selectinload(ApplicationLog.user))
            .where(ApplicationLog.id == log_id)
        )
        return result.scalar_one_or_none()

