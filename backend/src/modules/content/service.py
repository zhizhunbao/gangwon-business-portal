"""
Content management service.

Business logic for content management (notices, press releases, banners, system info).
"""
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID, uuid4

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
    PopupCreate,
    PopupUpdate,
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
        
        member_result = supabase_service.client.table('members').select('company_name').eq('id', member_id).execute()
        return member_result.data[0]['company_name'] if member_result.data else None

    # Notice Management - Using Supabase Client

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
        # Build query
        query = supabase_service.client.table('notices').select('*', count='exact')
        
        # Apply search filter
        if search:
            query = query.ilike('title', f'%{search}%')
        
        # Get total count first
        count_result = query.execute()
        total = count_result.count or 0
        
        # Get paginated results
        query = supabase_service.client.table('notices').select('*')
        if search:
            query = query.ilike('title', f'%{search}%')
        
        query = query.order('created_at', desc=True).range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        notices = result.data or []

        return notices, total

    async def get_notice_latest5(self) -> List[Dict[str, Any]]:
        """
        Get latest 5 notices for homepage.

        Returns:
            List of latest 5 notices
        """
        query = supabase_service.client.table('notices').select('*').order('created_at', desc=True).limit(5)
        
        result = query.execute()
        return result.data or []

    async def get_notice_by_id(self, notice_id: UUID) -> Dict[str, Any]:
        """
        Get notice by ID and increment view count.

        Args:
            notice_id: Notice UUID

        Returns:
            Notice dictionary with author_name

        Raises:
            NotFoundError: If notice not found
        """
        # Get notice first
        query = supabase_service.client.table('notices').select('*').eq('id', str(notice_id))
        result = query.execute()
        
        if not result.data:
            raise NotFoundError("Notice")
        
        notice = result.data[0]
        
        # Increment view count
        current_count = notice.get('view_count', 0) or 0
        update_result = supabase_service.client.table('notices').update({
            'view_count': current_count + 1
        }).eq('id', str(notice_id)).execute()
        
        if update_result.data:
            notice = update_result.data[0]
        else:
            # Return original notice if update fails
            notice['view_count'] = current_count + 1
        
        # Get author name
        notice['author_name'] = await self._get_member_name(notice.get('author_id'))
        
        return notice

    async def create_notice(
        self, data: NoticeCreate
    ) -> Dict[str, Any]:
        """
        Create a new notice.

        Args:
            data: Notice creation data

        Returns:
            Created notice dictionary
        """
        notice_data = {
            'title': data.title,
            'content_html': data.content_html,
            'board_type': data.board_type or "notice",
            'view_count': 0,
            'author_id': None  # Admin-created content
        }
        
        result = supabase_service.client.table('notices').insert(notice_data).execute()
        return result.data[0] if result.data else None

    async def update_notice(
        self, notice_id: UUID, data: NoticeUpdate
    ) -> Dict[str, Any]:
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
        # Build update data (only include non-None fields)
        update_data = {}
        if data.title is not None:
            update_data['title'] = data.title
        if data.content_html is not None:
            update_data['content_html'] = data.content_html
        if data.board_type is not None:
            update_data['board_type'] = data.board_type
        
        if not update_data:
            # No fields to update, just return existing notice
            result = supabase_service.client.table('notices').select('*').eq('id', str(notice_id)).execute()
            if not result.data:
                raise NotFoundError("Notice")
            return result.data[0]
        
        result = supabase_service.client.table('notices').update(update_data).eq('id', str(notice_id)).execute()
        
        if not result.data:
            raise NotFoundError("Notice")
        
        notice = result.data[0]
        notice['author_name'] = await self._get_member_name(notice.get('author_id'))
        
        return notice

    async def delete_notice(self, notice_id: UUID) -> None:
        """
        Delete a notice.

        Args:
            notice_id: Notice UUID

        Raises:
            NotFoundError: If notice not found
        """
        # Check if notice exists first
        check_result = supabase_service.client.table('notices').select('id').eq('id', str(notice_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Notice")
        
        # Delete the notice
        supabase_service.client.table('notices').delete().eq('id', str(notice_id)).execute()

    # Press Release Management - Using Supabase Client

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
        # Get total count first
        count_query = supabase_service.client.table('press_releases').select('*', count='exact')
        count_result = count_query.execute()
        total = count_result.count or 0
        
        # Get paginated results
        query = supabase_service.client.table('press_releases').select('*')
        query = query.order('created_at', desc=True).range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        press_releases = result.data or []

        return press_releases, total

    async def get_press_latest1(self) -> Optional[Dict[str, Any]]:
        """
        Get latest press release for homepage.

        Returns:
            Latest press release dictionary with author_name or None
        """
        query = supabase_service.client.table('press_releases').select('*').order('created_at', desc=True).limit(1)
        
        result = query.execute()
        if result.data:
            press = result.data[0]
            press['author_name'] = await self._get_member_name(press.get('author_id'))
            return press
        return None

    async def get_press_by_id(self, press_id: UUID) -> Dict[str, Any]:
        """
        Get press release by ID.

        Args:
            press_id: Press release UUID

        Returns:
            Press release dictionary with author_name

        Raises:
            NotFoundError: If press release not found
        """
        query = supabase_service.client.table('press_releases').select('*').eq('id', str(press_id))
        result = query.execute()
        
        if not result.data:
            raise NotFoundError("Press release")

        press = result.data[0]
        press['author_name'] = await self._get_member_name(press.get('author_id'))
        
        return press

    async def create_press_release(
        self, data: PressReleaseCreate
    ) -> Dict[str, Any]:
        """
        Create a new press release.

        Args:
            data: Press release creation data

        Returns:
            Created press release dictionary
        """
        press_data = {
            'title': data.title,
            'image_url': data.image_url,
            'author_id': None  # Admin-created content
        }
        
        result = supabase_service.client.table('press_releases').insert(press_data).execute()
        return result.data[0] if result.data else None

    async def update_press_release(
        self, press_id: UUID, data: PressReleaseUpdate
    ) -> Dict[str, Any]:
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
        # Build update data (only include non-None fields)
        update_data = {}
        if data.title is not None:
            update_data['title'] = data.title
        if data.image_url is not None:
            update_data['image_url'] = data.image_url
        
        if not update_data:
            # No fields to update, just return existing press release
            result = supabase_service.client.table('press_releases').select('*').eq('id', str(press_id)).execute()
            if not result.data:
                raise NotFoundError("Press release")
            return result.data[0]
        
        result = supabase_service.client.table('press_releases').update(update_data).eq('id', str(press_id)).execute()
        
        if not result.data:
            raise NotFoundError("Press release")
        
        press = result.data[0]
        press['author_name'] = await self._get_member_name(press.get('author_id'))
        
        return press

    async def delete_press_release(self, press_id: UUID) -> None:
        """
        Delete a press release.

        Args:
            press_id: Press release UUID

        Raises:
            NotFoundError: If press release not found
        """
        # Check if press release exists first
        check_result = supabase_service.client.table('press_releases').select('id').eq('id', str(press_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Press release")
        
        # Delete the press release
        supabase_service.client.table('press_releases').delete().eq('id', str(press_id)).execute()

    # Banner Management - Using Supabase Client

    async def get_banners(
        self, banner_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get banners, optionally filtered by type.

        Only returns active banners for public access.

        Args:
            banner_type: Optional banner type filter (supports both new and legacy values)

        Returns:
            List of banner dictionaries
        """
        query = supabase_service.client.table('banners').select('*').eq('is_active', 'true')

        if banner_type:
            # 统一使用小写，转换为小写后查询
            banner_type_lower = banner_type.lower()
            query = query.eq('banner_type', banner_type_lower)

        query = query.order('display_order', desc=False).order('created_at', desc=False)

        result = query.execute()
        return result.data or []

    async def get_all_banners(self) -> List[Dict[str, Any]]:
        """
        Get all banners (admin only, includes inactive).

        Returns:
            List of all banner dictionaries
        """
        query = supabase_service.client.table('banners').select('*')
        query = query.order('banner_type', desc=False).order('display_order', desc=False).order('created_at', desc=False)
        
        result = query.execute()
        return result.data or []

    async def create_banner(self, data: BannerCreate) -> Dict[str, Any]:
        """
        Create a new banner.

        Args:
            data: Banner creation data

        Returns:
            Created banner dictionary
        """
        # Validate banner type (统一使用小写)
        valid_types = ["main_primary", "main_secondary", "about", "projects", "performance", "support", "profile", "notices", "news", "scroll"]
        # 转换为小写
        if not data.banner_type:
            raise ValidationError("banner_type is required")
        banner_type = data.banner_type.lower()
        if banner_type not in valid_types:
            raise ValidationError(f"Invalid banner_type. Must be one of: {', '.join(valid_types)}")

        banner_data = {
            'id': str(uuid4()),
            'banner_type': banner_type,
            'image_url': data.image_url,
            'link_url': data.link_url,
            'title_ko': data.title_ko,
            'title_zh': data.title_zh,
            'subtitle_ko': data.subtitle_ko,
            'subtitle_zh': data.subtitle_zh,
            'is_active': 'true' if data.is_active else 'false',
            'display_order': data.display_order,
        }
        
        result = supabase_service.client.table('banners').insert(banner_data).execute()
        return result.data[0] if result.data else None

    async def update_banner(
        self, banner_id: UUID, data: BannerUpdate
    ) -> Dict[str, Any]:
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
        # Build update data (only include non-None fields)
        update_data = {}
        if data.banner_type is not None:
            valid_types = ["main_primary", "main_secondary", "about", "projects", "performance", "support", "profile", "notices", "news", "scroll"]
            # 转换为小写
            banner_type = data.banner_type.lower()
            if banner_type not in valid_types:
                raise ValidationError(f"Invalid banner_type. Must be one of: {', '.join(valid_types)}")
            
            update_data['banner_type'] = banner_type
        if data.image_url is not None:
            update_data['image_url'] = data.image_url
        if data.link_url is not None:
            update_data['link_url'] = data.link_url
        if data.title_ko is not None:
            update_data['title_ko'] = data.title_ko
        if data.title_zh is not None:
            update_data['title_zh'] = data.title_zh
        if data.subtitle_ko is not None:
            update_data['subtitle_ko'] = data.subtitle_ko
        if data.subtitle_zh is not None:
            update_data['subtitle_zh'] = data.subtitle_zh
        if data.is_active is not None:
            update_data['is_active'] = 'true' if data.is_active else 'false'
        if data.display_order is not None:
            update_data['display_order'] = data.display_order
        
        if not update_data:
            # No fields to update, just return existing banner
            result = supabase_service.client.table('banners').select('*').eq('id', str(banner_id)).execute()
            if not result.data:
                raise NotFoundError("Banner")
            return result.data[0]
        
        result = supabase_service.client.table('banners').update(update_data).eq('id', str(banner_id)).execute()
        
        if not result.data:
            raise NotFoundError("Banner")
        
        return result.data[0]

    async def delete_banner(self, banner_id: UUID) -> None:
        """
        Delete a banner.

        Args:
            banner_id: Banner UUID

        Raises:
            NotFoundError: If banner not found
        """
        # Check if banner exists first
        check_result = supabase_service.client.table('banners').select('id').eq('id', str(banner_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Banner")
        
        # Delete the banner
        supabase_service.client.table('banners').delete().eq('id', str(banner_id)).execute()

    # SystemInfo Management - Using Supabase Client

    async def get_system_info(self) -> Optional[Dict[str, Any]]:
        """
        Get system information (singleton).

        Returns:
            SystemInfo dictionary with updater_name or None if not set
        """
        query = supabase_service.client.table('system_info').select('*').order('updated_at', desc=True).limit(1)
        result = query.execute()
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
            # Update existing
            result = supabase_service.client.table('system_info').update(system_info_data).eq('id', existing['id']).execute()
            return result.data[0] if result.data else existing
        else:
            # Create new
            result = supabase_service.client.table('system_info').insert(system_info_data).execute()
            return result.data[0] if result.data else None

    # Popup Management - Using Supabase Client

    async def get_popups(self) -> List[Dict[str, Any]]:
        """
        Get all popups (admin only).

        Returns:
            List of all popup dictionaries
        """
        try:
            query = supabase_service.client.table('popups').select('*')
            query = query.order('created_at', desc=True)
            
            result = query.execute()
            return result.data or []
        except Exception:
            # If table doesn't exist or other error, return empty list
            return []

    async def get_active_popup(self) -> Optional[Dict[str, Any]]:
        """
        Get active popup for public display.

        Returns the first active popup that is currently within its date range.

        Returns:
            Active popup dictionary or None
        """
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)
        
        query = supabase_service.client.table('popups').select('*')
        query = query.eq('is_active', 'true')
        query = query.order('created_at', desc=True)
        
        result = query.execute()
        popups = result.data or []
        
        # Filter by date range
        for popup in popups:
            start_date = popup.get('start_date')
            end_date = popup.get('end_date')
            
            # Check if popup is within date range
            if start_date:
                if isinstance(start_date, str):
                    # Parse ISO format string
                    try:
                        if start_date.endswith('Z'):
                            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        else:
                            start = datetime.fromisoformat(start_date)
                        # Ensure timezone aware
                        if start.tzinfo is None:
                            start = start.replace(tzinfo=timezone.utc)
                    except ValueError:
                        continue
                else:
                    start = start_date
                    if start.tzinfo is None:
                        start = start.replace(tzinfo=timezone.utc)
                
                if now < start:
                    continue
            
            if end_date:
                if isinstance(end_date, str):
                    # Parse ISO format string
                    try:
                        if end_date.endswith('Z'):
                            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        else:
                            end = datetime.fromisoformat(end_date)
                        # Ensure timezone aware
                        if end.tzinfo is None:
                            end = end.replace(tzinfo=timezone.utc)
                    except ValueError:
                        continue
                else:
                    end = end_date
                    if end.tzinfo is None:
                        end = end.replace(tzinfo=timezone.utc)
                
                if now > end:
                    continue
            
            # Found an active popup within date range
            return popup
        
        return None

    async def get_popup_by_id(self, popup_id: UUID) -> Dict[str, Any]:
        """
        Get popup by ID.

        Args:
            popup_id: Popup UUID

        Returns:
            Popup dictionary

        Raises:
            NotFoundError: If popup not found
        """
        query = supabase_service.client.table('popups').select('*').eq('id', str(popup_id))
        result = query.execute()
        
        if not result.data:
            raise NotFoundError("Popup")
        
        return result.data[0]

    async def create_popup(self, data: PopupCreate) -> Dict[str, Any]:
        """
        Create a new popup.

        Args:
            data: Popup creation data

        Returns:
            Created popup dictionary
        """
        popup_data = {
            'id': str(uuid4()),
            'title': data.title,
            'content': data.content,
            'image_url': data.image_url,
            'link_url': data.link_url,
            'width': data.width,
            'height': data.height,
            'position': data.position,
            'is_active': 'true' if data.is_active else 'false',
            'start_date': data.start_date.isoformat() if data.start_date else None,
            'end_date': data.end_date.isoformat() if data.end_date else None,
        }
        
        # Ensure dates are in the correct format for Supabase
        if popup_data['start_date']:
            # Remove timezone info if present, Supabase stores as timestamp without timezone
            popup_data['start_date'] = popup_data['start_date'].replace('+00:00', '').replace('Z', '')
        if popup_data['end_date']:
            popup_data['end_date'] = popup_data['end_date'].replace('+00:00', '').replace('Z', '')
        
        result = supabase_service.client.table('popups').insert(popup_data).execute()
        return result.data[0] if result.data else None

    async def update_popup(
        self, popup_id: UUID, data: PopupUpdate
    ) -> Dict[str, Any]:
        """
        Update a popup.

        Args:
            popup_id: Popup UUID
            data: Popup update data

        Returns:
            Updated popup dictionary

        Raises:
            NotFoundError: If popup not found
        """
        # Build update data (only include non-None fields)
        update_data = {}
        if data.title is not None:
            update_data['title'] = data.title
        if data.content is not None:
            update_data['content'] = data.content
        if data.image_url is not None:
            update_data['image_url'] = data.image_url
        if data.link_url is not None:
            update_data['link_url'] = data.link_url
        if data.width is not None:
            update_data['width'] = data.width
        if data.height is not None:
            update_data['height'] = data.height
        if data.position is not None:
            update_data['position'] = data.position
        if data.is_active is not None:
            update_data['is_active'] = 'true' if data.is_active else 'false'
        if data.start_date is not None:
            if data.start_date:
                date_str = data.start_date.isoformat()
                # Remove timezone info for Supabase timestamp without timezone
                update_data['start_date'] = date_str.replace('+00:00', '').replace('Z', '')
            else:
                update_data['start_date'] = None
        if data.end_date is not None:
            if data.end_date:
                date_str = data.end_date.isoformat()
                # Remove timezone info for Supabase timestamp without timezone
                update_data['end_date'] = date_str.replace('+00:00', '').replace('Z', '')
            else:
                update_data['end_date'] = None
        
        if not update_data:
            # No fields to update, just return existing popup
            result = supabase_service.client.table('popups').select('*').eq('id', str(popup_id)).execute()
            if not result.data:
                raise NotFoundError("Popup")
            return result.data[0]
        
        result = supabase_service.client.table('popups').update(update_data).eq('id', str(popup_id)).execute()
        
        if not result.data:
            raise NotFoundError("Popup")
        
        return result.data[0]

    async def delete_popup(self, popup_id: UUID) -> None:
        """
        Delete a popup.

        Args:
            popup_id: Popup UUID

        Raises:
            NotFoundError: If popup not found
        """
        # Check if popup exists first
        check_result = supabase_service.client.table('popups').select('id').eq('id', str(popup_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Popup")
        
        # Delete the popup
        supabase_service.client.table('popups').delete().eq('id', str(popup_id)).execute()

    # Dashboard Popup Management (Simplified)

    async def get_dashboard_popup(self) -> Dict[str, Any]:
        """
        Get popup in dashboard format (simplified structure).

        Returns:
            Dictionary with 'popup' key containing simplified popup data
        """
        try:
            popups = await self.get_popups()
            
            if popups:
                # Find the most recent active popup, or just the most recent one
                active_popup = next((p for p in popups if p.get('is_active') == 'true'), None)
                popup = active_popup or popups[0]
                
                # Convert to dashboard format
                start_date = popup.get('start_date')
                end_date = popup.get('end_date')
                
                # Safely extract date string (handle None and different types)
                def format_date(date_value):
                    if not date_value:
                        return ''
                    if isinstance(date_value, str):
                        return date_value[:10] if len(date_value) >= 10 else ''
                    # If it's a datetime object, convert to string first
                    if hasattr(date_value, 'isoformat'):
                        return date_value.isoformat()[:10]
                    return str(date_value)[:10] if len(str(date_value)) >= 10 else ''
                
                return {
                    "popup": {
                        "id": popup.get('id'),
                        "enabled": popup.get('is_active') == 'true',
                        "startDate": format_date(start_date),
                        "endDate": format_date(end_date),
                        "image": popup.get('image_url') or '',
                        "content": popup.get('content') or '',
                        "link": popup.get('link_url') or '',
                        "title": popup.get('title') or ''
                    }
                }
            else:
                # Return empty popup structure
                return {
                    "popup": {
                        "enabled": False,
                        "startDate": "",
                        "endDate": "",
                        "image": "",
                        "content": "",
                        "link": "",
                        "title": ""
                    }
                }
        except Exception:
            # Return empty popup structure on error
            return {
                "popup": {
                    "enabled": False,
                    "startDate": "",
                    "endDate": "",
                    "image": "",
                    "content": "",
                    "link": "",
                    "title": ""
                }
            }

    async def save_dashboard_popup(
        self,
        image_url: Optional[str],
        start_date_str: Optional[str],
        end_date_str: Optional[str],
        content: Optional[str],
        link: Optional[str],
        enabled: Optional[str],
    ) -> Dict[str, Any]:
        """
        Save popup from dashboard format (simplified structure).

        Args:
            image_url: Image URL (if uploaded)
            start_date_str: Start date string (YYYY-MM-DD format)
            end_date_str: End date string (YYYY-MM-DD format)
            content: Popup content
            link: Link URL
            enabled: Enabled status ('true' or None)

        Returns:
            Dictionary with 'popup' key containing simplified popup data

        Raises:
            ValidationError: If validation fails
        """
        from datetime import datetime, timezone
        
        # Get existing popups to find the one to update
        popups = await self.get_popups()
        existing_popup = popups[0] if popups else None
        
        # Prepare data
        is_active = enabled == 'true' if enabled else False
        
        # Parse dates (format: YYYY-MM-DD)
        start_date = None
        end_date = None
        if start_date_str:
            try:
                # Parse date string (YYYY-MM-DD) and set to start of day in UTC
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if end_date_str:
            try:
                # Parse date string (YYYY-MM-DD) and set to end of day in UTC
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').replace(
                    hour=23, minute=59, second=59, tzinfo=timezone.utc
                )
            except ValueError:
                pass
        
        # Use title from content if no title provided, or use a default
        title = content[:50] if content else "弹窗通知"
        
        if existing_popup:
            # Update existing popup
            update_data = PopupUpdate(
                title=title,
                content=content or '',
                link_url=link or '',
                is_active=is_active,
                start_date=start_date,
                end_date=end_date
            )
            # Only update image_url if a new image was uploaded
            if image_url:
                update_data.image_url = image_url
            # Otherwise, don't set image_url (keep existing)
            
            updated_popup = await self.update_popup(
                UUID(existing_popup['id']),
                update_data
            )
            
            return {
                "popup": {
                    "id": updated_popup.get('id'),
                    "enabled": updated_popup.get('is_active') == 'true',
                    "startDate": updated_popup.get('start_date')[:10] if updated_popup.get('start_date') and len(updated_popup.get('start_date')) >= 10 else '',
                    "endDate": updated_popup.get('end_date')[:10] if updated_popup.get('end_date') and len(updated_popup.get('end_date')) >= 10 else '',
                    "image": updated_popup.get('image_url') or '',
                    "content": updated_popup.get('content') or '',
                    "link": updated_popup.get('link_url') or '',
                    "title": updated_popup.get('title') or ''
                }
            }
        else:
            # Create new popup
            if not image_url and not content:
                raise ValidationError("Image or content is required when creating a new popup")
            
            create_data = PopupCreate(
                title=title,
                content=content or '',
                image_url=image_url or '',
                link_url=link or '',
                width=600,
                height=400,
                position="center",
                is_active=is_active,
                start_date=start_date,
                end_date=end_date
            )
            
            new_popup = await self.create_popup(create_data)
            
            return {
                "popup": {
                    "id": new_popup.get('id'),
                    "enabled": new_popup.get('is_active') == 'true',
                    "startDate": new_popup.get('start_date')[:10] if new_popup.get('start_date') and len(new_popup.get('start_date')) >= 10 else '',
                    "endDate": new_popup.get('end_date')[:10] if new_popup.get('end_date') and len(new_popup.get('end_date')) >= 10 else '',
                    "image": new_popup.get('image_url') or '',
                    "content": new_popup.get('content') or '',
                    "link": new_popup.get('link_url') or '',
                    "title": new_popup.get('title') or ''
                }
            }

