"""
Application exception router.

API endpoint for frontend to report exceptions.
Provides unified v1 API format consistent with logging endpoints.
"""
from fastapi import APIRouter, Request

from .service import ExceptionService
from .schemas import FrontendExceptionCreate, FrontendExceptionBatch, FrontendExceptionBatchResponse

router = APIRouter()
exception_service = ExceptionService()


@router.post("/api/v1/exceptions/frontend", response_model=FrontendExceptionBatchResponse)
async def create_frontend_exception(
    request: Request,
    batch_data: FrontendExceptionBatch,
):
    """
    Create frontend application exception entries (batch processing).
    
    This endpoint handles batch exception reporting from frontend.
    Processes each exception in the batch and returns processing results.
    No authentication required for this endpoint (but should be rate-limited in production).
    
    Unified v1 format consistent with /api/v1/logging/frontend/logs
    """
    return await _handle_frontend_exception_batch(request, batch_data)


@router.post("/api/exceptions", response_model=FrontendExceptionBatchResponse)
async def create_frontend_exception_legacy(
    request: Request,
    batch_data: FrontendExceptionBatch,
):
    """
    Legacy endpoint for frontend exception reporting.
    
    This is a compatibility endpoint that forwards to the main exception handler.
    Maintained for backward compatibility with existing frontend code.
    
    Frontend should migrate to /api/v1/exceptions/frontend for consistency.
    """
    return await _handle_frontend_exception_batch(request, batch_data)


async def _handle_frontend_exception_batch(request: Request, batch_data: FrontendExceptionBatch) -> FrontendExceptionBatchResponse:
    """
    Handle frontend exception batch reporting.
    
    Processes each exception in the batch and converts frontend format to backend format.
    """
    processed = 0
    failed = 0
    errors = []
    
    for exception_item in batch_data.exceptions:
        try:
            # Convert frontend exception format to backend format
            converted_exception = _convert_frontend_exception(exception_item)
            
            # Process the converted exception
            await _handle_frontend_exception(request, converted_exception)
            processed += 1
            
        except Exception as e:
            failed += 1
            error_msg = f"Failed to process exception {exception_item.get('id', 'unknown')}: {str(e)}"
            errors.append(error_msg)
            
            # Log the processing error but don't let it stop the batch
            import logging
            logging.warning(f"Exception batch processing error: {error_msg}")
    
    return FrontendExceptionBatchResponse(
        status="completed" if failed == 0 else "partial",
        processed=processed,
        failed=failed,
        errors=errors if errors else None
    )


def _convert_frontend_exception(frontend_exception: dict) -> FrontendExceptionCreate:
    """
    Convert frontend exception format to backend expected format.
    
    Frontend sends: { error: {name, message, stack}, context: {...}, ... }
    Backend expects: { exception_type, exception_message, stack_trace, ... }
    """
    error = frontend_exception.get('error', {})
    context = frontend_exception.get('context', {})
    
    # Extract basic exception info
    exception_type = error.get('name', 'UnknownError')
    exception_message = error.get('message', 'Unknown error')
    stack_trace = error.get('stack')
    
    # Extract context information
    user_agent = context.get('userAgent')
    request_path = context.get('url')
    
    # Build exception details from context
    exception_details = {
        'frontend_id': frontend_exception.get('id'),
        'timestamp': frontend_exception.get('timestamp'),
        'classification': frontend_exception.get('classification'),
        'source': frontend_exception.get('source', 'frontend')
    }
    
    # Build context data (remove redundant fields)
    context_data = {k: v for k, v in context.items() if k not in ['userAgent', 'url']}
    
    return FrontendExceptionCreate(
        exception_type=exception_type,
        exception_message=exception_message,
        stack_trace=stack_trace,
        user_agent=user_agent,
        request_path=request_path,
        exception_details=exception_details,
        context_data=context_data
    )


async def _handle_frontend_exception(request: Request, exception_data: FrontendExceptionCreate):
    """
    Handle frontend exception reporting with unified logic.
    
    This function processes frontend exceptions and ensures all required context
    is captured, with fallbacks for missing information.
    """
    from uuid import UUID
    
    try:
        # Convert user_id from string to UUID if provided
        user_id = None
        if exception_data.user_id:
            try:
                user_id = UUID(exception_data.user_id)
            except (ValueError, TypeError):
                # Invalid UUID format, ignore user_id
                pass
        
        # Frontend should provide these fields, but we auto-extract as fallback if missing
        # This ensures we always have request context even if frontend doesn't send it
        # Priority: frontend provided value > auto-extracted value
        ip_address = exception_data.ip_address
        if ip_address is None:
            # Frontend cannot get real IP, so we extract it from request
            ip_address = request.client.host if request.client else None
        
        user_agent = exception_data.user_agent
        if not user_agent:
            # Fallback to request header if frontend didn't provide
            user_agent = request.headers.get("user-agent")
        
        request_method = exception_data.request_method
        if not request_method:
            # Fallback to request method if frontend didn't provide
            request_method = request.method
        
        request_path = exception_data.request_path
        if not request_path:
            # Fallback to request path if frontend didn't provide
            request_path = request.url.path
        
        # Get trace_id from request header if frontend didn't provide
        trace_id = exception_data.trace_id
        if not trace_id:
            trace_id = request.headers.get("X-Trace-ID")
        
        # Force source to be frontend for both endpoints
        await exception_service.create_exception(
            source="frontend",  # Always frontend for this endpoint
            exception_type=exception_data.exception_type,
            exception_message=exception_data.exception_message,
            error_code=exception_data.error_code,
            status_code=exception_data.status_code,
            trace_id=trace_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            request_data=exception_data.request_data,
            stack_trace=exception_data.stack_trace,
            exception_details=exception_data.exception_details,
            context_data=exception_data.context_data,
        )
        
        return {"status": "ok"}
        
    except Exception as processing_error:
        # If exception processing fails, log it but don't let it bubble up
        # to avoid duplicate logging by the exception middleware
        import logging
        logging.error(f"Failed to process frontend exception: {processing_error}", exc_info=True)
        
        # Return success to prevent frontend retry, but indicate processing issue
        return {
            "status": "accepted", 
            "message": "Exception received but processing encountered issues",
            "error": str(processing_error)
        }