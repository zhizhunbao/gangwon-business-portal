"""
Content management service.

Business logic for content management (notices, press releases, banners, system info).
"""
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from uuid import UUID

from ...common.modules.db.models import Notice, PressRelease, Banner, SystemInfo, Member
from ...common.modules.exception import NotFoundError, ValidationError
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

    # Notice Management

    async def get_notices(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        db: AsyncSession = None,
    ) -> Tuple[List[Notice], int]:
        """
        Get paginated list of notices.

        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            search: Optional search term for title
            db: Database session

        Returns:
            Tuple of (notices list, total count)
        """
        query = select(Notice)

        # Apply search filter
        if search:
            query = query.where(Notice.title.ilike(f"%{search}%"))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination and ordering
        query = query.order_by(desc(Notice.created_at)).offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        notices = result.scalars().all()

        return notices, total

    async def get_notice_latest5(self, db: AsyncSession) -> List[Notice]:
        """
        Get latest 5 notices for homepage.

        Args:
            db: Database session

        Returns:
            List of latest 5 notices
        """
        query = (
            select(Notice)
            .order_by(desc(Notice.created_at))
            .limit(5)
        )
        result = await db.execute(query)
        return result.scalars().all()

    async def get_notice_by_id(self, notice_id: UUID, db: AsyncSession) -> Notice:
        """
        Get notice by ID and increment view count.

        Args:
            notice_id: Notice UUID
            db: Database session

        Returns:
            Notice object

        Raises:
            NotFoundError: If notice not found
        """
        query = select(Notice).where(Notice.id == notice_id)
        result = await db.execute(query)
        notice = result.scalar_one_or_none()

        if not notice:
            raise NotFoundError("Notice")

        # Increment view count
        notice.view_count = (notice.view_count or 0) + 1
        await db.commit()
        await db.refresh(notice)

        return notice

    async def create_notice(
        self, data: NoticeCreate, db: AsyncSession
    ) -> Notice:
        """
        Create a new notice.

        Args:
            data: Notice creation data
            db: Database session

        Returns:
            Created notice object
        """
        # For admin-created content, author_id is None since admin IDs are not in members table
        notice = Notice(
            title=data.title,
            content_html=data.content_html,
            board_type=data.board_type or "notice",
            view_count=0,
        )
        db.add(notice)
        await db.commit()
        await db.refresh(notice)
        return notice

    async def update_notice(
        self, notice_id: UUID, data: NoticeUpdate, db: AsyncSession
    ) -> Notice:
        """
        Update a notice.

        Args:
            notice_id: Notice UUID
            data: Notice update data
            db: Database session

        Returns:
            Updated notice object

        Raises:
            NotFoundError: If notice not found
        """
        query = select(Notice).where(Notice.id == notice_id)
        result = await db.execute(query)
        notice = result.scalar_one_or_none()

        if not notice:
            raise NotFoundError("Notice")

        # Update fields
        if data.title is not None:
            notice.title = data.title
        if data.content_html is not None:
            notice.content_html = data.content_html
        if data.board_type is not None:
            notice.board_type = data.board_type

        await db.commit()
        await db.refresh(notice)
        return notice

    async def delete_notice(self, notice_id: UUID, db: AsyncSession) -> None:
        """
        Delete a notice.

        Args:
            notice_id: Notice UUID
            db: Database session

        Raises:
            NotFoundError: If notice not found
        """
        query = select(Notice).where(Notice.id == notice_id)
        result = await db.execute(query)
        notice = result.scalar_one_or_none()

        if not notice:
            raise NotFoundError("Notice")

        await db.delete(notice)
        await db.commit()

    # Press Release Management

    async def get_press_releases(
        self, page: int = 1, page_size: int = 20, db: AsyncSession = None
    ) -> Tuple[List[PressRelease], int]:
        """
        Get paginated list of press releases.

        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            db: Database session

        Returns:
            Tuple of (press releases list, total count)
        """
        # Get total count
        count_query = select(func.count()).select_from(PressRelease)
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Get paginated results
        query = (
            select(PressRelease)
            .order_by(desc(PressRelease.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await db.execute(query)
        press_releases = result.scalars().all()

        return press_releases, total

    async def get_press_latest1(self, db: AsyncSession) -> Optional[PressRelease]:
        """
        Get latest press release for homepage.

        Args:
            db: Database session

        Returns:
            Latest press release or None
        """
        query = (
            select(PressRelease)
            .order_by(desc(PressRelease.created_at))
            .limit(1)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_press_by_id(self, press_id: UUID, db: AsyncSession) -> PressRelease:
        """
        Get press release by ID.

        Args:
            press_id: Press release UUID
            db: Database session

        Returns:
            Press release object

        Raises:
            NotFoundError: If press release not found
        """
        query = select(PressRelease).where(PressRelease.id == press_id)
        result = await db.execute(query)
        press = result.scalar_one_or_none()

        if not press:
            raise NotFoundError("Press release")

        return press

    async def create_press_release(
        self, data: PressReleaseCreate, db: AsyncSession
    ) -> PressRelease:
        """
        Create a new press release.

        Args:
            data: Press release creation data
            db: Database session

        Returns:
            Created press release object
        """
        # For admin-created content, author_id is None since admin IDs are not in members table
        press = PressRelease(
            title=data.title,
            image_url=data.image_url,
        )
        db.add(press)
        await db.commit()
        await db.refresh(press)
        return press

    async def update_press_release(
        self, press_id: UUID, data: PressReleaseUpdate, db: AsyncSession
    ) -> PressRelease:
        """
        Update a press release.

        Args:
            press_id: Press release UUID
            data: Press release update data
            db: Database session

        Returns:
            Updated press release object

        Raises:
            NotFoundError: If press release not found
        """
        query = select(PressRelease).where(PressRelease.id == press_id)
        result = await db.execute(query)
        press = result.scalar_one_or_none()

        if not press:
            raise NotFoundError("Press release")

        # Update fields
        if data.title is not None:
            press.title = data.title
        if data.image_url is not None:
            press.image_url = data.image_url

        await db.commit()
        await db.refresh(press)
        return press

    async def delete_press_release(self, press_id: UUID, db: AsyncSession) -> None:
        """
        Delete a press release.

        Args:
            press_id: Press release UUID
            db: Database session

        Raises:
            NotFoundError: If press release not found
        """
        query = select(PressRelease).where(PressRelease.id == press_id)
        result = await db.execute(query)
        press = result.scalar_one_or_none()

        if not press:
            raise NotFoundError("Press release")

        await db.delete(press)
        await db.commit()

    # Banner Management

    async def get_banners(
        self, banner_type: Optional[str] = None, db: AsyncSession = None
    ) -> List[Banner]:
        """
        Get banners, optionally filtered by type.

        Only returns active banners for public access.

        Args:
            banner_type: Optional banner type filter
            db: Database session

        Returns:
            List of banner objects
        """
        query = select(Banner).where(Banner.is_active == "true")

        if banner_type:
            query = query.where(Banner.banner_type == banner_type)

        query = query.order_by(Banner.display_order, Banner.created_at)

        result = await db.execute(query)
        return result.scalars().all()

    async def get_all_banners(self, db: AsyncSession) -> List[Banner]:
        """
        Get all banners (admin only, includes inactive).

        Args:
            db: Database session

        Returns:
            List of all banner objects
        """
        query = select(Banner).order_by(Banner.banner_type, Banner.display_order, Banner.created_at)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_banner(self, data: BannerCreate, db: AsyncSession) -> Banner:
        """
        Create a new banner.

        Args:
            data: Banner creation data
            db: Database session

        Returns:
            Created banner object
        """
        # Validate banner type
        valid_types = ["MAIN", "INTRO", "PROGRAM", "PERFORMANCE", "SUPPORT"]
        if data.banner_type not in valid_types:
            raise ValidationError(f"Invalid banner_type. Must be one of: {', '.join(valid_types)}")

        banner = Banner(
            banner_type=data.banner_type,
            image_url=data.image_url,
            link_url=data.link_url,
            is_active="true" if data.is_active else "false",
            display_order=data.display_order,
        )
        db.add(banner)
        await db.commit()
        await db.refresh(banner)
        return banner

    async def update_banner(
        self, banner_id: UUID, data: BannerUpdate, db: AsyncSession
    ) -> Banner:
        """
        Update a banner.

        Args:
            banner_id: Banner UUID
            data: Banner update data
            db: Database session

        Returns:
            Updated banner object

        Raises:
            NotFoundError: If banner not found
        """
        query = select(Banner).where(Banner.id == banner_id)
        result = await db.execute(query)
        banner = result.scalar_one_or_none()

        if not banner:
            raise NotFoundError("Banner")

        # Update fields
        if data.banner_type is not None:
            valid_types = ["MAIN", "INTRO", "PROGRAM", "PERFORMANCE", "SUPPORT"]
            if data.banner_type not in valid_types:
                raise ValidationError(f"Invalid banner_type. Must be one of: {', '.join(valid_types)}")
            banner.banner_type = data.banner_type
        if data.image_url is not None:
            banner.image_url = data.image_url
        if data.link_url is not None:
            banner.link_url = data.link_url
        if data.is_active is not None:
            banner.is_active = "true" if data.is_active else "false"
        if data.display_order is not None:
            banner.display_order = data.display_order

        await db.commit()
        await db.refresh(banner)
        return banner

    async def delete_banner(self, banner_id: UUID, db: AsyncSession) -> None:
        """
        Delete a banner.

        Args:
            banner_id: Banner UUID
            db: Database session

        Raises:
            NotFoundError: If banner not found
        """
        query = select(Banner).where(Banner.id == banner_id)
        result = await db.execute(query)
        banner = result.scalar_one_or_none()

        if not banner:
            raise NotFoundError("Banner")

        await db.delete(banner)
        await db.commit()

    # SystemInfo Management

    async def get_system_info(self, db: AsyncSession) -> Optional[SystemInfo]:
        """
        Get system information (singleton).

        Args:
            db: Database session

        Returns:
            SystemInfo object or None if not set
        """
        query = select(SystemInfo).order_by(desc(SystemInfo.updated_at)).limit(1)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def update_system_info(
        self, data: SystemInfoUpdate, updated_by: UUID, db: AsyncSession
    ) -> SystemInfo:
        """
        Update system information (upsert pattern).

        Args:
            data: System info update data
            updated_by: User ID (Admin or Member ID)
            db: Database session

        Returns:
            Updated or created SystemInfo object
        """
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        
        # Check if updated_by is a member (admins are not in members table)
        member_result = await db.execute(select(Member).where(Member.id == updated_by))
        member = member_result.scalar_one_or_none()
        
        # If not a member, it's an admin - set to None to avoid foreign key constraint
        member_id = updated_by if member else None
        
        # Try to get existing system info
        existing = await self.get_system_info(db)

        if existing:
            # Update existing
            existing.content_html = data.content_html
            if data.image_url is not None:
                existing.image_url = data.image_url
            existing.updated_by = member_id
            await db.commit()
            await db.refresh(existing)
            return existing
        else:
            # Create new
            system_info = SystemInfo(
                content_html=data.content_html,
                image_url=data.image_url,
                updated_by=member_id,
            )
            db.add(system_info)
            await db.commit()
            await db.refresh(system_info)
            return system_info

