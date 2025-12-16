"""
Dashboard router.

API endpoints for dashboard statistics.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, Response
from typing import Optional

from ...common.modules.db.models import Member
from ...common.modules.logger import auto_log
from ..user.dependencies import get_current_admin_user
from .service import DashboardService
from .schemas import DashboardResponse

router = APIRouter()
service = DashboardService()


@router.get(
    "/api/admin/dashboard/stats",
    response_model=DashboardResponse,
    tags=["dashboard"],
    summary="Get admin dashboard statistics",
)
@auto_log("get_dashboard_stats")
async def get_dashboard_stats(
    year: Optional[str] = Query(
        None, description="Year filter ('all' or specific year)"
    ),
    quarter: Optional[str] = Query(
        None, description="Quarter filter ('all', 'Q1', 'Q2', 'Q3', 'Q4')"
    ),
    request: Request = None,
    current_user: Member = Depends(get_current_admin_user),
):
    """
    Get dashboard statistics for admin.

    Aggregates data from members and performance records:
    - Total approved members count
    - Total sales revenue (from approved 'sales' type performance records)
    - Total employment (from approved 'support' type performance records)
    - Total intellectual property count (from approved 'ip' type performance records)

    Also returns chart data for:
    - Member growth over time
    - Sales and employment trends

    Query Parameters:
    - **year**: Filter by year ('all' for all years, or specific year like '2024')
    - **quarter**: Filter by quarter ('all', 'Q1', 'Q2', 'Q3', 'Q4')

    Returns:
        Dashboard statistics and chart data
    """
    result = await service.get_dashboard_stats(
        year=year or "all", quarter=quarter or "all"
    )
    return DashboardResponse(**result)


@router.get(
    "/api/admin/dashboard/export",
    tags=["dashboard"],
    summary="Export dashboard statistics",
)
@auto_log("export_dashboard_stats")
async def export_dashboard_stats(
    year: Optional[str] = Query(
        None, description="Year filter ('all' or specific year)"
    ),
    quarter: Optional[str] = Query(
        None, description="Quarter filter ('all', 'Q1', 'Q2', 'Q3', 'Q4')"
    ),
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
    request: Request = None,
    current_user: Member = Depends(get_current_admin_user),
):
    """
    Export dashboard statistics to Excel or CSV (admin only).

    Query Parameters:
    - **year**: Filter by year ('all' for all years, or specific year like '2024')
    - **quarter**: Filter by quarter ('all', 'Q1', 'Q2', 'Q3', 'Q4')
    - **format**: Export format ('excel' or 'csv')

    Returns:
        Excel or CSV file download
    """
    from ...common.modules.export import ExportService
    
    # Get export data
    export_data = await service.export_dashboard_data(
        year=year or "all", quarter=quarter or "all"
    )
    
    # Generate export file
    if format == "excel":
        excel_bytes = ExportService.export_to_excel(
            data=export_data,
            sheet_name="Dashboard",
            title=f"Dashboard Statistics Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="dashboard_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
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
                "Content-Disposition": f'attachment; filename="dashboard_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            },
        )

