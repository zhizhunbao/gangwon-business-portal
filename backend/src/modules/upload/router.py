"""
Upload router.

API endpoints for file upload and management.
"""
from fastapi import APIRouter, Depends, UploadFile, File, Query, status, HTTPException
from fastapi.responses import RedirectResponse
from typing import Optional, Annotated
from uuid import UUID

from fastapi import Request

from ...common.modules.audit import audit_log
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
@audit_log(action="upload", resource_type="file")
async def upload_public_file(
    file: Annotated[UploadFile, File(description="File to upload")],
    request: Request,
    current_user: Annotated[dict, Depends(get_current_active_user)],
    resource_type: Annotated[Optional[str], Query(description="Resource type (e.g., 'banner', 'notice')")] = None,
    resource_id: Annotated[Optional[UUID], Query(description="Associated resource ID")] = None,
):
    """
    Upload a public file (e.g., banner images, notice images).
    Returns file metadata to be stored in JSONB by caller.
    """
    attachment = await service.upload_public_file(
        file=file,
        user=current_user,
        resource_type=resource_type,
        resource_id=resource_id,
    )
    return FileUploadResponse(**attachment)


@router.post(
    "/api/upload/private",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["upload"],
    summary="Upload private file",
)
@audit_log(action="upload", resource_type="file")
async def upload_private_file(
    file: Annotated[UploadFile, File(description="File to upload")],
    request: Request,
    current_user: Annotated[dict, Depends(get_current_active_user)],
    resource_type: Annotated[Optional[str], Query(description="Resource type (e.g., 'performance', 'project')")] = None,
    resource_id: Annotated[Optional[UUID], Query(description="Associated resource ID")] = None,
):
    """
    Upload a private file (e.g., performance attachments, member certificates).
    Returns file metadata to be stored in JSONB by caller.
    """
    try:
        attachment = await service.upload_private_file(
            file=file,
            user=current_user,
            resource_type=resource_type,
            resource_id=resource_id,
        )
    except ICustomException as exc:
        _handle_exception(exc)
    
    return FileUploadResponse(**attachment)
