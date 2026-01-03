"""
Router Interceptor - HTTP 请求/响应日志中间件

职责：记录 Router 层日志
- 请求/响应日志
- 性能监控（慢请求警告）
"""
import logging
import time
from typing import Callable, Optional
from uuid import UUID

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .error import get_client_ip

logger = logging.getLogger(__name__)

# 默认配置
SLOW_REQUEST_THRESHOLD_MS = 1000
SKIP_PATHS = [
    "/healthz",
    "/readyz",
    "/api/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/favicon.ico",
    "/api/v1/logging",
    "/api/v1/exceptions",
]


def should_skip_logging(path: str) -> bool:
    """检查是否跳过日志记录"""
    return any(path.startswith(p) for p in SKIP_PATHS)


def determine_log_level(status_code: int, duration_ms: float) -> str:
    """根据状态码和耗时确定日志级别"""
    if status_code >= 500:
        return "ERROR"
    if status_code >= 400:
        return "WARNING"
    if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
        return "WARNING"
    return "INFO"


def extract_user_id_from_token(request: Request) -> Optional[str]:
    """从 Authorization header 中提取 user_id（不验证用户是否存在）"""
    try:
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header[7:]  # Remove "Bearer " prefix
        if not token:
            return None
        
        from jose import jwt
        from ..config import settings
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        return user_id
    except Exception:
        # Token invalid or expired - return None silently
        return None


class HTTPLoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTP 日志中间件

    - 记录请求方法、路径、IP
    - 记录响应状态码和耗时
    - 慢请求 WARNING 级别日志
    - 自动生成/传递 trace_id
    """

    def __init__(self, app: ASGIApp, debug: bool = False):
        super().__init__(app)
        self.debug = debug

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        from ..logger import logging_service
        from ..logger.request import set_request_context, get_trace_id, get_request_id
        from ..logger.schemas import AppLogCreate, PerformanceLogCreate

        trace_id = get_trace_id(request)
        request_id = get_request_id(request, trace_id)

        request.state.trace_id = trace_id
        request.state.request_id = request_id

        ip_address = get_client_ip(request)
        user_agent = request.headers.get("user-agent")

        set_request_context(
            trace_id=trace_id,
            request_id=request_id,
            user_id=None,  # 此时认证还未完成，user_id 在请求处理后获取
            request_path=request.url.path,
            request_method=request.method,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # 尝试在请求处理前提取 user_id，用于异常处理时记录
        # 这样即使请求处理过程中发生异常，也能记录 user_id
        pre_user_id_str = extract_user_id_from_token(request)
        if pre_user_id_str:
            try:
                request.state.user_id = UUID(pre_user_id_str)
            except (ValueError, TypeError):
                request.state.user_id = None
        else:
            request.state.user_id = None

        start_time = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000

        # 从 token 中提取 user_id（在请求处理后，确保 token 已被验证）
        user_id_str = extract_user_id_from_token(request)
        user_id = UUID(user_id_str) if user_id_str else None
        
        # 更新 request.state.user_id（可能在请求处理过程中被更新）
        if user_id:
            request.state.user_id = user_id

        log_level = determine_log_level(response.status_code, duration_ms)
        is_slow = duration_ms > SLOW_REQUEST_THRESHOLD_MS

        log_message = f"HTTP: {request.method} {request.url.path} -> {response.status_code}"

        if not should_skip_logging(request.url.path):
            try:
                await logging_service.log(
                    AppLogCreate(
                        source="backend",
                        level=log_level,
                        message=log_message,
                        layer="Router",
                        module="common.modules.interceptor",
                        function="dispatch",
                        line_number=100,
                        file_path="src/common/modules/interceptor/router.py",
                        trace_id=trace_id,
                        request_id=request_id,
                        user_id=user_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        request_method=request.method,
                        request_path=request.url.path,
                        response_status=response.status_code,
                        duration_ms=int(duration_ms),
                    )
                )

                if is_slow:
                    await logging_service.performance(
                        PerformanceLogCreate(
                            source="backend",
                            metric_name="slow_api_response",
                            metric_value=duration_ms,
                            metric_unit="ms",
                            level="WARNING",
                            layer="Router",
                            module="common.modules.interceptor",
                            function="dispatch",
                            line_number=148,
                            file_path="src/common/modules/interceptor/router.py",
                            trace_id=trace_id,
                            request_id=request_id,
                            user_id=user_id,
                            duration_ms=int(duration_ms),
                            threshold_ms=float(SLOW_REQUEST_THRESHOLD_MS),
                            is_slow=True,
                            extra_data={
                                "request_method": request.method,
                                "request_path": request.url.path,
                                "response_status": response.status_code,
                            },
                        )
                    )
            except Exception as e:
                logger.warning(f"Failed to record log: {e}")

        if self.debug:
            response.headers["X-Trace-Id"] = trace_id
            response.headers["X-Request-Id"] = request_id

        return response


def add_logging_middleware(app, debug: bool = False):
    """添加日志中间件"""
    app.add_middleware(HTTPLoggingMiddleware, debug=debug)


__all__ = [
    "HTTPLoggingMiddleware",
    "add_logging_middleware",
    "should_skip_logging",
    "determine_log_level",
    "SLOW_REQUEST_THRESHOLD_MS",
]
