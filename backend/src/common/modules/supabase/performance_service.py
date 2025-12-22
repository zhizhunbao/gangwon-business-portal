"""
Performance management service.

Handles all performance record-related database operations.
Updated to use the merged performance_records table structure.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from .base_service import BaseSupabaseService


class PerformanceService(BaseSupabaseService):
    """Service for performance management operations using merged table structure."""
    
    # ============================================================================
    # Performance Records
    # ============================================================================
    
    async def get_performance_record_by_id(self, performance_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取绩效记录"""
        result = self.client.table('performance_records')\
            .select('*')\
            .eq('id', performance_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_performance_record(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建绩效记录"""
        result = self.client.table('performance_records')\
            .insert(record_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create performance record: no data returned")
        return result.data[0]
    
    async def update_performance_record(self, performance_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新绩效记录"""
        result = self.client.table('performance_records')\
            .update(update_data)\
            .eq('id', performance_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update performance record {performance_id}: no data returned")
        return result.data[0]
    
    async def delete_performance_record(self, performance_id: str) -> bool:
        """软删除绩效记录（设置 deleted_at）"""
        self.client.table('performance_records')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', performance_id)\
            .execute()
        return True
    
    async def get_performance_records(
        self,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Get performance records with filters for dashboard.
        
        Args:
            year: Filter by year
            quarter: Filter by quarter
            status: Filter by status
            limit: Maximum number of records
            
        Returns:
            List of performance records
        """
        query = self.client.table('performance_records')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)\
            .limit(limit)
        
        if year:
            query = query.eq('year', year)
        if quarter:
            query = query.eq('quarter', quarter)
        if status:
            query = query.eq('status', status)
        
        result = query.execute()
        return result.data or []
    
    async def get_performance_records_for_chart(
        self,
        year_filter: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get performance records for chart data generation.
        
        Args:
            year_filter: Optional year filter
            
        Returns:
            List of performance records for chart
        """
        query = self.client.table('performance_records')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .eq('status', 'approved')\
            .order('year', desc=False)\
            .order('quarter', desc=False)
        
        if year_filter:
            query = query.eq('year', year_filter)
        
        result = query.execute()
        return result.data or []
    
    async def export_performance_records(
        self,
        member_id: Optional[str] = None,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Export performance records for download.
        
        Args:
            member_id: Filter by member ID
            year: Filter by year
            quarter: Filter by quarter
            status: Filter by status
            
        Returns:
            List of performance records for export
        """
        query = self.client.table('performance_records')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)
        
        if member_id:
            query = query.eq('member_id', member_id)
        if year:
            query = query.eq('year', year)
        if quarter:
            query = query.eq('quarter', quarter)
        if status:
            query = query.eq('status', status)
        
        result = query.execute()
        records = result.data or []
        
        # Enrich with related data for export
        return await self._enrich_performance_records(records)
    
    async def list_performance_records_with_filters(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        status: Optional[str] = None,
        member_id: Optional[str] = None,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List performance records with advanced filtering and search capabilities.
        
        Args:
            limit: Maximum number of results per page
            offset: Number of results to skip
            search: Search term for fuzzy matching
            status: Filter by status
            member_id: Filter by member ID
            year: Filter by year
            quarter: Filter by quarter
            sort_by: Field to sort by
            sort_order: Sort order ('asc' or 'desc')
            
        Returns:
            Tuple of (records_list, total_count)
        """
        if search and len(search.strip()) > 0:
            return await self._list_performance_records_search(
                search.strip(), limit, offset, status, member_id, year, quarter
            )
        else:
            return await self._list_performance_records_normal(
                limit, offset, status, member_id, year, quarter, sort_by, sort_order
            )
    
    async def _list_performance_records_normal(
        self,
        limit: int,
        offset: int,
        status: Optional[str],
        member_id: Optional[str],
        year: Optional[int],
        quarter: Optional[int],
        sort_by: str,
        sort_order: str
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List performance records without search (normal filtering)."""
        # Build filters
        filters = {'deleted_at': None}  # Only non-deleted records
        if status:
            filters['status'] = status
        if member_id:
            filters['member_id'] = member_id
        if year:
            filters['year'] = year
        if quarter:
            filters['quarter'] = quarter
        
        # Count total
        total = await self.count_records('performance_records', filters)
        
        # Get data
        query = self.client.table('performance_records').select('*')
        
        # Apply filters
        for key, value in filters.items():
            if key == 'deleted_at' and value is None:
                query = query.is_('deleted_at', 'null')
            elif value is not None:
                query = query.eq(key, value)
        
        # Apply sorting
        if sort_order == 'desc':
            query = query.order(sort_by, desc=True)
        else:
            query = query.order(sort_by, desc=False)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        records = result.data or []
        
        # Enrich with related data
        enriched_records = await self._enrich_performance_records(records)
        
        return enriched_records, total
    
    async def _list_performance_records_search(
        self,
        search_term: str,
        limit: int,
        offset: int,
        status: Optional[str],
        member_id: Optional[str],
        year: Optional[int],
        quarter: Optional[int]
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List performance records with search functionality."""
        # Build filters
        filters = {'deleted_at': None}  # Only non-deleted records
        if status:
            filters['status'] = status
        if member_id:
            filters['member_id'] = member_id
        if year:
            filters['year'] = year
        if quarter:
            filters['quarter'] = quarter
        
        # Define searchable fields
        search_fields = ['title', 'description', 'achievements']
        
        # Use fuzzy search
        records, total = await self._fuzzy_search_with_filters(
            'performance_records', search_fields, search_term, filters, limit, offset
        )
        
        # Enrich with related data
        enriched_records = await self._enrich_performance_records(records)
        
        return enriched_records, total
    
    async def _enrich_performance_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich performance records with related data (member info, attachments)."""
        if not records:
            return records
        
        record_ids = [record['id'] for record in records]
        member_ids = list(set(record['member_id'] for record in records if record.get('member_id')))
        
        # 批量获取会员信息
        members_map = {}
        
        members_result = self.client.table('members')\
            .select('id, company_name, business_number')\
            .in_('id', member_ids)\
            .execute()
        
        for member in members_result.data or []:
            members_map[member['id']] = member
        
        # 批量获取附件信息
        attachments_map = {}
        attachments_result = self.client.table('attachments')\
            .select('id, resource_id, original_name, file_size')\
            .eq('resource_type', 'performance')\
            .in_('resource_id', record_ids)\
            .is_('deleted_at', 'null')\
            .execute()
        
        for attachment in attachments_result.data or []:
            resource_id = attachment['resource_id']
            if resource_id not in attachments_map:
                attachments_map[resource_id] = []
            attachments_map[resource_id].append(attachment)
        
        # 组装数据
        enriched_records = []
        for record in records:
            enriched_record = record.copy()
            
            # 审核信息现在直接在记录中（合并后的字段）
            # 为了向后兼容，创建一个reviews数组
            reviews = []
            if record.get('review_status'):
                reviews.append({
                    'id': f"{record['id']}_review",  # 虚拟ID
                    'performance_id': record['id'],
                    'reviewer_id': record.get('reviewer_id'),
                    'status': record.get('review_status'),
                    'comments': record.get('review_comments'),
                    'reviewed_at': record.get('reviewed_at'),
                })
            
            enriched_record['reviews'] = reviews
            enriched_record['review_count'] = len(reviews)
            
            # 添加会员信息
            member_info = members_map.get(record.get('member_id'))
            if member_info:
                enriched_record['member_company_name'] = member_info.get('company_name')
                enriched_record['member_business_number'] = member_info.get('business_number')
            
            # 添加附件信息
            enriched_record['attachments'] = attachments_map.get(record['id'], [])
            enriched_record['attachment_count'] = len(enriched_record['attachments'])
            
            enriched_records.append(enriched_record)
        
        return enriched_records
    
    # ============================================================================
    # Performance Reviews (now integrated into performance_records table)
    # ============================================================================
    
    async def create_performance_review(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建绩效审核记录（现在更新performance_records表的审核字段）
        
        Args:
            review_data: 包含performance_id, reviewer_id, status, comments的字典
            
        Returns:
            更新后的performance record
        """
        performance_id = review_data.get('performance_id')
        if not performance_id:
            raise ValueError("performance_id is required")
        
        # 更新performance_records表的审核字段
        update_data = {
            'reviewer_id': review_data.get('reviewer_id'),
            'review_status': review_data.get('status'),
            'review_comments': review_data.get('comments'),
            'reviewed_at': datetime.now(timezone.utc).isoformat(),
        }
        
        result = self.client.table('performance_records')\
            .update(update_data)\
            .eq('id', performance_id)\
            .execute()
        
        if not result.data:
            raise ValueError("Failed to create performance review: no data returned")
        return result.data[0]
    
    async def get_performance_reviews_by_performance_id(self, performance_id: str) -> List[Dict[str, Any]]:
        """
        根据绩效记录ID获取审核记录（现在从performance_records表获取）
        
        Returns:
            审核记录列表（为了向后兼容，返回reviews格式）
        """
        result = self.client.table('performance_records')\
            .select('id, reviewer_id, review_status, review_comments, reviewed_at')\
            .eq('id', performance_id)\
            .execute()
        
        if not result.data:
            return []
        
        record = result.data[0]
        reviews = []
        
        # 如果有审核信息，转换为reviews格式
        if record.get('review_status'):
            reviews.append({
                'id': f"{performance_id}_review",
                'performance_id': performance_id,
                'reviewer_id': record.get('reviewer_id'),
                'status': record.get('review_status'),
                'comments': record.get('review_comments'),
                'reviewed_at': record.get('reviewed_at'),
            })
        
        return reviews
    
    async def update_performance_review(self, review_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        更新绩效审核记录（现在更新performance_records表）
        
        Note: review_id 现在应该是 performance_id，因为审核信息合并到主表中
        """
        # 假设review_id实际上是performance_id
        performance_id = review_id.replace('_review', '') if '_review' in review_id else review_id
        
        # 转换字段名
        performance_update = {}
        if 'status' in update_data:
            performance_update['review_status'] = update_data['status']
        if 'comments' in update_data:
            performance_update['review_comments'] = update_data['comments']
        if 'reviewer_id' in update_data:
            performance_update['reviewer_id'] = update_data['reviewer_id']
        
        performance_update['reviewed_at'] = datetime.now(timezone.utc).isoformat()
        
        result = self.client.table('performance_records')\
            .update(performance_update)\
            .eq('id', performance_id)\
            .execute()
        
        if not result.data:
            raise ValueError(f"Failed to update performance review {review_id}: no data returned")
        return result.data[0]
    
    async def delete_performance_review(self, review_id: str) -> bool:
        """
        删除绩效审核记录（现在清空performance_records表的审核字段）
        """
        # 假设review_id实际上是performance_id
        performance_id = review_id.replace('_review', '') if '_review' in review_id else review_id
        
        # 清空审核字段
        update_data = {
            'reviewer_id': None,
            'review_status': None,
            'review_comments': None,
            'reviewed_at': None,
        }
        
        self.client.table('performance_records')\
            .update(update_data)\
            .eq('id', performance_id)\
            .execute()
        
        return True