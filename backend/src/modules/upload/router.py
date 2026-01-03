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
from ...common.modules.exception import ICustomException
from ..user.dependencies import get_current_active_user
from .service import UploadService
from .schemas import FileUploadResponse, FileDownloadResponse

router = APIRouter()
service = UploadService()


def _handle_exception(exc: ICustomException) -> None:
    """Convert ICustomException into FastAPI HTTPException."""
    raise HTTPException(status_code=exc.http_status_code, detail=exc.message)


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
    """
    try:
        attachment = await service.upload_public_file(
            file=file,
            user=current_user,
            resource_type=resource_type,
            resource_id=resource_id,
        )
    except ICustomException as exc:
        _handle_exception(exc)
    
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


@router.get(
    "/api/upload/{file_id}",
    response_model=FileDownloadResponse,
    tags=["upload"],
    summary="Download file",
)
@audit_log(action="download", resource_type="file")
async def download_file(
    file_id: UUID,
    request: Request,
    current_user: Annotated[dict, Depends(get_current_active_user)] = None,
):
    """
    Get file download URL.
    """
    try:
        attachment = await service.get_file(
            file_id=file_id,
            user=current_user,
        )
    except ICustomException as exc:
        _handle_exception(exc)
    
    return FileDownloadResponse(
        file_url=attachment["file_url"],
        original_name=attachment["original_name"],
        mime_type=attachment["mime_type"],
        file_size=attachment["file_size"],
    )


@router.get(
    "/api/upload/{file_id}/redirect",
    tags=["upload"],
    summary="Redirect to file download",
)
async def redirect_to_file(
    file_id: UUID,
    current_user: Annotated[dict, Depends(get_current_active_user)] = None,
):
    """
    Redirect to file download URL.
    """
    try:
        attachment = await service.get_file(
            file_id=file_id,
            user=current_user,
        )
    except ICustomException as exc:
        _handle_exception(exc)
    
    return RedirectResponse(url=attachment["file_url"], status_code=status.HTTP_302_FOUND)


@router.delete(
    "/api/upload/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["upload"],
    summary="Delete file",
)
@audit_log(action="delete", resource_type="file")
async def delete_file(
    file_id: UUID,
    request: Request,
    current_user: Annotated[dict, Depends(get_current_active_user)] = None,
):
    """
    Delete a file.
    """
    try:
        await service.delete_file(
            file_id=file_id,
            user=current_user,
        )
    except ICustomException as exc:
        _handle_exception(exc)
    
    return None
