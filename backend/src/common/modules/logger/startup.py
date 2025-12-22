"""
Startup tasks for logging module.

This module handles log cleanup and initialization tasks when the application starts.
"""
import logging
from ..config import settings
from .file_writer import file_log_writer
from .service import LoggingService
from .schemas import AppLogCreate

logger = logging.getLogger(__name__)


async def clear_logs_on_startup() -> tuple[list[str], int, int]:
    """
    Clear log files on startup.
    
    Returns:
        Tuple of (cleared_file_names, logs_count, exceptions_count)
        Note: logs_count and exceptions_count are always 0 now (no database clearing)
    """
    from pathlib import Path
    
    # Determine backend directory path
    backend_dir = Path(__file__).resolve().parent.parent.parent.parent.parent
    logs_dir = backend_dir / "logs"
    
    # Clear all log files (using actual file paths from file_log_writer)
    log_files = [
        ("system.log", logs_dir / "system.log"),  # Python standard logging
        ("app.log", file_log_writer.application_logs_file),  # Application business logs
        ("error.log", file_log_writer.application_exceptions_file),  # Application exceptions
        ("audit.log", file_log_writer.audit_logs_file),  # Audit logs
        ("performance.log", file_log_writer.performance_logs_file),  # Performance logs - 添加性能日志清理
    ]
    
    cleared_files = []
    for log_name, log_file in log_files:
        if log_file.exists():
            log_file.write_text("")  # Clear file content
            cleared_files.append(log_name)
    
    # Database clearing is no longer performed
    logs_count = 0
    exceptions_count = 0
    
    return cleared_files, logs_count, exceptions_count


async def write_startup_logs(
    startup_message: str,
    debug_mode_message: str,
    log_clear_message: str | None = None,
    db_clear_message: str | None = None,
) -> None:
    """
    Write startup logs to file.
    
    Args:
        startup_message: Application startup message
        debug_mode_message: Debug mode status message
        log_clear_message: Optional log cleanup message
        db_clear_message: Optional database cleanup message
    """
    logging_service = LoggingService()
    
    # Write startup messages (from main.py lifespan)
    await logging_service.log(AppLogCreate(
        source="backend",
        level="INFO",
        message=startup_message,
        module="src.main",
        function="lifespan",
        line_number=30,
    ))
    await logging_service.log(AppLogCreate(
        source="backend",
        level="INFO",
        message=debug_mode_message,
        module="src.main",
        function="lifespan",
        line_number=31,
    ))
    
    # Write cleanup messages (from logger.startup module)
    if log_clear_message:
        await logging_service.log(AppLogCreate(
            source="backend",
            level="INFO",
            message=log_clear_message,
            module=__name__,
            function="write_startup_logs",
            line_number=96,
        ))
    if db_clear_message:
        await logging_service.log(AppLogCreate(
            source="backend",
            level="INFO",
            message=db_clear_message,
            module=__name__,
            function="write_startup_logs",
            line_number=107,
        ))


async def handle_startup_logging() -> None:
    """
    Handle all startup logging tasks including cleanup and logging startup messages.
    
    This function:
    1. Clears log files and database records if LOG_CLEAR_ON_STARTUP is enabled
    2. Writes startup messages to both log files and database
    """
    startup_message = f"Starting {settings.APP_NAME} v{settings.APP_VERSION}"
    debug_mode_message = f"Debug mode: {settings.DEBUG}"
    
    # Logs are written to files only (no console output)
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
            
            # Write startup logs to file after clearing
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
        # Even if not clearing logs, write startup messages to file
        try:
            await write_startup_logs(
                startup_message=startup_message,
                debug_mode_message=debug_mode_message,
            )
        except Exception as e:
            logger.warning(f"Failed to write startup logs to file: {str(e)}")

