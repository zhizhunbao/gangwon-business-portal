"""
Upload module schemas.

Pydantic models for file upload request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class FileUploadResponse(BaseModel):
    """File upload response schema."""
    
    id: UUID
    resource_type: Optional[str] = Field(None, description="Resource type (e.g., 'performance', 'project')")
    resource_id: Optional[UUID] = Field(None, description="Associated resource ID")
    file_type: Optional[str] = Field(None, description="File type (e.g., 'image', 'document')")
    file_url: str = Field(..., description="File URL (public URL for public files, signed URL for private files)")
    original_name: str = Field(..., description="Original filename")
    stored_name: str = Field(..., description="Stored filename")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    mime_type: Optional[str] = Field(None, description="MIME type")
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class FileDownloadResponse(BaseModel):
    """File download response schema."""
    
    file_url: str = Field(..., description="File URL (signed URL for private files)")
    original_name: str = Field(..., description="Original filename")
    mime_type: Optional[str] = Field(None, description="MIME type")
    file_size: Optional[int] = Field(None, description="File size in bytes")

