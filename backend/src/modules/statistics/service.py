from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime
import json

from ...common.modules.supabase.service import supabase_service
from .schemas import StatisticsQuery, StatisticsItem, Gender
import logging

logger = logging.getLogger(__name__)


def ensure_list(value) -> List[str]:
    """确保返回值是列表格式

    处理数据库中可能的多种格式:
    - None -> []
    - [] -> []
    - ["A", "B"] -> ["A", "B"]
    - "A" -> ["A"]
    - "A,B" -> ["A", "B"]
    - '["A", "B"]' (JSON string) -> ["A", "B"]
    """
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        # 尝试解析 JSON 字符串
        if value.startswith('['):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
        # 处理逗号分隔的字符串
        if ',' in value:
            return [v.strip() for v in value.split(',') if v.strip()]
        # 单个字符串
        return [value] if value.strip() else []
    return []


def ensure_float(value, default: float = 0.0) -> float:
    """确保返回值是 float 格式"""
    if value is None:
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def ensure_int(value, default: int = 0) -> int:
    """确保返回值是 int 格式"""
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default

# 企业统计与报告服务类
class StatisticsService:
    async def get_statistics_report(
        self, query: StatisticsQuery
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取并筛选企业统计报告"""
        sb_query = supabase_service.client.table("members").select("*", count="exact")

        if query.search_query:
            sb_query = sb_query.or_(f"company_name.ilike.%{query.search_query}%,business_number.ilike.%{query.search_query}%")

        if query.gender:
            sb_query = sb_query.eq("representative_gender", query.gender.value)

        if query.has_investment is not None:
            sb_query = sb_query.eq("investment_status", query.has_investment)

        if query.startup_stages:
            sb_query = sb_query.in_("startup_type", query.startup_stages)

        if query.major_industry_codes:

            sb_query = sb_query.in_("ksic_major", query.major_industry_codes)
        
        if query.gangwon_industry_codes:
            sb_query = sb_query.in_("industry_category", query.gangwon_industry_codes)

        if query.year:
            sb_query = sb_query.gte("founding_date", f"{query.year}-01-01")\
                             .lte("founding_date", f"{query.year}-12-31")

        if query.policy_tags:
            for tag in query.policy_tags:
                sb_query = sb_query.contains("participation_programs", [tag])

        if query.min_investment:
            sb_query = sb_query.gte("total_investment", query.min_investment)
        if query.max_investment:
            sb_query = sb_query.lte("total_investment", query.max_investment)
            
        if query.min_patents:
            sb_query = sb_query.gte("patent_count", query.min_patents)
        if query.max_patents:
            sb_query = sb_query.lte("patent_count", query.max_patents)

        current_year = datetime.now().year
        if query.min_work_years:
            founding_before = datetime(current_year - query.min_work_years, 12, 31).strftime("%Y-%m-%d")
            sb_query = sb_query.lte("founding_date", founding_before)
        if query.max_work_years:
            founding_after = datetime(current_year - query.max_work_years, 1, 1).strftime("%Y-%m-%d")
            sb_query = sb_query.gte("founding_date", founding_after)

        order_field = query.sort_by.value

        field_map = {
            "enterprise_name": "company_name",
            "total_investment": "total_investment",
            "patent_count": "patent_count",
            "annual_revenue": "revenue"
        }
        sb_column = field_map.get(order_field, "company_name")
        sb_query = sb_query.order(sb_column, desc=(query.sort_order == "desc"))

        offset = (query.page - 1) * query.page_size
        sb_query = sb_query.range(offset, offset + query.page_size - 1)

        result = sb_query.execute()
        
        items = []
        for row in (result.data or []):
            items.append({
                "business_reg_no": row.get("business_number"),
                "enterprise_name": row.get("company_name"),
                "industry_type": row.get("industry") or row.get("ksic_major"),
                "startup_stage": row.get("startup_type"),
                "policy_tags": ensure_list(row.get("participation_programs")),
                "total_investment": ensure_float(row.get("total_investment")),
                "patent_count": ensure_int(row.get("patent_count")),
                "annual_revenue": ensure_float(row.get("revenue")),
                "export_amount": ensure_float(row.get("export_val"))
            })

        return items, result.count or 0

    async def get_export_data(self, query: StatisticsQuery) -> List[Dict[str, Any]]:
        """获取脱敏后的导出数据"""
        query.page = 1
        query.page_size = 5000 
        
        items, _ = await self.get_statistics_report(query)
        
        return items

    def _mask_name(self, name: str) -> str:
        """姓名脱敏处理"""
        if not name:
            return ""
        if len(name) <= 1:
            return "*"
        if len(name) == 2:
            return name[0] + "*"
        return name[0] + "*" * (len(name) - 2) + name[-1]


service = StatisticsService()

