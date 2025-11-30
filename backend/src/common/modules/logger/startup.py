"""
Startup tasks for logging module.

This module handles log cleanup and initialization tasks when the application starts.
"""
import logging
from sqlalchemy import delete

from ..config import settings
from ..db.session import AsyncSessionLocal
from ..db.models import ApplicationLog, ApplicationException
from .file_writer import file_log_writer
from .service import LoggingService

logger = logging.getLogger(__name__)


async def clear_logs_on_startup() -> tuple[list[str], int, int]:
    """
    Clear log files and database records on startup.
    
    Returns:
        Tuple of (cleared_file_names, logs_count, exceptions_count)
    """
    # Clear all log files (including exception logs)
    log_files = [
        ("backend_logs.log", file_log_writer.backend_logs_file),
        ("frontend_logs.log", file_log_writer.frontend_logs_file),
        ("backend_exceptions.log", file_log_writer.backend_exceptions_file),
        ("frontend_exceptions.log", file_log_writer.frontend_exceptions_file),
    ]
    
    cleared_files = []
    for log_name, log_file in log_files:
        if log_file.exists():
            log_file.write_text("")  # Clear file content
            cleared_files.append(log_name)
    
    # Clear database records (application logs and exceptions)
    logs_count = 0
    exceptions_count = 0
    async with AsyncSessionLocal() as db:
        # Delete all application logs
        logs_deleted = await db.execute(delete(ApplicationLog))
        logs_count = logs_deleted.rowcount
        # Delete all application exceptions
        exceptions_deleted = await db.execute(delete(ApplicationException))
        exceptions_count = exceptions_deleted.rowcount
        await db.commit()
    
    return cleared_files, logs_count, exceptions_count


async def write_startup_logs(
    startup_message: str,
    debug_mode_message: str,
    log_clear_message: str | None = None,
    db_clear_message: str | None = None,
) -> None:
    """
    Write startup logs to both file and database.
    
    Args:
        startup_message: Application startup message
        debug_mode_message: Debug mode status message
        log_clear_message: Optional log cleanup message
        db_clear_message: Optional database cleanup message
    """
    logging_service = LoggingService()
    
    async with AsyncSessionLocal() as db:
        # Write startup messages (from main.py lifespan)
        await logging_service.create_log(
            db=db,
            source="backend",
            level="INFO",
            message=startup_message,
            module="src.main",
            function="lifespan",
            line_number=30,
        )
        await logging_service.create_log(
            db=db,
            source="backend",
            level="INFO",
            message=debug_mode_message,
            module="src.main",
            function="lifespan",
            line_number=31,
        )
        
        # Write cleanup messages (from logger.startup module)
        if log_clear_message:
            await logging_service.create_log(
                db=db,
                source="backend",
                level="INFO",
                message=log_clear_message,
                module=__name__,
                function="write_startup_logs",
                line_number=96,
            )
        if db_clear_message:
            await logging_service.create_log(
                db=db,
                source="backend",
                level="INFO",
                message=db_clear_message,
                module=__name__,
                function="write_startup_logs",
                line_number=107,
            )


async def handle_startup_logging() -> None:
    """
    Handle all startup logging tasks including cleanup and logging startup messages.
    
    This function:
    1. Clears log files and database records if LOG_CLEAR_ON_STARTUP is enabled
    2. Writes startup messages to both log files and database
    """
    startup_message = f"Starting {settings.APP_NAME} v{settings.APP_VERSION}"
    debug_mode_message = f"Debug mode: {settings.DEBUG}"
    
    # Log to console immediately
    logger.info(startup_message)
    logger.info(debug_mode_message)
    
    should_clear_logs = settings.LOG_CLEAR_ON_STARTUP
    
    if should_clear_logs:
        try:
            # Clear logs and database records
            cleared_files, logs_count, exceptions_count = await clear_logs_on_startup()
            
            # Generate cleanup messages
            if cleared_files:
                log_clear_message = f"Cleared log files on startup: {', '.join(cleared_files)}"
            else:
                log_clear_message = "No log files found to clear"
            
            db_clear_message = (
                f"Cleared database records on startup: "
                f"{logs_count} application logs, "
                f"{exceptions_count} application exceptions"
            )
            
            # Log to console
            logger.info(log_clear_message)
            logger.info(db_clear_message)
            
            # Write startup logs to both file and database after clearing
            await write_startup_logs(
                startup_message=startup_message,
                debug_mode_message=debug_mode_message,
                log_clear_message=log_clear_message,
                db_clear_message=db_clear_message,
            )
        except Exception as e:
            logger.warning(f"Failed to clear logs on startup: {str(e)}")
            # Still try to write startup messages even if cleanup failed
            try:
                await write_startup_logs(
                    startup_message=startup_message,
                    debug_mode_message=debug_mode_message,
                )
            except Exception as log_error:
                logger.warning(f"Failed to write startup logs: {str(log_error)}")
    else:
        # Even if not clearing logs, write startup messages to both file and database
        try:
            await write_startup_logs(
                startup_message=startup_message,
                debug_mode_message=debug_mode_message,
            )
        except Exception as e:
            logger.warning(f"Failed to write startup logs to file/database: {str(e)}")

