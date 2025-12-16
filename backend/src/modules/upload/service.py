"""
Upload service.

Business logic for file upload and management.
"""
from typing import Optional
from fastapi import UploadFile
from uuid import UUID, uuid4

from ...common.modules.supabase.service import supabase_service
from ...common.modules.storage import storage_service
from ...common.modules.config import settings
from ...common.modules.exception import NotFoundError, UnauthorizedError, ValidationError


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
                f"File size ({file_size_mb:.2f}MB) exceeds maximum allowed size of {max_size_mb}MB for {file_category} files"
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
                    f"File extension '{file_ext}' is not allowed for {file_category} files. Allowed extensions: {', '.join(allowed_extensions)}"
                )

        # Validate MIME type
        if file.content_type:
            # Basic MIME type validation
            if file_category == "image" and not file.content_type.startswith("image/"):
                raise ValidationError(f"MIME type '{file.content_type}' is not allowed for image files")
            elif file_category == "document" and not (
                file.content_type.startswith("application/") or 
                file.content_type.startswith("text/") or
                file.content_type == "application/pdf"
            ):
                raise ValidationError(f"MIME type '{file.content_type}' is not allowed for document files")
            
            # Additional validation against allowed types list (for backward compatibility)
            allowed_types = [t.strip() for t in settings.ALLOWED_FILE_TYPES.split(",")]
            if file.content_type not in allowed_types and file_category == "general":
                raise ValidationError(
                    f"File type '{file.content_type}' is not allowed. Allowed types: {settings.ALLOWED_FILE_TYPES}"
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
            resource_type: Optional resource type
            resource_id: Optional resource ID

        Returns:
            Attachment dict
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

        # Create attachment record
        attachment_id = str(uuid4())
        attachment_data = {
            "id": attachment_id,
            "resource_type": resource_type or "public",
            "resource_id": str(resource_id) if resource_id else user["id"],
            "file_type": self._determine_file_type(upload_result["mime_type"]),
            "file_url": upload_result["url"],
            "original_name": upload_result["original_name"],
            "stored_name": upload_result["stored_name"],
            "file_size": file_size,
            "mime_type": upload_result["mime_type"],
            # Note: uploaded_at is automatically set by database default
        }

        attachment = await supabase_service.create_attachment(attachment_data)
        if not attachment:
            raise ValidationError("Failed to create attachment record")

        return attachment

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
            resource_type: Optional resource type
            resource_id: Optional resource ID

        Returns:
            Attachment dict
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

        # For private files, we need to generate a signed URL
        # For now, store the path and generate signed URL on demand
        # Note: Supabase signed URLs are temporary, so we store the path
        file_url = f"private-files/{upload_result['path']}"

        # Create attachment record
        attachment_id = str(uuid4())
        attachment_data = {
            "id": attachment_id,
            "resource_type": resource_type or "private",
            "resource_id": str(resource_id) if resource_id else user["id"],
            "file_type": self._determine_file_type(upload_result["mime_type"]),
            "file_url": file_url,  # Store path for private files
            "original_name": upload_result["original_name"],
            "stored_name": upload_result["stored_name"],
            "file_size": file_size,
            "mime_type": upload_result["mime_type"],
            # Note: uploaded_at is automatically set by database default
        }

        attachment = await supabase_service.create_attachment(attachment_data)
        if not attachment:
            raise ValidationError("Failed to create attachment record")

        return attachment

    async def get_file(
        self,
        file_id: UUID,
        user: dict,
    ) -> dict:
        """
        Get file metadata and generate download URL.

        Args:
            file_id: Attachment ID
            user: Current user dict

        Returns:
            Attachment dict with download URL

        Raises:
            NotFoundError: If file not found
            UnauthorizedError: If user doesn't have permission
        """
        # Get attachment
        attachment = await supabase_service.get_attachment_by_id(str(file_id))

        if not attachment:
            raise NotFoundError("File not found")

        # Check permissions
        # For public files, anyone can access
        # For private files, check if user owns the resource or is admin
        from ...modules.user.service import AuthService
        auth_service = AuthService()
        is_admin = await auth_service.is_admin(user["id"])

        if attachment.get("resource_type") == "public":
            # Public files are accessible to everyone
            pass
        else:
            # Private files: check ownership or admin
            if not is_admin and attachment.get("resource_id") != user["id"]:
                # Check if user owns the resource
                # For now, we check if resource_id matches user.id
                # In the future, we might need to check the actual resource ownership
                raise UnauthorizedError("You don't have permission to access this file")

        # Generate download URL
        if attachment.get("resource_type") == "public" or attachment.get("file_url", "").startswith("http"):
            # Public file or already has URL
            download_url = attachment.get("file_url")
        else:
            # Private file: generate signed URL
            # Extract bucket and path from stored URL
            file_url = attachment.get("file_url", "")
            if file_url.startswith("private-files/"):
                bucket = "private-files"
                path = file_url.replace("private-files/", "")
            else:
                bucket = "private-files"
                path = file_url

            # Generate signed URL (valid for 1 hour)
            try:
                signed_url = storage_service.create_signed_url(bucket, path, expires_in=3600)
                download_url = signed_url
            except Exception:
                # Fallback to public URL if signed URL generation fails
                download_url = file_url

        # Return attachment with modified file_url
        attachment["file_url"] = download_url
        return attachment

    async def delete_file(
        self,
        file_id: UUID,
        user: dict,
    ) -> bool:
        """
        Delete a file.

        Args:
            file_id: Attachment ID
            user: Current user dict

        Returns:
            True if successful

        Raises:
            NotFoundError: If file not found
            UnauthorizedError: If user doesn't have permission
        """
        # Get attachment
        attachment = await supabase_service.get_attachment_by_id(str(file_id))

        if not attachment:
            raise NotFoundError("File not found")

        # Check permissions
        from ...modules.user.service import AuthService
        auth_service = AuthService()
        is_admin = await auth_service.is_admin(user["id"])

        if not is_admin and attachment.get("resource_id") != user["id"]:
            raise UnauthorizedError("You don't have permission to delete this file")

        # Determine bucket and path
        project_prefix = "gangwon-portal"
        resource_type = attachment.get("resource_type")
        file_category = resource_type if resource_type not in ["public", "private"] else "files"
        
        file_url = attachment.get("file_url", "")
        if resource_type == "public" or not file_url.startswith("private-files/"):
            bucket = "public-files"
            # For public files, reconstruct path with project prefix and category
            if file_url.startswith("http"):
                # Public URL - reconstruct path with project prefix and category
                user_business_number = user.get('business_number')
                if user_business_number:
                    path = f"{project_prefix}/{user_business_number}/{file_category}/{attachment.get('stored_name')}"
                else:
                    path = f"{project_prefix}/{file_category}/{attachment.get('stored_name')}"
            else:
                # Already a path - use as is if it has project prefix, otherwise reconstruct
                if file_url.startswith(project_prefix):
                    path = file_url
                else:
                    # Reconstruct with project prefix and category
                    user_business_number = user.get('business_number')
                    if user_business_number:
                        path = f"{project_prefix}/{user_business_number}/{file_category}/{attachment.get('stored_name')}"
                    else:
                        path = f"{project_prefix}/{file_category}/{attachment.get('stored_name')}"
        else:
            bucket = "private-files"
            # Remove "private-files/" prefix
            path = file_url.replace("private-files/", "").lstrip("/")
            # Ensure path has project prefix and category
            if not path.startswith(project_prefix):
                user_business_number = user.get('business_number')
                if user_business_number:
                    path = f"{project_prefix}/{user_business_number}/{file_category}/{attachment.get('stored_name')}"
                else:
                    path = f"{project_prefix}/{file_category}/{attachment.get('stored_name')}"

        # Delete from storage
        # Try to delete, but don't fail if file doesn't exist in storage
        try:
            await storage_service.delete_file(bucket, path)
        except Exception:
            # Continue with database deletion even if storage deletion fails
            pass

        # Delete from database
        success = await supabase_service.delete_attachment(str(file_id))
        if not success:
            raise ValidationError("Failed to delete attachment record")

        return True

