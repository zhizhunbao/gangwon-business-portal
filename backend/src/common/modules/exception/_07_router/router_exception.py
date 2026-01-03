"""Exception router.

API endpoint for frontend to report exceptions.
"""
from fastapi import APIRouter, Request

from .._04_services import ExceptionService
from .._05_dtos import (
    FrontendExceptionCreate,
    FrontendExceptionBatch,
    FrontendExceptionBatchResponse,
)

router = APIRouter(tags=["exceptions"])
exception_service = ExceptionService()


@router.post("/api/v1/exceptions/frontend", response_model=FrontendExceptionBatchResponse)
async def create_frontend_exception(
    request: Request,
    batch_data: FrontendExceptionBatch,
):
    """Create frontend application exception entries (batch processing)."""
    return await _handle_frontend_exception_batch(request, batch_data)


@router.post("/api/exceptions", response_model=FrontendExceptionBatchResponse)
async def create_frontend_exception_legacy(
    request: Request,
    batch_data: FrontendExceptionBatch,
):
    """Legacy endpoint for frontend exception reporting."""
    return await _handle_frontend_exception_batch(request, batch_data)


async def _handle_frontend_exception_batch(
    request: Request, 
    batch_data: FrontendExceptionBatch
) -> FrontendExceptionBatchResponse:
    """Handle frontend exception batch reporting."""
    processed = 0
    failed = 0
    errors = []
    
    exceptions = batch_data.get_exceptions()
    
    for exception_item in exceptions:
        try:
            converted_exception = _convert_frontend_exception(exception_item)
            await _handle_frontend_exception(request, converted_exception)
            processed += 1
        except Exception as e:
            failed += 1
            error_msg = f"Failed to process exception {exception_item.get('id', 'unknown')}: {str(e)}"
            errors.append(error_msg)
            import logging
            logging.warning(f"Exception batch processing error: {error_msg}")
    
    return FrontendExceptionBatchResponse(
        status="completed" if failed == 0 else "partial",
        processed=processed,
        failed=failed,
        errors=errors if errors else None
    )


def _convert_frontend_exception(frontend_exception: dict) -> FrontendExceptionCreate:
    """Convert frontend exception format to backend expected format."""
    error = frontend_exception.get('error', {})
    context = frontend_exception.get('context', {})
    
    exception_type = error.get('name', 'UnknownError')
    exception_message = error.get('message', 'Unknown error')
    stack_trace = error.get('stack')
    
    user_agent = context.get('userAgent')
    api_info = context.get('api', {})
    request_method = api_info.get('method')
    request_path = api_info.get('url') or context.get('url')
    trace_id = context.get('trace_id') or api_info.get('trace_id')
    
    exception_details = {
        'frontend_id': frontend_exception.get('id'),
        'timestamp': frontend_exception.get('timestamp'),
        'classification': frontend_exception.get('classification'),
        'source': frontend_exception.get('source', 'frontend'),
        'page_url': context.get('url'),
    }
    
    request_id = context.get('request_id') or api_info.get('request_id')
    if request_id:
        exception_details['request_id'] = request_id
    
    response_info = context.get('response', {})
    if response_info:
        exception_details['api_response'] = response_info
    
    context_data = {
        k: v for k, v in context.items() 
        if k not in ['userAgent', 'url', 'api', 'response', 'trace_id', 'request_id']
    }
    
    return FrontendExceptionCreate(
        exception_type=exception_type,
        exception_message=exception_message,
        stack_trace=stack_trace,
        trace_id=trace_id,
        user_agent=user_agent,
        request_method=request_method,
        request_path=request_path,
        exception_details=exception_details,
        context_data=context_data
    )


async def _handle_frontend_exception(
    request: Request, 
    exception_data: FrontendExceptionCreate
):
    """Handle frontend exception reporting with unified logic."""
    from uuid import UUID
    
    try:
        user_id = None
        if exception_data.user_id:
            try:
                user_id = UUID(exception_data.user_id)
            except (ValueError, TypeError):
                pass
        
        ip_address = exception_data.ip_address
        if ip_address is None:
            ip_address = request.client.host if request.client else None
        
        user_agent = exception_data.user_agent
        if not user_agent:
            user_agent = request.headers.get("user-agent")
        
        request_method = exception_data.request_method
        if not request_method:
            request_method = request.method
        
        request_path = exception_data.request_path
        if not request_path:
            request_path = request.url.path
        
        trace_id = exception_data.trace_id
        if not trace_id:
            trace_id = request.headers.get("X-Trace-ID")
        
        request_id = None
        if exception_data.exception_details:
            request_id = exception_data.exception_details.get('request_id')
        if not request_id:
            request_id = request.headers.get("X-Request-ID")
        
        await exception_service.create_exception(
            source="frontend",
            exception_type=exception_data.exception_type,
            exception_message=exception_data.exception_message,
            error_code=exception_data.error_code,
            status_code=exception_data.status_code,
            trace_id=trace_id,
            request_id=request_id,
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
        import logging
        logging.error(f"Failed to process frontend exception: {processing_error}", exc_info=True)
        return {
            "status": "accepted", 
            "message": "Exception received but processing encountered issues",
            "error": str(processing_error)
        }
