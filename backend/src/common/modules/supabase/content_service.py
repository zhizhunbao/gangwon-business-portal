"""
Content management service.

Handles all content-related database operations including notices, press releases,
banners, system info, FAQs, and inquiries.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from .base_service import BaseSupabaseService


class ContentService(BaseSupabaseService):
    """Service for content management operations."""
    
    # ============================================================================
    # Notice Operations
    # ============================================================================
    
    async def get_notice_by_id(self, notice_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取公告"""
        result = self.client.table('notices')\
            .select('*')\
            .eq('id', notice_id)\
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_notice(self, notice_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建公告"""
        result = self.client.table('notices')\
            .insert(notice_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create notice: no data returned")
        return result.data[0]
    
    async def update_notice(self, notice_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新公告"""
        result = self.client.table('notices')\
            .update(update_data)\
            .eq('id', notice_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update notice {notice_id}: no data returned")
        return result.data[0]
    
    async def delete_notice(self, notice_id: str) -> bool:
        """删除公告（软删除）"""
        from datetime import datetime, timezone
        
        result = self.client.table('notices')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', notice_id)\
            .execute()
        return bool(result.data)
    
    async def list_notices_with_filters(
        self,
        limit: int = 20,
        offset: int = 0,
        board_type: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List notices with filtering and search."""
        if search and len(search.strip()) > 0:
            return await self._list_notices_search(
                search.strip(), limit, offset, board_type
            )
        else:
            return await self._list_notices_normal(
                limit, offset, board_type, sort_by, sort_order
            )
    
    async def _list_notices_normal(
        self,
        limit: int,
        offset: int,
        board_type: Optional[str],
        sort_by: str,
        sort_order: str
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List notices without search."""
        filters = {'deleted_at': None}  # Filter out soft-deleted records
        if board_type:
            filters['board_type'] = board_type
        
        total = await self.count_records('notices', filters)
        
        query = self.client.table('notices').select('*').is_('deleted_at', 'null')
        
        if board_type:
            query = query.eq('board_type', board_type)
        
        if sort_order == 'desc':
            query = query.order(sort_by, desc=True)
        else:
            query = query.order(sort_by, desc=False)
        
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    async def _list_notices_search(
        self,
        search_term: str,
        limit: int,
        offset: int,
        board_type: Optional[str]
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List notices with search."""
        filters = {'deleted_at': None}  # Filter out soft-deleted records
        if board_type:
            filters['board_type'] = board_type
        
        search_fields = ['title', 'content_html']
        
        return await self._fuzzy_search_with_filters(
            'notices', search_fields, search_term, filters, limit, offset
        )
    
    # ============================================================================
    # Press Release Operations
    # ============================================================================
    
    async def get_press_release_by_id(self, press_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取新闻稿"""
        result = self.client.table('press_releases')\
            .select('*')\
            .eq('id', press_id)\
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_press_release(self, press_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新闻稿"""
        result = self.client.table('press_releases')\
            .insert(press_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create press release: no data returned")
        return result.data[0]
    
    async def update_press_release(self, press_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新新闻稿"""
        result = self.client.table('press_releases')\
            .update(update_data)\
            .eq('id', press_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update press release {press_id}: no data returned")
        return result.data[0]
    
    async def delete_press_release(self, press_id: str) -> bool:
        """删除新闻稿（软删除）"""
        from datetime import datetime, timezone
        
        result = self.client.table('press_releases')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', press_id)\
            .execute()
        return bool(result.data)
    
    async def list_press_releases(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List press releases."""
        if search and len(search.strip()) > 0:
            search_fields = ['title']
            filters = {'deleted_at': None}  # Filter out soft-deleted records
            return await self._fuzzy_search_with_filters(
                'press_releases', search_fields, search.strip(), filters, limit, offset
            )
        else:
            filters = {'deleted_at': None}  # Filter out soft-deleted records
            total = await self.count_records('press_releases', filters)
            
            query = self.client.table('press_releases')\
                .select('*')\
                .is_('deleted_at', 'null')\
                .order('created_at', desc=True)\
                .range(offset, offset + limit - 1)
            
            result = query.execute()
            return result.data or [], total
    
    # ============================================================================
    # Banner Operations
    # ============================================================================
    
    async def get_banner_by_id(self, banner_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取横幅"""
        result = self.client.table('banners')\
            .select('*')\
            .eq('id', banner_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_banner(self, banner_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建横幅"""
        result = self.client.table('banners')\
            .insert(banner_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create banner: no data returned")
        return result.data[0]
    
    async def update_banner(self, banner_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新横幅"""
        result = self.client.table('banners')\
            .update(update_data)\
            .eq('id', banner_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update banner {banner_id}: no data returned")
        return result.data[0]
    
    async def delete_banner(self, banner_id: str) -> bool:
        """删除横幅（硬删除）"""
        self.client.table('banners')\
            .delete()\
            .eq('id', banner_id)\
            .execute()
        return True
    
    async def get_banners_by_type(self, banner_type: str, is_active: str = "true") -> List[Dict[str, Any]]:
        """根据类型获取横幅列表"""
        result = self.client.table('banners')\
            .select('*')\
            .eq('banner_type', banner_type)\
            .eq('is_active', is_active)\
            .order('display_order', desc=False)\
            .execute()
        return result.data or []
    
    async def list_banners(
        self,
        limit: int = 20,
        offset: int = 0,
        banner_type: Optional[str] = None,
        is_active: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List banners with filtering."""
        filters = {}
        if banner_type:
            filters['banner_type'] = banner_type
        if is_active:
            filters['is_active'] = is_active
        
        total = await self.count_records('banners', filters)
        
        query = self.client.table('banners').select('*')
        
        if banner_type:
            query = query.eq('banner_type', banner_type)
        if is_active:
            query = query.eq('is_active', is_active)
        
        query = query.order('display_order', desc=False)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # System Info Operations
    # ============================================================================
    
    async def get_system_info(self) -> Optional[Dict[str, Any]]:
        """获取系统介绍信息（单例）"""
        result = self.client.table('system_info')\
            .select('*')\
            .order('updated_at', desc=True)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_or_update_system_info(self, info_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建或更新系统介绍信息"""
        existing = await self.get_system_info()
        
        if existing:
            # Update existing record
            result = self.client.table('system_info')\
                .update(info_data)\
                .eq('id', existing['id'])\
                .execute()
        else:
            # Create new record
            result = self.client.table('system_info')\
                .insert(info_data)\
                .execute()
        
        if not result.data:
            raise ValueError("Failed to create/update system info: no data returned")
        return result.data[0]
    
    # ============================================================================
    # FAQ Operations
    # ============================================================================
    
    async def get_faq_by_id(self, faq_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取FAQ"""
        result = self.client.table('faqs')\
            .select('*')\
            .eq('id', faq_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_faq(self, faq_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建FAQ"""
        result = self.client.table('faqs')\
            .insert(faq_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create FAQ: no data returned")
        return result.data[0]
    
    async def update_faq(self, faq_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新FAQ"""
        result = self.client.table('faqs')\
            .update(update_data)\
            .eq('id', faq_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update FAQ {faq_id}: no data returned")
        return result.data[0]
    
    async def delete_faq(self, faq_id: str) -> bool:
        """删除FAQ（硬删除）"""
        self.client.table('faqs')\
            .delete()\
            .eq('id', faq_id)\
            .execute()
        return True
    
    async def list_faqs(
        self,
        limit: int = 50,
        offset: int = 0,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List FAQs with filtering and search."""
        if search and len(search.strip()) > 0:
            filters = {}
            if category:
                filters['category'] = category
            
            search_fields = ['question', 'answer', 'category']
            return await self._fuzzy_search_with_filters(
                'faqs', search_fields, search.strip(), filters, limit, offset
            )
        else:
            filters = {}
            if category:
                filters['category'] = category
            
            total = await self.count_records('faqs', filters)
            
            query = self.client.table('faqs').select('*')
            
            if category:
                query = query.eq('category', category)
            
            query = query.order('display_order', desc=False)\
                        .order('created_at', desc=True)\
                        .range(offset, offset + limit - 1)
            
            result = query.execute()
            return result.data or [], total
    
    # ============================================================================
    # Inquiry Operations
    # ============================================================================
    
    async def get_inquiry_by_id(self, inquiry_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取咨询"""
        result = self.client.table('inquiries')\
            .select('*')\
            .eq('id', inquiry_id)\
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_inquiry(self, inquiry_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建咨询"""
        result = self.client.table('inquiries')\
            .insert(inquiry_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create inquiry: no data returned")
        return result.data[0]
    
    async def update_inquiry(self, inquiry_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新咨询"""
        result = self.client.table('inquiries')\
            .update(update_data)\
            .eq('id', inquiry_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update inquiry {inquiry_id}: no data returned")
        return result.data[0]
    
    async def delete_inquiry(self, inquiry_id: str) -> bool:
        """删除咨询（软删除）"""
        from datetime import datetime, timezone
        
        result = self.client.table('inquiries')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', inquiry_id)\
            .execute()
        return bool(result.data)
    
    async def list_inquiries_with_filters(
        self,
        limit: int = 20,
        offset: int = 0,
        member_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List inquiries with filtering and search."""
        if search and len(search.strip()) > 0:
            filters = {'deleted_at': None}  # Filter out soft-deleted records
            if member_id:
                filters['member_id'] = member_id
            if status:
                filters['status'] = status
            
            search_fields = ['subject', 'content']
            return await self._fuzzy_search_with_filters(
                'inquiries', search_fields, search.strip(), filters, limit, offset
            )
        else:
            filters = {'deleted_at': None}  # Filter out soft-deleted records
            if member_id:
                filters['member_id'] = member_id
            if status:
                filters['status'] = status
            
            total = await self.count_records('inquiries', filters)
            
            query = self.client.table('inquiries').select('*').is_('deleted_at', 'null')
            
            if member_id:
                query = query.eq('member_id', member_id)
            if status:
                query = query.eq('status', status)
            
            if sort_order == 'desc':
                query = query.order(sort_by, desc=True)
            else:
                query = query.order(sort_by, desc=False)
            
            query = query.range(offset, offset + limit - 1)
            
            result = query.execute()
            return result.data or [], total