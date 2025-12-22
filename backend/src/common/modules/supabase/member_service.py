"""
Member management service.

Handles all member-related database operations including profile management.
Since members and member_profiles tables have been merged, this service
handles both basic member operations and profile operations.
"""
from typing import Dict, Any, List, Optional, Tuple
from .base_service import BaseSupabaseService


class MemberService(BaseSupabaseService):
    """Service for member management operations including profile management."""
    
    # ============================================================================
    # Basic Member Operations
    # ============================================================================
    
    async def get_members(self, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """获取会员列表"""
        result = self.client.table('members')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .range(offset, offset + limit - 1)\
            .execute()
        return result.data
    
    async def get_member_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('id', member_id)\
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新会员"""
        result = self.client.table('members')\
            .insert(member_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create member: no data returned")
        return result.data[0]
    
    async def update_member(self, member_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新会员信息"""
        result = self.client.table('members')\
            .update(update_data)\
            .eq('id', member_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update member {member_id}: no data returned")
        return result.data[0]
    
    async def delete_member(self, member_id: str) -> bool:
        """删除会员（软删除）"""
        from datetime import datetime, timezone
        
        result = self.client.table('members')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', member_id)\
            .execute()
        return bool(result.data)
    
    async def get_member_by_business_number(self, business_number: str) -> Optional[Dict[str, Any]]:
        """根据事业자登록번호获取会员"""
        # 标准化事业자登록번호（移除破折号和空格）
        normalized = business_number.replace("-", "").replace(" ", "")
        
        # 查询时也标准化数据库中的值进行比较
        result = self.client.table('members')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .execute()
        
        # 在客户端进行标准化比较
        for member in result.data or []:
            db_normalized = member.get('business_number', '').replace("-", "").replace(" ", "")
            if db_normalized == normalized:
                return member
        return None
    
    async def get_member_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('email', email)\
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def get_member_by_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """根据重置令牌获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('reset_token', token)\
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def check_email_uniqueness(self, email: str, exclude_member_id: Optional[str] = None) -> bool:
        """检查邮箱是否已被使用"""
        query = self.client.table('members').select('id').eq('email', email).is_('deleted_at', 'null')
        
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
    
    # ============================================================================
    # Member Profile Operations (merged from MemberProfileService)
    # ============================================================================
    
    async def get_member_profile(self, member_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        获取会员及其档案信息（现在从单一members表获取）
        
        Returns:
            Tuple of (member_data, profile_data) - both refer to same merged data for backward compatibility
        """
        # 获取会员信息（现在包含所有档案数据）
        member_result = self.client.table('members')\
            .select('*')\
            .eq('id', member_id)\
            .limit(1)\
            .execute()
        
        member = member_result.data[0] if member_result.data else None
        
        # For backward compatibility, return the same data as both member and profile
        return member, member
    
    async def get_member_profile_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取会员档案（现在从members表获取）"""
        return await self.get_member_by_id(member_id)
    
    async def create_member_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        创建会员档案（现在更新members表）
        
        Note: This method now updates the members table since profiles are merged.
        """
        member_id = profile_data.get('member_id')
        if not member_id:
            raise ValueError("member_id is required")
        
        # Remove member_id from profile_data since it's not a column to update
        update_data = {k: v for k, v in profile_data.items() if k != 'member_id'}
        
        return await self.update_member(member_id, update_data)
    
    async def update_member_profile(self, member_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新会员档案（现在更新members表）"""
        return await self.update_member(member_id, profile_data)
    
    async def delete_member_profile(self, member_id: str) -> bool:
        """
        删除会员档案（现在清空members表中的档案字段）
        """
        # Clear profile fields instead of deleting the member record
        profile_fields = {
            'industry': None,
            'revenue': None,
            'employee_count': None,
            'founding_date': None,
            'region': None,
            'address': None,
            'website': None,
            'logo_url': None,
            'representative': None,
            'legal_number': None,
            'phone': None
        }
        
        await self.update_member(member_id, profile_fields)
        return True
    
    async def get_profiles_by_member_ids(self, member_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """批量获取会员档案（现在从members表获取）"""
        if not member_ids:
            return {}
        
        profiles_result = self.client.table('members')\
            .select('*')\
            .in_('id', member_ids)\
            .execute()
        
        # 转换为字典格式，以 id 为键（不再是 member_id）
        profiles_map = {}
        for profile in profiles_result.data or []:
            profiles_map[profile['id']] = profile
        
        return profiles_map
    
    # ============================================================================
    # Advanced Member Operations (Search and Filtering)
    # ============================================================================
    
    async def list_members_with_filters(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        approval_status: Optional[str] = None,
        business_type: Optional[str] = None,
        region: Optional[str] = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        List members with advanced filtering and search capabilities.
        
        Args:
            limit: Maximum number of results per page
            offset: Number of results to skip
            search: Search term for fuzzy matching
            approval_status: Filter by approval status
            business_type: Filter by business type
            region: Filter by region
            sort_by: Field to sort by
            sort_order: Sort order ('asc' or 'desc')
            
        Returns:
            Tuple of (members_list, total_count)
        """
        if search and len(search.strip()) > 0:
            return await self._list_members_search(
                search.strip(), limit, offset, approval_status, business_type, region
            )
        else:
            return await self._list_members_normal(
                limit, offset, approval_status, business_type, region, sort_by, sort_order
            )
    
    async def _list_members_normal(
        self,
        limit: int,
        offset: int,
        approval_status: Optional[str],
        business_type: Optional[str],
        region: Optional[str],
        sort_by: str,
        sort_order: str
    ) -> tuple[List[Dict[str, Any]], int]:
        """List members without search (normal filtering)."""
        # Build filters
        filters = {'deleted_at': None}  # Filter out soft-deleted records
        if approval_status:
            filters['approval_status'] = approval_status
        if business_type:
            filters['business_type'] = business_type
        if region:
            filters['region'] = region
        
        # Count total
        total = await self.count_records('members', filters)
        
        # Get data from merged members table (no need for JOIN)
        query = self.client.table('members').select('*').is_('deleted_at', 'null')
        
        # Apply filters
        for key, value in filters.items():
            if key != 'deleted_at':  # Skip deleted_at as it's already handled
                query = query.eq(key, value)
        
        # Apply sorting
        if sort_order == 'desc':
            query = query.order(sort_by, desc=True)
        else:
            query = query.order(sort_by, desc=False)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        members = result.data or []
        
        return members, total
    
    async def _list_members_search(
        self,
        search_term: str,
        limit: int,
        offset: int,
        approval_status: Optional[str],
        business_type: Optional[str],
        region: Optional[str]
    ) -> tuple[List[Dict[str, Any]], int]:
        """List members with search functionality."""
        # Build filters
        filters = {'deleted_at': None}  # Filter out soft-deleted records
        if approval_status:
            filters['approval_status'] = approval_status
        if business_type:
            filters['business_type'] = business_type
        if region:
            filters['region'] = region
        
        # Define searchable fields (now includes profile fields since tables are merged)
        search_fields = ['company_name', 'business_number', 'email', 'representative', 'industry', 'region']
        
        # Use fuzzy search
        return await self._fuzzy_search_with_filters(
            'members', search_fields, search_term, filters, limit, offset
        )