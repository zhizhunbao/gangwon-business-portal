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
    # Can be set as comma-separated string in .env: "http://localhost:5173,http://localhost:3000"
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
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
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_FILE_TYPES: str = "image/jpeg,image/png,image/gif,application/pdf"

    # Logging Configuration
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FILE: str | None = None  # Path to log file (None = auto-detect backend/logs/app.log)
    LOG_FILE_MAX_BYTES: int = 10485760  # 10MB per log file
    LOG_FILE_BACKUP_COUNT: int = 5  # Number of backup files to keep
    LOG_ENABLE_FILE: bool = False  # Enable file logging (default: False - console only, can enable in production if needed)
    LOG_ENABLE_CONSOLE: bool = True  # Enable console logging
    LOG_CLEAR_ON_STARTUP: bool = True  # Clear logs and database records on startup (default: True)
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

