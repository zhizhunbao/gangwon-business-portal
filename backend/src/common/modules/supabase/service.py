"""
Supabase service with generic helper methods.

This service provides generic helper methods for common database operations
to reduce code duplication across business modules.
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from supabase import Client
from .client import get_supabase_client, get_unified_supabase_client

logger = logging.getLogger(__name__)


class SupabaseService:
    """
    Unified Supabase service with generic helper methods.
    
    This class provides helper methods for common database operations
    while maintaining backward compatibility with existing specialized methods.
    """
    
    def __init__(self):
        # 使用带日志的客户端，自动记录 DB 层操作
        self.client = get_unified_supabase_client()
        # raw 客户端用于特殊场景（如日志写入），避免循环
        self._raw_client: Client = get_supabase_client()

    # ============================================================================
    # Generic Helper Methods - For reducing code duplication
    # ============================================================================

    async def get_by_id(self, table: str, id: str) -> Optional[Dict[str, Any]]:
        """
        Generic method to get a record by ID.
        
        Args:
            table: Table name
            id: Record ID
            
        Returns:
            Record dict or None if not found
        """
        result = self.client.table(table)\
            .select('*')\
            .eq('id', id)\
            .execute()
        
        return result.data[0] if result.data else None

    async def create_record(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generic method to create a record.
        
        Args:
            table: Table name
            data: Record data
            
        Returns:
            Created record dict
            
        Raises:
            ValueError: If creation fails
        """
        result = self.client.table(table)\
            .insert(data)\
            .execute()
        
        if not result.data:
            raise ValueError(f"Failed to create record in {table}")
        return result.data[0]

    async def update_record(self, table: str, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generic method to update a record.
        
        Args:
            table: Table name
            id: Record ID
            data: Update data
            
        Returns:
            Updated record dict
            
        Raises:
            ValueError: If update fails
        """
        result = self.client.table(table)\
            .update(data)\
            .eq('id', id)\
            .execute()
        
        if not result.data:
            raise ValueError(f"Failed to update record {id} in {table}")
        return result.data[0]

    async def delete_record(self, table: str, id: str) -> bool:
        """
        Generic method to delete a record (soft delete by setting deleted_at).
        
        Args:
            table: Table name
            id: Record ID
            
        Returns:
            True if successful
        """
        result = self.client.table(table)\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', id)\
            .execute()
        
        return bool(result.data)

    async def hard_delete_record(self, table: str, id: str) -> bool:
        """
        Generic method to hard delete a record.
        
        Args:
            table: Table name
            id: Record ID
            
        Returns:
            True if successful
        """
        self.client.table(table)\
            .delete()\
            .eq('id', id)\
            .execute()
        
        return True

    async def list_with_pagination(
        self, 
        table: str, 
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1, 
        page_size: int = 20,
        order_by: str = 'created_at',
        order_desc: bool = True,
        exclude_deleted: bool = True
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Generic method for paginated listing with filters.
        
        Args:
            table: Table name
            filters: Optional filters dict
            page: Page number (1-indexed)
            page_size: Items per page
            order_by: Column to order by
            order_desc: Whether to order descending
            exclude_deleted: Whether to exclude soft-deleted records
            
        Returns:
            Tuple of (records list, total count)
        """
        # Build filters for count query
        count_filters = filters.copy() if filters else {}
        if exclude_deleted:
            count_filters['deleted_at'] = None
        
        # Get total count
        total = await self.count_records(table, count_filters)
        
        # Build main query
        query = self.client.table(table).select('*')
        
        # Apply filters
        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)
        
        # Exclude soft-deleted records
        if exclude_deleted:
            query = query.is_('deleted_at', 'null')
        
        # Apply ordering
        query = query.order(order_by, desc=order_desc)
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)
        
        result = query.execute()
        return result.data or [], total

    async def count_records(self, table: str, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Generic method to count records with filters.
        
        Args:
            table: Table name
            filters: Optional filters dict
            
        Returns:
            Record count
        """
        query = self.client.table(table).select('*', count='exact')
        
        if filters:
            for key, value in filters.items():
                if value is not None:
                    if key == 'deleted_at' and value is None:
                        query = query.is_('deleted_at', 'null')
                    else:
                        query = query.eq(key, value)
        
        result = query.execute()
        return result.count or 0

    async def exists(self, table: str, filters: Dict[str, Any]) -> bool:
        """
        Generic method to check if a record exists.
        
        Args:
            table: Table name
            filters: Filters dict
            
        Returns:
            True if record exists
        """
        query = self.client.table(table).select('id')
        
        for key, value in filters.items():
            if value is not None:
                query = query.eq(key, value)
        
        query = query.limit(1)
        result = query.execute()
        
        return bool(result.data)

    # ============================================================================
    # Backward Compatibility Methods - Keep existing business logic methods
    # ============================================================================

    async def get_member_by_business_number(self, business_number: str) -> Optional[Dict[str, Any]]:
        """根据事业자登록번호获取会员"""
        # Normalize business number (remove hyphens and spaces)
        normalized_number = business_number.replace('-', '').replace(' ', '')
        
        result = self.client.table('members')\
            .select('*')\
            .eq('business_number', normalized_number)\
            .is_('deleted_at', 'null')\
            .execute()
        
        return result.data[0] if result.data else None

    async def get_member_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('email', email)\
            .is_('deleted_at', 'null')\
            .execute()
        
        return result.data[0] if result.data else None

    async def get_member_by_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """根据重置令牌获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('reset_token', token)\
            .is_('deleted_at', 'null')\
            .execute()
        
        return result.data[0] if result.data else None

    async def check_email_uniqueness(self, email: str, exclude_member_id: Optional[str] = None) -> bool:
        """检查邮箱是否已被使用"""
        query = self.client.table('members')\
            .select('id')\
            .eq('email', email)\
            .is_('deleted_at', 'null')
        
        if exclude_member_id:
            query = query.neq('id', exclude_member_id)
        
        result = query.execute()
        return len(result.data) == 0

    async def get_approved_members_count(self) -> int:
        """获取已批准会员总数"""
        result = self.client.table('members')\
            .select('*', count='exact')\
            .eq('approval_status', 'approved')\
            .is_('deleted_at', 'null')\
            .execute()
        
        return result.count or 0

    async def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取管理员"""
        result = self.client.table('admins')\
            .select('*')\
            .eq('email', email)\
            .execute()
        
        return result.data[0] if result.data else None

    async def get_member_profile(self, member_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """获取会员及其档案信息
        
        Note: member_profiles 表已合并到 members 表中，
        profile 字段现在直接在 member 记录中。
        为了向后兼容，仍然返回 (member, profile) 元组，
        但 profile 实际上是从 member 中提取的字段。
        """
        # Get member (includes profile fields)
        member = await self.get_by_id('members', member_id)
        if not member:
            return None, None
        
        # Extract profile fields from member for backward compatibility
        profile_fields = [
            'industry', 'revenue', 'employee_count', 'founding_date',
            'region', 'address', 'representative', 'representative_birth_date',
            'representative_gender', 'legal_number', 'phone', 'website', 'logo_url',
            'contact_person_name', 'contact_person_department', 'contact_person_position',
            'main_business', 'description', 'cooperation_fields',
            'startup_type', 'ksic_major', 'ksic_sub', 'category',
            'participation_programs', 'investment_status'
        ]
        profile = {k: member.get(k) for k in profile_fields if k in member}
        profile['member_id'] = member_id
        
        return member, profile if profile else None

    async def update_member_profile(self, member_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新会员档案信息
        
        Note: member_profiles 表已合并到 members 表中，
        直接更新 members 表中的 profile 字段。
        """
        # Remove member_id from profile_data if present (it's not a column to update)
        update_data = {k: v for k, v in profile_data.items() if k != 'member_id'}
        
        # Update member record directly
        result = self.client.table('members')\
            .update(update_data)\
            .eq('id', member_id)\
            .execute()
        
        return result.data[0] if result.data else None

    async def get_attachments_by_resource(self, resource_type: str, resource_id: str) -> List[Dict[str, Any]]:
        """根据资源类型和ID获取附件列表"""
        result = self.client.table('attachments')\
            .select('*')\
            .eq('resource_type', resource_type)\
            .eq('resource_id', resource_id)\
            .is_('deleted_at', 'null')\
            .order('uploaded_at', desc=False)\
            .execute()
        
        return result.data or []

    async def get_attachments_by_resource_ids_batch(self, resource_type: str, resource_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """批量获取多个资源的附件列表，返回 {resource_id: [attachments]} 格式"""
        if not resource_ids:
            return {}
        
        result = self.client.table('attachments')\
            .select('*')\
            .eq('resource_type', resource_type)\
            .in_('resource_id', resource_ids)\
            .is_('deleted_at', 'null')\
            .order('uploaded_at', desc=False)\
            .execute()
        
        # 按 resource_id 分组
        attachments_map = {}
        for att in (result.data or []):
            rid = att['resource_id']
            if rid not in attachments_map:
                attachments_map[rid] = []
            attachments_map[rid].append(att)
        
        return attachments_map

    # Complex business methods that are still needed for backward compatibility
    async def list_members_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List members with advanced filtering and search capabilities."""
        # This is a complex method that handles member-specific business logic
        # Keep the existing implementation for now
        search = kwargs.get('search')
        approval_status = kwargs.get('approval_status')
        region = kwargs.get('region')
        sort_by = kwargs.get('sort_by', 'created_at')
        sort_order = kwargs.get('sort_order', 'desc')
        
        # Build query
        query = self.client.table('members').select('*')
        
        # Apply filters
        if approval_status:
            query = query.eq('approval_status', approval_status)
        if region:
            # region is now directly in members table (merged from member_profiles)
            query = query.eq('region', region)
        
        # Apply search
        if search:
            query = query.or_(f'company_name.ilike.%{search}%,business_number.ilike.%{search}%')
        
        # Exclude deleted
        query = query.is_('deleted_at', 'null')
        
        # Apply ordering
        query = query.order(sort_by, desc=(sort_order == 'desc'))
        
        result = query.execute()
        
        # Get total count (simplified for now)
        count_result = self.client.table('members')\
            .select('*', count='exact')\
            .is_('deleted_at', 'null')\
            .execute()
        
        return result.data or [], count_result.count or 0

    async def list_performance_records_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List performance records with advanced filtering."""
        sort_by = kwargs.get('sort_by', 'created_at')
        sort_order = kwargs.get('sort_order', 'desc')
        
        # Build query with member info - use explicit FK relationship to avoid ambiguity
        # performance_records has both member_id and reviewer_id pointing to members table
        query = self.client.table('performance_records')\
            .select('*, members!performance_records_member_id_fkey(company_name, business_number)')\
            .is_('deleted_at', 'null')\
            .order(sort_by, desc=(sort_order == 'desc'))
        
        result = query.execute()
        
        # Flatten member info into record for schema compatibility
        records = []
        for record in (result.data or []):
            member_info = record.pop('members', None) or {}
            record['member_company_name'] = member_info.get('company_name', '')
            record['member_business_number'] = member_info.get('business_number', '')
            records.append(record)
        
        # Get total count
        count_result = self.client.table('performance_records')\
            .select('*', count='exact')\
            .is_('deleted_at', 'null')\
            .execute()
        
        return records, count_result.count or 0

    async def list_projects_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List projects with advanced filtering."""
        sort_by = kwargs.get('sort_by', 'created_at')
        sort_order = kwargs.get('sort_order', 'desc')
        
        query = self.client.table('projects')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order(sort_by, desc=(sort_order == 'desc'))
        
        result = query.execute()
        
        # Get total count
        count_result = self.client.table('projects')\
            .select('*', count='exact')\
            .is_('deleted_at', 'null')\
            .execute()
        
        return result.data or [], count_result.count or 0

    async def list_project_applications_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List project applications with advanced filtering."""
        sort_by = kwargs.get('sort_by', 'submitted_at')
        sort_order = kwargs.get('sort_order', 'desc')
        project_id = kwargs.get('project_id')
        
        query = self.client.table('project_applications')\
            .select('*, projects(title), members(company_name, business_number)')
        
        # Filter by project_id if provided
        if project_id:
            query = query.eq('project_id', project_id)
        
        query = query.order(sort_by, desc=(sort_order == 'desc'))
        
        result = query.execute()
        
        # Get total count with same filters
        count_query = self.client.table('project_applications')\
            .select('*', count='exact')
        
        if project_id:
            count_query = count_query.eq('project_id', project_id)
        
        count_result = count_query.execute()
        
        return result.data or [], count_result.count or 0

    async def list_member_applications_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List member's project applications with search support."""
        sort_by = kwargs.get('sort_by', 'submitted_at')
        sort_order = kwargs.get('sort_order', 'desc')
        member_id = kwargs.get('member_id')
        search = kwargs.get('search')
        
        query = self.client.table('project_applications')\
            .select('*, projects(title), members(company_name, business_number)')\
            .is_('deleted_at', 'null')
        
        # Filter by member_id (required)
        if member_id:
            query = query.eq('member_id', member_id)
        
        query = query.order(sort_by, desc=(sort_order == 'desc'))
        
        result = query.execute()
        
        # Apply search filter on project title (client-side since Supabase doesn't support nested field search easily)
        data = result.data or []
        if search:
            search_lower = search.lower()
            data = [
                app for app in data 
                if app.get('projects', {}).get('title', '').lower().find(search_lower) >= 0
            ]
        
        return data, len(data)

    async def get_performance_records(self, **kwargs) -> List[Dict[str, Any]]:
        """Get performance records for dashboard."""
        year = kwargs.get('year')
        quarter = kwargs.get('quarter')
        status = kwargs.get('status', 'approved')
        
        query = self.client.table('performance_records')\
            .select('*')\
            .eq('status', status)\
            .is_('deleted_at', 'null')
        
        if year:
            query = query.eq('year', year)
        if quarter:
            query = query.eq('quarter', quarter)
        
        result = query.execute()
        return result.data or []

    async def get_performance_records_for_chart(self, **kwargs) -> List[Dict[str, Any]]:
        """Get performance records for chart data generation."""
        year_filter = kwargs.get('year_filter')
        
        query = self.client.table('performance_records')\
            .select('*')\
            .eq('status', 'approved')\
            .is_('deleted_at', 'null')
        
        if year_filter:
            query = query.eq('year', year_filter)
        
        result = query.execute()
        return result.data or []

    async def export_performance_records(self, **kwargs) -> List[Dict[str, Any]]:
        """Export performance records for download."""
        query = self.client.table('performance_records')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)
        
        # Apply filters if provided
        member_id = kwargs.get('member_id')
        year = kwargs.get('year')
        quarter = kwargs.get('quarter')
        status = kwargs.get('status')
        type_filter = kwargs.get('type')
        
        if member_id:
            query = query.eq('member_id', member_id)
        if year:
            query = query.eq('year', year)
        if quarter:
            query = query.eq('quarter', quarter)
        if status:
            query = query.eq('status', status)
        if type_filter:
            query = query.eq('type', type_filter)
        
        result = query.execute()
        return result.data or []

    async def export_projects(self, **kwargs) -> List[Dict[str, Any]]:
        """Export projects for download."""
        query = self.client.table('projects')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)
        
        # Apply filters if provided
        status = kwargs.get('status')
        search = kwargs.get('search')
        
        if status:
            query = query.eq('status', status)
        if search:
            query = query.ilike('title', f'%{search}%')
        
        result = query.execute()
        return result.data or []

    async def export_project_applications(self, **kwargs) -> List[Dict[str, Any]]:
        """Export project applications for download."""
        query = self.client.table('project_applications')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('submitted_at', desc=True)
        
        # Apply filters if provided
        project_id = kwargs.get('project_id')
        status = kwargs.get('status')
        
        if project_id:
            query = query.eq('project_id', project_id)
        if status:
            query = query.eq('status', status)
        
        result = query.execute()
        return result.data or []


# Create singleton instance for backward compatibility
supabase_service = SupabaseService()

__all__ = ['supabase_service', 'SupabaseService']