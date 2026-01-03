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
    layer: Optional[str] = Query(default=None, description="Filter by layer (Router/Service/Database/Auth/Performance/System)"),
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
        layer=layer,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await logging_service.list_logs(db, query)


@router.get("/api/v1/logging/errors", response_model=LogListResponse)
async def list_error_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    level: Optional[str] = Query(default=None, description="Filter by level (ERROR/CRITICAL)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List error logs with filtering and pagination (admin only).
    
    This endpoint queries the error_logs table for ERROR and CRITICAL level logs.
    """
    query = LogListQuery(
        page=page,
        page_size=page_size,
        level=level or "ERROR,CRITICAL",
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await logging_service.list_error_logs(db, query)


@router.get("/api/v1/logging/performance", response_model=LogListResponse)
async def list_performance_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    source: Optional[str] = Query(default=None, description="Filter by source (backend/frontend)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    user_id: Optional[UUID] = Query(default=None, description="Filter by user ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List performance logs with filtering and pagination (admin only).
    
    This endpoint queries the performance_logs table.
    """
    query = LogListQuery(
        page=page,
        page_size=page_size,
        source=source,
        trace_id=trace_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await logging_service.list_performance_logs(db, query)


@router.get("/api/v1/logging/system", response_model=LogListResponse)
async def list_system_logs(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=500, description="Items per page"),
    level: Optional[str] = Query(default=None, description="Filter by level (DEBUG/INFO/WARNING/ERROR/CRITICAL)"),
    trace_id: Optional[str] = Query(default=None, description="Filter by trace ID"),
    start_date: Optional[datetime] = Query(default=None, description="Start date filter"),
    end_date: Optional[datetime] = Query(default=None, description="End date filter"),
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    List system logs with filtering and pagination (admin only).
    
    This endpoint queries the system_logs table for Python standard logging output.
    """
    query = LogListQuery(
        page=page,
        page_size=page_size,
        level=level,
        trace_id=trace_id,
        start_date=start_date,
        end_date=end_date,
    )

    return await logging_service.list_system_logs(db, query)


@router.delete("/api/v1/logging/system/by-message")
async def delete_system_logs_by_message(
    message: str = Query(..., description="Message pattern to match"),
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete system logs matching a specific message (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import SystemLog
    
    stmt = delete(SystemLog).where(SystemLog.message.ilike(f"%{message}%"))
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "status": "ok",
        "deleted": result.rowcount,
        "message": f"Deleted {result.rowcount} system logs matching '{message}'"
    }


@router.delete("/api/v1/logging/system/{log_id}")
async def delete_system_log(
    log_id: UUID,
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a single system log by ID (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import SystemLog
    
    stmt = delete(SystemLog).where(SystemLog.id == log_id)
    result = await db.execute(stmt)
    await db.commit()
    
    if result.rowcount == 0:
        from ..exception import NotFoundError
        raise NotFoundError("System log")
    
    return {"status": "ok", "deleted": 1}


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
                # 统一性能日志处理 - 按照日志规范格式
                from .schemas import PerformanceLogCreate
                
                extra_data = log_entry.extra_data or {}
                
                # 标准化指标名称和值
                metric_name = extra_data.get("metric_name", "frontend_performance")
                metric_value = float(extra_data.get("metric_value", extra_data.get("duration_ms", 0.0)))
                metric_unit = extra_data.get("metric_unit", "ms")
                
                # 跳过无意义的 performance_report 类型（定期汇报）
                if metric_name == "performance_report":
                    return True  # 跳过，不记录
                
                # 从消息中推断指标类型
                if metric_name == "frontend_performance":
                    message = log_entry.message.lower()
                    if "memory" in message:
                        metric_name = "memory_usage"
                        metric_value = float(extra_data.get("used", 0))
                        metric_unit = "bytes"
                    elif "network" in message or "request" in message:
                        metric_name = "network_request"
                        metric_value = float(extra_data.get("duration_ms", 0))
                        metric_unit = "ms"
                
                # duration_ms 只对时间类指标有意义
                # 对于内存等非时间指标，不设置 duration_ms
                duration_ms = None
                if metric_unit == "ms":
                    duration_ms = float(extra_data.get("duration_ms", metric_value))
                
                # 获取阈值和慢查询标识
                threshold_ms = extra_data.get("threshold_ms") or extra_data.get("threshold")
                is_slow = bool(extra_data.get("is_slow")) or bool(extra_data.get("performance_issue")) or (
                    threshold_ms and duration_ms and duration_ms > threshold_ms
                )
                
                # 确定日志级别
                level = "WARNING" if is_slow else "INFO"
                
                # 组件名称
                component_name = extra_data.get("component_name") or extra_data.get("url")
                
                await logging_service.performance(PerformanceLogCreate(
                    source="frontend",
                    level=level,
                    metric_name=metric_name,
                    metric_value=metric_value,
                    metric_unit=metric_unit,
                    layer="Performance",
                    module=log_entry.module or "frontend",
                    function=log_entry.function or "",
                    line_number=log_entry.line_number or 0,
                    file_path=log_entry.file_path,
                    component_name=component_name,
                    trace_id=log_entry.trace_id,
                    request_id=str(extra_data.get("request_id", "")) if extra_data.get("request_id") else None,
                    user_id=user_id,
                    duration_ms=duration_ms,
                    threshold_ms=float(threshold_ms) if threshold_ms else None,
                    is_slow=is_slow,
                    web_vitals=extra_data.get("web_vitals"),
                    extra_data=extra_data if extra_data else None,
                ))
            else:
                # 统一应用日志处理 - 精简格式，避免冗余
                await logging_service.log(AppLogCreate(
                    timestamp=log_entry.timestamp,
                    source="frontend",
                    level=log_entry.level or "INFO",
                    message=log_entry.message,
                    layer=log_entry.layer or "Frontend",
                    module=log_entry.module or "frontend",
                    function=log_entry.function,
                    line_number=log_entry.line_number,
                    file_path=log_entry.file_path,
                    trace_id=log_entry.trace_id,
                    request_id=log_entry.request_id,
                    user_id=user_id,
                    duration_ms=log_entry.duration_ms,
                    extra_data=log_entry.extra_data if log_entry.extra_data else None,
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


@router.get("/api/v1/logging/stats")
async def get_log_stats(
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Get log statistics for monitoring dashboard (admin only).
    
    Returns aggregated statistics including:
    - Today's error count and change vs yesterday
    - Slow request count
    - Security alert count
    - Total request count
    - Average response time
    - System health status
    """
    from sqlalchemy import select, func, and_, cast, Date
    from datetime import date, timedelta
    from ..db.models import AppLog
    
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    # Today's errors
    today_errors_query = select(func.count()).select_from(AppLog).where(
        and_(
            cast(AppLog.created_at, Date) == today,
            AppLog.level.in_(["ERROR", "CRITICAL"])
        )
    )
    today_errors_result = await db.execute(today_errors_query)
    today_errors = today_errors_result.scalar() or 0
    
    # Yesterday's errors (for comparison)
    yesterday_errors_query = select(func.count()).select_from(AppLog).where(
        and_(
            cast(AppLog.created_at, Date) == yesterday,
            AppLog.level.in_(["ERROR", "CRITICAL"])
        )
    )
    yesterday_errors_result = await db.execute(yesterday_errors_query)
    yesterday_errors = yesterday_errors_result.scalar() or 0
    
    # Calculate error change percentage
    error_change = 0
    if yesterday_errors > 0:
        error_change = round(((today_errors - yesterday_errors) / yesterday_errors) * 100)
    elif today_errors > 0:
        error_change = 100
    
    # Slow requests (duration > 500ms)
    slow_requests_query = select(func.count()).select_from(AppLog).where(
        and_(
            cast(AppLog.created_at, Date) == today,
            AppLog.duration_ms > 500
        )
    )
    slow_requests_result = await db.execute(slow_requests_query)
    slow_requests = slow_requests_result.scalar() or 0
    
    # Security alerts (auth warnings/errors)
    security_query = select(func.count()).select_from(AppLog).where(
        and_(
            cast(AppLog.created_at, Date) == today,
            AppLog.layer == "Auth",
            AppLog.level.in_(["WARNING", "ERROR", "CRITICAL"])
        )
    )
    security_result = await db.execute(security_query)
    security_alerts = security_result.scalar() or 0
    
    # Today's total requests
    today_requests_query = select(func.count()).select_from(AppLog).where(
        cast(AppLog.created_at, Date) == today
    )
    today_requests_result = await db.execute(today_requests_query)
    today_requests = today_requests_result.scalar() or 0
    
    # Average response time
    avg_response_query = select(func.avg(AppLog.duration_ms)).select_from(AppLog).where(
        and_(
            cast(AppLog.created_at, Date) == today,
            AppLog.duration_ms.isnot(None)
        )
    )
    avg_response_result = await db.execute(avg_response_query)
    avg_response_time = avg_response_result.scalar() or 0
    
    return {
        "today_errors": today_errors,
        "error_change": error_change,
        "slow_requests": slow_requests,
        "security_alerts": security_alerts,
        "today_requests": today_requests,
        "avg_response_time": round(avg_response_time) if avg_response_time else 0,
        "api_health": "healthy",
        "db_health": "healthy",
        "cache_health": "healthy",
        "storage_health": "healthy",
    }



@router.delete("/api/v1/logging/logs/by-message")
async def delete_logs_by_message(
    message: str = Query(..., description="Error message pattern to match"),
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete logs matching a specific error message (admin only).
    
    Used to clean up resolved/fixed errors from the database.
    Matches logs where the message contains the provided pattern.
    """
    from sqlalchemy import delete
    from ..db.models import AppLog
    
    # Delete logs matching the message pattern
    stmt = delete(AppLog).where(AppLog.message.ilike(f"%{message}%"))
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "status": "ok",
        "deleted": result.rowcount,
        "message": f"Deleted {result.rowcount} logs matching '{message}'"
    }


@router.delete("/api/v1/logging/logs/{log_id}")
async def delete_log(
    log_id: UUID,
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a single log by ID (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import AppLog
    
    stmt = delete(AppLog).where(AppLog.id == log_id)
    result = await db.execute(stmt)
    await db.commit()
    
    if result.rowcount == 0:
        from ..exception import NotFoundError
        raise NotFoundError("Application log")
    
    return {"status": "ok", "deleted": 1}


@router.delete("/api/v1/logging/errors/by-message")
async def delete_error_logs_by_message(
    message: str = Query(..., description="Error message pattern to match"),
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete error logs matching a specific message (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import ErrorLog
    
    stmt = delete(ErrorLog).where(ErrorLog.message.ilike(f"%{message}%"))
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "status": "ok",
        "deleted": result.rowcount,
        "message": f"Deleted {result.rowcount} error logs matching '{message}'"
    }


@router.delete("/api/v1/logging/errors/{log_id}")
async def delete_error_log(
    log_id: UUID,
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a single error log by ID (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import ErrorLog
    
    stmt = delete(ErrorLog).where(ErrorLog.id == log_id)
    result = await db.execute(stmt)
    await db.commit()
    
    if result.rowcount == 0:
        from ..exception import NotFoundError
        raise NotFoundError("Error log")
    
    return {"status": "ok", "deleted": 1}


@router.delete("/api/v1/logging/performance/by-message")
async def delete_performance_logs_by_message(
    message: str = Query(..., description="Message pattern to match"),
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete performance logs matching a specific message (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import PerformanceLog
    
    stmt = delete(PerformanceLog).where(PerformanceLog.message.ilike(f"%{message}%"))
    result = await db.execute(stmt)
    await db.commit()
    
    return {
        "status": "ok",
        "deleted": result.rowcount,
        "message": f"Deleted {result.rowcount} performance logs matching '{message}'"
    }


@router.delete("/api/v1/logging/performance/{log_id}")
async def delete_performance_log(
    log_id: UUID,
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a single performance log by ID (admin only).
    """
    from sqlalchemy import delete
    from ..db.models import PerformanceLog
    
    stmt = delete(PerformanceLog).where(PerformanceLog.id == log_id)
    result = await db.execute(stmt)
    await db.commit()
    
    if result.rowcount == 0:
        from ..exception import NotFoundError
        raise NotFoundError("Performance log")
    
    return {"status": "ok", "deleted": 1}


@router.delete("/api/v1/logging/all")
async def delete_all_logs(
    current_user = Depends(get_admin_user_dependency),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete all logs from all tables (admin only).
    
    WARNING: This is a destructive operation that cannot be undone.
    Clears: app_logs, error_logs, performance_logs, system_logs, audit_logs
    """
    from sqlalchemy import delete, text
    from ..db.models import AppLog, ErrorLog, PerformanceLog, SystemLog, AuditLog
    
    deleted_counts = {}
    
    # Delete from each log table
    for model, name in [
        (AppLog, "app_logs"),
        (ErrorLog, "error_logs"),
        (PerformanceLog, "performance_logs"),
        (SystemLog, "system_logs"),
        (AuditLog, "audit_logs"),
    ]:
        try:
            stmt = delete(model)
            result = await db.execute(stmt)
            deleted_counts[name] = result.rowcount
        except Exception as e:
            deleted_counts[name] = f"error: {str(e)}"
    
    await db.commit()
    
    total_deleted = sum(v for v in deleted_counts.values() if isinstance(v, int))
    
    return {
        "status": "ok",
        "total_deleted": total_deleted,
        "details": deleted_counts,
        "message": f"Deleted {total_deleted} logs from all tables"
    }