"""
Application exception router.

API endpoints for viewing and managing application exceptions (admin only).
"""
from fastapi import APIRouter, Depends, Query, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
from uuid import UUID

from ..db.session import get_db
from ..logger import auto_log
from . import NotFoundError
from ..db.models import Member
from .service import ExceptionService
from .schemas import (
    ExceptionListResponse,
    ApplicationExceptionResponse,
    ExceptionListQuery,
    ExceptionResolveRequest,
    FrontendExceptionCreate,
)

router = APIRouter()
exception_service = ExceptionService()


def get_admin_user_dependency():
    """
    Lazy import of get_current_admin_user to avoid circular import issues.
    
    This function returns the dependency function that can be used with Depends().
    """
    from ....modules.user.dependencies import get_current_admin_user
    return get_current_admin_user


@router.get("/api/v1/exceptions", response_model=ExceptionListResponse)
@auto_log("list_exceptions", log_result_count=True)
async def list_exceptions(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    source: Optional[str] = Query(default=None, description="Filter by source (backend/frontend)"),
    exception_type: Optional[str] = Query(default=None, description="Filter by exception type"),
    resolved: Optional[str] = Query(default=None, description="Filter by resolved status (true/false)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List application exceptions with filtering and pagination (admin only).
    
    This endpoint allows administrators to view application exceptions for
    debugging and issue tracking. Use source parameter to filter by backend or frontend.
    """
    query = ExceptionListQuery(
        page=page,
        page_size=page_size,
        source=source,
        exception_type=exception_type,
        resolved=resolved,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await exception_service.list_exceptions(db, query)


@router.get("/api/v1/exceptions/backend", response_model=ExceptionListResponse)
@auto_log("list_backend_exceptions", log_result_count=True)
async def list_backend_exceptions(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    exception_type: Optional[str] = Query(default=None, description="Filter by exception type"),
    resolved: Optional[str] = Query(default=None, description="Filter by resolved status (true/false)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List backend application exceptions (admin only).
    
    This endpoint shows only backend exceptions (recorded by backend exception handlers).
    """
    query = ExceptionListQuery(
        page=page,
        page_size=page_size,
        source="backend",  # Force backend only
        exception_type=exception_type,
        resolved=resolved,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await exception_service.list_exceptions(db, query)


@router.get("/api/v1/exceptions/frontend", response_model=ExceptionListResponse)
@auto_log("list_frontend_exceptions", log_result_count=True)
async def list_frontend_exceptions(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    exception_type: Optional[str] = Query(default=None, description="Filter by exception type"),
    resolved: Optional[str] = Query(default=None, description="Filter by resolved status (true/false)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List frontend application exceptions (admin only).
    
    This endpoint shows only frontend exceptions (recorded by frontend and sent via API).
    """
    query = ExceptionListQuery(
        page=page,
        page_size=page_size,
        source="frontend",  # Force frontend only
        exception_type=exception_type,
        resolved=resolved,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await exception_service.list_exceptions(db, query)


@router.get("/api/v1/exceptions/{exception_id}", response_model=ApplicationExceptionResponse)
@auto_log("get_exception", log_resource_id=True)
async def get_exception(
    request: Request,
    exception_id: UUID,
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single exception by ID (admin only).
    """
    exception = await exception_service.get_exception(db, exception_id)
    if not exception:
        raise NotFoundError("Application exception")

    # Convert to response
    user_email = None
    user_company_name = None
    resolver_email = None
    resolver_company_name = None

    if exception.user:
        user_email = exception.user.email
        user_company_name = exception.user.company_name

    if exception.resolver:
        resolver_email = exception.resolver.email
        resolver_company_name = exception.resolver.company_name

    return ApplicationExceptionResponse(
        id=exception.id,
        source=exception.source,
        exception_type=exception.exception_type,
        exception_message=exception.exception_message,
        error_code=exception.error_code,
        status_code=exception.status_code,
        trace_id=exception.trace_id,
        user_id=exception.user_id,
        ip_address=exception.ip_address,
        user_agent=exception.user_agent,
        request_method=exception.request_method,
        request_path=exception.request_path,
        request_data=exception.request_data,
        stack_trace=exception.stack_trace,
        exception_details=exception.exception_details,
        context_data=exception.context_data,
        resolved=exception.resolved,
        resolved_at=exception.resolved_at,
        resolved_by=exception.resolved_by,
        resolution_notes=exception.resolution_notes,
        created_at=exception.created_at,
        user_email=user_email,
        user_company_name=user_company_name,
        resolver_email=resolver_email,
        resolver_company_name=resolver_company_name,
    )


@router.post("/api/v1/exceptions/{exception_id}/resolve", response_model=ApplicationExceptionResponse)
@auto_log("resolve_exception", log_resource_id=True)
async def resolve_exception(
    request: Request,
    exception_id: UUID,
    resolve_request: ExceptionResolveRequest = Body(...),
    current_user: Member = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark an exception as resolved (admin only).
    """
    exception = await exception_service.resolve_exception(
        db=db,
        exception_id=exception_id,
        resolver_id=current_user.id,
        resolution_notes=resolve_request.resolution_notes,
    )
    
    if not exception:
        raise NotFoundError("Application exception")

    # Convert to response
    user_email = None
    user_company_name = None
    resolver_email = None
    resolver_company_name = None

    if exception.user:
        user_email = exception.user.email
        user_company_name = exception.user.company_name

    if exception.resolver:
        resolver_email = exception.resolver.email
        resolver_company_name = exception.resolver.company_name

    return ApplicationExceptionResponse(
        id=exception.id,
        source=exception.source,
        exception_type=exception.exception_type,
        exception_message=exception.exception_message,
        error_code=exception.error_code,
        status_code=exception.status_code,
        trace_id=exception.trace_id,
        user_id=exception.user_id,
        ip_address=exception.ip_address,
        user_agent=exception.user_agent,
        request_method=exception.request_method,
        request_path=exception.request_path,
        request_data=exception.request_data,
        stack_trace=exception.stack_trace,
        exception_details=exception.exception_details,
        context_data=exception.context_data,
        resolved=exception.resolved,
        resolved_at=exception.resolved_at,
        resolved_by=exception.resolved_by,
        resolution_notes=exception.resolution_notes,
        created_at=exception.created_at,
        user_email=user_email,
        user_company_name=user_company_name,
        resolver_email=resolver_email,
        resolver_company_name=resolver_company_name,
    )


@router.post("/api/v1/exceptions/frontend")
@auto_log("create_frontend_exception")
async def create_frontend_exception(
    request: Request,
    exception_data: FrontendExceptionCreate,
):
    """
    Create a frontend application exception entry.
    
    This endpoint is specifically for frontend to record exceptions.
    Backend exceptions should be recorded directly via exception_service (not through this API).
    No authentication required for this endpoint (but should be rate-limited in production).
    """
    from uuid import UUID
    
    # Convert user_id from string to UUID if provided
    user_id = None
    if exception_data.user_id:
        try:
            user_id = UUID(exception_data.user_id)
        except (ValueError, TypeError):
            # Invalid UUID format, ignore user_id
            pass
    
    # Frontend should provide these fields, but we auto-extract as fallback if missing
    # This ensures we always have request context even if frontend doesn't send it
    # Priority: frontend provided value > auto-extracted value
    ip_address = exception_data.ip_address
    if ip_address is None:
        # Frontend cannot get real IP, so we extract it from request
        ip_address = request.client.host if request.client else None
    
    user_agent = exception_data.user_agent
    if not user_agent:
        # Fallback to request header if frontend didn't provide
        user_agent = request.headers.get("user-agent")
    
    request_method = exception_data.request_method
    if not request_method:
        # Fallback to request method if frontend didn't provide
        request_method = request.method
    
    request_path = exception_data.request_path
    if not request_path:
        # Fallback to request path if frontend didn't provide
        request_path = request.url.path
    
    # Get trace_id from request header if frontend didn't provide
    trace_id = exception_data.trace_id
    if not trace_id:
        trace_id = request.headers.get("X-Trace-ID")
    
    # Force source to be frontend
    exception_service.create_exception(
        source="frontend",  # Always frontend for this endpoint
        exception_type=exception_data.exception_type,
        exception_message=exception_data.exception_message,
        error_code=exception_data.error_code,
        status_code=exception_data.status_code,
        trace_id=trace_id,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        request_method=request_method,
        request_path=request_path,
        request_data=exception_data.request_data,
        stack_trace=exception_data.stack_trace,
        exception_details=exception_data.exception_details,
        context_data=exception_data.context_data,
    )
    
    return {"status": "ok"}

