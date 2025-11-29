"""
Exception service.

Business logic for application exception operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
import traceback

from ..db.models import ApplicationException
from ..logger.file_writer import file_log_writer
from .schemas import (
    ExceptionListQuery,
    ExceptionListResponse,
    ApplicationExceptionResponse,
)


class ExceptionService:
    """Exception service class."""

    async def create_exception(
        self,
        db: AsyncSession,
        source: str,  # backend, frontend
        exception_type: str,
        exception_message: str,
        error_code: Optional[str] = None,
        status_code: Optional[int] = None,
        trace_id: Optional[str] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        request_data: Optional[dict[str, Any]] = None,
        stack_trace: Optional[str] = None,
        exception_details: Optional[dict[str, Any]] = None,
        context_data: Optional[dict[str, Any]] = None,
        exc: Optional[Exception] = None,
    ) -> ApplicationException:
        """
        Create an application exception entry.

        Args:
            db: Database session
            source: Source of the exception (backend/frontend)
            exception_type: Exception class name
            exception_message: Exception message
            error_code: Application error code
            status_code: HTTP status code
            trace_id: Request trace ID
            user_id: User ID
            ip_address: IP address
            user_agent: User agent string
            request_method: HTTP method
            request_path: Request path
            request_data: Request payload (sanitized)
            stack_trace: Full stack trace
            exception_details: Additional exception details
            context_data: Additional context data
            exc: Exception object (for extracting stack trace if not provided)

        Returns:
            Created ApplicationException instance
        """
        # Extract stack trace from exception if not provided
        if not stack_trace and exc:
            stack_trace = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))

        app_exception = ApplicationException(
            source=source,
            exception_type=exception_type,
            exception_message=exception_message,
            error_code=error_code,
            status_code=status_code,
            trace_id=trace_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            request_data=request_data,
            stack_trace=stack_trace,
            exception_details=exception_details,
            context_data=context_data,
        )

        db.add(app_exception)
        await db.commit()
        await db.refresh(app_exception)

        # Write to file log
        try:
            file_log_writer.write_exception(
                source=source,
                exception_type=exception_type,
                exception_message=exception_message,
                error_code=error_code,
                status_code=status_code,
                trace_id=trace_id,
                user_id=str(user_id) if user_id else None,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request_method,
                request_path=request_path,
                request_data=request_data,
                stack_trace=stack_trace,
                exception_details=exception_details,
                context_data=context_data,
            )
        except Exception:
            # Don't fail if file write fails
            pass

        return app_exception

    async def list_exceptions(
        self,
        db: AsyncSession,
        query: ExceptionListQuery,
    ) -> ExceptionListResponse:
        """
        List application exceptions with filtering and pagination.

        Args:
            db: Database session
            query: Query parameters

        Returns:
            Paginated list of application exceptions
        """
        # Build base query
        base_query = select(ApplicationException).options(
            selectinload(ApplicationException.user),
            selectinload(ApplicationException.resolver),
        )

        # Apply filters
        conditions = []

        if query.source:
            conditions.append(ApplicationException.source == query.source)

        if query.exception_type:
            conditions.append(ApplicationException.exception_type == query.exception_type)

        if query.resolved is not None:
            conditions.append(ApplicationException.resolved == query.resolved)

        if query.trace_id:
            conditions.append(ApplicationException.trace_id == query.trace_id)

        if query.user_id:
            conditions.append(ApplicationException.user_id == query.user_id)

        if query.start_date:
            conditions.append(ApplicationException.created_at >= query.start_date)

        if query.end_date:
            conditions.append(ApplicationException.created_at <= query.end_date)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(ApplicationException)
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        offset = (query.page - 1) * query.page_size
        base_query = base_query.order_by(ApplicationException.created_at.desc())
        base_query = base_query.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(base_query)
        exceptions = result.scalars().all()

        # Convert to response models
        items = []
        for exc in exceptions:
            user_email = None
            user_company_name = None
            resolver_email = None
            resolver_company_name = None

            if exc.user:
                user_email = exc.user.email
                user_company_name = exc.user.company_name

            if exc.resolver:
                resolver_email = exc.resolver.email
                resolver_company_name = exc.resolver.company_name

            items.append(
                ApplicationExceptionResponse(
                    id=exc.id,
                    source=exc.source,
                    exception_type=exc.exception_type,
                    exception_message=exc.exception_message,
                    error_code=exc.error_code,
                    status_code=exc.status_code,
                    trace_id=exc.trace_id,
                    user_id=exc.user_id,
                    ip_address=exc.ip_address,
                    user_agent=exc.user_agent,
                    request_method=exc.request_method,
                    request_path=exc.request_path,
                    request_data=exc.request_data,
                    stack_trace=exc.stack_trace,
                    exception_details=exc.exception_details,
                    context_data=exc.context_data,
                    resolved=exc.resolved,
                    resolved_at=exc.resolved_at,
                    resolved_by=exc.resolved_by,
                    resolution_notes=exc.resolution_notes,
                    created_at=exc.created_at,
                    user_email=user_email,
                    user_company_name=user_company_name,
                    resolver_email=resolver_email,
                    resolver_company_name=resolver_company_name,
                )
            )

        total_pages = (total + query.page_size - 1) // query.page_size

        return ExceptionListResponse(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages,
        )

    async def get_exception(
        self,
        db: AsyncSession,
        exception_id: UUID,
    ) -> Optional[ApplicationException]:
        """
        Get a single exception by ID.

        Args:
            db: Database session
            exception_id: Exception ID

        Returns:
            ApplicationException instance or None if not found
        """
        result = await db.execute(
            select(ApplicationException)
            .options(
                selectinload(ApplicationException.user),
                selectinload(ApplicationException.resolver),
            )
            .where(ApplicationException.id == exception_id)
        )
        return result.scalar_one_or_none()

    async def resolve_exception(
        self,
        db: AsyncSession,
        exception_id: UUID,
        resolver_id: UUID,
        resolution_notes: Optional[str] = None,
    ) -> Optional[ApplicationException]:
        """
        Mark an exception as resolved.

        Args:
            db: Database session
            exception_id: Exception ID
            resolver_id: ID of the user resolving the exception
            resolution_notes: Notes about the resolution

        Returns:
            Updated ApplicationException instance or None if not found
        """
        exception = await self.get_exception(db, exception_id)
        if not exception:
            return None

        exception.resolved = "true"
        exception.resolved_at = datetime.now()
        exception.resolved_by = resolver_id
        exception.resolution_notes = resolution_notes

        await db.commit()
        await db.refresh(exception)

        return exception

