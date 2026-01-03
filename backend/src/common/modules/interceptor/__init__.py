"""
Interceptor Module - AOP 拦截器统一入口

=============================================================================
使用方式
=============================================================================

在 main.py 中一行代码配置所有拦截器：

```python
from src.common.modules.interceptor import setup_interceptors

app = FastAPI()
setup_interceptors(app, debug=settings.DEBUG)
```

=============================================================================
架构（按 Layer 组织）
=============================================================================

    interceptor/
    ├── config.py       # 配置类
    ├── router.py       # Router 层
    ├── service.py      # Service 层
    ├── auth.py         # Auth 层
    ├── database.py     # Database 层
    ├── error.py        # 错误日志拦截
    └── __init__.py     # 入口 + 自动注册
"""
import importlib
import inspect
import pkgutil
import logging

from typing import List, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# 配置类
# =============================================================================
from .config import (
    MiddlewareConfig,
    ServiceConfig,
    DatabaseConfig,
    InterceptorConfig,
    SENSITIVE_FIELDS,
    SENSITIVE_HEADERS,
)

# =============================================================================
# Router 层
# =============================================================================
from .router import (
    HTTPLoggingMiddleware,
    add_logging_middleware,
    should_skip_logging,
    determine_log_level,
    SLOW_REQUEST_THRESHOLD_MS,
)

# =============================================================================
# Error 层
# =============================================================================
from .error import (
    ExceptionMiddleware,
    add_exception_middleware,
    get_client_ip,
)

# =============================================================================
# Service 层
# =============================================================================
from .service import intercept_service, intercept_method

# =============================================================================
# Auth 层
# =============================================================================
from .auth import intercept_auth_service, intercept_auth_method

# =============================================================================
# Database 层
# =============================================================================
from .database import (
    UnifiedSupabaseClient,
    UnifiedTable,
    UnifiedQuery,
    DatabaseOperationLogger,
    DatabaseExceptionHandler,
    create_unified_supabase_client,
)


# =============================================================================
# 自动注册
# =============================================================================

# 根据类名自动识别 layer
AUTH_SERVICE_NAMES = {"AuthService", "AuthenticationService", "LoginService"}


def _get_layer_for_class(class_name: str) -> str:
    """根据类名确定日志层级"""
    if class_name in AUTH_SERVICE_NAMES:
        return "Auth"
    return "Service"


def auto_intercept_services(
    package_name: str,
    config: Optional[ServiceConfig] = None,
    class_suffix: str = "Service",
    exclude_classes: Optional[List[str]] = None,
) -> List[str]:
    """
    自动扫描并拦截指定包下的所有 Service 类
    
    Args:
        package_name: 要扫描的包名，如 "src.modules"
        config: Service 拦截器配置
        class_suffix: 类名后缀，默认 "Service"
        exclude_classes: 排除的类名列表
    
    Returns:
        被拦截的类名列表
    """
    _config = config or ServiceConfig()
    _exclude = set(exclude_classes or [])
    intercepted_classes = []
    
    try:
        package = importlib.import_module(package_name)
    except ImportError as e:
        logger.warning(f"Failed to import package {package_name}: {e}")
        return []
    
    for module_info in pkgutil.walk_packages(
        package.__path__, 
        prefix=package.__name__ + "."
    ):
        if not module_info.name.endswith(".service"):
            continue
        
        try:
            module = importlib.import_module(module_info.name)
        except ImportError as e:
            logger.warning(f"Failed to import module {module_info.name}: {e}")
            continue
        
        for name, obj in inspect.getmembers(module, inspect.isclass):
            if not name.endswith(class_suffix):
                continue
            if name in _exclude:
                continue
            if obj.__module__ != module.__name__:
                continue
            if hasattr(obj, '_intercepted'):
                continue
            
            try:
                # 根据类名确定 layer
                layer = _get_layer_for_class(name)
                intercept_service(obj, config=_config, layer=layer)
                obj._intercepted = True
                intercepted_classes.append(f"{module.__name__}.{name}")
                logger.debug(f"Intercepted: {module.__name__}.{name} (layer={layer})")
            except Exception as e:
                logger.warning(f"Failed to intercept {name}: {e}")
    
    logger.info(f"Auto-intercepted {len(intercepted_classes)} service classes")
    return intercepted_classes


def setup_interceptors(
    app,
    debug: bool = False,
    service_packages: Optional[List[str]] = None,
):
    """
    一站式配置所有拦截器
    
    Args:
        app: FastAPI 应用实例
        debug: 是否开启调试模式
        service_packages: Service 类所在的包名列表
    """
    if service_packages is None:
        service_packages = ["src.modules", "src.common.modules"]
    
    # LoggingService 必须排除，否则会导致日志递归循环
    exclude_classes = ["LoggingService"]
    
    # 1. Router 层
    add_exception_middleware(app, debug=debug)
    app.add_middleware(HTTPLoggingMiddleware, debug=debug)
    
    # 2. Service 层
    intercepted = []
    for package in service_packages:
        intercepted.extend(auto_intercept_services(package, exclude_classes=exclude_classes))
    
    # 3. Database 层 - 已通过 UnifiedSupabaseClient 自动拦截
    
    logger.info(
        f"Interceptors configured: "
        f"Router=OK, Service={len(intercepted)} classes, Database=OK"
    )
    
    return intercepted


__all__ = [
    # 一站式配置
    "setup_interceptors",
    "auto_intercept_services",
    # 配置
    "MiddlewareConfig",
    "ServiceConfig",
    "DatabaseConfig",
    "InterceptorConfig",
    "SENSITIVE_FIELDS",
    "SENSITIVE_HEADERS",
    # Router 层
    "HTTPLoggingMiddleware",
    "add_logging_middleware",
    "should_skip_logging",
    "determine_log_level",
    "SLOW_REQUEST_THRESHOLD_MS",
    # Error 层
    "ExceptionMiddleware",
    "add_exception_middleware",
    "get_client_ip",
    # Service 层
    "intercept_service",
    "intercept_method",
    # Auth 层
    "intercept_auth_service",
    "intercept_auth_method",
    # Database 层
    "UnifiedSupabaseClient",
    "UnifiedTable",
    "UnifiedQuery",
    "DatabaseOperationLogger",
    "DatabaseExceptionHandler",
    "create_unified_supabase_client",
]
