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
# Database Connection
# ============================================================================
#
# Connection Strategy:
#   - Uses DATABASE_URL for runtime (with PgBouncer pooling on port 6543)
#   - DIRECT_URL is reserved for migrations only (Alembic needs direct connection)
#   - When using PgBouncer: NullPool is required (PgBouncer handles pooling)
#   - When using direct connection: SQLAlchemy pooling for better performance
#   - Supports raw SQL execution: session.execute(text("SELECT ..."))
#
# Performance Considerations:
#   - PgBouncer reduces connection overhead significantly
#   - For Supabase: always use port 6543 (pooler) for runtime
# ============================================================================

# Get database URL
# For runtime: prefer DATABASE_URL (with PgBouncer pooling)
# DIRECT_URL is only for migrations (Alembic) that need direct connection
database_url = settings.DATABASE_URL

# Ensure asyncpg driver is used for async operations
# Convert postgresql:// or postgres:// to postgresql+asyncpg://
if database_url.startswith("postgresql://") or database_url.startswith("postgres://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1).replace("postgres://", "postgresql+asyncpg://", 1)

# Check if using PgBouncer (transaction mode) - detected by port 6543
is_pgbouncer = ":6543" in database_url

# Create async database engine
# - With PgBouncer: use NullPool (PgBouncer handles pooling)
# - Without PgBouncer: use connection pooling for better performance
if is_pgbouncer:
    # PgBouncer mode: NullPool required (PgBouncer manages connections)
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        poolclass=NullPool,
        connect_args={
            "statement_cache_size": 0,  # Required for PgBouncer transaction mode
        },
    )
else:
    # Direct connection mode: use connection pooling
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True,
        pool_size=5,  # Maintain 5 connections
        max_overflow=10,  # Allow up to 15 total connections
        pool_timeout=30,  # Wait up to 30s for a connection
        pool_recycle=1800,  # Recycle connections after 30 minutes
        pool_pre_ping=True,  # Verify connections before use
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

