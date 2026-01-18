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
    
    file_id: str = Field(..., description="Unique file identifier")
    file_name: str = Field(..., description="Original file name")
    file_url: str = Field(..., description="File URL or path")
    file_size: int = Field(..., description="File size in bytes")
    file_type: Optional[str] = Field(None, description="File type (e.g., 'image', 'document')")
    mime_type: Optional[str] = Field(None, description="MIME type")
    uploaded_at: str = Field(..., description="Upload timestamp")
    
    class Config:
        from_attributes = True


class FileDownloadResponse(BaseModel):
    """File download response schema."""
    
    file_url: str = Field(..., description="File URL (signed URL for private files)")
    original_name: str = Field(..., description="Original filename")
    mime_type: Optional[str] = Field(None, description="MIME type")
    file_size: Optional[int] = Field(None, description="File size in bytes")

