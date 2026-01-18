"""
Interceptor Configuration - 各层拦截器的统一配置

提供灵活的配置选项来控制拦截器行为。
"""
from dataclasses import dataclass, field
from typing import Set, List


# =============================================================================
# 通用配置
# =============================================================================

# 敏感字段（会被过滤）
SENSITIVE_FIELDS: Set[str] = {
    "password", "secret", "key", "auth",
    "credential", "private", "api_key",
}

# 敏感请求头
SENSITIVE_HEADERS: Set[str] = {
    "authorization", "cookie", "x-api-key",
    "x-auth-token", "authentication",
}


# =============================================================================
# Middleware 层配置
# =============================================================================

@dataclass
class MiddlewareConfig:
    """HTTP 中间件配置"""
    slow_threshold_ms: float = 1000.0
    skip_paths: List[str] = field(default_factory=lambda: [
        "/healthz", "/readyz", "/docs", "/openapi.json",
        "/redoc", "/favicon.ico",
        "/api/v1/logging", "/api/v1/exceptions",
    ])
    add_trace_header: bool = True


# =============================================================================
# Service 层配置
# =============================================================================

@dataclass
class ServiceConfig:
    """Service 层拦截器配置"""
    log_args: bool = True
    log_result: bool = False
    log_level: str = "DEBUG"
    slow_threshold_ms: float = 500.0
    exclude_methods: Set[str] = field(default_factory=lambda: {
        "__init__", "__repr__", "__str__", "__eq__", "__hash__",
        "__getattr__", "__setattr__", "__delattr__",
    })
    sensitive_args: Set[str] = field(default_factory=lambda: SENSITIVE_FIELDS)
    max_arg_length: int = 200
    max_result_length: int = 500


# =============================================================================
# Database 层配置
# =============================================================================

@dataclass
class DatabaseConfig:
    """Database 层拦截器配置"""
    slow_threshold_ms: float = 500.0
    log_query_params: bool = True
    sensitive_fields: Set[str] = field(default_factory=lambda: SENSITIVE_FIELDS)


# 别名
InterceptorConfig = ServiceConfig
