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
   
   Active components (NOT deprecated):
   - fuzzy_search_all_columns() - Active utility function for multi-column fuzzy search
     This function is actively maintained and recommended for fuzzy search operations.

Features:
    - Async database sessions with automatic connection management
    - Direct connection mode (no connection pooling) for simplicity
    - Multi-column fuzzy search utility optimized for large datasets (ACTIVE)
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
# Fuzzy Search Function (Optimized for Large Datasets)
# ============================================================================
#
# This function is ACTIVE and actively maintained.
# It provides efficient multi-column fuzzy search capabilities optimized for
# large datasets. This is the recommended approach for fuzzy search operations.
# ============================================================================

async def fuzzy_search_all_columns(
    session: AsyncSession,
    table_name: str,
    search_keyword: str,
    columns: List[str],
    limit: int = 100,
    offset: int = 0,
    order_by: Optional[str] = None,
    case_sensitive: bool = False,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    在指定列中进行模糊查询，支持分页和排序。
    
    核心功能：
    1. 模糊查询：使用 ILIKE/LIKE 在指定列中搜索
    2. 分页：使用 LIMIT/OFFSET 进行分页
    3. 排序：支持 ORDER BY 子句
    4. SQL 注入防护：使用参数化查询和列名验证
    
    Args:
        session: 数据库会话
        table_name: 表名（如 'members' 或 'public.members'）
        search_keyword: 搜索关键词
        columns: 要搜索的列名列表（必需，调用端负责验证列存在性）
        limit: 返回结果的最大数量（默认 100）
        offset: 跳过的记录数（默认 0）
        order_by: 排序字段（如 'id DESC' 或 'created_at ASC'），None 则不排序
        case_sensitive: 是否区分大小写（默认 False，使用 ILIKE）
    
    Returns:
        Tuple[List[Dict[str, Any]], int]: (结果列表, 总记录数)
    
    Example:
        ```python
        async with AsyncSessionLocal() as session:
            results, total = await fuzzy_search_all_columns(
                session=session,
                table_name='members',
                search_keyword='test',
                columns=['company_name', 'business_number'],
                limit=50,
                offset=0,
                order_by='id DESC'
            )
        ```
    """
    # 参数验证
    if not search_keyword or not search_keyword.strip():
        return [], 0
    
    if not columns:
        raise ValueError("columns parameter is required and cannot be empty")
    
    # 表名处理：添加 schema 前缀（如果未指定）
    if '.' not in table_name:
        table_name = f'public.{table_name}'
    schema_name, table_only = table_name.split('.', 1)
    schema_name = schema_name.strip('"')
    table_only = table_only.strip('"')
    safe_table_name = f'"{schema_name}"."{table_only}"'
    
    # SQL 注入防护：验证列名只包含字母、数字、下划线、连字符
    # 列名会被双引号包裹，进一步防止注入
    safe_columns = []
    for col in columns:
        col = col.strip()
        if not col:
            continue
        # 只允许字母、数字、下划线、连字符
        if not all(c.isalnum() or c in ('_', '-') for c in col):
            raise ValueError(f"Invalid column name: {col}")
        safe_columns.append(f'"{col}"')
    
    if not safe_columns:
        return [], 0
    
    # 转义搜索关键词中的特殊字符（LIKE 模式中的 % 和 _）
    escaped_keyword = search_keyword.replace('%', r'\%').replace('_', r'\_')
    search_pattern = f'%{escaped_keyword}%'
    
    # 选择 LIKE 或 ILIKE 操作符
    like_operator = 'LIKE' if case_sensitive else 'ILIKE'
    
    # 构建 WHERE 子句：所有列的 OR 条件
    where_conditions = [f'{col} {like_operator} :search_pattern' for col in safe_columns]
    where_clause = ' OR '.join(where_conditions)
    
    # 构建 ORDER BY 子句（SQL 注入防护）
    order_clause = ''
    if order_by:
        order_by = order_by.strip()
        # 防止 SQL 注入：检查危险字符
        if any(char in order_by for char in [';', '--', '/*', '*/', 'xp_', 'sp_']):
            raise ValueError("Invalid order_by parameter: contains dangerous characters")
        order_clause = f'ORDER BY {order_by}'
    
    # 构建查询：COUNT 查询和分页数据查询
    count_query = text(f"""
        SELECT COUNT(*) 
        FROM {safe_table_name}
        WHERE {where_clause}
    """)
    
    data_query = text(f"""
        SELECT * 
        FROM {safe_table_name}
        WHERE {where_clause}
        {order_clause}
        LIMIT :limit OFFSET :offset
    """)
    
    # 执行查询
    # 获取总数
    count_result = await session.execute(
        count_query,
        {"search_pattern": search_pattern}
    )
    total = count_result.scalar() or 0
    
    # 获取分页数据
    data_result = await session.execute(
        data_query,
        {
            "search_pattern": search_pattern,
            "limit": limit,
            "offset": offset
        }
    )
    
    # 转换为字典列表
    rows = data_result.fetchall()
    columns_from_result = data_result.keys()
    results = [
        {col: value for col, value in zip(columns_from_result, row)}
        for row in rows
    ]
    
    return results, total


# ============================================================================
# Module Exports
# ============================================================================

__all__ = ["engine", "AsyncSessionLocal", "Base", "get_db", "fuzzy_search_all_columns"]

