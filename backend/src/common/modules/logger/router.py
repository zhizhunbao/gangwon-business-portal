"""
Application logging router.

API endpoints for viewing application logs (admin only).
Exception endpoints are in the exception module.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from uuid import UUID

from ..db.session import get_db
from ..db.models import Member
from .service import LoggingService
from .schemas import (
    LogListResponse,
    LogListQuery,
    ApplicationLogResponse,
    FrontendLogCreate,
)

router = APIRouter()
logging_service = LoggingService()


def get_admin_user_dependency():
    """
    Lazy import of get_current_admin_user to avoid circular import issues.
    
    This function can be used directly with Depends() as a dependency.
    """
    from ....modules.user.dependencies import get_current_admin_user
    return get_current_admin_user()


@router.get("/api/v1/logging/logs", response_model=LogListResponse)
async def list_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    source: Optional[str] = Query(default=None, description="Filter by source (backend/frontend)"),
    level: Optional[str] = Query(default=None, description="Filter by level (DEBUG/INFO/WARNING/ERROR/CRITICAL)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List application logs with filtering and pagination (admin only).
    
    This endpoint allows administrators to view application logs for debugging
    and monitoring purposes. Use source parameter to filter by backend or frontend.
    """
    query = LogListQuery(
        page=page,
        page_size=page_size,
        source=source,
        level=level,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await logging_service.list_logs(db, query)


@router.get("/api/v1/logging/backend/logs", response_model=LogListResponse)
async def list_backend_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    level: Optional[str] = Query(default=None, description="Filter by level (DEBUG/INFO/WARNING/ERROR/CRITICAL)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List backend application logs (admin only).
    
    This endpoint shows only backend logs (recorded by backend services).
    """
    query = LogListQuery(
        page=page,
        page_size=page_size,
        source="backend",  # Force backend only
        level=level,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await logging_service.list_logs(db, query)


@router.get("/api/v1/logging/frontend/logs", response_model=LogListResponse)
async def list_frontend_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    level: Optional[str] = Query(default=None, description="Filter by level (DEBUG/INFO/WARNING/ERROR/CRITICAL)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List frontend application logs (admin only).
    
    This endpoint shows only frontend logs (recorded by frontend and sent via API).
    """
    query = LogListQuery(
        page=page,
        page_size=page_size,
        source="frontend",  # Force frontend only
        level=level,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await logging_service.list_logs(db, query)


@router.post("/api/v1/logging/frontend/logs")
async def create_frontend_log(
    log_data: FrontendLogCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a frontend application log entry.
    
    This endpoint is specifically for frontend to record logs.
    Backend logs should be recorded directly via logging_service (not through this API).
    No authentication required for this endpoint (but should be rate-limited in production).
    """
    from uuid import UUID
    
    # Convert user_id from string to UUID if provided
    user_id = None
    if log_data.user_id:
        try:
            user_id = UUID(log_data.user_id)
        except (ValueError, TypeError):
            # Invalid UUID format, ignore user_id
            pass
    
    # Force source to be frontend
    await logging_service.create_log(
        db=db,
        source="frontend",  # Always frontend for this endpoint
        level=log_data.level,
        message=log_data.message,
        module=log_data.module,
        function=log_data.function,
        line_number=log_data.line_number,
        trace_id=log_data.trace_id,
        user_id=user_id,
        ip_address=log_data.ip_address,
        user_agent=log_data.user_agent,
        request_method=log_data.request_method,
        request_path=log_data.request_path,
        request_data=log_data.request_data,
        response_status=log_data.response_status,
        duration_ms=log_data.duration_ms,
        extra_data=log_data.extra_data,
    )
    
    return {"status": "ok"}


@router.get("/api/v1/logging/logs/{log_id}", response_model=ApplicationLogResponse)
async def get_log(
    log_id: UUID,
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single application log by ID (admin only).
    """
    log = await logging_service.get_log(db, log_id)
    
    if not log:
        from ...exception import NotFoundError
        raise NotFoundError("Application log")
    
    user_email = None
    user_company_name = None
    
    if log.user:
        user_email = log.user.email
        user_company_name = log.user.company_name
    
    return ApplicationLogResponse(
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

