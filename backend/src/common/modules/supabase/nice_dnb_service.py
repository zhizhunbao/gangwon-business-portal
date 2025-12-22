"""
Nice D&B company info service.

Handles Nice D&B company information database operations.
"""
from typing import Dict, Any, List, Optional
from .base_service import BaseSupabaseService


class NiceDnbService(BaseSupabaseService):
    """Service for Nice D&B company info operations."""
    
    async def get_company_info_by_biz_no(self, biz_no: str) -> Optional[Dict[str, Any]]:
        """根据营业执照号获取公司信息"""
        result = self.client.table('nice_dnb_company_info')\
            .select('*')\
            .eq('biz_no', biz_no)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_or_update_company_info(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建或更新公司信息"""
        biz_no = company_data.get('biz_no')
        if not biz_no:
            raise ValueError("biz_no is required")
        
        existing = await self.get_company_info_by_biz_no(biz_no)
        
        if existing:
            # Update existing record
            result = self.client.table('nice_dnb_company_info')\
                .update(company_data)\
                .eq('biz_no', biz_no)\
                .execute()
        else:
            # Create new record
            result = self.client.table('nice_dnb_company_info')\
                .insert(company_data)\
                .execute()
        
        if not result.data:
            raise ValueError("Failed to create/update company info: no data returned")
        return result.data[0]
    
    async def search_companies(
        self,
        search_term: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """搜索公司信息"""
        search_fields = ['cmp_nm', 'cmp_enm', 'biz_no', 'ceo_nm']
        
        results, _ = await self._fuzzy_search_with_filters(
            'nice_dnb_company_info', search_fields, search_term, {}, limit, offset
        )
        return results
    
    async def get_companies_by_industry(
        self,
        industry_code: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """根据行业代码获取公司列表"""
        result = self.client.table('nice_dnb_company_info')\
            .select('*')\
            .eq('ind_cd1', industry_code)\
            .order('cmp_nm', desc=False)\
            .range(offset, offset + limit - 1)\
            .execute()
        return result.data or []
    
    async def delete_company_info(self, biz_no: str) -> bool:
        """删除公司信息（硬删除）"""
        self.client.table('nice_dnb_company_info')\
            .delete()\
            .eq('biz_no', biz_no)\
            .execute()
        return True