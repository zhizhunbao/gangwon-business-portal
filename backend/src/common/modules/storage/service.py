"""
Storage service for file upload operations.
"""
from supabase import create_client, Client
from fastapi import UploadFile
import uuid
from typing import Optional
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Service for file storage operations using Supabase Storage."""

    def __init__(self):
        """Initialize storage service with lazy client creation."""
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        """Lazily create and return Supabase client."""
        if self._client is None:
            if settings.SUPABASE_KEY == "placeholder-key" or settings.SUPABASE_URL == "https://placeholder.supabase.co":
                raise ValueError(
                    "Supabase credentials not configured. "
                    "Please set SUPABASE_URL and SUPABASE_KEY in your .env file."
                )
            self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return self._client

    async def upload_file(
        self,
        file: UploadFile,
        bucket: str,
        path: str = "",
        make_public: bool = True,
    ) -> dict:
        """
        Upload a file to Supabase Storage.

        Args:
            file: FastAPI UploadFile object
            bucket: Storage bucket name
            path: Path within bucket (optional)
            make_public: Whether to make file publicly accessible

        Returns:
            dict: File metadata including URL
        """
        try:
            # Generate unique filename
            ext = file.filename.split(".")[-1] if "." in file.filename else ""
            stored_name = f"{uuid.uuid4()}.{ext}" if ext else str(uuid.uuid4())
            full_path = f"{path}/{stored_name}" if path else stored_name

            # Read file content
            file_content = await file.read()

            # Upload to Supabase
            self.client.storage.from_(bucket).upload(
                full_path,
                file_content,
                file_options={"content-type": file.content_type or "application/octet-stream"},
            )

            # Get public URL if needed
            if make_public:
                file_url = self.client.storage.from_(bucket).get_public_url(full_path)
            else:
                file_url = None

            return {
                "url": file_url,
                "path": full_path,
                "stored_name": stored_name,
                "original_name": file.filename,
                "size": len(file_content),
                "mime_type": file.content_type,
            }
        except Exception as e:
            logger.error(f"File upload error: {str(e)}", exc_info=e)
            raise

    async def delete_file(self, bucket: str, path: str) -> bool:
        """
        Delete a file from Supabase Storage.

        Args:
            bucket: Storage bucket name
            path: File path within bucket

        Returns:
            bool: True if successful
        """
        try:
            self.client.storage.from_(bucket).remove([path])
            return True
        except Exception as e:
            logger.error(f"File delete error: {str(e)}", exc_info=e)
            return False

    def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        """
        Create a signed URL for private file access.

        Args:
            bucket: Storage bucket name
            path: File path within bucket
            expires_in: URL expiration time in seconds (default: 1 hour)

        Returns:
            str: Signed URL
        """
        try:
            result = self.client.storage.from_(bucket).create_signed_url(path, expires_in)
            # Supabase may return a dict with 'signedURL' key or a string directly
            if isinstance(result, dict):
                return result.get('signedURL', result.get('url', str(result)))
            return str(result)
        except Exception as e:
            logger.error(f"Signed URL creation error: {str(e)}", exc_info=e)
            raise


# Global storage service instance
storage_service = StorageService()

