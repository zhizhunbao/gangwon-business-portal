from fastapi import APIRouter, Depends, Query, Response
from typing import List, Optional
from .schemas import StatisticsQuery, StatisticsResponse, SortField, SortOrder, Gender
from .service import service as statistics_service
from ..user.dependencies import get_current_admin_user
from ...common.modules.export.exporter import ExportService
from datetime import datetime

router = APIRouter(prefix="/api/admin/statistics", tags=["管理员统计接口"])


@router.get("/report", response_model=StatisticsResponse)
async def get_statistics_report(
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    major_industry_codes: List[str] = Query([]),
    gangwon_industry_codes: List[str] = Query([]),
    policy_tags: List[str] = Query([]),
    has_investment: Optional[bool] = Query(None),
    min_investment: Optional[float] = Query(None),
    max_investment: Optional[float] = Query(None),
    min_patents: Optional[int] = Query(None),
    max_patents: Optional[int] = Query(None),
    gender: Optional[Gender] = Query(None),
    min_age: Optional[int] = Query(None),
    max_age: Optional[int] = Query(None),
    search_query: Optional[str] = Query(None),
    startup_stages: List[str] = Query([]),
    min_work_years: Optional[int] = Query(None),
    max_work_years: Optional[int] = Query(None),
    page: int = Query(1, ge=1),


    page_size: int = Query(10, ge=1, le=100),
    sort_by: SortField = Query(SortField.ENTERPRISE_NAME),
    sort_order: SortOrder = Query(SortOrder.ASC),
    current_admin: dict = Depends(get_current_admin_user)
):
    """获取企业统计列表"""
    query = StatisticsQuery(
        year=year,
        quarter=quarter,
        month=month,
        major_industry_codes=major_industry_codes,
        gangwon_industry_codes=gangwon_industry_codes,
        policy_tags=policy_tags,
        has_investment=has_investment,
        min_investment=min_investment,
        max_investment=max_investment,
        min_patents=min_patents,
        max_patents=max_patents,
        gender=gender,
        min_age=min_age,
        max_age=max_age,
        search_query=search_query,
        startup_stages=startup_stages,
        min_work_years=min_work_years,
        max_work_years=max_work_years,
        page=page,


        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    items, total = await statistics_service.get_statistics_report(query)
    
    return StatisticsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/export")
async def export_statistics(
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    major_industry_codes: List[str] = Query([]),
    gangwon_industry_codes: List[str] = Query([]),
    policy_tags: List[str] = Query([]),
    has_investment: Optional[bool] = Query(None),
    min_investment: Optional[float] = Query(None),
    max_investment: Optional[float] = Query(None),
    min_patents: Optional[int] = Query(None),
    max_patents: Optional[int] = Query(None),
    gender: Optional[Gender] = Query(None),
    min_age: Optional[int] = Query(None),
    max_age: Optional[int] = Query(None),
    search_query: Optional[str] = Query(None),
    startup_stages: List[str] = Query([]),
    min_work_years: Optional[int] = Query(None),
    max_work_years: Optional[int] = Query(None),
    sort_by: SortField = Query(SortField.ENTERPRISE_NAME),


    sort_order: SortOrder = Query(SortOrder.ASC),
    current_admin: dict = Depends(get_current_admin_user)
):
    """导出企业统计 Excel"""
    query = StatisticsQuery(
        year=year,
        quarter=quarter,
        month=month,
        major_industry_codes=major_industry_codes,
        gangwon_industry_codes=gangwon_industry_codes,
        policy_tags=policy_tags,
        has_investment=has_investment,
        min_investment=min_investment,
        max_investment=max_investment,
        min_patents=min_patents,
        max_patents=max_patents,
        gender=gender,
        min_age=min_age,
        max_age=max_age,
        search_query=search_query,
        startup_stages=startup_stages,
        min_work_years=min_work_years,
        max_work_years=max_work_years,
        sort_by=sort_by,


        sort_order=sort_order
    )
    
    data = await statistics_service.get_export_data(query)
    
    headers = [
        "business_reg_no", "enterprise_name", "industry_type", 
        "startup_stage", "policy_tags", "total_investment",
        "patent_count", "annual_revenue", "export_amount"
    ]
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    excel_content = ExportService.export_to_excel(
        data=data,
        sheet_name="Enterprise Statistics",
        headers=headers,
        title=f"Gangwon Business Portal Statistics Report ({timestamp})"
    )
    
    filename = f"gangwon_stats_{timestamp}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


