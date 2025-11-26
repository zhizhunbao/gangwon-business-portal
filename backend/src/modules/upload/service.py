"""
Upload service.

Business logic for file upload and management.
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import UploadFile, HTTPException, status
from uuid import UUID
import mimetypes

from ...common.modules.db.models import Attachment, Member
from ...common.modules.storage import storage_service
from ...common.modules.config import settings
from ...common.modules.exception import NotFoundError, UnauthorizedError, ValidationError


class UploadService:
    """File upload service class."""

    def _validate_file(self, file: UploadFile, file_size: Optional[int] = None) -> None:
        """
        Validate uploaded file.

        Args:
            file: UploadFile object
            file_size: Optional file size in bytes (if already read)

        Raises:
            ValidationError: If file validation fails
        """
        # Check file size
        size = file_size
        if size is None:
            # Try to get size from file object
            if hasattr(file, 'size') and file.size:
                size = file.size
        
        if size and size > settings.MAX_UPLOAD_SIZE:
            max_size_mb = settings.MAX_UPLOAD_SIZE / 1024 / 1024
            raise ValidationError(
                f"File size exceeds maximum allowed size of {max_size_mb}MB"
            )

        # Check file type
        if file.content_type:
            allowed_types = [t.strip() for t in settings.ALLOWED_FILE_TYPES.split(",")]
            if file.content_type not in allowed_types:
                raise ValidationError(
                    f"File type '{file.content_type}' is not allowed. Allowed types: {settings.ALLOWED_FILE_TYPES}"
                )

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
        user: Member,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        db: AsyncSession = None,
    ) -> Attachment:
        """
        Upload a public file.

        Args:
            file: UploadFile object
            user: Current user
            resource_type: Optional resource type
            resource_id: Optional resource ID
            db: Database session

        Returns:
            Attachment object
        """
        # Read file content to get size
        file_content = await file.read()
        file_size = len(file_content)
        
        # Reset file pointer for storage service
        await file.seek(0)

        # Validate file
        self._validate_file(file, file_size=file_size)

        # Determine file path (use business_id if available)
        path = ""
        if user.business_id:
            path = str(user.business_id)

        # Upload to Supabase Storage
        upload_result = await storage_service.upload_file(
            file=file,
            bucket="public-files",
            path=path,
            make_public=True,
        )

        # Create attachment record
        attachment = Attachment(
            resource_type=resource_type or "public",
            resource_id=resource_id or user.id,
            file_type=self._determine_file_type(upload_result["mime_type"]),
            file_url=upload_result["url"],
            original_name=upload_result["original_name"],
            stored_name=upload_result["stored_name"],
            file_size=file_size,
            mime_type=upload_result["mime_type"],
        )

        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)

        return attachment

    async def upload_private_file(
        self,
        file: UploadFile,
        user: Member,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        db: AsyncSession = None,
    ) -> Attachment:
        """
        Upload a private file.

        Args:
            file: UploadFile object
            user: Current user
            resource_type: Optional resource type
            resource_id: Optional resource ID
            db: Database session

        Returns:
            Attachment object
        """
        # Read file content to get size
        file_content = await file.read()
        file_size = len(file_content)
        
        # Reset file pointer for storage service
        await file.seek(0)

        # Validate file
        self._validate_file(file, file_size=file_size)

        # Determine file path (use business_id if available)
        path = ""
        if user.business_id:
            path = str(user.business_id)

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
        attachment = Attachment(
            resource_type=resource_type or "private",
            resource_id=resource_id or user.id,
            file_type=self._determine_file_type(upload_result["mime_type"]),
            file_url=file_url,  # Store path for private files
            original_name=upload_result["original_name"],
            stored_name=upload_result["stored_name"],
            file_size=file_size,
            mime_type=upload_result["mime_type"],
        )

        db.add(attachment)
        await db.commit()
        await db.refresh(attachment)

        return attachment

    async def get_file(
        self,
        file_id: UUID,
        user: Member,
        db: AsyncSession = None,
    ) -> Attachment:
        """
        Get file metadata and generate download URL.

        Args:
            file_id: Attachment ID
            user: Current user
            db: Database session

        Returns:
            Attachment object with download URL

        Raises:
            NotFoundError: If file not found
            UnauthorizedError: If user doesn't have permission
        """
        # Get attachment
        result = await db.execute(select(Attachment).where(Attachment.id == file_id))
        attachment = result.scalar_one_or_none()

        if not attachment:
            raise NotFoundError("File not found")

        # Check permissions
        # For public files, anyone can access
        # For private files, check if user owns the resource or is admin
        from ...modules.user.service import AuthService
        auth_service = AuthService()
        is_admin = auth_service.is_admin(user)

        if attachment.resource_type == "public":
            # Public files are accessible to everyone
            pass
        else:
            # Private files: check ownership or admin
            if not is_admin and attachment.resource_id != user.id:
                # Check if user owns the resource
                # For now, we check if resource_id matches user.id
                # In the future, we might need to check the actual resource ownership
                raise UnauthorizedError("You don't have permission to access this file")

        # Generate download URL
        if attachment.resource_type == "public" or attachment.file_url.startswith("http"):
            # Public file or already has URL
            download_url = attachment.file_url
        else:
            # Private file: generate signed URL
            # Extract bucket and path from stored URL
            if attachment.file_url.startswith("private-files/"):
                bucket = "private-files"
                path = attachment.file_url.replace("private-files/", "")
            else:
                bucket = "private-files"
                path = attachment.file_url

            # Generate signed URL (valid for 1 hour)
            try:
                signed_url = storage_service.create_signed_url(bucket, path, expires_in=3600)
                download_url = signed_url
            except Exception as e:
                # Fallback to public URL if signed URL generation fails
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to generate signed URL: {str(e)}")
                download_url = attachment.file_url

        # Create a temporary attachment object with download URL
        # We'll return the attachment with modified file_url
        attachment.file_url = download_url
        return attachment

    async def delete_file(
        self,
        file_id: UUID,
        user: Member,
        db: AsyncSession = None,
    ) -> bool:
        """
        Delete a file.

        Args:
            file_id: Attachment ID
            user: Current user
            db: Database session

        Returns:
            True if successful

        Raises:
            NotFoundError: If file not found
            UnauthorizedError: If user doesn't have permission
        """
        # Get attachment
        result = await db.execute(select(Attachment).where(Attachment.id == file_id))
        attachment = result.scalar_one_or_none()

        if not attachment:
            raise NotFoundError("File not found")

        # Check permissions
        from ...modules.user.service import AuthService
        auth_service = AuthService()
        is_admin = auth_service.is_admin(user)

        if not is_admin and attachment.resource_id != user.id:
            raise UnauthorizedError("You don't have permission to delete this file")

        # Determine bucket and path
        if attachment.resource_type == "public" or not attachment.file_url.startswith("private-files/"):
            bucket = "public-files"
            # For public files, extract path from stored_name or file_url
            if attachment.file_url.startswith("http"):
                # Public URL - we need to extract the path
                # Supabase public URLs typically have the path in them
                # For now, reconstruct from stored_name and business_id if available
                if user.business_id:
                    path = f"{user.business_id}/{attachment.stored_name}"
                else:
                    path = attachment.stored_name
            else:
                # Already a path
                path = attachment.file_url
        else:
            bucket = "private-files"
            # Remove "private-files/" prefix
            path = attachment.file_url.replace("private-files/", "").lstrip("/")

        # Delete from storage
        # Try to delete, but don't fail if file doesn't exist in storage
        try:
            await storage_service.delete_file(bucket, path)
        except Exception as e:
            # Log error but continue with database deletion
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to delete file from storage: {str(e)}")

        # Delete from database
        await db.delete(attachment)
        await db.commit()

        return True

