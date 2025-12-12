"""
Storage service for file upload operations.
"""
from supabase import create_client, Client
from fastapi import UploadFile
import uuid
from typing import Optional

from ..config import settings


class StorageService:
    """Service for file storage operations using Supabase Storage."""

    def __init__(self):
        """Initialize storage service with lazy client creation."""
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        """Lazily create and return Supabase client."""
        if self._client is None:
            if settings.SUPABASE_URL == "https://placeholder.supabase.co":
                raise ValueError(
                    "Supabase URL not configured. "
                    "Please set SUPABASE_URL in your .env file."
                )
            
            # Prefer service role key for server-side operations (bypasses RLS)
            # Fall back to anon key if service key is not available
            supabase_key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY
            
            if supabase_key == "placeholder-key" or not supabase_key:
                raise ValueError(
                    "Supabase key not configured. "
                    "Please set SUPABASE_SERVICE_KEY (recommended) or SUPABASE_KEY in your .env file. "
                    "Service role key is required for file upload operations to bypass RLS policies."
                )
            
            try:
                self._client = create_client(settings.SUPABASE_URL, supabase_key)
            except TypeError as e:
                if "proxy" in str(e) and "unexpected keyword argument" in str(e):
                    # This is a known compatibility issue between gotrue and httpx
                    # The error occurs when gotrue tries to pass 'proxy' parameter to httpx Client
                    # which is not supported in newer httpx versions
                    raise ValueError(
                        "Supabase client initialization failed due to library compatibility issue. "
                        "This is a known issue with gotrue/httpx versions. "
                        "To fix this, please reinstall dependencies:\n"
                        "  pip install --upgrade 'supabase==2.25.1' 'gotrue>=2.12.0' 'httpx>=0.26.0,<0.27.0'\n"
                        "Or if using requirements.txt:\n"
                        "  pip install -r requirements.txt --force-reinstall"
                    ) from e
                raise
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
            error_str = str(e)
            # Check for RLS policy violation errors
            if "row-level security policy" in error_str.lower() or "403" in error_str:
                raise ValueError(
                    "File upload failed due to Supabase security policy. "
                    "Please ensure SUPABASE_SERVICE_KEY is set in your .env file. "
                    "Service role key is required to bypass Row-Level Security (RLS) policies for server-side operations."
                ) from e
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
            error_str = str(e)
            # Check for RLS policy violation errors
            if "row-level security policy" in error_str.lower() or "403" in error_str:
                # Don't raise here, just return False as the method signature indicates
                return False
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
            error_str = str(e)
            # Check for RLS policy violation errors
            if "row-level security policy" in error_str.lower() or "403" in error_str:
                raise ValueError(
                    "Signed URL creation failed due to Supabase security policy. "
                    "Please ensure SUPABASE_SERVICE_KEY is set in your .env file. "
                    "Service role key is required to bypass Row-Level Security (RLS) policies for server-side operations."
                ) from e
            raise


# Global storage service instance
storage_service = StorageService()

