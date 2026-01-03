"""
Content management service.

Business logic for content management (notices, press releases, banners, system info).
"""
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone

from ...common.modules.exception import NotFoundError, ValidationError
from ...common.modules.supabase.service import supabase_service
from .schemas import (
    NoticeCreate,
    NoticeUpdate,
    PressReleaseCreate,
    PressReleaseUpdate,
    BannerCreate,
    BannerUpdate,
    SystemInfoUpdate,
)


class ContentService:
    """Content management service class."""

    async def _get_member_name(self, member_id: str) -> Optional[str]:
        """
        Get member company name by ID.
        
        Args:
            member_id: Member UUID string
            
        Returns:
            Company name or None if not found
        """
        if not member_id:
            return None
        
        # Use direct client for simple lookup
        result = supabase_service.client.table('members').select('company_name').eq('id', member_id).execute()
        return result.data[0]['company_name'] if result.data else None

    # ============================================================================
    # Notice Management - Using Helper Methods + Direct Client
    # ============================================================================

    async def get_notices(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get paginated list of notices.

        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            search: Optional search term for title

        Returns:
            Tuple of (notices list, total count)
        """
        if search:
            # Complex search query - use direct client
            # Get total count first
            count_query = supabase_service.client.table('notices')\
                .select('*', count='exact')\
                .is_('deleted_at', 'null')\
                .ilike('title', f'%{search}%')
            count_result = count_query.execute()
            total = count_result.count or 0
            
            # Get paginated results
            query = supabase_service.client.table('notices')\
                .select('*')\
                .is_('deleted_at', 'null')\
                .ilike('title', f'%{search}%')\
                .order('created_at', desc=True)\
                .range((page - 1) * page_size, page * page_size - 1)
            
            result = query.execute()
            return result.data or [], total
        else:
            # Simple pagination - use helper method
            return await supabase_service.list_with_pagination(
                table='notices',
                page=page,
                page_size=page_size,
                order_by='created_at',
                order_desc=True,
                exclude_deleted=True
            )

    async def get_notice_latest5(self) -> List[Dict[str, Any]]:
        """
        Get latest 5 notices for homepage.

        Returns:
            List of latest 5 notices
        """
        # Simple query - use direct client
        result = supabase_service.client.table('notices')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)\
            .limit(5)\
            .execute()
        
        return result.data or []

    async def get_notice_by_id(self, notice_id: UUID) -> Dict[str, Any]:
        """
        Get notice by ID and increment view count.

        Args:
            notice_id: Notice UUID

        Returns:
            Notice dictionary

        Raises:
            NotFoundError: If notice not found
        """
        # Use helper method to get notice
        notice = await supabase_service.get_by_id('notices', str(notice_id))
        if not notice:
            raise NotFoundError(resource_type="Notice")
        
        # Increment view count - use direct client for atomic operation
        supabase_service.client.table('notices')\
            .update({'view_count': (notice.get('view_count', 0) + 1)})\
            .eq('id', str(notice_id))\
            .execute()
        
        # Return updated notice
        notice['view_count'] = notice.get('view_count', 0) + 1
        return notice

    async def create_notice(self, data: NoticeCreate) -> Dict[str, Any]:
        """
        Create a new notice.

        Args:
            data: Notice creation data

        Returns:
            Created notice dictionary
        """
        notice_data = {
            'id': str(uuid4()),
            'title': data.title,
            'content_html': data.content_html,
            'board_type': data.board_type or 'general',
            'view_count': 0,
        }
        
        # Use helper method
        return await supabase_service.create_record('notices', notice_data)

    async def update_notice(self, notice_id: UUID, data: NoticeUpdate) -> Dict[str, Any]:
        """
        Update a notice.

        Args:
            notice_id: Notice UUID
            data: Notice update data

        Returns:
            Updated notice dictionary

        Raises:
            NotFoundError: If notice not found
        """
        # Check if notice exists
        existing_notice = await supabase_service.get_by_id('notices', str(notice_id))
        if not existing_notice:
            raise NotFoundError(resource_type="Notice")

        # Build update data
        update_data = {}
        if data.title is not None:
            update_data['title'] = data.title
        if data.content_html is not None:
            update_data['content_html'] = data.content_html
        if data.board_type is not None:
            update_data['board_type'] = data.board_type

        if not update_data:
            return existing_notice

        # Use helper method
        return await supabase_service.update_record('notices', str(notice_id), update_data)

    async def delete_notice(self, notice_id: UUID) -> None:
        """
        Delete a notice (soft delete).

        Args:
            notice_id: Notice UUID

        Raises:
            NotFoundError: If notice not found
        """
        # Check if notice exists
        existing_notice = await supabase_service.get_by_id('notices', str(notice_id))
        if not existing_notice:
            raise NotFoundError(resource_type="Notice")

        # Use helper method for soft delete
        await supabase_service.delete_record('notices', str(notice_id))

    # ============================================================================
    # Press Release Management - Using Helper Methods + Direct Client
    # ============================================================================

    async def get_press_releases(
        self, page: int = 1, page_size: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get paginated list of press releases.

        Args:
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (press releases list, total count)
        """
        # Simple pagination - use helper method
        return await supabase_service.list_with_pagination(
            table='press_releases',
            page=page,
            page_size=page_size,
            order_by='created_at',
            order_desc=True,
            exclude_deleted=True
        )

    async def get_press_latest1(self) -> Optional[Dict[str, Any]]:
        """
        Get latest press release for homepage.

        Returns:
            Latest press release or None
        """
        # Simple query - use direct client
        result = supabase_service.client.table('press_releases')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)\
            .limit(1)\
            .execute()
        
        return result.data[0] if result.data else None

    async def get_press_by_id(self, press_id: UUID) -> Dict[str, Any]:
        """
        Get press release by ID.

        Args:
            press_id: Press release UUID

        Returns:
            Press release dictionary

        Raises:
            NotFoundError: If press release not found
        """
        # Use helper method
        press = await supabase_service.get_by_id('press_releases', str(press_id))
        if not press:
            raise NotFoundError(resource_type="Press Release")
        return press

    async def create_press_release(self, data: PressReleaseCreate) -> Dict[str, Any]:
        """
        Create a new press release.

        Args:
            data: Press release creation data

        Returns:
            Created press release dictionary
        """
        press_data = {
            'id': str(uuid4()),
            'title': data.title,
            'image_url': data.image_url,
        }
        
        # Use helper method
        return await supabase_service.create_record('press_releases', press_data)

    async def update_press_release(self, press_id: UUID, data: PressReleaseUpdate) -> Dict[str, Any]:
        """
        Update a press release.

        Args:
            press_id: Press release UUID
            data: Press release update data

        Returns:
            Updated press release dictionary

        Raises:
            NotFoundError: If press release not found
        """
        # Check if press release exists
        existing_press = await supabase_service.get_by_id('press_releases', str(press_id))
        if not existing_press:
            raise NotFoundError(resource_type="Press Release")

        # Build update data
        update_data = {}
        if data.title is not None:
            update_data['title'] = data.title
        if data.content_html is not None:
            update_data['content_html'] = data.content_html
        if data.image_url is not None:
            update_data['image_url'] = data.image_url

        if not update_data:
            return existing_press

        # Use helper method
        return await supabase_service.update_record('press_releases', str(press_id), update_data)

    async def delete_press_release(self, press_id: UUID) -> None:
        """
        Delete a press release (soft delete).

        Args:
            press_id: Press release UUID

        Raises:
            NotFoundError: If press release not found
        """
        # Check if press release exists
        existing_press = await supabase_service.get_by_id('press_releases', str(press_id))
        if not existing_press:
            raise NotFoundError(resource_type="Press Release")

        # Use helper method for soft delete
        await supabase_service.delete_record('press_releases', str(press_id))

    # ============================================================================
    # Banner Management - Using Helper Methods + Direct Client
    # ============================================================================

    async def get_banners(self, banner_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get active banners by type.

        Args:
            banner_type: Optional banner type filter

        Returns:
            List of active banners
        """
        # Complex query with multiple conditions - use direct client
        query = supabase_service.client.table('banners').select('*')
        
        if banner_type:
            query = query.eq('banner_type', banner_type)
        
        query = query.eq('is_active', 'true')\
                    .order('display_order', desc=False)\
                    .order('created_at', desc=True)
        
        result = query.execute()
        return result.data or []

    async def get_all_banners(self) -> List[Dict[str, Any]]:
        """
        Get all banners (admin only, includes inactive).

        Returns:
            List of all banners
        """
        # Simple query - use direct client
        result = supabase_service.client.table('banners')\
            .select('*')\
            .order('display_order', desc=False)\
            .execute()
        
        return result.data or []

    async def get_banner_by_type(self, banner_type: str) -> Optional[Dict[str, Any]]:
        """
        Get a banner by banner_type (prefers active banner).

        Args:
            banner_type: Banner type

        Returns:
            Banner dictionary or None
        """
        # Try to get active banner first
        result = supabase_service.client.table('banners')\
            .select('*')\
            .eq('banner_type', banner_type)\
            .eq('is_active', 'true')\
            .order('display_order', desc=False)\
            .limit(1)\
            .execute()
        
        if result.data:
            return result.data[0]
        
        # Fallback to any banner of this type
        result = supabase_service.client.table('banners')\
            .select('*')\
            .eq('banner_type', banner_type)\
            .order('display_order', desc=False)\
            .limit(1)\
            .execute()
        
        return result.data[0] if result.data else None

    async def create_banner(self, data: BannerCreate) -> Dict[str, Any]:
        """
        Create a new banner.

        Args:
            data: Banner creation data

        Returns:
            Created banner dictionary
        """
        banner_data = {
            'id': str(uuid4()),
            'banner_type': data.banner_type,
            'title': data.title,
            'image_url': data.image_url,
            'link_url': data.link_url,
            'is_active': data.is_active,
            'display_order': data.display_order or 0,
        }
        
        # Use helper method
        return await supabase_service.create_record('banners', banner_data)

    async def update_banner(self, banner_id: UUID, data: BannerUpdate) -> Dict[str, Any]:
        """
        Update a banner.

        Args:
            banner_id: Banner UUID
            data: Banner update data

        Returns:
            Updated banner dictionary

        Raises:
            NotFoundError: If banner not found
        """
        # Check if banner exists
        existing_banner = await supabase_service.get_by_id('banners', str(banner_id))
        if not existing_banner:
            raise NotFoundError(resource_type="Banner")

        # Build update data
        update_data = {}
        if data.banner_type is not None:
            update_data['banner_type'] = data.banner_type
        if data.title_ko is not None:
            update_data['title_ko'] = data.title_ko
        if data.title_zh is not None:
            update_data['title_zh'] = data.title_zh
        if data.subtitle_ko is not None:
            update_data['subtitle_ko'] = data.subtitle_ko
        if data.subtitle_zh is not None:
            update_data['subtitle_zh'] = data.subtitle_zh
        if data.image_url is not None:
            update_data['image_url'] = data.image_url
        if data.link_url is not None:
            update_data['link_url'] = data.link_url
        if data.is_active is not None:
            update_data['is_active'] = data.is_active
        if data.display_order is not None:
            update_data['display_order'] = data.display_order

        if not update_data:
            return existing_banner

        # Use helper method
        return await supabase_service.update_record('banners', str(banner_id), update_data)

    async def delete_banner(self, banner_id: UUID) -> None:
        """
        Delete a banner (hard delete).

        Args:
            banner_id: Banner UUID

        Raises:
            NotFoundError: If banner not found
        """
        # Check if banner exists
        existing_banner = await supabase_service.get_by_id('banners', str(banner_id))
        if not existing_banner:
            raise NotFoundError(resource_type="Banner")

        # Use helper method for hard delete
        await supabase_service.hard_delete_record('banners', str(banner_id))

    # ============================================================================
    # SystemInfo Management - Using Helper Methods + Direct Client
    # ============================================================================

    async def get_system_info(self) -> Optional[Dict[str, Any]]:
        """
        Get system information (singleton).

        Returns:
            SystemInfo dictionary with updater_name or None if not set
        """
        # Simple query - use direct client
        result = supabase_service.client.table('system_info')\
            .select('*')\
            .order('updated_at', desc=True)\
            .limit(1)\
            .execute()
        
        if result.data:
            system_info = result.data[0]
            system_info['updater_name'] = await self._get_member_name(system_info.get('updated_by'))
            return system_info
        return None

    async def update_system_info(
        self, data: SystemInfoUpdate, updated_by: UUID
    ) -> Dict[str, Any]:
        """
        Update system information (upsert pattern).

        Args:
            data: System info update data
            updated_by: User ID (Admin or Member ID)

        Returns:
            Updated or created SystemInfo dictionary
        """
        # Check if updated_by is a member (admins are not in members table)
        member_result = supabase_service.client.table('members').select('id').eq('id', str(updated_by)).execute()
        member_id = str(updated_by) if member_result.data else None

        # Try to get existing system info
        existing = await self.get_system_info()

        system_info_data = {
            'content_html': data.content_html,
            'image_url': data.image_url,
            'updated_by': member_id,
        }

        if existing:
            # Update existing - use helper method
            return await supabase_service.update_record('system_info', existing['id'], system_info_data)
        else:
            # Create new - use helper method
            system_info_data['id'] = str(uuid4())
            return await supabase_service.create_record('system_info', system_info_data)


    # ============================================================================
    # LegalContent Management - Terms of Service, Privacy Policy
    # ============================================================================

    async def get_legal_content(self, content_type: str) -> Optional[Dict[str, Any]]:
        """
        Get legal content by type.

        Args:
            content_type: 'terms_of_service' or 'privacy_policy'

        Returns:
            LegalContent dictionary or None if not set
        """
        result = supabase_service.client.table('legal_content')\
            .select('*')\
            .eq('content_type', content_type)\
            .limit(1)\
            .execute()
        
        if result.data:
            return result.data[0]
        return None

    async def update_legal_content(
        self, content_type: str, content_html: str, updated_by: UUID
    ) -> Dict[str, Any]:
        """
        Update or create legal content (upsert pattern).

        Args:
            content_type: 'terms_of_service' or 'privacy_policy'
            content_html: HTML content
            updated_by: Admin user ID

        Returns:
            Updated or created LegalContent dictionary
        """
        # Try to get existing content
        existing = await self.get_legal_content(content_type)

        legal_content_data = {
            'content_type': content_type,
            'content_html': content_html,
            'updated_by': str(updated_by),
        }

        if existing:
            # Update existing
            return await supabase_service.update_record('legal_content', existing['id'], legal_content_data)
        else:
            # Create new
            legal_content_data['id'] = str(uuid4())
            return await supabase_service.create_record('legal_content', legal_content_data)
