"""
Database session management.

This module provides async database session management using SQLAlchemy.
"""
from urllib.parse import urlparse, urlunparse, quote
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

from ..config import settings


def _encode_database_url(url: str) -> str:
    """
    Properly encode special characters in database URL password.
    
    This handles passwords containing special characters like % that need
    to be URL-encoded for SQLAlchemy to parse correctly.
    """
    parsed = urlparse(url)
    if parsed.password:
        # URL-encode the password (quote with safe='')
        encoded_password = quote(parsed.password, safe='')
        # Reconstruct the netloc with encoded password
        if parsed.port:
            netloc = f"{parsed.username}:{encoded_password}@{parsed.hostname}:{parsed.port}"
        else:
            netloc = f"{parsed.username}:{encoded_password}@{parsed.hostname}"
        # Reconstruct the full URL
        return urlunparse((
            parsed.scheme,
            netloc,
            parsed.path,
            parsed.params,
            parsed.query,
            parsed.fragment
        ))
    return url


# Create async engine with properly encoded URL
engine = create_async_engine(
    _encode_database_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()

__all__ = ["engine", "AsyncSessionLocal", "Base", "get_db"]


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get database session.

    Yields:
        AsyncSession: Database session
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

