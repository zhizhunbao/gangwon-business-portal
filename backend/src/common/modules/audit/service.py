"""
Audit log service.

Business logic for audit log operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
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
            )
            if created_log:
                db_write_success = True
        except Exception as e:
            # Log error but continue with file write
            import logging
            logging.warning(f"Failed to write audit log to database: {str(e)}", exc_info=False)
        
        # Write to audit log file (always attempt, even if DB write failed)
        try:
            extra_data = {}
            if created_log:
                extra_data = {
                    "audit_log_id": created_log.get("id"),
                    "created_at": created_log.get("created_at"),
                }
            
            file_log_writer.write_audit_log(
                action=action,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                extra_data=extra_data,
            )
            file_write_success = True
        except Exception as e:
            # Log error but don't fail the audit log creation
            import logging
            logging.warning(f"Failed to write audit log to file: {str(e)}")
        
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
        # Build base query
        base_query = select(AuditLog).options(selectinload(AuditLog.user))

        # Apply filters
        conditions = []

        if query.user_id:
            conditions.append(AuditLog.user_id == query.user_id)

        if query.action:
            conditions.append(AuditLog.action == query.action)

        if query.resource_type:
            conditions.append(AuditLog.resource_type == query.resource_type)

        if query.resource_id:
            conditions.append(AuditLog.resource_id == query.resource_id)

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

        # Convert to response models
        items = []
        for log in audit_logs:
            user_email = None
            user_company_name = None

            if log.user:
                user_email = log.user.email
                user_company_name = log.user.company_name

            items.append(
                AuditLogResponse(
                    id=log.id,
                    user_id=log.user_id,
                    action=log.action,
                    resource_type=log.resource_type,
                    resource_id=log.resource_id,
                    ip_address=log.ip_address,
                    user_agent=log.user_agent,
                    created_at=log.created_at,
                    user_email=user_email,
                    user_company_name=user_company_name,
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
            .options(selectinload(AuditLog.user))
            .where(AuditLog.id == log_id)
        )
        return result.scalar_one_or_none()























