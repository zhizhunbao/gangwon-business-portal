"""
Service Interceptor - AOP 风格的 Service 层拦截器实现

通过装饰器模式为 Service 类的方法添加：
- 日志记录（方法调用、参数、耗时）
- 异常处理（捕获、分类、记录）
- 性能监控（慢方法警告）
"""
import time
import asyncio
import functools
import inspect
from typing import Any, Callable, Optional, TypeVar, Type
from uuid import UUID

from .config import InterceptorConfig

# Type variables for generic decorators
T = TypeVar('T')
F = TypeVar('F', bound=Callable[..., Any])


def _get_logging_service():
    """延迟导入避免循环依赖"""
    from ..logger.service import logging_service
    return logging_service


def _get_app_log_create():
    """延迟导入避免循环依赖"""
    from ..logger.schemas import AppLogCreate
    return AppLogCreate


def _get_request_context():
    """延迟导入避免循环依赖"""
    from ..logger.request import get_request_context
    return get_request_context()


def _filter_sensitive_args(args_dict: dict, sensitive_args: set) -> dict:
    """过滤敏感参数"""
    filtered = {}
    for key, value in args_dict.items():
        key_lower = key.lower()
        if any(s in key_lower for s in sensitive_args):
            filtered[key] = "[FILTERED]"
        elif isinstance(value, dict):
            filtered[key] = _filter_sensitive_args(value, sensitive_args)
        else:
            filtered[key] = value
    return filtered


def _truncate_value(value: Any, max_length: int) -> str:
    """截断过长的值"""
    str_value = str(value)
    if len(str_value) > max_length:
        return str_value[:max_length] + "...[truncated]"
    return str_value


def _serialize_arg(value: Any, max_length: int) -> Any:
    """序列化参数值为可记录的格式"""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return _truncate_value(value, max_length)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (list, tuple)):
        if len(value) > 10:
            return f"[{type(value).__name__} with {len(value)} items]"
        return [_serialize_arg(v, max_length) for v in value[:10]]
    if isinstance(value, dict):
        if len(value) > 10:
            return f"{{dict with {len(value)} keys}}"
        return {k: _serialize_arg(v, max_length) for k, v in list(value.items())[:10]}
    if hasattr(value, '__dict__'):
        # Pydantic model or dataclass
        return f"<{type(value).__name__}>"
    return _truncate_value(value, max_length)


def _build_args_dict(
    func: Callable, 
    args: tuple, 
    kwargs: dict, 
    config: InterceptorConfig
) -> dict:
    """构建参数字典"""
    sig = inspect.signature(func)
    params = list(sig.parameters.keys())
    
    args_dict = {}
    
    # 处理位置参数（跳过 self）
    for i, arg in enumerate(args):
        if i < len(params):
            param_name = params[i]
            if param_name != 'self':
                args_dict[param_name] = _serialize_arg(arg, config.max_arg_length)
    
    # 处理关键字参数
    for key, value in kwargs.items():
        args_dict[key] = _serialize_arg(value, config.max_arg_length)
    
    # 过滤敏感参数
    return _filter_sensitive_args(args_dict, config.sensitive_args)


def _get_function_line_number(func: Callable) -> Optional[int]:
    """获取函数定义的行号"""
    try:
        # 获取函数源代码的起始行号
        source_lines, start_line = inspect.getsourcelines(func)
        return start_line
    except (OSError, TypeError):
        # 无法获取源代码（内置函数、C扩展等）
        return None


async def _log_method_call(
    class_name: str,
    method_name: str,
    duration_ms: float,
    success: bool,
    config: InterceptorConfig,
    args_dict: Optional[dict] = None,
    result: Any = None,
    error: Optional[Exception] = None,
    layer: str = "Service",
    line_number: Optional[int] = None,
):
    """记录方法调用日志"""
    try:
        context = _get_request_context()
        trace_id = context.get("trace_id")
        request_id = context.get("request_id")
        user_id = context.get("user_id")
        
        # 确定日志级别
        is_slow = duration_ms > config.slow_threshold_ms
        if error:
            level = "ERROR"
        elif is_slow:
            level = "WARNING"
        else:
            level = config.log_level
        
        # 构建日志消息（按规范格式）
        status = "OK" if success else "FAILED"
        message = f"{layer}: {method_name} {status}"
        
        # 构建额外数据（扁平化，不嵌套）
        extra_data = {}
        
        if config.log_args and args_dict:
            # 直接展开参数到 extra_data
            for key, value in args_dict.items():
                extra_data[f"arg_{key}"] = value
        
        if config.log_result and result is not None and success:
            extra_data["result"] = _serialize_arg(result, config.max_result_length)
        
        if error:
            extra_data["error"] = str(error)
            extra_data["error_type"] = type(error).__name__
        
        # 记录日志
        AppLogCreate = _get_app_log_create()
        await _get_logging_service().log(AppLogCreate(
            source="backend",
            level=level,
            message=message,
            layer=layer,
            module="common.modules.interceptor",
            function=method_name,
            line_number=line_number,
            file_path="src/common/modules/interceptor/service.py",
            trace_id=trace_id,
            request_id=request_id,
            user_id=user_id,
            duration_ms=int(duration_ms),
            extra_data=extra_data if extra_data else None,
        ))
        
    except Exception as log_exc:
        import logging
        logging.error(f"Failed to log service method call: {log_exc}", exc_info=True)


def intercept_method(
    config: Optional[InterceptorConfig] = None,
    log_args: bool = True,
    log_result: bool = False,
    owner_class: Optional[Type] = None,
    is_static: bool = False,
    layer: str = "Service",
) -> Callable[[F], F]:
    """
    方法装饰器 - 拦截单个方法
    
    Usage:
        @intercept_method(log_args=True)
        async def my_method(self, arg1, arg2):
            ...
    """
    _config = config or InterceptorConfig(log_args=log_args, log_result=log_result)
    
    def decorator(func: F) -> F:
        # 在装饰时获取行号（只获取一次）
        func_line_number = _get_function_line_number(func)
        
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                # 获取类名
                if owner_class:
                    class_name = owner_class.__name__
                elif is_static:
                    class_name = "Unknown"
                else:
                    class_name = args[0].__class__.__name__ if args else "Unknown"
                method_name = func.__name__
                
                # 构建参数字典
                args_dict = _build_args_dict(func, args, kwargs, _config) if _config.log_args else None
                
                start_time = time.time()
                try:
                    result = await func(*args, **kwargs)
                    duration_ms = (time.time() - start_time) * 1000
                    
                    # 异步记录日志（不阻塞）
                    asyncio.create_task(_log_method_call(
                        class_name, method_name, duration_ms, True, _config,
                        args_dict=args_dict, result=result, layer=layer,
                        line_number=func_line_number
                    ))
                    
                    return result
                    
                except Exception as exc:
                    duration_ms = (time.time() - start_time) * 1000
                    
                    # 异步记录错误日志
                    asyncio.create_task(_log_method_call(
                        class_name, method_name, duration_ms, False, _config,
                        args_dict=args_dict, error=exc, layer=layer,
                        line_number=func_line_number
                    ))
                    
                    raise
            
            return async_wrapper  # type: ignore
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                if owner_class:
                    class_name = owner_class.__name__
                elif is_static:
                    class_name = "Unknown"
                else:
                    class_name = args[0].__class__.__name__ if args else "Unknown"
                method_name = func.__name__
                
                args_dict = _build_args_dict(func, args, kwargs, _config) if _config.log_args else None
                
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration_ms = (time.time() - start_time) * 1000
                    
                    # 同步上下文中调度异步日志
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(_log_method_call(
                            class_name, method_name, duration_ms, True, _config,
                            args_dict=args_dict, result=result, layer=layer,
                            line_number=func_line_number
                        ))
                    except RuntimeError:
                        pass  # 没有事件循环，跳过日志
                    
                    return result
                    
                except Exception as exc:
                    duration_ms = (time.time() - start_time) * 1000
                    
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(_log_method_call(
                            class_name, method_name, duration_ms, False, _config,
                            args_dict=args_dict, error=exc, layer=layer,
                            line_number=func_line_number
                        ))
                    except RuntimeError:
                        pass
                    
                    raise
            
            return sync_wrapper  # type: ignore
    
    return decorator


def intercept_service(
    cls: Optional[Type[T]] = None,
    *,
    config: Optional[InterceptorConfig] = None,
    layer: str = "Service",
) -> Type[T]:
    """
    类装饰器 - 自动拦截所有公开方法
    
    Usage:
        @intercept_service
        class MyService:
            async def my_method(self, arg1):
                ...
        
        # 或带配置
        @intercept_service(config=InterceptorConfig(log_result=True))
        class MyService:
            ...
        
        # 或指定 layer
        @intercept_service(layer="Auth")
        class AuthService:
            ...
    """
    _config = config or InterceptorConfig()
    
    def decorator(cls: Type[T]) -> Type[T]:
        # 遍历类的所有方法
        for name, method in inspect.getmembers(cls, predicate=inspect.isfunction):
            # 跳过私有方法和排除的方法
            if name.startswith('_') or name in _config.exclude_methods:
                continue
            
            # 检查是否是静态方法或类方法
            attr = inspect.getattr_static(cls, name)
            
            if isinstance(attr, staticmethod):
                # 静态方法：包装内部函数，然后重新包装为 staticmethod
                wrapped = intercept_method(config=_config, owner_class=cls, is_static=True, layer=layer)(method)
                setattr(cls, name, staticmethod(wrapped))
            elif isinstance(attr, classmethod):
                # 类方法：暂时跳过，处理起来更复杂
                continue
            else:
                # 普通实例方法
                wrapped = intercept_method(config=_config, layer=layer)(method)
                setattr(cls, name, wrapped)
        
        return cls
    
    # 支持 @intercept_service 和 @intercept_service() 两种用法
    if cls is not None:
        return decorator(cls)
    return decorator  # type: ignore
