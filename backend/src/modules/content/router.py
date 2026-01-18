"""
Content management router.

API endpoints for content management (notices, press releases, banners, system info).
"""
from fastapi import APIRouter, Depends, Query, status, UploadFile, File, Form
from typing import Annotated, Optional
from uuid import UUID
from math import ceil

from fastapi import Request

from ...common.modules.db.models import Member
from ...common.modules.audit import audit_log
from ..user.dependencies import get_current_admin_user
from ..upload.service import UploadService
from .service import ContentService
from .schemas import (
    NoticeCreate,
    NoticeUpdate,
    NoticeResponse,
    NoticeListItem,
    NoticeListResponse,
    ContentProjectCreate,
    ContentProjectUpdate,
    ContentProjectResponse,
    ContentProjectListItem,
    ContentProjectListResponse,
    BannerCreate,
    BannerUpdate,
    BannerResponse,
    BannerListResponse,
    SystemInfoUpdate,
    SystemInfoResponse,
    PopupCreate,
    PopupUpdate,
    PopupResponse,
    PopupListResponse,
    LegalContentUpdate,
    LegalContentResponse,
)

router = APIRouter()
service = ContentService()
upload_service = UploadService()

# Banner keys (直接使用前端值，无需映射)
BANNER_KEYS = ['main_primary', 'about', 'projects', 'performance', 'support']


# Public Notice Endpoints

@router.get(
    "/api/notices",
    response_model=NoticeListResponse,
    tags=["content"],
    summary="List notices",
)
async def list_notices(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=1000)] = 20,
    search: Optional[str] = None,
):
    """
    List notices with pagination and optional search.
    Data formatting is handled by schemas.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **search**: Optional search term for title
    """
    notices, total = await service.get_notices(page, page_size, search)

    # Use schema to format data - no manual conversion needed
    return NoticeListResponse(
        items=[NoticeListItem.from_db_dict(n, include_admin_fields=False) for n in notices],
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
async def get_latest_notices():
    """Get latest 5 notices for homepage."""
    notices = await service.get_notice_latest5()
    return [NoticeListItem.from_db_dict(n) for n in notices]


@router.get(
    "/api/notices/{notice_id}",
    response_model=NoticeResponse,
    tags=["content"],
    summary="Get notice detail",
)
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

@router.get(
    "/api/admin/content/notices",
    response_model=NoticeListResponse,
    tags=["content", "admin"],
    summary="List notices (admin)",
)
async def list_notices_admin(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=1000)] = 20,
    search: Optional[str] = None,
    current_user: Member = Depends(get_current_admin_user),
):
    """
    List notices with pagination and optional search (admin only).
    
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **search**: Optional search term for title
    """
    notices, total = await service.get_notices(page, page_size, search)

    return NoticeListResponse(
        items=[NoticeListItem.from_db_dict(n, include_admin_fields=True) for n in notices],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.post(
    "/api/admin/content/notices",
    response_model=NoticeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create notice",
)
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
@audit_log(action="delete", resource_type="notice")
async def delete_notice(
    notice_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Delete a notice (admin only)."""
    await service.delete_notice(notice_id)


# Public Project Endpoints

@router.get(
    "/api/project",
    response_model=ContentProjectListResponse,
    tags=["content"],
    summary="List projects",
)
async def list_projects(
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=1000)] = 20,
):
    """
    List projects with pagination.
    Data formatting is handled by schemas.

    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    projects, total = await service.get_projects(page, page_size)

    # Use schema to format data - no manual conversion needed
    return ContentProjectListResponse(
        items=[ContentProjectListItem.from_db_dict(p, include_admin_fields=False) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )


@router.get(
    "/api/project/latest1",
    response_model=Optional[ContentProjectResponse],
    tags=["content"],
    summary="Get latest project",
)
async def get_latest_project():
    """Get latest project for homepage."""
    project = await service.get_project_latest1()
    
    if not project:
        return None
    
    return ContentProjectResponse(**project)


@router.get(
    "/api/project/{press_id}",
    response_model=ContentProjectResponse,
    tags=["content"],
    summary="Get project detail",
)
async def get_project(
    press_id: UUID,
):
    """Get project detail by ID."""
    project = await service.get_project_by_id(press_id)
    
    return ContentProjectResponse(**project)


# Public Banner Endpoints

@router.get(
    "/api/banners",
    response_model=BannerListResponse,
    tags=["content"],
    summary="Get banners",
)
async def get_banners(
    banner_type: Optional[str] = Query(default=None, description="Banner type: main_primary, about, projects, performance, support"),
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
@audit_log(action="delete", resource_type="banner")
async def delete_banner(
    banner_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Delete a banner (admin only)."""
    await service.delete_banner(banner_id)


# Admin Banner Management by Key (for dashboard)
@router.get(
    "/api/admin/banners",
    tags=["content", "admin"],
    summary="Get banners by key (admin)",
)
async def get_banners_by_key(
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """
    Get all banners organized by banner key (admin only).
    
    Returns banners in a format suitable for the dashboard:
    {
        "banners": {
            "main": { "image": "...", "url": "..." },
            "systemIntro": { "image": "...", "url": "..." },
            ...
        }
    }
    """
    all_banners = await service.get_all_banners()
    
    # Organize by banner key (直接使用前端值)
    result = {
        "banners": {
            "main_primary": {"image": None, "mobile_image": None, "url": ""},
            "about": {"image": None, "mobile_image": None, "url": ""},
            "projects": {"image": None, "mobile_image": None, "url": ""},
            "performance": {"image": None, "mobile_image": None, "url": ""},
            "support": {"image": None, "mobile_image": None, "url": ""}
        }
    }
    
    # Find the most recent active banner for each type
    for banner in all_banners:
        banner_type = banner.get('banner_type')
        # 统一转换为小写
        if banner_type:
            banner_type = banner_type.lower()
        
        # 如果 banner_type 在结果中，更新它
        if banner_type in result["banners"]:
            is_active = banner.get('is_active') == 'true' or banner.get('is_active') is True
            
            # Use the first active banner found, or the most recent if none active
            if result["banners"][banner_type]["image"] is None or is_active:
                result["banners"][banner_type] = {
                    "image": banner.get('image_url') or None,
                    "mobile_image": banner.get('mobile_image_url') or None,
                    "url": banner.get('link_url') or ""
                }
    
    return result


@router.post(
    "/api/admin/banners/{banner_key}",
    tags=["content", "admin"],
    summary="Update banner by key (admin)",
)
@audit_log(action="update", resource_type="banner")
async def update_banner_by_key(
    banner_key: str,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
    image: Optional[UploadFile] = File(None),
    mobile_image: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
):
    """
    Update a banner by banner key (admin only).
    
    - **banner_key**: One of: main_primary, about, projects, performance, support
    - **image**: Optional desktop image file to upload
    - **mobile_image**: Optional mobile image file to upload
    - **url**: Optional link URL
    
    If banner doesn't exist, creates a new one.
    If banner exists, updates it.
    """
    from ...common.modules.exception import ValidationError, CMessageTemplate
    
    # Validate banner key (直接使用前端值)
    if banner_key not in BANNER_KEYS:
        raise ValidationError(
            CMessageTemplate.VALIDATION_INVALID_VALUE.format(
                field="banner_key",
                allowed_values=", ".join(BANNER_KEYS)
            )
        )
    
    banner_type = banner_key  # 直接使用，无需映射
    
    # Upload desktop image if provided
    image_url = None
    if image:
        attachment = await upload_service.upload_public_file(
            file=image,
            user=current_user,
            resource_type="banner",
        )
        image_url = attachment["file_url"]
    
    # Upload mobile image if provided
    mobile_image_url = None
    if mobile_image:
        attachment = await upload_service.upload_public_file(
            file=mobile_image,
            user=current_user,
            resource_type="banner",
        )
        mobile_image_url = attachment["file_url"]
    
    # Find existing banner of this type (optimized: direct query instead of fetching all)
    existing_banner = await service.get_banner_by_type(banner_type)
    
    # Prepare update data
    if existing_banner:
        # Update existing banner
        from .schemas import BannerUpdate
        update_data = BannerUpdate()
        
        # Update image_url only if new image was uploaded
        if image_url:
            update_data.image_url = image_url
        # Otherwise keep existing image_url (don't set it to None)
        
        # Update mobile_image_url only if new mobile image was uploaded
        if mobile_image_url:
            update_data.mobile_image_url = mobile_image_url
        
        # Update link_url if provided (even if empty string)
        if url is not None:
            update_data.link_url = url
        
        updated_banner = await service.update_banner(
            UUID(existing_banner['id']),
            update_data
        )
        return {
            "banner": {
                "image": updated_banner.get('image_url'),
                "mobile_image": updated_banner.get('mobile_image_url'),
                "url": updated_banner.get('link_url') or ""
            }
        }
    else:
        # Create new banner
        from .schemas import BannerCreate
        if not image_url:
            raise ValidationError(
                CMessageTemplate.VALIDATION_REQUIRED_FIELD.format(field="Image")
            )
        
        create_data = BannerCreate(
            banner_type=banner_type,
            image_url=image_url,
            mobile_image_url=mobile_image_url,
            link_url=url if url is not None else "",
            is_active=True,
            display_order=0
        )
        new_banner = await service.create_banner(create_data)
        return {
            "banner": {
                "image": new_banner.get('image_url'),
                "mobile_image": new_banner.get('mobile_image_url'),
                "url": new_banner.get('link_url') or ""
            }
        }


# Public SystemInfo Endpoints

@router.get(
    "/api/system-info",
    response_model=Optional[SystemInfoResponse],
    tags=["content"],
    summary="Get system information",
)
async def get_system_info():
    """Get system introduction content."""
    system_info = await service.get_system_info()
    
    if not system_info:
        return None
    
    return SystemInfoResponse(**system_info)


# Admin SystemInfo Endpoints

@router.get(
    "/api/admin/content/system-info",
    response_model=Optional[SystemInfoResponse],
    tags=["content", "admin"],
    summary="Get system information (admin)",
)
async def get_system_info_admin(
    current_user: Member = Depends(get_current_admin_user),
):
    """Get system introduction content (admin only)."""
    system_info = await service.get_system_info()
    
    if not system_info:
        return None
    
    return SystemInfoResponse(**system_info)


@router.put(
    "/api/admin/content/system-info",
    response_model=SystemInfoResponse,
    tags=["content", "admin"],
    summary="Update system information",
)
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


# Public Popup Endpoints

@router.get(
    "/api/popup",
    response_model=Optional[PopupResponse],
    tags=["content"],
    summary="Get active popup",
)
async def get_active_popup():
    """
    Get active popup for public display.
    
    Returns the first active popup that is currently within its date range.
    """
    popup = await service.get_active_popup()
    
    if not popup:
        return None
    
    return PopupResponse(**popup)


# Admin Popup Endpoints

@router.get(
    "/api/admin/content/popups",
    response_model=PopupListResponse,
    tags=["content", "admin"],
    summary="Get all popups (admin)",
)
async def get_all_popups(
    current_user: Member = Depends(get_current_admin_user),
):
    """Get all popups including inactive (admin only)."""
    popups = await service.get_popups()
    
    popup_responses = [PopupResponse(**p) for p in popups]
    return PopupListResponse(popups=popup_responses)


@router.get(
    "/api/admin/content/popups/{popup_id}",
    response_model=PopupResponse,
    tags=["content", "admin"],
    summary="Get popup by ID (admin)",
)
async def get_popup(
    popup_id: UUID,
    current_user: Member = Depends(get_current_admin_user),
):
    """Get popup detail by ID (admin only)."""
    popup = await service.get_popup_by_id(popup_id)
    
    return PopupResponse(**popup)


@router.post(
    "/api/admin/content/popups",
    response_model=PopupResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["content", "admin"],
    summary="Create popup",
)
@audit_log(action="create", resource_type="popup")
async def create_popup(
    data: PopupCreate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """Create a new popup (admin only)."""
    popup = await service.create_popup(data)
    
    return PopupResponse(**popup)


@router.put(
    "/api/admin/content/popups/{popup_id}",
    response_model=PopupResponse,
    tags=["content", "admin"],
    summary="Update popup",
)
@audit_log(action="update", resource_type="popup")
async def update_popup(
    popup_id: UUID,
    data: PopupUpdate,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Update a popup (admin only)."""
    popup = await service.update_popup(popup_id, data)
    
    return PopupResponse(**popup)


@router.delete(
    "/api/admin/content/popups/{popup_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["content", "admin"],
    summary="Delete popup",
)
@audit_log(action="delete", resource_type="popup")
async def delete_popup(
    popup_id: UUID,
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
):
    """Delete a popup (admin only)."""
    await service.delete_popup(popup_id)


# Dashboard Popup Management (Simplified - Single Popup)
# This endpoint is for the dashboard's simplified popup management

@router.get(
    "/api/admin/popup",
    tags=["content", "admin"],
    summary="Get popup for dashboard (admin)",
)
async def get_dashboard_popup(
    current_user: Member = Depends(get_current_admin_user),
):
    """
    Get the most recent active popup for dashboard management (admin only).
    
    Returns a simplified popup object for the dashboard.
    """
    return await service.get_dashboard_popup()


@router.post(
    "/api/admin/popup",
    tags=["content", "admin"],
    summary="Create or update popup for dashboard (admin)",
)
@audit_log(action="update", resource_type="popup")
async def save_dashboard_popup(
    request: Request,
    current_user: Member = Depends(get_current_admin_user),
    image: Optional[UploadFile] = File(None),
    startDate: Optional[str] = Form(None),
    endDate: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    link: Optional[str] = Form(None),
    enabled: Optional[str] = Form(None),
):
    """
    Create or update popup from dashboard (admin only).
    
    This is a simplified endpoint for the dashboard's popup management.
    It creates or updates a single popup with basic fields.
    """
    # Upload image if provided
    image_url = None
    if image:
        attachment = await upload_service.upload_public_file(
            file=image,
            user=current_user,
            resource_type="popup",
        )
        image_url = attachment["file_url"]
    
    # Delegate business logic to service layer
    return await service.save_dashboard_popup(
        image_url=image_url,
        start_date_str=startDate,
        end_date_str=endDate,
        content=content,
        link=link,
        enabled=enabled,
    )


# ============================================================================
# Legal Content Endpoints (Terms of Service, Privacy Policy)
# ============================================================================

# Public Legal Content Endpoints

@router.get(
    "/api/legal-content/{content_type}",
    response_model=Optional[LegalContentResponse],
    tags=["content"],
    summary="Get legal content",
)
async def get_legal_content(
    content_type: str,
):
    """
    Get legal content by type.
    
    - **content_type**: 'terms_of_service', 'privacy_policy', 'third_party_sharing', or 'marketing_consent'
    """
    from ...common.modules.exception import ValidationError, CMessageTemplate
    
    allowed_types = ['terms_of_service', 'privacy_policy', 'third_party_sharing', 'marketing_consent']
    if content_type not in allowed_types:
        raise ValidationError(
            CMessageTemplate.VALIDATION_INVALID_VALUE.format(
                field="content_type",
                allowed_values=", ".join(allowed_types)
            )
        )
    
    legal_content = await service.get_legal_content(content_type)
    
    if not legal_content:
        return None
    
    return LegalContentResponse(**legal_content)


# Admin Legal Content Endpoints

@router.put(
    "/api/admin/content/legal/{content_type}",
    response_model=LegalContentResponse,
    tags=["content", "admin"],
    summary="Update legal content",
)
@audit_log(action="update", resource_type="legal_content")
async def update_legal_content(
    content_type: str,
    data: LegalContentUpdate,
    request: Request,
    current_user = Depends(get_current_admin_user),
):
    """
    Update legal content (admin only, upsert pattern).
    
    - **content_type**: 'terms_of_service', 'privacy_policy', 'third_party_sharing', or 'marketing_consent'
    """
    from ...common.modules.exception import ValidationError, CMessageTemplate
    
    allowed_types = ['terms_of_service', 'privacy_policy', 'third_party_sharing', 'marketing_consent']
    if content_type not in allowed_types:
        raise ValidationError(
            CMessageTemplate.VALIDATION_INVALID_VALUE.format(
                field="content_type",
                allowed_values=", ".join(allowed_types)
            )
        )
    
    legal_content = await service.update_legal_content(
        content_type=content_type,
        content_html=data.content_html,
        updated_by=current_user["id"]
    )
    
    return LegalContentResponse(**legal_content)
