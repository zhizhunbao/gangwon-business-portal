"""
Upload service.

Business logic for file upload and management.
"""
from typing import Optional
from fastapi import UploadFile
from uuid import UUID, uuid4
from datetime import datetime

from ...common.modules.supabase.service import supabase_service
from ...common.modules.storage import storage_service
from ...common.modules.config import settings
from ...common.modules.exception import NotFoundError, AuthorizationError, ValidationError, CMessageTemplate


class UploadService:
    """File upload service class."""

    def _validate_file(self, file: UploadFile, file_size: Optional[int] = None, check_size_first: bool = True, file_category: str = "general") -> None:
        """
        Validate uploaded file.

        Args:
            file: UploadFile object
            file_size: Optional file size in bytes (if already read)
            check_size_first: If True, check size before reading file content (more efficient)
            file_category: File category ("image", "document", or "general")

        Raises:
            ValidationError: If file validation fails
        """
        # Check file size first (before reading content) if possible
        size = file_size
        if size is None and check_size_first:
            # Try to get size from file object attributes
            if hasattr(file, 'size') and file.size:
                size = file.size
            # Try to get size from Content-Length header if available
            elif hasattr(file, 'headers') and 'content-length' in file.headers:
                try:
                    size = int(file.headers['content-length'])
                except (ValueError, TypeError):
                    pass
        
        # Determine size limit based on file category
        if file_category == "image":
            max_size = settings.MAX_IMAGE_SIZE
        elif file_category == "document":
            max_size = settings.MAX_DOCUMENT_SIZE
        else:
            max_size = settings.MAX_UPLOAD_SIZE
        
        # Validate file size
        if size and size > max_size:
            max_size_mb = max_size / 1024 / 1024
            file_size_mb = size / 1024 / 1024
            raise ValidationError(
                CMessageTemplate.VALIDATION_FILE_SIZE.format(
                    actual_size=f"{file_size_mb:.2f}",
                    max_size=f"{max_size_mb:.0f}"
                )
            )

        # Validate file extension
        if file.filename:
            file_ext = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
            
            if file_category == "image":
                allowed_extensions = [ext.strip().lower() for ext in settings.ALLOWED_IMAGE_EXTENSIONS.split(",")]
            elif file_category == "document":
                allowed_extensions = [ext.strip().lower() for ext in settings.ALLOWED_DOCUMENT_EXTENSIONS.split(",")]
            else:
                # For general files, combine both lists
                image_exts = [ext.strip().lower() for ext in settings.ALLOWED_IMAGE_EXTENSIONS.split(",")]
                doc_exts = [ext.strip().lower() for ext in settings.ALLOWED_DOCUMENT_EXTENSIONS.split(",")]
                allowed_extensions = image_exts + doc_exts
            
            if file_ext not in allowed_extensions:
                raise ValidationError(
                    CMessageTemplate.VALIDATION_FILE_EXTENSION.format(
                        extension=file_ext,
                        allowed_extensions=", ".join(allowed_extensions)
                    )
                )

        # Validate MIME type
        if file.content_type:
            # Basic MIME type validation
            if file_category == "image" and not file.content_type.startswith("image/"):
                raise ValidationError(
                    CMessageTemplate.UPLOAD_MIME_TYPE_NOT_ALLOWED.format(
                        mime_type=file.content_type,
                        file_category="image"
                    )
                )
            elif file_category == "document" and not (
                file.content_type.startswith("application/") or 
                file.content_type.startswith("text/") or
                file.content_type == "application/pdf"
            ):
                raise ValidationError(
                    CMessageTemplate.UPLOAD_MIME_TYPE_NOT_ALLOWED.format(
                        mime_type=file.content_type,
                        file_category="document"
                    )
                )
            
            # Additional validation against allowed types list (for backward compatibility)
            allowed_types = [t.strip() for t in settings.ALLOWED_FILE_TYPES.split(",")]
            if file.content_type not in allowed_types and file_category == "general":
                raise ValidationError(
                    CMessageTemplate.VALIDATION_FILE_TYPE.format(
                        file_type=file.content_type,
                        allowed_types=settings.ALLOWED_FILE_TYPES
                    )
                )

    def _determine_file_category(self, file: UploadFile) -> str:
        """
        Determine file category from filename and MIME type.

        Args:
            file: UploadFile object

        Returns:
            File category string ("image", "document", or "general")
        """
        # Check by MIME type first
        if file.content_type:
            if file.content_type.startswith("image/"):
                return "image"
            elif file.content_type.startswith("application/") or file.content_type.startswith("text/"):
                return "document"
        
        # Check by file extension
        if file.filename:
            file_ext = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
            image_exts = [ext.strip().lower() for ext in settings.ALLOWED_IMAGE_EXTENSIONS.split(",")]
            doc_exts = [ext.strip().lower() for ext in settings.ALLOWED_DOCUMENT_EXTENSIONS.split(",")]
            
            if file_ext in image_exts:
                return "image"
            elif file_ext in doc_exts:
                return "document"
        
        return "general"

    def _determine_file_type(self, mime_type: Optional[str]) -> str:
        """
        Determine file type from MIME type.

        Args:
            mime_type: MIME type string

        Returns:
            File type string (image, document, etc.)
        """
        if not mime_type:
            return "other"
        
        if mime_type.startswith("image/"):
            return "image"
        elif mime_type.startswith("application/pdf"):
            return "document"
        elif mime_type.startswith("application/"):
            return "document"
        else:
            return "other"

    async def upload_public_file(
        self,
        file: UploadFile,
        user: dict,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
    ) -> dict:
        """
        Upload a public file.

        Args:
            file: UploadFile object
            user: Current user dict
            resource_type: Optional resource type (for organizing files)
            resource_id: Optional resource ID (for organizing files)

        Returns:
            File metadata dict (to be stored in JSONB)
        """
        # Validate file size first (before reading content)
        self._validate_file(file, check_size_first=True)
        
        # Read file content to get actual size
        file_content = await file.read()
        file_size = len(file_content)
        
        # Reset file pointer for storage service
        await file.seek(0)

        # Validate file again with actual size (in case Content-Length was wrong)
        self._validate_file(file, file_size=file_size, check_size_first=False)

        # Determine file path (project name + business_number + resource_type)
        project_prefix = "gangwon-portal"
        file_category = resource_type or "files"  # Default category if not specified
        
        user_business_number = user.get('business_number')
        if user_business_number:
            path = f"{project_prefix}/{user_business_number}/{file_category}"
        else:
            path = f"{project_prefix}/{file_category}"

        # Upload to Supabase Storage
        upload_result = await storage_service.upload_file(
            file=file,
            bucket="public-files",
            path=path,
            make_public=True,
        )

        # Return file metadata (to be stored in JSONB by caller)
        return {
            "file_id": str(uuid4()),
            "file_name": upload_result["original_name"],
            "file_url": upload_result["url"],
            "file_size": file_size,
            "file_type": self._determine_file_type(upload_result["mime_type"]),
            "mime_type": upload_result["mime_type"],
            "uploaded_at": datetime.utcnow().isoformat(),
        }

    async def upload_private_file(
        self,
        file: UploadFile,
        user: dict,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
    ) -> dict:
        """
        Upload a private file.

        Args:
            file: UploadFile object
            user: Current user dict
            resource_type: Optional resource type (for organizing files)
            resource_id: Optional resource ID (for organizing files)

        Returns:
            File metadata dict (to be stored in JSONB)
        """
        # Validate file size first (before reading content)
        self._validate_file(file, check_size_first=True)
        
        # Read file content to get actual size
        file_content = await file.read()
        file_size = len(file_content)
        
        # Reset file pointer for storage service
        await file.seek(0)

        # Validate file again with actual size (in case Content-Length was wrong)
        self._validate_file(file, file_size=file_size, check_size_first=False)

        # Determine file path (project name + business_number + resource_type)
        project_prefix = "gangwon-portal"
        file_category = resource_type or "files"  # Default category if not specified
        
        user_business_number = user.get('business_number')
        if user_business_number:
            path = f"{project_prefix}/{user_business_number}/{file_category}"
        else:
            path = f"{project_prefix}/{file_category}"

        # Upload to Supabase Storage (private)
        upload_result = await storage_service.upload_file(
            file=file,
            bucket="private-files",
            path=path,
            make_public=False,
        )

        # For private files, store the path (signed URL generated on demand)
        file_url = f"private-files/{upload_result['path']}"

        # Return file metadata (to be stored in JSONB by caller)
        return {
            "file_id": str(uuid4()),
            "file_name": upload_result["original_name"],
            "file_url": file_url,
            "file_size": file_size,
            "file_type": self._determine_file_type(upload_result["mime_type"]),
            "mime_type": upload_result["mime_type"],
            "uploaded_at": datetime.utcnow().isoformat(),
        }

    async def get_file_url(
        self,
        file_url: str,
        user: dict,
    ) -> str:
        """
        Generate download URL for a file (mainly for private files).

        Args:
            file_url: File URL or path
            user: Current user dict

        Returns:
            Download URL (signed URL for private files)

        Raises:
            NotFoundError: If file not found
        """
        # If already a public URL, return as-is
        if file_url.startswith("http"):
            return file_url

        # Private file: generate signed URL
        if file_url.startswith("private-files/"):
            bucket = "private-files"
            path = file_url.replace("private-files/", "")
        else:
            bucket = "private-files"
            path = file_url

        # Generate signed URL (valid for 1 hour)
        try:
            signed_url = storage_service.create_signed_url(bucket, path, expires_in=3600)
            return signed_url
        except ValueError as e:
            error_msg = str(e)
            if "Object not found" in error_msg or "404" in error_msg:
                raise NotFoundError(
                    CMessageTemplate.UPLOAD_FILE_DELETED.format(filename=path)
                )
            raise

    async def delete_file_from_storage(
        self,
        file_url: str,
    ) -> bool:
        """
        Delete a file from storage.

        Args:
            file_url: File URL or path

        Returns:
            True if successful
        """
        # Extract bucket and path
        if file_url.startswith("http"):
            # Parse URL to get path
            # For now, skip deletion of public URLs
            return True

        if file_url.startswith("private-files/"):
            bucket = "private-files"
            path = file_url.replace("private-files/", "")
        elif file_url.startswith("public-files/"):
            bucket = "public-files"
            path = file_url.replace("public-files/", "")
        else:
            # Assume private
            bucket = "private-files"
            path = file_url

        # Delete from storage
        try:
            await storage_service.delete_file(bucket, path)
            return True
        except Exception:
            # Continue even if storage deletion fails
            return False

