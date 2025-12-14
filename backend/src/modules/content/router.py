"""
Content management router.

API endpoints for content management (notices, press releases, banners, system info).
"""
from fastapi import APIRouter, Depends, Query, status
from typing import Annotated, Optional
from uuid import UUID
from math import ceil

from fastapi import Request

from ...common.modules.db.models import Member
from ...common.modules.audit import audit_log
from ...common.modules.logger import auto_log
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
@auto_log("list_notices", log_result_count=True)
async def list_notices(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Optional[str] = None,
):
    """
    List notices with pagination and optional search.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **search**: Optional search term for title
    """
    notices, total = await service.get_notices(page, page_size, search)

    return NoticeListResponse(
        items=[NoticeListItem(**n) for n in notices],
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
@auto_log("get_latest_notices")
async def get_latest_notices():
    """Get latest 5 notices for homepage."""
    notices = await service.get_notice_latest5()
    return [NoticeListItem(**n) for n in notices]


@router.get(
    "/api/notices/{notice_id}",
    response_model=NoticeResponse,
    tags=["content"],
    summary="Get notice detail",
)
@auto_log("get_notice", log_resource_id=True)
async def get_notice(
    notice_id: UUID,
):
    """
    Get notice detail by ID.

    View count is automatically incremented.
    """
    notice = await service.get_notice_by_id(notice_id)
    
    return NoticeResponse(**notice)


# Admin Notice Endpoints

@router.post(
    "/api/admin/content/notices",
    response_model=NoticeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create notice",
)
@auto_log("create_notice", log_resource_id=True)
@audit_log(action="create", resource_type="notice")
async def create_notice(
    data: NoticeCreate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Create a new notice (admin only)."""
    notice = await service.create_notice(data)
    
    # Admin users don't have company_name, use full_name or email instead
    author_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'email', 'Admin')
    
    # Create a copy of notice dict and update author_name
    notice_data = notice.copy()
    notice_data['author_name'] = author_name
    return NoticeResponse(**notice_data)


@router.put(
    "/api/admin/content/notices/{notice_id}",
    response_model=NoticeResponse,
    tags=["content", "admin"],
    summary="Update notice",
)
@auto_log("update_notice", log_resource_id=True)
@audit_log(action="update", resource_type="notice")
async def update_notice(
    notice_id: UUID,
    data: NoticeUpdate,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Update a notice (admin only)."""
    notice = await service.update_notice(notice_id, data)
    
    return NoticeResponse(**notice)


@router.delete(
    "/api/admin/content/notices/{notice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content", "admin"],
    summary="Delete notice",
)
@auto_log("delete_notice", log_resource_id=True)
@audit_log(action="delete", resource_type="notice")
async def delete_notice(
    notice_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Delete a notice (admin only)."""
    await service.delete_notice(notice_id)


# Public Press Release Endpoints

@router.get(
    "/api/press",
    response_model=PressListResponse,
    tags=["content"],
    summary="List press releases",
)
@auto_log("list_press_releases", log_result_count=True)
async def list_press_releases(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """
    List press releases with pagination.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    press_releases, total = await service.get_press_releases(page, page_size)

    return PressListResponse(
        items=[PressListItem(**p) for p in press_releases],
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
async def get_latest_press():
    """Get latest press release for homepage."""
    press = await service.get_press_latest1()
    
    if not press:
        return None
    
    return PressReleaseResponse(**press)


@router.get(
    "/api/press/{press_id}",
    response_model=PressReleaseResponse,
    tags=["content"],
    summary="Get press release detail",
)
@auto_log("get_press_release", log_resource_id=True)
async def get_press_release(
    press_id: UUID,
):
    """Get press release detail by ID."""
    press = await service.get_press_by_id(press_id)
    
    return PressReleaseResponse(**press)


# Admin Press Release Endpoints

@router.post(
    "/api/admin/content/press",
    response_model=PressReleaseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create press release",
)
@auto_log("create_press_release", log_resource_id=True)
@audit_log(action="create", resource_type="press_release")
async def create_press_release(
    data: PressReleaseCreate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Create a new press release (admin only)."""
    press = await service.create_press_release(data)
    
    # Admin users don't have company_name, use full_name or email instead
    author_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'email', 'Admin')
    
    # Create a copy of press dict and update author_name
    press_data = press.copy()
    press_data['author_name'] = author_name
    return PressReleaseResponse(**press_data)


@router.put(
    "/api/admin/content/press/{press_id}",
    response_model=PressReleaseResponse,
    tags=["content", "admin"],
    summary="Update press release",
)
@auto_log("update_press_release", log_resource_id=True)
@audit_log(action="update", resource_type="press_release")
async def update_press_release(
    press_id: UUID,
    data: PressReleaseUpdate,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Update a press release (admin only)."""
    press = await service.update_press_release(press_id, data)
    
    return PressReleaseResponse(**press)


@router.delete(
    "/api/admin/content/press/{press_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content", "admin"],
    summary="Delete press release",
)
@auto_log("delete_press_release", log_resource_id=True)
@audit_log(action="delete", resource_type="press_release")
async def delete_press_release(
    press_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Delete a press release (admin only)."""
    await service.delete_press_release(press_id)


# Public Banner Endpoints

@router.get(
    "/api/banners",
    response_model=BannerListResponse,
    tags=["content"],
    summary="Get banners",
)
@auto_log("get_banners")
async def get_banners(
    banner_type: Optional[str] = Query(default=None, description="Banner type: MAIN, INTRO, PROGRAM, PERFORMANCE, SUPPORT"),
):
    """
    Get active banners, optionally filtered by type.

    Only returns active banners for public access.
    """
    banners = await service.get_banners(banner_type)
    
    # Convert is_active from string to boolean
    banner_responses = []
    for banner in banners:
        # Create a copy of banner dict and update is_active
        banner_data = banner.copy()
        banner_data['is_active'] = banner.get('is_active') == 'true'
        banner_responses.append(BannerResponse(**banner_data))
    
    return BannerListResponse(items=banner_responses)


# Admin Banner Endpoints

@router.get(
    "/api/admin/content/banners",
    response_model=BannerListResponse,
    tags=["content", "admin"],
    summary="Get all banners (admin)",
)
@auto_log("get_all_banners")
async def get_all_banners(
    current_user: Member = Depends(get_current_admin_user),
):
    """Get all banners including inactive (admin only)."""
    banners = await service.get_all_banners()
    
    # Convert is_active from string to boolean
    banner_responses = []
    for banner in banners:
        # Create a copy of banner dict and update is_active
        banner_data = banner.copy()
        banner_data['is_active'] = banner.get('is_active') == 'true'
        banner_responses.append(BannerResponse(**banner_data))
    
    return BannerListResponse(items=banner_responses)


@router.post(
    "/api/admin/content/banners",
    response_model=BannerResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create banner",
)
@auto_log("create_banner", log_resource_id=True)
@audit_log(action="create", resource_type="banner")
async def create_banner(
    data: BannerCreate,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Create a new banner (admin only)."""
    banner = await service.create_banner(data)
    
    # Create a copy of banner dict and update is_active
    banner_data = banner.copy()
    banner_data['is_active'] = banner.get('is_active') == 'true'
    return BannerResponse(**banner_data)


@router.put(
    "/api/admin/content/banners/{banner_id}",
    response_model=BannerResponse,
    tags=["content", "admin"],
    summary="Update banner",
)
@auto_log("update_banner", log_resource_id=True)
@audit_log(action="update", resource_type="banner")
async def update_banner(
    banner_id: UUID,
    data: BannerUpdate,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Update a banner (admin only)."""
    banner = await service.update_banner(banner_id, data)
    
    # Create a copy of banner dict and update is_active
    banner_data = banner.copy()
    banner_data['is_active'] = banner.get('is_active') == 'true'
    return BannerResponse(**banner_data)


@router.delete(
    "/api/admin/content/banners/{banner_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content", "admin"],
    summary="Delete banner",
)
@auto_log("delete_banner", log_resource_id=True)
@audit_log(action="delete", resource_type="banner")
async def delete_banner(
    banner_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Delete a banner (admin only)."""
    await service.delete_banner(banner_id)


# Public SystemInfo Endpoints

@router.get(
    "/api/system-info",
    response_model=Optional[SystemInfoResponse],
    tags=["content"],
    summary="Get system information",
)
@auto_log("get_system_info")
async def get_system_info():
    """Get system introduction content."""
    system_info = await service.get_system_info()
    
    if not system_info:
        return None
    
    return SystemInfoResponse(**system_info)


# Admin SystemInfo Endpoints

@router.put(
    "/api/admin/content/system-info",
    response_model=SystemInfoResponse,
    tags=["content", "admin"],
    summary="Update system information",
)
@auto_log("update_system_info", log_resource_id=True)
@audit_log(action="update", resource_type="system_info")
async def update_system_info(
    data: SystemInfoUpdate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Update system introduction content (admin only, upsert pattern)."""
    system_info = await service.update_system_info(data, current_user["id"])
    
    # Admin users don't have company_name, use full_name or email instead
    updater_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'email', 'Admin')
    
    # Create a copy of system_info dict and update updater_name
    system_info_data = system_info.copy()
    system_info_data['updater_name'] = updater_name
    return SystemInfoResponse(**system_info_data)

