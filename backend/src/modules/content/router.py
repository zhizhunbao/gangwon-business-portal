"""
Content management router.

API endpoints for content management (notices, press releases, banners, system info).
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, Optional
from uuid import UUID
from math import ceil

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ..user.dependencies import get_current_admin_user
from .service import ContentService
from .schemas import (
    NoticeCreate,
    NoticeUpdate,
    NoticeResponse,
    NoticeListItem,
    NoticeListResponse,
    PressReleaseCreate,
    PressReleaseUpdate,
    PressReleaseResponse,
    PressListItem,
    PressListResponse,
    BannerCreate,
    BannerUpdate,
    BannerResponse,
    BannerListResponse,
    SystemInfoUpdate,
    SystemInfoResponse,
)

router = APIRouter()
service = ContentService()


# Public Notice Endpoints

@router.get(
    "/api/notices",
    response_model=NoticeListResponse,
    tags=["content"],
    summary="List notices",
)
async def list_notices(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List notices with pagination and optional search.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **search**: Optional search term for title
    """
    notices, total = await service.get_notices(page, page_size, search, db)

    return NoticeListResponse(
        items=[NoticeListItem.model_validate(n) for n in notices],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.get(
    "/api/notices/latest5",
    response_model=list[NoticeListItem],
    tags=["content"],
    summary="Get latest 5 notices",
)
async def get_latest_notices(
    db: AsyncSession = Depends(get_db),
):
    """Get latest 5 notices for homepage."""
    notices = await service.get_notice_latest5(db)
    return [NoticeListItem.model_validate(n) for n in notices]


@router.get(
    "/api/notices/{notice_id}",
    response_model=NoticeResponse,
    tags=["content"],
    summary="Get notice detail",
)
async def get_notice(
    notice_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get notice detail by ID.

    View count is automatically incremented.
    """
    notice = await service.get_notice_by_id(notice_id, db)
    
    # Get author name if available
    author_name = None
    if notice.author_id:
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        result = await db.execute(select(Member).where(Member.id == notice.author_id))
        author = result.scalar_one_or_none()
        if author:
            author_name = author.company_name
    
    return NoticeResponse(
        id=notice.id,
        board_type=notice.board_type,
        title=notice.title,
        content_html=notice.content_html,
        author_id=notice.author_id,
        author_name=author_name,
        view_count=notice.view_count or 0,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


# Admin Notice Endpoints

@router.post(
    "/api/admin/content/notices",
    response_model=NoticeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create notice",
)
async def create_notice(
    data: NoticeCreate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new notice (admin only)."""
    notice = await service.create_notice(data, current_user.id, db)
    
    return NoticeResponse(
        id=notice.id,
        board_type=notice.board_type,
        title=notice.title,
        content_html=notice.content_html,
        author_id=notice.author_id,
        author_name=current_user.company_name,
        view_count=notice.view_count or 0,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


@router.put(
    "/api/admin/content/notices/{notice_id}",
    response_model=NoticeResponse,
    tags=["content", "admin"],
    summary="Update notice",
)
async def update_notice(
    notice_id: UUID,
    data: NoticeUpdate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a notice (admin only)."""
    notice = await service.update_notice(notice_id, data, db)
    
    # Get author name if available
    author_name = None
    if notice.author_id:
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        result = await db.execute(select(Member).where(Member.id == notice.author_id))
        author = result.scalar_one_or_none()
        if author:
            author_name = author.company_name
    
    return NoticeResponse(
        id=notice.id,
        board_type=notice.board_type,
        title=notice.title,
        content_html=notice.content_html,
        author_id=notice.author_id,
        author_name=author_name,
        view_count=notice.view_count or 0,
        created_at=notice.created_at,
        updated_at=notice.updated_at,
    )


@router.delete(
    "/api/admin/content/notices/{notice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content", "admin"],
    summary="Delete notice",
)
async def delete_notice(
    notice_id: UUID,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notice (admin only)."""
    await service.delete_notice(notice_id, db)


# Public Press Release Endpoints

@router.get(
    "/api/press",
    response_model=PressListResponse,
    tags=["content"],
    summary="List press releases",
)
async def list_press_releases(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: AsyncSession = Depends(get_db),
):
    """
    List press releases with pagination.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    press_releases, total = await service.get_press_releases(page, page_size, db)

    return PressListResponse(
        items=[PressListItem.model_validate(p) for p in press_releases],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.get(
    "/api/press/latest1",
    response_model=Optional[PressReleaseResponse],
    tags=["content"],
    summary="Get latest press release",
)
async def get_latest_press(
    db: AsyncSession = Depends(get_db),
):
    """Get latest press release for homepage."""
    press = await service.get_press_latest1(db)
    
    if not press:
        return None
    
    # Get author name if available
    author_name = None
    if press.author_id:
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        result = await db.execute(select(Member).where(Member.id == press.author_id))
        author = result.scalar_one_or_none()
        if author:
            author_name = author.company_name
    
    return PressReleaseResponse(
        id=press.id,
        title=press.title,
        image_url=press.image_url,
        author_id=press.author_id,
        author_name=author_name,
        created_at=press.created_at,
    )


@router.get(
    "/api/press/{press_id}",
    response_model=PressReleaseResponse,
    tags=["content"],
    summary="Get press release detail",
)
async def get_press_release(
    press_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get press release detail by ID."""
    press = await service.get_press_by_id(press_id, db)
    
    # Get author name if available
    author_name = None
    if press.author_id:
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        result = await db.execute(select(Member).where(Member.id == press.author_id))
        author = result.scalar_one_or_none()
        if author:
            author_name = author.company_name
    
    return PressReleaseResponse(
        id=press.id,
        title=press.title,
        image_url=press.image_url,
        author_id=press.author_id,
        author_name=author_name,
        created_at=press.created_at,
    )


# Admin Press Release Endpoints

@router.post(
    "/api/admin/content/press",
    response_model=PressReleaseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create press release",
)
async def create_press_release(
    data: PressReleaseCreate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new press release (admin only)."""
    press = await service.create_press_release(data, current_user.id, db)
    
    return PressReleaseResponse(
        id=press.id,
        title=press.title,
        image_url=press.image_url,
        author_id=press.author_id,
        author_name=current_user.company_name,
        created_at=press.created_at,
    )


@router.put(
    "/api/admin/content/press/{press_id}",
    response_model=PressReleaseResponse,
    tags=["content", "admin"],
    summary="Update press release",
)
async def update_press_release(
    press_id: UUID,
    data: PressReleaseUpdate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a press release (admin only)."""
    press = await service.update_press_release(press_id, data, db)
    
    # Get author name if available
    author_name = None
    if press.author_id:
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        result = await db.execute(select(Member).where(Member.id == press.author_id))
        author = result.scalar_one_or_none()
        if author:
            author_name = author.company_name
    
    return PressReleaseResponse(
        id=press.id,
        title=press.title,
        image_url=press.image_url,
        author_id=press.author_id,
        author_name=author_name,
        created_at=press.created_at,
    )


@router.delete(
    "/api/admin/content/press/{press_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content", "admin"],
    summary="Delete press release",
)
async def delete_press_release(
    press_id: UUID,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a press release (admin only)."""
    await service.delete_press_release(press_id, db)


# Public Banner Endpoints

@router.get(
    "/api/banners",
    response_model=BannerListResponse,
    tags=["content"],
    summary="Get banners",
)
async def get_banners(
    banner_type: Optional[str] = Query(default=None, description="Banner type: MAIN, INTRO, PROGRAM, PERFORMANCE, SUPPORT"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get active banners, optionally filtered by type.

    Only returns active banners for public access.
    """
    banners = await service.get_banners(banner_type, db)
    
    # Convert is_active from string to boolean
    banner_responses = []
    for banner in banners:
        banner_responses.append(BannerResponse(
            id=banner.id,
            banner_type=banner.banner_type,
            image_url=banner.image_url,
            link_url=banner.link_url,
            is_active=banner.is_active == "true",
            display_order=banner.display_order,
            created_at=banner.created_at,
            updated_at=banner.updated_at,
        ))
    
    return BannerListResponse(items=banner_responses)


# Admin Banner Endpoints

@router.get(
    "/api/admin/content/banners",
    response_model=BannerListResponse,
    tags=["content", "admin"],
    summary="Get all banners (admin)",
)
async def get_all_banners(
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all banners including inactive (admin only)."""
    banners = await service.get_all_banners(db)
    
    # Convert is_active from string to boolean
    banner_responses = []
    for banner in banners:
        banner_responses.append(BannerResponse(
            id=banner.id,
            banner_type=banner.banner_type,
            image_url=banner.image_url,
            link_url=banner.link_url,
            is_active=banner.is_active == "true",
            display_order=banner.display_order,
            created_at=banner.created_at,
            updated_at=banner.updated_at,
        ))
    
    return BannerListResponse(items=banner_responses)


@router.post(
    "/api/admin/content/banners",
    response_model=BannerResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create banner",
)
async def create_banner(
    data: BannerCreate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new banner (admin only)."""
    banner = await service.create_banner(data, db)
    
    return BannerResponse(
        id=banner.id,
        banner_type=banner.banner_type,
        image_url=banner.image_url,
        link_url=banner.link_url,
        is_active=banner.is_active == "true",
        display_order=banner.display_order,
        created_at=banner.created_at,
        updated_at=banner.updated_at,
    )


@router.put(
    "/api/admin/content/banners/{banner_id}",
    response_model=BannerResponse,
    tags=["content", "admin"],
    summary="Update banner",
)
async def update_banner(
    banner_id: UUID,
    data: BannerUpdate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a banner (admin only)."""
    banner = await service.update_banner(banner_id, data, db)
    
    return BannerResponse(
        id=banner.id,
        banner_type=banner.banner_type,
        image_url=banner.image_url,
        link_url=banner.link_url,
        is_active=banner.is_active == "true",
        display_order=banner.display_order,
        created_at=banner.created_at,
        updated_at=banner.updated_at,
    )


@router.delete(
    "/api/admin/content/banners/{banner_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content", "admin"],
    summary="Delete banner",
)
async def delete_banner(
    banner_id: UUID,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a banner (admin only)."""
    await service.delete_banner(banner_id, db)


# Public SystemInfo Endpoints

@router.get(
    "/api/system-info",
    response_model=Optional[SystemInfoResponse],
    tags=["content"],
    summary="Get system information",
)
async def get_system_info(
    db: AsyncSession = Depends(get_db),
):
    """Get system introduction content."""
    system_info = await service.get_system_info(db)
    
    if not system_info:
        return None
    
    # Get updater name if available
    updater_name = None
    if system_info.updated_by:
        from sqlalchemy import select
        from ...common.modules.db.models import Member
        result = await db.execute(select(Member).where(Member.id == system_info.updated_by))
        updater = result.scalar_one_or_none()
        if updater:
            updater_name = updater.company_name
    
    return SystemInfoResponse(
        id=system_info.id,
        content_html=system_info.content_html,
        image_url=system_info.image_url,
        updated_by=system_info.updated_by,
        updater_name=updater_name,
        updated_at=system_info.updated_at,
    )


# Admin SystemInfo Endpoints

@router.put(
    "/api/admin/content/system-info",
    response_model=SystemInfoResponse,
    tags=["content", "admin"],
    summary="Update system information",
)
async def update_system_info(
    data: SystemInfoUpdate,
    current_user: Member = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update system introduction content (admin only, upsert pattern)."""
    system_info = await service.update_system_info(data, current_user.id, db)
    
    return SystemInfoResponse(
        id=system_info.id,
        content_html=system_info.content_html,
        image_url=system_info.image_url,
        updated_by=system_info.updated_by,
        updater_name=current_user.company_name,
        updated_at=system_info.updated_at,
    )

