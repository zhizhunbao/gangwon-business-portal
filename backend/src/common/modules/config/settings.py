"""
Application configuration settings.

This module uses Pydantic Settings to manage environment variables
and application configuration.
"""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application Configuration
    APP_NAME: str = "Gangwon Business Portal"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/db"  # Default for migration generation
    DIRECT_URL: str | None = None  # Direct connection URL for migrations (Alembic). If not set, uses DATABASE_URL

    # Supabase Configuration
    SUPABASE_URL: str = "https://placeholder.supabase.co"  # Default placeholder
    SUPABASE_KEY: str = "placeholder-key"  # Default placeholder
    SUPABASE_SERVICE_KEY: str | None = None

    # JWT Configuration
    SECRET_KEY: str = "development-secret-key-change-in-production"  # Default for development
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS Configuration
    # Default allows both Vite dev ports (5173 and 3000) and production domains
    # Can be set as comma-separated string in .env: "http://localhost:5173,http://localhost:3000"
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://gangwon-portal-frontend.onrender.com",
        "https://gangwon-business-portal-frontend.onrender.com",
    ]

    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            # Split by comma and strip whitespace
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    # Nice D&B API (Optional)
    NICE_DNB_API_KEY: str | None = None
    NICE_DNB_API_SECRET_KEY: str | None = None
    NICE_DNB_API_URL: str | None = None  # API base URL (defaults to https://gate.nicednb.com if not set)
    
    # Nice D&B API Endpoints
    NICE_DNB_OAUTH_TOKEN_ENDPOINT: str | None = None  # OAuth 令牌端点
    NICE_DNB_COMPANY_INFO_ENDPOINT: str | None = None  # 企业信用信息端点
    NICE_DNB_FINANCIAL_STATEMENT_ENDPOINT: str | None = None  # 财务报表端点
    NICE_DNB_GLOBAL_RATE_ENDPOINT: str | None = None  # 全球等级端点
    NICE_DNB_CRITERIA_SEARCH_ENDPOINT: str | None = None  # 标准查询端点

    # Email Configuration
    EMAIL_SMTP_HOST: str = "smtp.gmail.com"
    EMAIL_SMTP_PORT: int = 587
    EMAIL_SMTP_USER: str = ""
    EMAIL_SMTP_PASSWORD: str = ""
    EMAIL_SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = "noreply@gangwon-portal.kr"
    EMAIL_FROM_NAME: str = "Gangwon Business Portal"
    FRONTEND_URL: str = "http://localhost:5173"  # Frontend URL for email links

    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB (default for backward compatibility)
    MAX_IMAGE_SIZE: int = 5242880  # 5MB for images
    MAX_DOCUMENT_SIZE: int = 10485760  # 10MB for documents
    # Extended MIME types: image, PDF, and common document formats
    # - HWP: application/x-hwp, application/haansofthwp, application/vnd.hancom.hwp
    # - TXT: text/plain
    # - Office: doc, docx, xls, xlsx, ppt, pptx
    ALLOWED_FILE_TYPES: str = (
        "image/jpeg,image/png,image/gif,image/webp,"
        "application/pdf,"
        "text/plain,"
        "application/x-hwp,application/haansofthwp,application/vnd.hancom.hwp,"
        "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,"
        "application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
        "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )
    ALLOWED_IMAGE_EXTENSIONS: str = "jpg,jpeg,png,gif,webp"
    ALLOWED_DOCUMENT_EXTENSIONS: str = "pdf,doc,docx,xls,xlsx,ppt,pptx,txt,hwp"

    # Logging Configuration
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL (default: INFO)
    LOG_FILE: str | None = None  # Path to system log file (None = auto-detect backend/logs/system.log)
    LOG_FILE_MAX_BYTES: int = 10485760  # 10MB per log file
    LOG_FILE_BACKUP_COUNT: int = 5  # Number of backup files to keep
    LOG_ENABLE_FILE: bool = True  # Enable system log file (default: True - writes to system.log)
    LOG_ENABLE_CONSOLE: bool = True  # Enable console logging
    LOG_CLEAR_ON_STARTUP: bool = True  # Clear logs and database records on startup (default: True)
    LOG_SENSITIVE_FIELDS: List[str] = [
        "password",
        "token",
        "secret",
        "api_key",
        "authorization",
    ]  # Fields to mask in logs
    
    # Per-file log level configuration (environment-based)
    # Production: INFO for app/audit/error, WARNING for system/performance
    # Development: DEBUG for app/audit/error, INFO for system/performance
    LOG_LEVEL_APP: str = "INFO"  # app.log level
    LOG_LEVEL_AUDIT: str = "INFO"  # audit.log level
    LOG_LEVEL_ERROR: str = "INFO"  # error.log level
    LOG_LEVEL_SYSTEM: str = "INFO"  # system.log level
    LOG_LEVEL_PERFORMANCE: str = "INFO"  # performance.log level
    
    # Database Logging Configuration (Supabase API)
    LOG_DB_ENABLED: bool = True  # Enable database logging (default: True)
    LOG_DB_SYSTEM_MIN_LEVEL: str = "INFO"  # Minimum log level for system logs (system_logs table) - consistent with file
    LOG_DB_APP_MIN_LEVEL: str = "INFO"  # Minimum log level for app logs (app_logs table) - INFO/WARNING/ERROR/CRITICAL
    LOG_DB_BATCH_SIZE: int = 50  # Batch size for database inserts (reduce database overhead)
    LOG_DB_BATCH_INTERVAL: float = 5.0  # Batch interval in seconds (flush batch after this time)

    class Config:
        # Try .env.local first (for local development), then .env
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env file


# Global settings instance
settings = Settings()

