"""
Database session management module.

This module provides async database session management using SQLAlchemy with
PostgreSQL backend. It includes session factory, dependency injection, and
utility functions for database operations.

⚠️ PARTIALLY DEPRECATED: Some functions in this module are deprecated.
   The application is migrating to Supabase client for most database operations.
   New code should use `supabase_service` from `common.modules.supabase.service`.
   
   Deprecated components:
   - get_db() - Use supabase_service instead
   - ORM models (Base) - kept for backward compatibility only
   - Exception/Audit/Logger routers - need migration to Supabase
   - Health check endpoints - can be replaced with Supabase health checks

Features:
    - Async database sessions with automatic connection management
    - Direct connection mode (no connection pooling) for simplicity
"""
from typing import AsyncGenerator, Optional, List, Dict, Any, Tuple
from sqlalchemy import text

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

from ..config import settings


# ============================================================================
# Database Connection (Direct Connection, No Pooling)
# ============================================================================
#
# Connection Strategy:
#   - Uses NullPool for direct connections (no connection pooling)
#   - Each connection is automatically closed after use
#   - Prefers DIRECT_URL (direct Postgres connection, bypasses PgBouncer)
#   - Falls back to DATABASE_URL if DIRECT_URL is not configured
#   - Supports raw SQL execution: session.execute(text("SELECT ..."))
#
# Performance Considerations:
#   - NullPool is simpler but may have higher connection overhead
#   - Suitable for low to moderate traffic scenarios
#   - For high-traffic scenarios, consider using connection pooling
# ============================================================================

# Get database URL (prefer direct connection URL)
database_url = settings.DIRECT_URL or settings.DATABASE_URL

# Ensure asyncpg driver is used for async operations
# Convert postgresql:// or postgres:// to postgresql+asyncpg://
if database_url.startswith("postgresql://") or database_url.startswith("postgres://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)

# Create async database engine with NullPool (no connection pooling)
# Each connection is created on demand and closed after use
engine = create_async_engine(
    database_url,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    future=True,  # Use SQLAlchemy 2.0 style
    poolclass=NullPool,  # Disable connection pooling - direct connections only
    connect_args={
        "statement_cache_size": 0,  # Disable statement cache for simplicity
    },
)


# ============================================================================
# Database Session Factory
# ============================================================================

# Create async session factory
# Configuration:
#   - expire_on_commit=False: Objects remain accessible after commit
#   - autocommit=False: Manual commit required
#   - autoflush=False: Manual flush required (better control)
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for SQLAlchemy ORM models
# Used for declarative model definitions (backward compatibility)
Base = declarative_base()


# ============================================================================
# Database Session Dependency
# ============================================================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get database session.
    
    ⚠️ DEPRECATED: This function is deprecated. Use `supabase_service` instead.
    
    This function provides a database session that is automatically
    committed on success or rolled back on error.
    
    Yields:
        AsyncSession: Database session ready for use
    
    Example:
        ```python
        async for session in get_db():
            result = await session.execute(text("SELECT * FROM users"))
            # Session is automatically committed on success
        ```
    """
    async with AsyncSessionLocal() as session:
        yield session
        await session.commit()


# ============================================================================
# Module Exports
# ============================================================================

__all__ = ["engine", "AsyncSessionLocal", "Base", "get_db"]

