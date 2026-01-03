"""
Error Interceptor - 异常拦截中间件

职责：拦截并处理异常
- 捕获所有未处理异常
- 标准化错误响应格式
- 记录异常到日志系统
- 添加 trace_id 到响应头
"""
import logging
import time
from typing import Callable, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> Optional[str]:
    """获取客户端真实 IP"""
    ip = request.headers.get("X-Forwarded-For")
    if ip:
        return ip.split(",")[0].strip()

    ip = request.headers.get("X-Real-IP")
    if ip:
        return ip

    if request.client:
        ip = request.client.host
        return "127.0.0.1" if ip == "::1" else ip

    return None


class ExceptionMiddleware(BaseHTTPMiddleware):
    """
    异常拦截中间件

    - 捕获所有未处理异常
    - 标准化错误响应格式
    - 记录异常到日志系统
    - 添加 trace_id 到响应头
    """

    def __init__(self, app: ASGIApp, debug: bool = False):
        super().__init__(app)
        self.debug = debug

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        from ..logger.request import get_trace_id, get_request_id, generate_request_id
        from ..exception import exception_service, DExceptionContext, AbstractCustomException

        start_time = time.time()
        trace_id = get_trace_id(request)
        request_id = get_request_id(request) or generate_request_id(trace_id)
        request.state.request_id = request_id

        try:
            response = await call_next(request)

            if hasattr(response, "headers"):
                response.headers["X-Trace-Id"] = str(trace_id) if trace_id else ""
                response.headers["X-Request-Id"] = request_id or ""

            return response

        except Exception as exc:
            duration = time.time() - start_time

            context = DExceptionContext(
                trace_id=trace_id,
                request_id=request_id,
                user_id=getattr(request.state, "user_id", None),
                additional_data={
                    "url": str(request.url),
                    "method": request.method,
                    "path": request.url.path,
                    "client_ip": get_client_ip(request),
                    "duration_seconds": duration,
                },
            )

            try:
                await exception_service.record_exception(exc, context, source="backend")
            except Exception as log_exc:
                logger.error(f"Failed to record exception: {log_exc}", exc_info=True)

            if isinstance(exc, AbstractCustomException):
                classified_exc = exc
            else:
                classified_exc = exception_service.classify_exception(exc)

            error_response = {
                "error": classified_exc.to_dict(),
                "trace_id": str(trace_id) if trace_id else None,
                "request_id": request_id,
            }

            if self.debug and classified_exc.http_status_code >= 500:
                error_response["debug"] = {
                    "exception_type": type(exc).__name__,
                    "method": request.method,
                    "path": request.url.path,
                }

            response = JSONResponse(
                status_code=classified_exc.http_status_code, content=error_response
            )
            response.headers["X-Trace-Id"] = str(trace_id) if trace_id else ""
            response.headers["X-Request-Id"] = request_id or ""
            response.headers["Access-Control-Expose-Headers"] = "X-Trace-Id, X-Request-Id"

            return response


def add_exception_middleware(app, debug: bool = False):
    """添加异常中间件"""
    app.add_middleware(ExceptionMiddleware, debug=debug)


__all__ = [
    "ExceptionMiddleware",
    "add_exception_middleware",
    "get_client_ip",
]
