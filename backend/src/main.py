"""
FastAPI application entry point.

This is the main application file that initializes FastAPI,
configures middleware, and registers routes.
"""

import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .common.modules.config import settings
from .common.modules.exception import register_exception_handlers
from .common.modules.interceptor import setup_interceptors

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

# =============================================================================
# 拦截器配置（AOP）
# =============================================================================
# 一站式配置所有拦截器：
# - Router 层：ExceptionMiddleware + HTTPLoggingMiddleware
# - Service 层：自动扫描并拦截所有 *Service 类
# - Database 层：通过 UnifiedSupabaseClient 自动拦截
setup_interceptors(app, debug=settings.DEBUG)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
# This registers all exception handlers for comprehensive error handling:
# - Custom exception handlers for BaseCustomException types
# - Validation exception handlers for FastAPI/Pydantic validation errors
# - HTTP exception handlers for standard HTTP errors
# - Database exception handlers for database-related errors
# - Global catch-all handler for any unhandled exceptions
# Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3, 9.4, 9.5
register_exception_handlers(app)

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
from .modules.statistics.router import router as statistics_router
from .common.modules.audit.router import router as audit_router
from .common.modules.exception._07_router import router as exception_router
from .common.modules.logger import get_logging_router
from .common.modules.health import router as health_router

app.include_router(auth_router)
app.include_router(member_router)
app.include_router(performance_router)
app.include_router(project_router)
app.include_router(content_router)
app.include_router(support_router)
app.include_router(upload_router)
app.include_router(dashboard_router)
app.include_router(messages_router)
app.include_router(statistics_router)
app.include_router(audit_router)
app.include_router(exception_router)
app.include_router(get_logging_router())
app.include_router(health_router)


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
        reload=settings.DEBUG,  # 开发环境启用热部署
        # 禁用 uvicorn 默认日志配置，使用我们自己的配置
        log_config=None,
    )

