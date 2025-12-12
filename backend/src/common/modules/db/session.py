"""
Database session management.

This module provides async database session management using SQLAlchemy.
"""
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional
from urllib.parse import urlparse, urlunparse, quote

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event

from ..config import settings
from ..logger.handlers import create_file_handler
from ..logger.formatter import JSONFormatter


# ============================================================================
# Database Pool Logger Setup
# ============================================================================

def _setup_db_pool_logger() -> logging.Logger:
    """
    Setup dedicated logger for database connection pool.
    
    This logger only writes to file (db_pool.log) and does NOT output to console.
    It is completely isolated from the root logger to avoid console output.
    
    Returns:
        Configured logger instance for database pool operations
    """
    logger = logging.getLogger("db_pool")
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    # Determine backend directory path
    # backend/src/common/modules/db/session.py -> backend/
    backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
    log_file = backend_dir / "logs" / "db_pool.log"
    
    # Create formatter and handler
    formatter = JSONFormatter()
    handler_level = logging.DEBUG if settings.DEBUG else logging.INFO
    file_handler = create_file_handler(
        str(log_file),
        formatter,
        handler_level,
        max_bytes=10485760,  # 10MB
        backup_count=5,
    )
    
    logger.addHandler(file_handler)
    logger.propagate = False  # Prevent propagation to root logger
    
    return logger


# Initialize database pool logger
db_pool_logger = _setup_db_pool_logger()


# ============================================================================
# Database URL Encoding
# ============================================================================

def _encode_database_url(url: str) -> str:
    """
    Properly encode special characters in database URL password.
    
    This handles passwords containing special characters like % that need
    to be URL-encoded for SQLAlchemy to parse correctly.
    
    Args:
        url: Database URL string
        
    Returns:
        Encoded database URL string
    """
    parsed = urlparse(url)
    if not parsed.password:
        return url
    
    # URL-encode the password
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


# ============================================================================
# Database Connection Pool Configuration
# ============================================================================

POOL_SIZE = 10
MAX_OVERFLOW = 20
POOL_TIMEOUT = 30
CONNECT_TIMEOUT = 10
COMMAND_TIMEOUT = 30

# Log pool configuration
db_pool_logger.info(
    "Initializing database connection pool",
    extra={
        "pool_size": POOL_SIZE,
        "max_overflow": MAX_OVERFLOW,
        "pool_timeout": POOL_TIMEOUT,
        "connect_timeout": CONNECT_TIMEOUT,
        "command_timeout": COMMAND_TIMEOUT,
    }
)

# Create async engine with properly encoded URL
engine = create_async_engine(
    _encode_database_url(settings.DATABASE_URL),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_timeout=POOL_TIMEOUT,
    connect_args={
        "timeout": CONNECT_TIMEOUT,
        "command_timeout": COMMAND_TIMEOUT,
    },
)


# ============================================================================
# SQL Logging Utilities
# ============================================================================

def _extract_sql_operation_type(statement: str) -> str:
    """
    Extract SQL operation type from statement.
    
    Args:
        statement: SQL statement string
        
    Returns:
        Operation type (SELECT, INSERT, UPDATE, DELETE, etc.)
    """
    sql_upper = statement.strip().upper()
    
    operation_types = [
        "SELECT", "INSERT", "UPDATE", "DELETE",
        "COMMIT", "ROLLBACK", "BEGIN"
    ]
    
    for op_type in operation_types:
        if sql_upper.startswith(op_type):
            return op_type
    
    return "OTHER"


def _normalize_sql_statement(statement: str) -> str:
    """
    Normalize SQL statement for logging.
    
    Args:
        statement: Raw SQL statement
        
    Returns:
        Normalized SQL statement (single line, trimmed)
    """
    return statement.replace("\n", " ").strip()


def _log_sql_execution(
    op_type: str,
    sql_statement: str,
    request_ctx: dict,
    connection_id: int,
    executemany: bool,
    level: str = "DEBUG",
) -> None:
    """
    Log SQL execution using logging service.
    
    Args:
        op_type: SQL operation type
        sql_statement: SQL statement
        request_ctx: Request context dictionary
        connection_id: Database connection ID
        executemany: Whether this is an executemany operation
        level: Log level (DEBUG, INFO, etc.)
    """
    from ..logger import logging_service
    
    user_id = request_ctx.get("user_id")  # Already UUID or None
    
    logging_service.create_log(
        source="backend",
        level=level,
        message=f"SQL {op_type}: {sql_statement}",
        module="db.session",
        function="before_cursor_execute",
        trace_id=request_ctx.get("trace_id"),
        user_id=user_id,
        request_path=request_ctx.get("request_path"),
        request_method=request_ctx.get("request_method"),
        ip_address=request_ctx.get("ip_address"),
        user_agent=request_ctx.get("user_agent"),
        extra_data={
            "db_operation": op_type,
            "connection_id": connection_id,
            "executemany": executemany,
        }
    )


def _log_sql_completion(
    op_type: str,
    rowcount: Optional[int],
    request_ctx: dict,
    connection_id: int,
) -> None:
    """
    Log SQL execution completion.
    
    Args:
        op_type: SQL operation type
        rowcount: Number of rows affected
        request_ctx: Request context dictionary
        connection_id: Database connection ID
    """
    from ..logger import logging_service
    
    logging_service.create_log(
        source="backend",
        level="INFO",
        message=f"SQL {op_type} completed: {rowcount} rows affected",
        module="db.session",
        function="after_cursor_execute",
        trace_id=request_ctx.get("trace_id"),
        user_id=request_ctx.get("user_id"),
        request_path=request_ctx.get("request_path"),
        request_method=request_ctx.get("request_method"),
        ip_address=request_ctx.get("ip_address"),
        user_agent=request_ctx.get("user_agent"),
        extra_data={
            "db_operation": op_type,
            "rows_affected": rowcount,
            "connection_id": connection_id,
        }
    )


# ============================================================================
# SQLAlchemy Event Listeners - Connection Pool
# ============================================================================

@event.listens_for(engine.sync_engine, "connect")
def on_connect(dbapi_conn, connection_record):
    """Log when a new database connection is established."""
    db_pool_logger.debug(
        "New database connection established",
        extra={"connection_id": id(dbapi_conn)}
    )


@event.listens_for(engine.sync_engine, "checkout")
def on_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log when a connection is checked out from the pool."""
    try:
        db_pool_logger.debug(
            "Connection checked out from pool",
            extra={"connection_id": id(dbapi_conn)}
        )
    except Exception:
        # Silently ignore errors to prevent connection invalidation
        pass


@event.listens_for(engine.sync_engine, "checkin")
def on_checkin(dbapi_conn, connection_record):
    """Log when a connection is returned to the pool."""
    try:
        db_pool_logger.debug(
            "Connection returned to pool",
            extra={"connection_id": id(dbapi_conn)}
        )
    except Exception:
        # Silently ignore errors to prevent connection invalidation
        pass


@event.listens_for(engine.sync_engine, "invalidate")
def on_invalidate(dbapi_conn, connection_record, exception):
    """Log when a connection is invalidated."""
    db_pool_logger.warning(
        "Database connection invalidated",
        extra={
            "connection_id": id(dbapi_conn),
            "exception": str(exception) if exception else None,
        },
        exc_info=exception is not None,
    )


@event.listens_for(engine.sync_engine, "soft_invalidate")
def on_soft_invalidate(dbapi_conn, connection_record, exception):
    """Log when a connection is soft invalidated."""
    db_pool_logger.warning(
        "Database connection soft invalidated",
        extra={
            "connection_id": id(dbapi_conn),
            "exception": str(exception) if exception else None,
        },
    )


@event.listens_for(engine.sync_engine, "close")
def on_close(dbapi_conn, connection_record):
    """Log when a connection is closed."""
    db_pool_logger.debug(
        "Database connection closed",
        extra={"connection_id": id(dbapi_conn)}
    )


# ============================================================================
# SQLAlchemy Event Listeners - SQL Execution
# ============================================================================

@event.listens_for(engine.sync_engine, "before_cursor_execute")
def on_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log SQL statement before execution."""
    from ..logger.request import get_request_context
    
    request_ctx = get_request_context()
    op_type = _extract_sql_operation_type(statement)
    sql_statement = _normalize_sql_statement(statement)
    
    _log_sql_execution(
        op_type=op_type,
        sql_statement=sql_statement,
        request_ctx=request_ctx,
        connection_id=id(conn),
        executemany=executemany,
        level="DEBUG",
    )


@event.listens_for(engine.sync_engine, "after_cursor_execute")
def on_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Log after SQL execution with row count."""
    from ..logger.request import get_request_context
    
    request_ctx = get_request_context()
    op_type = _extract_sql_operation_type(statement)
    rowcount = cursor.rowcount if cursor.rowcount >= 0 else None
    
    # Only log INSERT, UPDATE, DELETE operations
    if op_type in ("INSERT", "UPDATE", "DELETE"):
        _log_sql_completion(
            op_type=op_type,
            rowcount=rowcount,
            request_ctx=request_ctx,
            connection_id=id(conn),
        )


# ============================================================================
# Database Session Factory
# ============================================================================

# Log engine creation success
db_pool_logger.info("Database engine created successfully")

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


# ============================================================================
# Database Session Dependency
# ============================================================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get database session.
    
    This function provides a database session that is automatically
    committed on success or rolled back on error.
    
    Yields:
        AsyncSession: Database session
    """
    db_pool_logger.debug("Creating new database session")
    
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
            db_pool_logger.debug("Database session committed successfully")
        except Exception as e:
            # Only rollback for database-related errors
            # Business logic exceptions (AppException) should not trigger rollback
            from sqlalchemy.exc import SQLAlchemyError
            from ..exception.exceptions import AppException
            
            # Check if it's a database error
            if isinstance(e, SQLAlchemyError):
                await session.rollback()
                db_pool_logger.error(
                    "Database session rollback due to database error",
                    extra={
                        "exception_type": type(e).__name__,
                        "exception_message": str(e),
                    },
                    exc_info=True,
                )
            # For business logic exceptions, just log at debug level (no rollback needed)
            elif isinstance(e, AppException):
                db_pool_logger.debug(
                    f"Business logic exception (no rollback needed): {type(e).__name__}",
                    extra={
                        "exception_type": type(e).__name__,
                        "exception_message": str(e),
                        "status_code": e.status_code,
                    },
                )
            # For other unexpected exceptions, rollback to be safe
            else:
                await session.rollback()
                db_pool_logger.error(
                    "Database session rollback due to unexpected error",
                    extra={
                        "exception_type": type(e).__name__,
                        "exception_message": str(e),
                    },
                    exc_info=True,
                )
            raise
        finally:
            db_pool_logger.debug("Database session closed")


# ============================================================================
# Module Exports
# ============================================================================

__all__ = ["engine", "AsyncSessionLocal", "Base", "get_db", "db_pool_logger"]
