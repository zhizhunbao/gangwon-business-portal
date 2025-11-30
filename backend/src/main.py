"""
FastAPI application entry point.

This is the main application file that initializes FastAPI,
configures middleware, and registers routes.
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlalchemy.exc import SQLAlchemyError

from .common.modules.config import settings
from .common.modules.exception import (
    app_exception_handler,
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
    
    await handle_startup_logging()
    
    yield
    
    # Shutdown
    logger.info("Shutting down application")


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
    from .common.modules.exception.responses import get_trace_id
    from .common.modules.logger import logging_service
    from .common.modules.db.session import AsyncSessionLocal

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

    start_time = time.time()
    response = await call_next(request)
    process_time_ms = (time.time() - start_time) * 1000

    # Get request information
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    # Try to get user_id from request state (if authenticated)
    user_id = getattr(request.state, "user_id", None)

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

    # Business log recording (file + database) - async, non-blocking
    if should_log:
        try:
            async with AsyncSessionLocal() as db:
                await logging_service.create_log(
                    db=db,
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
                await db.commit()
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
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Register routers
from .modules.user.router import router as auth_router
from .modules.member.router import router as member_router
from .modules.performance.router import router as performance_router
from .modules.project.router import router as project_router
from .modules.content.router import router as content_router
from .modules.support.router import router as support_router
from .modules.upload.router import router as upload_router
from .common.modules.audit.router import router as audit_router
from .common.modules.logger import logging_router
from .common.modules.exception import exception_router

app.include_router(auth_router)
app.include_router(member_router)
app.include_router(performance_router)
app.include_router(project_router)
app.include_router(content_router)
app.include_router(support_router)
app.include_router(upload_router)
app.include_router(audit_router)
app.include_router(logging_router)
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
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )

