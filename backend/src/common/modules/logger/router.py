"""
Application logging router.

API endpoints for viewing application logs (admin only).
Exception endpoints are in the exception module.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, TYPE_CHECKING
from datetime import datetime
from uuid import UUID

from .service import LoggingService
from ..db.session import get_db

# Use TYPE_CHECKING to avoid circular import
if TYPE_CHECKING:
    pass
from .schemas import (
    LogListResponse,
    LogListQuery,
    AppLogResponse,
    FrontendLogCreate,
    FrontendLogBatchCreate,
    AppLogCreate,
)

router = APIRouter()
logging_service = LoggingService()


def get_admin_user_dependency():
    """
    Lazy import of get_current_admin_user to avoid circular import issues.
    
    This function can be used directly with Depends() as a dependency.
    """
    from ....modules.user.dependencies import get_current_admin_user
    return get_current_admin_user


def get_member_type():
    """
    Lazy import of Member type for type hints.
    """
    from ..db.models import Member
    return Member


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
    current_user = Depends(get_admin_user_dependency),
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
    current_user = Depends(get_admin_user_dependency),
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
    current_user = Depends(get_admin_user_dependency),
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
    log_data: FrontendLogBatchCreate,
):
    """
    Create frontend application log entries (batch).
    
    This endpoint is specifically for frontend to record logs in batches.
    Backend logs should be recorded directly via logging_service (not through this API).
    No authentication required for this endpoint (but should be rate-limited in production).
    
    Optimized for fast response to avoid logging loops.
    """
    import asyncio
    from uuid import UUID
    
    # Quick validation and early return for empty batches
    if not log_data.logs:
        return {"status": "ok", "processed": 0, "failed": 0, "total": 0}
    
    # Limit batch size to prevent performance issues
    max_batch_size = 50
    if len(log_data.logs) > max_batch_size:
        # Process only the first batch_size logs to maintain performance
        log_data.logs = log_data.logs[:max_batch_size]
    
    async def process_log_entry(log_entry):
        """Process a single log entry asynchronously with minimal overhead."""
        try:
            # Convert user_id from string to UUID if provided
            user_id = None
            if log_entry.user_id:
                try:
                    user_id = UUID(log_entry.user_id)
                except (ValueError, TypeError):
                    # Invalid UUID format, ignore user_id
                    pass
            
            # Simplified performance log detection
            is_performance_log = (hasattr(log_entry, 'layer') and 
                                log_entry.layer == 'Performance')
            
            if is_performance_log:
                # Simplified performance log processing
                from .schemas import PerformanceLogCreate
                
                extra_data = log_entry.extra_data or {}
                
                # Quick metric extraction with defaults
                metric_name = "performance_metric"
                metric_value = 0.0
                metric_unit = "ms"
                
                # Fast pattern matching for common metrics
                message = log_entry.message
                if "memory" in message.lower():
                    metric_name = "memory_usage"
                    metric_value = float(extra_data.get("used", 0))
                    metric_unit = "bytes"
                elif "network" in message.lower() or "request" in message.lower():
                    metric_name = "network_request"
                    metric_value = float(extra_data.get("duration_ms", 0))
                elif "report" in message.lower():
                    metric_name = "performance_report"
                    metric_value = 1.0
                    metric_unit = "report"
                
                # Convert request_id to string if needed
                request_id = extra_data.get("request_id")
                if request_id is not None and not isinstance(request_id, str):
                    request_id = str(request_id)
                
                await logging_service.performance(PerformanceLogCreate(
                    source="frontend",
                    metric_name=metric_name,
                    metric_value=metric_value,
                    metric_unit=metric_unit,
                    layer=log_entry.layer,
                    module=log_entry.module,
                    component_name=extra_data.get("component_name"),
                    trace_id=log_entry.trace_id,
                    request_id=request_id,
                    user_id=user_id,
                    threshold=extra_data.get("threshold_ms"),
                    performance_issue=extra_data.get("performance_issue"),
                    web_vitals=extra_data.get("web_vitals"),
                    extra_data=extra_data,
                ))
            else:
                # Regular application log with minimal processing
                await logging_service.log(AppLogCreate(
                    source="frontend",
                    level=log_entry.level,
                    message=log_entry.message,
                    module=log_entry.module,
                    function=log_entry.function,
                    line_number=log_entry.line_number,
                    trace_id=log_entry.trace_id,
                    user_id=user_id,
                    ip_address=log_entry.ip_address,
                    user_agent=log_entry.user_agent,
                    request_method=log_entry.request_method,
                    request_path=log_entry.request_path,
                    request_data=log_entry.request_data,
                    response_status=log_entry.response_status,
                    duration_ms=log_entry.duration_ms,
                    extra_data=log_entry.extra_data,
                ))
            return True
        except Exception as e:
            # Minimal error logging to avoid recursion
            return False
    
    # Optimized concurrent processing with smaller batches
    concurrent_batch_size = 5  # Reduced from 10 to improve response time
    processed = 0
    failed = 0
    
    # Process in smaller concurrent batches for better performance
    for i in range(0, len(log_data.logs), concurrent_batch_size):
        batch = log_data.logs[i:i + concurrent_batch_size]
        
        # Process batch with timeout to prevent hanging
        try:
            tasks = [process_log_entry(log_entry) for log_entry in batch]
            results = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=2.0  # 2 second timeout per batch
            )
            
            # Count results
            for result in results:
                if result is True:
                    processed += 1
                else:
                    failed += 1
                    
        except asyncio.TimeoutError:
            # If batch times out, count all as failed
            failed += len(batch)
        except Exception:
            # If batch fails completely, count all as failed
            failed += len(batch)
    
    return {
        "status": "ok", 
        "processed": processed,
        "failed": failed,
        "total": len(log_data.logs)
    }


@router.get("/api/v1/logging/logs/{log_id}", response_model=AppLogResponse)
async def get_log(
    log_id: UUID,
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single application log by ID (admin only).
    """
    log = await logging_service.get_log(db, log_id)
    
    if not log:
        from ..exception import NotFoundError
        raise NotFoundError("Application log")
    
    user_email = None
    user_company_name = None
    
    if log.user:
        user_email = log.user.email
        user_company_name = log.user.company_name
    
    return AppLogResponse(
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

