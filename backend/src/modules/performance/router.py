"""
Performance router.

API endpoints for performance record management.
"""
from fastapi import APIRouter, Depends, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Annotated, Optional
from math import ceil
from datetime import datetime

from fastapi import Request

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ...common.modules.audit import audit_log_service, get_client_info
from ..user.dependencies import get_current_active_user, get_current_admin_user
from .service import PerformanceService
from .schemas import (
    PerformanceRecordCreate,
    PerformanceRecordUpdate,
    PerformanceRecordResponse,
    PerformanceListItem,
    PerformanceListQuery,
    PerformanceListResponsePaginated,
    PerformanceApprovalRequest,
)


router = APIRouter()
service = PerformanceService()


# Member endpoints


@router.get(
    "/api/performance",
    response_model=PerformanceListResponsePaginated,
    tags=["performance"],
    summary="List my performance records",
)
async def list_my_performance_records(
    query: Annotated[PerformanceListQuery, Depends()],
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List member's own performance records with pagination and filtering.

    - **year**: Filter by year
    - **quarter**: Filter by quarter (1-4)
    - **status**: Filter by status (draft, submitted, approved, rejected, revision_requested)
    - **type**: Filter by type (sales, support, ip)
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    records, total = await service.list_performance_records(
        current_user.id, query, db
    )

    return PerformanceListResponsePaginated(
        items=[PerformanceListItem.model_validate(r) for r in records],
        total=total,
        page=query.page,
        page_size=query.page_size,
        total_pages=ceil(total / query.page_size) if total > 0 else 0,
    )


@router.get(
    "/api/performance/{performance_id}",
    response_model=PerformanceRecordResponse,
    tags=["performance"],
    summary="Get performance record details",
)
async def get_performance_record(
    performance_id: UUID,
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get detailed information about a specific performance record.

    Only the owner can access their own records.
    """
    record = await service.get_performance_by_id(performance_id, current_user.id, db)
    # NOTE:
    # Use the helper that builds the response from ORM fields without
    # traversing relationships. This avoids unexpected serialization
    # issues with lazy-loaded relations while still returning all fields
    # required by the current API consumers and tests.
    return PerformanceRecordResponse.from_orm_without_reviews(record)


@router.post(
    "/api/performance",
    response_model=PerformanceRecordResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["performance"],
    summary="Create new performance record",
)
async def create_performance_record(
    data: PerformanceRecordCreate,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new performance record in draft status.

    The record can be edited until it is submitted for review.
    """
    record = await service.create_performance(current_user.id, data, db)
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(request)
        await audit_log_service.create_audit_log(
            db=db,
            action="create",
            user_id=current_user.id,
            resource_type="performance",
            resource_id=record.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
    
    return PerformanceRecordResponse.from_orm_without_reviews(record)


@router.put(
    "/api/performance/{performance_id}",
    response_model=PerformanceRecordResponse,
    tags=["performance"],
    summary="Update performance record",
)
async def update_performance_record(
    performance_id: UUID,
    data: PerformanceRecordUpdate,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update a performance record (draft or revision_requested only).

    Only draft or revision_requested records can be edited.
    """
    record = await service.update_performance(
        performance_id, current_user.id, data, db
    )
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(request)
        await audit_log_service.create_audit_log(
            db=db,
            action="update",
            user_id=current_user.id,
            resource_type="performance",
            resource_id=record.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
    
    return PerformanceRecordResponse.from_orm_without_reviews(record)


@router.delete(
    "/api/performance/{performance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["performance"],
    summary="Delete performance record",
)
async def delete_performance_record(
    performance_id: UUID,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Delete a performance record (draft only).

    Only draft records can be deleted.
    """
    await service.delete_performance(performance_id, current_user.id, db)
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(request)
        await audit_log_service.create_audit_log(
            db=db,
            action="delete",
            user_id=current_user.id,
            resource_type="performance",
            resource_id=performance_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)


@router.post(
    "/api/performance/{performance_id}/submit",
    response_model=PerformanceRecordResponse,
    tags=["performance"],
    summary="Submit performance record for review",
)
async def submit_performance_record(
    performance_id: UUID,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Submit a performance record for admin review.

    Changes status from draft/revision_requested to submitted.
    Once submitted, the record cannot be edited unless admin requests revision.
    """
    record = await service.submit_performance(performance_id, current_user.id, db)
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(request)
        await audit_log_service.create_audit_log(
            db=db,
            action="submit",
            user_id=current_user.id,
            resource_type="performance",
            resource_id=record.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
    
    return PerformanceRecordResponse.from_orm_without_reviews(record)


# Admin endpoints


@router.get(
    "/api/admin/performance",
    response_model=PerformanceListResponsePaginated,
    tags=["admin-performance"],
    summary="List all performance records (Admin)",
)
async def list_all_performance_records(
    query: Annotated[PerformanceListQuery, Depends()],
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List all performance records with filtering (admin only).

    - **member_id**: Filter by specific member
    - **year**: Filter by year
    - **quarter**: Filter by quarter (1-4)
    - **status**: Filter by status
    - **type**: Filter by type (sales, support, ip)
    - **page**: Page number
    - **page_size**: Items per page
    """
    records, total = await service.list_all_performance_records(query, db)

    return PerformanceListResponsePaginated(
        items=[PerformanceListItem.model_validate(r) for r in records],
        total=total,
        page=query.page,
        page_size=query.page_size,
        total_pages=ceil(total / query.page_size) if total > 0 else 0,
    )


@router.get(
    "/api/admin/performance/{performance_id}",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Get performance record details (Admin)",
)
async def get_performance_record_admin(
    performance_id: UUID,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get detailed information about any performance record (admin only).
    """
    record = await service.get_performance_by_id_admin(performance_id, db)
    return PerformanceRecordResponse.from_orm_without_reviews(record)


@router.post(
    "/api/admin/performance/{performance_id}/approve",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Approve performance record (Admin)",
)
async def approve_performance_record(
    performance_id: UUID,
    request: PerformanceApprovalRequest,
    http_request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Approve a performance record (admin only).

    Creates a review record and changes status to approved.
    """
    record = await service.approve_performance(
        performance_id, current_admin.id, request.comments, db
    )
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(http_request)
        await audit_log_service.create_audit_log(
            db=db,
            action="approve",
            user_id=current_admin.id,
            resource_type="performance",
            resource_id=record.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
    
    return PerformanceRecordResponse.from_orm_without_reviews(record)


@router.post(
    "/api/admin/performance/{performance_id}/request-fix",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Request revision of performance record (Admin)",
)
async def request_fix_performance_record(
    performance_id: UUID,
    request: PerformanceApprovalRequest,
    http_request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Request revision of a performance record (admin only).

    Creates a review record and changes status to revision_requested.
    Member will be able to edit the record again.
    """
    record = await service.request_fix_performance(
        performance_id, current_admin.id, request.comments, db
    )
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(http_request)
        await audit_log_service.create_audit_log(
            db=db,
            action="request_fix",
            user_id=current_admin.id,
            resource_type="performance",
            resource_id=record.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
    
    return PerformanceRecordResponse.from_orm_without_reviews(record)


@router.post(
    "/api/admin/performance/{performance_id}/reject",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Reject performance record (Admin)",
)
async def reject_performance_record(
    performance_id: UUID,
    request: PerformanceApprovalRequest,
    http_request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Reject a performance record (admin only).

    Creates a review record and changes status to rejected.
    """
    record = await service.reject_performance(
        performance_id, current_admin.id, request.comments, db
    )
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(http_request)
        await audit_log_service.create_audit_log(
            db=db,
            action="reject",
            user_id=current_admin.id,
            resource_type="performance",
            resource_id=record.id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
    
    return PerformanceRecordResponse.from_orm_without_reviews(record)


@router.get(
    "/api/admin/performance/export",
    tags=["admin-performance"],
    summary="Export performance data (Admin)",
)
async def export_performance_data(
    query: Annotated[PerformanceListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
):
    """
    Export performance data to Excel or CSV (admin only).

    Supports the same filtering options as the list endpoint.
    """
    from ...common.modules.export import ExportService
    from ...common.modules.audit import audit_log_service, get_client_info
    
    # Get export data
    export_data = await service.export_performance_data(query, db)
    
    # Record audit log
    try:
        ip_address, user_agent = get_client_info(request)
        await audit_log_service.create_audit_log(
            db=db,
            action="export",
            user_id=current_admin.id,
            resource_type="performance",
            resource_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        from ...common.modules.logger import logger
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
    
    # Generate export file
    if format == "excel":
        excel_bytes = ExportService.export_to_excel(
            data=export_data,
            sheet_name="Performance",
            title=f"Performance Data Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="performance_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
            },
        )
    else:  # CSV
        csv_content = ExportService.export_to_csv(
            data=export_data,
        )
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="performance_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            },
        )
