"""
Performance router.

API endpoints for performance record management.
"""
from fastapi import APIRouter, Depends, status, Query, Response
from uuid import UUID
from typing import Annotated
from math import ceil
from datetime import datetime

from fastapi import Request

from ...common.modules.db.models import Member, Admin
from ...common.modules.audit import audit_log
from ...common.modules.logger import auto_log
from ..user.dependencies import get_current_active_user_compat as get_current_active_user, get_current_admin_user
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
@auto_log("list_my_performance_records", log_result_count=True)
async def list_my_performance_records(
    query: Annotated[PerformanceListQuery, Depends()],
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    List member's own performance records with filtering.

    - **year**: Filter by year
    - **quarter**: Filter by quarter (1-4)
    - **status**: Filter by status (draft, submitted, approved, rejected, revision_requested)
    - **type**: Filter by type (sales, support, ip)
    """
    records, total = await service.list_performance_records(
        current_user.id, query
    )

    return PerformanceListResponsePaginated(
        items=[PerformanceListItem.model_validate(r) for r in records],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


@router.get(
    "/api/performance/{performance_id}",
    response_model=PerformanceRecordResponse,
    tags=["performance"],
    summary="Get performance record details",
)
@auto_log("get_performance_record", log_resource_id=True)
async def get_performance_record(
    performance_id: UUID,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Get detailed information about a specific performance record.

    Only the owner can access their own records.
    """
    record = await service.get_performance_by_id(performance_id, current_user.id)
    
    return PerformanceRecordResponse.model_validate(record)


@router.post(
    "/api/performance",
    response_model=PerformanceRecordResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["performance"],
    summary="Create new performance record",
)
@auto_log("create_performance_record", log_resource_id=True)
@audit_log(action="create", resource_type="performance")
async def create_performance_record(
    data: PerformanceRecordCreate,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Create a new performance record in draft status.

    The record can be edited until it is submitted for review.
    """
    record = await service.create_performance(current_user.id, data)
    return PerformanceRecordResponse.model_validate(record)


@router.put(
    "/api/performance/{performance_id}",
    response_model=PerformanceRecordResponse,
    tags=["performance"],
    summary="Update performance record",
)
@auto_log("update_performance_record", log_resource_id=True)
@audit_log(action="update", resource_type="performance")
async def update_performance_record(
    performance_id: UUID,
    data: PerformanceRecordUpdate,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Update a performance record (draft or revision_requested only).

    Only draft or revision_requested records can be edited.
    """
    record = await service.update_performance(
        performance_id, current_user.id, data
    )
    return PerformanceRecordResponse.model_validate(record)


@router.delete(
    "/api/performance/{performance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["performance"],
    summary="Delete performance record",
)
@auto_log("delete_performance_record", log_resource_id=True)
@audit_log(action="delete", resource_type="performance")
async def delete_performance_record(
    performance_id: UUID,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Delete a performance record (draft only).

    Only draft records can be deleted.
    """
    await service.delete_performance(performance_id, current_user.id)


@router.post(
    "/api/performance/{performance_id}/submit",
    response_model=PerformanceRecordResponse,
    tags=["performance"],
    summary="Submit performance record for review",
)
@auto_log("submit_performance_record", log_resource_id=True)
@audit_log(action="submit", resource_type="performance")
async def submit_performance_record(
    performance_id: UUID,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Submit a performance record for admin review.

    Changes status from draft/revision_requested to submitted.
    Once submitted, the record cannot be edited unless admin requests revision.
    """
    record = await service.submit_performance(performance_id, current_user.id)
    return PerformanceRecordResponse.model_validate(record)


# Admin endpoints


@router.get(
    "/api/admin/performance",
    response_model=PerformanceListResponsePaginated,
    tags=["admin-performance"],
    summary="List all performance records (Admin)",
)
@auto_log("list_all_performance_records", log_result_count=True)
async def list_all_performance_records(
    query: Annotated[PerformanceListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    List all performance records with filtering (admin only).

    - **member_id**: Filter by specific member
    - **year**: Filter by year
    - **quarter**: Filter by quarter (1-4)
    - **status**: Filter by status
    - **type**: Filter by type (sales, support, ip)
    """
    records, total = await service.list_all_performance_records(query)

    return PerformanceListResponsePaginated(
        items=[PerformanceListItem.model_validate(r) for r in records],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


@router.get(
    "/api/admin/performance/export",
    tags=["admin-performance"],
    summary="Export performance data (Admin)",
)
@auto_log("export_performance_data", log_result_count=True)
@audit_log(action="export", resource_type="performance")
async def export_performance_data(
    query: Annotated[PerformanceListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Admin, Depends(get_current_admin_user)],
    export_format: str = Query("excel", alias="format", regex="^(excel|csv)$", description="Export format: excel or csv"),
):
    """
    Export performance data to Excel or CSV (admin only).

    Supports the same filtering options as the list endpoint.
    """
    from ...common.modules.export import ExportService
    
    # Get export data
    export_data = await service.export_performance_data(query)
    
    # Generate export file
    if export_format == "excel":
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


@router.get(
    "/api/admin/performance/{performance_id}",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Get performance record details (Admin)",
)
@auto_log("get_performance_record_admin", log_resource_id=True)
async def get_performance_record_admin(
    performance_id: UUID,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Get detailed information about any performance record (admin only).
    """
    record = await service.get_performance_by_id_admin(performance_id)
    return PerformanceRecordResponse.model_validate(record)


@router.post(
    "/api/admin/performance/{performance_id}/approve",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Approve performance record (Admin)",
)
@auto_log("approve_performance_record", log_resource_id=True)
@audit_log(action="approve", resource_type="performance")
async def approve_performance_record(
    performance_id: UUID,
    data: PerformanceApprovalRequest,
    request: Request,
    current_admin: Annotated[Admin, Depends(get_current_admin_user)],
):
    """
    Approve a performance record (admin only).

    Creates a review record and changes status to approved.
    """
    # Note: reviewer_id is not used because admin is not in members table
    # The PerformanceReview.reviewer_id foreign key points to members.id
    record = await service.approve_performance(
        performance_id, None, data.comments  # reviewer_id set to None for admin
    )
    return PerformanceRecordResponse.model_validate(record)


@router.post(
    "/api/admin/performance/{performance_id}/request-fix",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Request revision of performance record (Admin)",
)
@auto_log("request_fix_performance_record", log_resource_id=True)
@audit_log(action="request_fix", resource_type="performance")
async def request_fix_performance_record(
    performance_id: UUID,
    data: PerformanceApprovalRequest,
    request: Request,
    current_admin: Annotated[Admin, Depends(get_current_admin_user)],
):
    """
    Request revision of a performance record (admin only).

    Creates a review record and changes status to revision_requested.
    Member will be able to edit the record again.
    """
    # Note: reviewer_id is not used because admin is not in members table
    record = await service.request_fix_performance(
        performance_id, None, data.comments  # reviewer_id set to None for admin
    )
    return PerformanceRecordResponse.model_validate(record)


@router.post(
    "/api/admin/performance/{performance_id}/reject",
    response_model=PerformanceRecordResponse,
    tags=["admin-performance"],
    summary="Reject performance record (Admin)",
)
@auto_log("reject_performance_record", log_resource_id=True)
@audit_log(action="reject", resource_type="performance")
async def reject_performance_record(
    performance_id: UUID,
    data: PerformanceApprovalRequest,
    request: Request,
    current_admin: Annotated[Admin, Depends(get_current_admin_user)],
):
    """
    Reject a performance record (admin only).

    Creates a review record and changes status to rejected.
    """
    # Note: reviewer_id is not used because admin is not in members table
    record = await service.reject_performance(
        performance_id, None, data.comments  # reviewer_id set to None for admin
    )
    return PerformanceRecordResponse.model_validate(record)
