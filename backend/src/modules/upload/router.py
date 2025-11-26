"""
Upload router.

API endpoints for file upload and management.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Annotated
from uuid import UUID

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ..user.dependencies import get_current_active_user
from .service import UploadService
from .schemas import FileUploadResponse, FileDownloadResponse

router = APIRouter()
service = UploadService()


@router.post(
    "/api/upload/public",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["upload"],
    summary="Upload public file",
)
async def upload_public_file(
    file: Annotated[UploadFile, File(description="File to upload")],
    resource_type: Annotated[Optional[str], Query(description="Resource type (e.g., 'banner', 'notice')")] = None,
    resource_id: Annotated[Optional[UUID], Query(description="Associated resource ID")] = None,
    current_user: Annotated[Member, Depends(get_current_active_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Upload a public file (e.g., banner images, notice images).

    - **file**: File to upload (max 10MB)
    - **resource_type**: Optional resource type
    - **resource_id**: Optional associated resource ID
    - Requires authentication
    """
    attachment = await service.upload_public_file(
        file=file,
        user=current_user,
        resource_type=resource_type,
        resource_id=resource_id,
        db=db,
    )
    return FileUploadResponse.model_validate(attachment)


@router.post(
    "/api/upload/private",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["upload"],
    summary="Upload private file",
)
async def upload_private_file(
    file: Annotated[UploadFile, File(description="File to upload")],
    resource_type: Annotated[Optional[str], Query(description="Resource type (e.g., 'performance', 'project')")] = None,
    resource_id: Annotated[Optional[UUID], Query(description="Associated resource ID")] = None,
    current_user: Annotated[Member, Depends(get_current_active_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Upload a private file (e.g., performance attachments, member certificates).

    - **file**: File to upload (max 10MB)
    - **resource_type**: Optional resource type
    - **resource_id**: Optional associated resource ID
    - Requires authentication
    - File will be stored privately and require authentication to access
    """
    attachment = await service.upload_private_file(
        file=file,
        user=current_user,
        resource_type=resource_type,
        resource_id=resource_id,
        db=db,
    )
    return FileUploadResponse.model_validate(attachment)


@router.get(
    "/api/upload/{file_id}",
    response_model=FileDownloadResponse,
    tags=["upload"],
    summary="Download file",
)
async def download_file(
    file_id: UUID,
    current_user: Annotated[Member, Depends(get_current_active_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Get file download URL.

    - **file_id**: Attachment ID
    - For public files: returns public URL
    - For private files: returns signed URL (valid for 1 hour)
    - Requires authentication
    - Checks permissions (user must own the file or be admin)
    """
    attachment = await service.get_file(
        file_id=file_id,
        user=current_user,
        db=db,
    )
    
    return FileDownloadResponse(
        file_url=attachment.file_url,
        original_name=attachment.original_name,
        mime_type=attachment.mime_type,
        file_size=attachment.file_size,
    )


@router.get(
    "/api/upload/{file_id}/redirect",
    tags=["upload"],
    summary="Redirect to file download",
)
async def redirect_to_file(
    file_id: UUID,
    current_user: Annotated[Member, Depends(get_current_active_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Redirect to file download URL.

    - **file_id**: Attachment ID
    - Returns HTTP redirect to file URL
    - Requires authentication
    - Checks permissions
    """
    attachment = await service.get_file(
        file_id=file_id,
        user=current_user,
        db=db,
    )
    
    return RedirectResponse(url=attachment.file_url, status_code=status.HTTP_302_FOUND)


@router.delete(
    "/api/upload/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["upload"],
    summary="Delete file",
)
async def delete_file(
    file_id: UUID,
    current_user: Annotated[Member, Depends(get_current_active_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """
    Delete a file.

    - **file_id**: Attachment ID
    - Requires authentication
    - Checks permissions (user must own the file or be admin)
    - Deletes file from storage and database
    """
    await service.delete_file(
        file_id=file_id,
        user=current_user,
        db=db,
    )
    return None

