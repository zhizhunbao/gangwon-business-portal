"""
FastAPI application entry point.

This is the main application file that initializes FastAPI,
configures middleware, and registers routes.
"""
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from sqlalchemy.exc import SQLAlchemyError

from .common.modules.config import settings
from .common.modules.logger import logger
from .common.modules.exception import (
    app_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    general_exception_handler,
    AppException,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
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
    """
    from .common.modules.exception.responses import get_trace_id

    # Generate trace_id for this request
    trace_id = get_trace_id(request)

    start_time = time.time()
    response = await call_next(request)
    process_time_ms = (time.time() - start_time) * 1000

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

app.include_router(auth_router)
app.include_router(member_router)
app.include_router(performance_router)
app.include_router(project_router)
app.include_router(content_router)
app.include_router(support_router)
app.include_router(upload_router)


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

