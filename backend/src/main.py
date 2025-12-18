"""
FastAPI application entry point.

This is the main application file that initializes FastAPI,
configures middleware, and registers routes.
"""

import logging
import time
from typing import Optional

from fastapi import FastAPI, Request


def get_client_ip(request: Request) -> Optional[str]:
    """
    Get real client IP address from request.
    
    Checks proxy headers (X-Forwarded-For, X-Real-IP) first,
    then falls back to direct client host.
    Normalizes IPv6 localhost (::1) to IPv4 (127.0.0.1).
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Client IP address string or None
    """
    ip_address = None
    
    # Check X-Forwarded-For header (common for reverse proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain (original client)
        ip_address = forwarded_for.split(",")[0].strip()
    
    # Check X-Real-IP header (used by some proxies like nginx)
    if not ip_address:
        ip_address = request.headers.get("X-Real-IP")
    
    # Fall back to direct client host
    if not ip_address and request.client:
        ip_address = request.client.host
    
    # Normalize IPv6 localhost to IPv4
    if ip_address == "::1":
        ip_address = "127.0.0.1"
    
    return ip_address
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlalchemy.exc import SQLAlchemyError

from .common.modules.config import settings
from fastapi.exceptions import HTTPException
from .common.modules.exception import (
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler,
    AppException,
)

# Create main module logger (different from logger module's logger)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: handle log cleanup and logging
    from .common.modules.logger.startup import handle_startup_logging
    from .common.modules.logger.db_writer import db_log_writer
    from .common.modules.logger.file_writer import file_log_writer
    
    await handle_startup_logging()
    
    yield
    
    # Shutdown: gracefully close log writers
    logger.info("Shutting down application")
    try:
        # Close database log writer (flush remaining logs)
        await db_log_writer.close(timeout=10.0)
        logger.info("Database log writer closed")
    except Exception as e:
        logger.warning(f"Error closing database log writer: {e}")
    
    try:
        # Close file log writer (flush remaining logs)
        file_log_writer.close(timeout=10.0)
        logger.info("File log writer closed")
    except Exception as e:
        logger.warning(f"Error closing file log writer: {e}")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Gangwon Business Portal API",
    lifespan=lifespan,
)


@app.middleware("http")
async def log_http_requests(request: Request, call_next):
    """
    HTTP request/response logging middleware with trace ID.

    Logs method, path, status code and duration for every request.
    Also generates a trace_id for error tracking.
    Records logs to both console and business log system (file + database).
    """
    from .common.modules.logger.request import get_trace_id, set_request_context
    from .common.modules.logger import logging_service

    # Skip logging for health check endpoints, static files, and logging/exception endpoints
    # to avoid infinite recursion (logging the logging API itself)
    skip_paths = [
        "/healthz", 
        "/readyz", 
        "/docs", 
        "/openapi.json", 
        "/redoc", 
        "/favicon.ico",
        "/api/v1/logging",  # Skip all logging endpoints to avoid recursion
        "/api/v1/exceptions",  # Skip all exception endpoints to avoid recursion
    ]
    should_log = not any(request.url.path.startswith(path) for path in skip_paths)

    # Generate trace_id for this request
    trace_id = get_trace_id(request)

    # Get real client IP address (considering reverse proxy headers)
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("user-agent")
    
    # Try to get user_id from request state (if authenticated)
    user_id = getattr(request.state, "user_id", None)
    
    # Set request context for SQL logging and other async operations
    # This allows SQL logs to include trace_id, user_id, request_path, etc.
    # user_id is stored as-is (UUID or None), no need to convert to string
    set_request_context(
        trace_id=trace_id,
        user_id=user_id,  # Keep as UUID, no string conversion needed
        request_path=request.url.path,
        request_method=request.method,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    start_time = time.time()
    response = await call_next(request)
    process_time_ms = (time.time() - start_time) * 1000

    # Determine log level based on status code
    if response.status_code >= 500:
        log_level = "ERROR"
    elif response.status_code >= 400:
        log_level = "WARNING"
    else:
        log_level = "INFO"

    # Console logging (always)
    logger.info(
        f"{request.method} {request.url.path} "
        f"-> {response.status_code} ({process_time_ms:.2f} ms)",
        extra={
            "trace_id": trace_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": process_time_ms,
        },
    )

    # Business log recording (file only) - non-blocking
    if should_log:
        try:
            logging_service.create_log(
                source="backend",
                level=log_level,
                message=f"{request.method} {request.url.path} -> {response.status_code}",
                module=logger.name,
                function="log_http_requests",
                trace_id=trace_id,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=request.method,
                request_path=request.url.path,
                response_status=response.status_code,
                duration_ms=int(process_time_ms),
            )
        except Exception as e:
            # Don't fail the request if logging fails
            logger.warning(f"Failed to record business log: {str(e)}")

    # Add trace_id to response headers for debugging
    if settings.DEBUG:
        response.headers["X-Trace-Id"] = trace_id

    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
# Order matters: more specific handlers should be registered first
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
# General exception handler should be last (catches all remaining exceptions)
app.add_exception_handler(Exception, general_exception_handler)

# Register routers
from .modules.user.router import router as auth_router
from .modules.member.router import router as member_router
from .modules.performance.router import router as performance_router
from .modules.project.router import router as project_router
from .modules.content.router import router as content_router
from .modules.support.router import router as support_router
from .modules.upload.router import router as upload_router
from .modules.dashboard.router import router as dashboard_router
from .modules.messages.router import router as messages_router
from .common.modules.audit.router import router as audit_router
from .common.modules.logger import get_logging_router
from .common.modules.exception import exception_router

app.include_router(auth_router)
app.include_router(member_router)
app.include_router(performance_router)
app.include_router(project_router)
app.include_router(content_router)
app.include_router(support_router)
app.include_router(upload_router)
app.include_router(dashboard_router)
app.include_router(messages_router)
app.include_router(audit_router)
app.include_router(get_logging_router())
app.include_router(exception_router)


# Health check endpoints
@app.get("/healthz")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/readyz")
async def readiness_check():
    """Readiness check endpoint."""
    from sqlalchemy import text
    from .common.modules.db.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {"status": "not ready", "error": str(e)}, 503


@app.get("/db-status")
async def database_status():
    """Database connection status endpoint."""
    from sqlalchemy import text
    from .common.modules.db.session import AsyncSessionLocal
    
    try:
        # Test connection
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        
        return {
            "timestamp": time.time(),
            "status": "healthy"
        }
    except Exception as e:
        logger.error(f"Database status check failed: {str(e)}")
        return {
            "timestamp": time.time(),
            "status": "unhealthy",
            "error": str(e),
            "error_type": type(e).__name__
        }, 500


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


if __name__ == "__main__":
    import os
    import uvicorn

    # 支持 Render 等平台的 PORT 环境变量
    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=port,
        # reload=settings.DEBUG,  # 注释掉热部署，避免测试时服务器重启导致连接断开
        reload=False,
    )

