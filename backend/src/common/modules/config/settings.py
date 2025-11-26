"""
Application configuration settings.

This module uses Pydantic Settings to manage environment variables
and application configuration.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application Configuration
    APP_NAME: str = "Gangwon Business Portal"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/db"  # Default for migration generation

    # Supabase Configuration
    SUPABASE_URL: str = "https://placeholder.supabase.co"  # Default placeholder
    SUPABASE_KEY: str = "placeholder-key"  # Default placeholder
    SUPABASE_SERVICE_KEY: str | None = None

    # JWT Configuration
    SECRET_KEY: str = "development-secret-key-change-in-production"  # Default for development
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS Configuration
    # Default allows both Vite dev ports (5173 and 3000)
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Nice D&B API (Optional)
    NICE_DNB_API_KEY: str | None = None

    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_FILE_TYPES: str = "image/jpeg,image/png,image/gif,application/pdf"

    # Logging Configuration
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FILE: str | None = None  # Path to log file (None = console only)
    LOG_FILE_MAX_BYTES: int = 10485760  # 10MB per log file
    LOG_FILE_BACKUP_COUNT: int = 5  # Number of backup files to keep
    LOG_ENABLE_FILE: bool = False  # Enable file logging
    LOG_ENABLE_CONSOLE: bool = True  # Enable console logging
    LOG_SENSITIVE_FIELDS: List[str] = [
        "password",
        "token",
        "secret",
        "api_key",
        "authorization",
    ]  # Fields to mask in logs

    class Config:
        # Try .env.local first (for local development), then .env
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env file


# Global settings instance
settings = Settings()

