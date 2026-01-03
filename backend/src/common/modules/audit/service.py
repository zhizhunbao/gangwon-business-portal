"""
Audit log service.

Business logic for audit log operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from uuid import UUID

from ..db.models import AuditLog, Member
from ..logger.file_writer import file_log_writer
from ..logger.db_writer import db_log_writer
from .schemas import AuditLogListQuery, AuditLogListResponse, AuditLogResponse


class AuditLogService:
    """Audit log service class."""

    async def create_audit_log_via_api(
        self,
        action: str,
        user_id: Optional[UUID] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        request_method: Optional[str] = None,
        request_path: Optional[str] = None,
        module: Optional[str] = None,
        function: Optional[str] = None,
        line_number: Optional[int] = None,
        file_path: Optional[str] = None,
    ) -> dict:
        """
        Create an audit log entry using Supabase API (no database session required).
        
        Implements dual-write pattern (Requirement 8.3):
        - Writes to audit_logs database table
        - Writes to audit.log file
        - Both writes are attempted independently for redundancy
        - If one write fails, the other still proceeds
        - Logs warnings for any write failures

        Args:
            action: Action type (e.g., 'login', 'create', 'update', 'delete', 'approve')
            user_id: User ID who performed the action
            resource_type: Type of resource (e.g., 'member', 'performance', 'project')
            resource_id: ID of the affected resource
            ip_address: IP address of the user
            user_agent: User agent string
            trace_id: Request trace ID for correlation
            request_id: Request ID for correlation
            request_method: HTTP method (GET, POST, etc.)
            request_path: Request path

        Returns:
            Created audit log data as dict (from database), or empty dict if both writes failed
        """
        # Initialize variables for dual-write tracking
        created_log = None
        db_write_success = False
        file_write_success = False
        
        # Write to audit_logs table using unified db_log_writer
        try:
            created_log = await db_log_writer.write_audit_log(
                action=action,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id,
                request_id=request_id,
                request_method=request_method,
                request_path=request_path,
                module=module,
                function=function,
                line_number=line_number,
                file_path=file_path,
            )
            if created_log:
                db_write_success = True
            else:
                import logging
                logging.warning(f"Audit log DB write returned None for action={action}")
        except Exception as e:
            # Log error but continue with file write
            import logging
            logging.warning(f"Failed to write audit log to database: {str(e)}", exc_info=True)
        
        # Write to audit log file (always attempt, even if DB write failed)
        try:
            extra_data = {}
            if created_log:
                extra_data = {
                    "audit_log_id": created_log.get("id"),
                    "created_at": created_log.get("created_at"),
                }
            
            file_log_writer.write_audit_log(
                action,  # 第一个位置参数
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                trace_id=trace_id,
                request_id=request_id,
                request_method=request_method,
                request_path=request_path,
                module=module,
                function=function,
                line_number=line_number,
                file_path=file_path,
                extra_data=extra_data,
            )
            file_write_success = True
            import logging
            logging.info(f"Audit log file write success for action={action}")
        except Exception as e:
            # Log error but don't fail the audit log creation
            import logging
            logging.warning(f"Failed to write audit log to file: {str(e)}", exc_info=True)
        
        # Log dual-write status for monitoring
        if not db_write_success and not file_write_success:
            import logging
            logging.error("Audit log dual-write completely failed - both database and file writes failed")
        elif not db_write_success:
            import logging
            logging.warning("Audit log database write failed, but file write succeeded")
        elif not file_write_success:
            import logging
            logging.warning("Audit log file write failed, but database write succeeded")
        
        # Return the database result (or empty dict if failed)
        return created_log if created_log else {}

    async def list_audit_logs(
        self,
        db: AsyncSession,
        query: AuditLogListQuery,
    ) -> AuditLogListResponse:
        """
        List audit logs with filtering and pagination.

        Args:
            db: Database session
            query: Query parameters

        Returns:
            Paginated list of audit logs
        """
        # Build base query (no user relationship)
        base_query = select(AuditLog)

        # Apply filters
        conditions = []

        if query.user_id:
            conditions.append(AuditLog.user_id == query.user_id)

        if query.start_date:
            conditions.append(AuditLog.created_at >= query.start_date)

        if query.end_date:
            conditions.append(AuditLog.created_at <= query.end_date)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(AuditLog)
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        offset = (query.page - 1) * query.page_size
        base_query = base_query.order_by(AuditLog.created_at.desc())
        base_query = base_query.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(base_query)
        audit_logs = result.scalars().all()

        # Convert to response models (no user relationship, use extra_data)
        items = []
        for log in audit_logs:
            extra = log.extra_data or {}
            items.append(
                AuditLogResponse(
                    id=log.id,
                    source=log.source or "backend",
                    level=log.level or "INFO",
                    message=log.message or "",
                    layer=log.layer or "Auth",
                    module=log.module or "",
                    function=log.function or "",
                    line_number=log.line_number or 0,
                    file_path=getattr(log, 'file_path', '') or "",
                    trace_id=log.trace_id or "",
                    request_id=getattr(log, 'request_id', '') or "",
                    user_id=log.user_id,
                    duration_ms=getattr(log, 'duration_ms', None),
                    extra_data=extra,
                    created_at=log.created_at,
                )
            )

        total_pages = (total + query.page_size - 1) // query.page_size

        return AuditLogListResponse(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            total_pages=total_pages,
        )

    async def get_audit_log(
        self,
        db: AsyncSession,
        log_id: UUID,
    ) -> Optional[AuditLog]:
        """
        Get a single audit log by ID.

        Args:
            db: Database session
            log_id: Audit log ID

        Returns:
            AuditLog instance or None if not found
        """
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.id == log_id)
        )
        return result.scalar_one_or_none()























