"""
Audit log router.

API endpoints for viewing audit logs (admin only).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from uuid import UUID

from ..db.session import get_db
from ..exception import NotFoundError
from ..db.models import Member
from .service import AuditLogService
from .schemas import AuditLogListResponse, AuditLogResponse, AuditLogListQuery

router = APIRouter()
audit_log_service = AuditLogService()


def get_admin_user_dependency():
    """
    Lazy import of get_current_admin_user to avoid circular import issues.
    
    This function returns the dependency function that can be used with Depends().
    """
    from ....modules.user.dependencies import get_current_admin_user
    return get_current_admin_user


@router.get("/api/admin/audit-logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=1000, description="Items per page"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    action: Optional[str] = Query(default=None, description="Filter by action type"),
    resource_type: Optional[str] = Query(default=None, description="Filter by resource type"),
    resource_id: Optional[UUID] = Query(default=None, description="Filter by resource ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List audit logs with filtering and pagination (admin only).

    This endpoint allows administrators to view audit logs for compliance
    and security tracking. Logs are retained for 7 years as per government
    compliance requirements.
    """
    query = AuditLogListQuery(
        page=page,
        page_size=page_size,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await audit_log_service.list_audit_logs(db, query)


@router.get("/api/admin/audit-logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: UUID,
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single audit log by ID (admin only).
    """
    log = await audit_log_service.get_audit_log(db, log_id)
    if not log:
        raise NotFoundError(resource_type="Audit log")

    # Convert to response
    user_email = None
    user_company_name = None

    if log.user:
        user_email = log.user.email
        user_company_name = log.user.company_name

    return AuditLogResponse(
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


@router.delete("/api/admin/audit-logs/by-action")
async def delete_audit_logs_by_action(
    action: str = Query(..., description="Action type to match"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete audit logs matching a specific action (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import AuditLog
    
    stmt = delete(AuditLog).where(AuditLog.action == action)
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "status": "ok",
        "deleted": result.rowcount,
        "message": f"Deleted {result.rowcount} audit logs with action '{action}'"
    }


@router.delete("/api/admin/audit-logs/{log_id}")
async def delete_audit_log(
    log_id: UUID,
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a single audit log by ID (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import AuditLog
    
    stmt = delete(AuditLog).where(AuditLog.id == log_id)
    result = await db.execute(stmt)
    await db.commit()
    
    if result.rowcount == 0:
        raise NotFoundError(resource_type="Audit log")
    
    return {"status": "ok", "deleted": 1}
