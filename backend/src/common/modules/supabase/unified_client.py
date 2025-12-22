"""
Unified Supabase Client - 统一的数据库 AOP 封装

这个模块提供了一个统一的 Supabase 客户端，通过装饰器模式集成：
1. 日志记录功能 - 委托给 logger 模块
2. 异常处理功能 - 委托给 exception 模块

设计原则：
- 单一职责：每个模块只负责自己的职责
- 装饰器模式：通过组合而非继承来扩展功能
- 透明性：对业务代码完全透明，不改变原有接口
- 可观测性：所有数据库操作都被记录和监控
- 容错性：异常被正确分类和处理
"""
import time
import asyncio
import threading
from typing import Any, Dict, Optional, List, TYPE_CHECKING
from supabase import Client

# Import request context (no circular dependency)
from ..logger.request import get_request_context

# Import exception components
from ..exception.service import exception_service, ExceptionContext
from ..exception.exceptions import DatabaseError

if TYPE_CHECKING:
    from postgrest import APIResponse


def _get_logging_service():
    """延迟导入 logging_service 以避免循环导入"""
    from ..logger.service import logging_service
    return logging_service


def _get_app_log_create():
    """延迟导入 AppLogCreate 以避免循环导入"""
    from ..logger.schemas import AppLogCreate
    return AppLogCreate


def _schedule_coro(coro):
    """安全地从同步或异步上下文调度协程。

    - 如果当前线程有运行的事件循环，直接在该循环中创建任务。
    - 否则在后台线程中运行协程，避免在无事件循环的线程里产生
      'coroutine was never awaited' 的 RuntimeWarning。
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # 当前线程没有运行事件循环 — 在后台线程中运行协程（不会阻塞当前线程）
        threading.Thread(target=lambda: asyncio.run(coro), daemon=True).start()
    else:
        loop.create_task(coro)


class DatabaseOperationLogger:
    """
    数据库操作日志记录器 - 单一职责：记录数据库操作日志
    """
    
    def __init__(self):
        self._slow_query_threshold_ms = 500
    
    async def log_operation(
        self,
        table_name: str,
        operation_type: str,
        duration_ms: float,
        success: bool,
        error: Optional[Exception] = None,
        operation_data: Optional[Dict[str, Any]] = None
    ):
        """记录数据库操作日志"""
        try:
            # 获取请求上下文
            context = get_request_context()
            trace_id = context.get("trace_id")
            request_id = context.get("request_id")
            user_id = context.get("user_id")
            
            if success:
                await self._log_success(
                    table_name, operation_type, duration_ms, 
                    trace_id, request_id, user_id, operation_data
                )
            else:
                await self._log_error(
                    table_name, operation_type, duration_ms, error,
                    trace_id, request_id, user_id
                )
                
        except Exception as log_exc:
            # 不让日志记录失败影响数据库操作
            import logging
            logging.error(f"Failed to log database operation: {log_exc}", exc_info=True)
    
    async def _log_success(self, table_name: str, operation_type: str, duration_ms: float, 
                          trace_id: str, request_id: str, user_id: Any, operation_data: Optional[Dict]):
        """记录成功操作的日志"""
        # 确定日志级别：慢查询用 WARNING，正常查询用 DEBUG
        log_level = "WARNING" if duration_ms > self._slow_query_threshold_ms else "DEBUG"
        
        # 构建日志消息
        is_slow = duration_ms > self._slow_query_threshold_ms
        slow_indicator = " [SLOW]" if is_slow else ""
        log_message = (
            f"DB {operation_type} {table_name} "
            f"({duration_ms:.2f}ms){slow_indicator}"
        )
        
        # 构建额外数据
        extra_data = {
            "table_name": table_name,
            "operation_type": operation_type,
            "is_slow_query": is_slow,
        }
        
        # 添加操作数据（去掉嵌套的 extra_data 避免无限嵌套）
        if operation_data:
            filtered_data = self._filter_sensitive_data(operation_data)
            # 如果是列表，去掉每条记录的 extra_data
            if isinstance(filtered_data, list):
                extra_data["operation_data"] = [
                    {k: v for k, v in item.items() if k != "extra_data"}
                    for item in filtered_data
                ]
            elif isinstance(filtered_data, dict):
                extra_data["operation_data"] = {k: v for k, v in filtered_data.items() if k != "extra_data"}
            else:
                extra_data["operation_data"] = filtered_data
        
        # 记录日志
        AppLogCreate = _get_app_log_create()
        await _get_logging_service().log(AppLogCreate(
            source="backend",
            level=log_level,
            message=log_message,
            layer="Database",
            module=__name__,
            function="DatabaseOperationLogger.log_operation",
            trace_id=trace_id,
            request_id=request_id,
            user_id=user_id,
            duration_ms=int(duration_ms),
            extra_data=extra_data,
        ))
    
    async def _log_error(self, table_name: str, operation_type: str, duration_ms: float, 
                        error: Exception, trace_id: str, request_id: str, user_id: Any):
        """记录错误操作的日志"""
        error_message = (
            f"DB {operation_type} {table_name} FAILED "
            f"({duration_ms:.2f}ms): {str(error)}"
        )
        
        extra_data = {
            "table_name": table_name,
            "operation_type": operation_type,
            "duration_ms": duration_ms,
            "error": str(error),
            "error_type": type(error).__name__,
        }
        
        AppLogCreate = _get_app_log_create()
        await _get_logging_service().log(AppLogCreate(
            source="backend",
            level="ERROR",
            message=error_message,
            layer="Database",
            module=__name__,
            function="DatabaseOperationLogger.log_operation",
            trace_id=trace_id,
            request_id=request_id,
            user_id=user_id,
            extra_data=extra_data,
        ))
    
    def _filter_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """过滤敏感信息"""
        if not isinstance(data, dict):
            return data
        
        # 敏感字段列表
        sensitive_fields = {
            "password", "token", "secret", "key", "auth", 
            "credential", "private", "confidential"
        }
        
        filtered = {}
        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_fields):
                filtered[key] = "[FILTERED]"
            elif isinstance(value, dict):
                filtered[key] = self._filter_sensitive_data(value)
            else:
                filtered[key] = value
        
        return filtered


class DatabaseExceptionHandler:
    """
    数据库异常处理器 - 单一职责：处理数据库异常
    """
    
    def __init__(self, exception_context: Optional[ExceptionContext] = None):
        self._exception_context = exception_context or ExceptionContext()
    
    async def handle_exception(
        self,
        exception: Exception,
        table_name: str,
        operation_type: str,
        duration_ms: float
    ) -> DatabaseError:
        """处理数据库异常并返回标准化的 DatabaseError"""
        try:
            # 创建数据库错误
            db_error = DatabaseError(
                message=f"Database {operation_type} operation failed on table '{table_name}'",
                table_name=table_name,
                operation=operation_type,
                original_exception=exception
            )
            
            # 构建异常上下文
            context = ExceptionContext(
                trace_id=self._exception_context.trace_id,
                request_id=self._exception_context.request_id,
                user_id=self._exception_context.user_id,
                additional_data={
                    'table_name': table_name,
                    'operation': operation_type,
                    'duration_ms': duration_ms,
                    'original_exception_type': type(exception).__name__,
                    'original_exception_message': str(exception),
                }
            )
            
            # 记录异常
            await exception_service.record_exception(db_error, context, source="backend")
            
            return db_error
            
        except Exception as handle_exc:
            # 异常处理失败，记录日志但不影响原异常
            import logging
            logging.error(f"Failed to handle database exception: {handle_exc}", exc_info=True)
            
            # 创建一个简单的 DatabaseError
            return DatabaseError(
                message=f"Database {operation_type} operation failed on table '{table_name}'",
                table_name=table_name,
                operation=operation_type,
                original_exception=exception
            )
    
    def set_context(self, context: ExceptionContext):
        """更新异常上下文"""
        self._exception_context = context


class UnifiedQuery:
    """
    统一的查询对象 - 单一职责：协调日志记录和异常处理
    
    这个类通过组合模式集成日志记录器和异常处理器，
    而不是直接实现这些功能。
    """
    
    def __init__(
        self, 
        query: Any, 
        table_name: str, 
        operation_type: str,
        operation_data: Optional[Dict[str, Any]] = None,
        logger: Optional[DatabaseOperationLogger] = None,
        exception_handler: Optional[DatabaseExceptionHandler] = None
    ):
        """初始化统一查询对象"""
        self._query = query
        self._table_name = table_name
        self._operation_type = operation_type
        self._operation_data = operation_data
        
        # 使用依赖注入，支持测试
        self._logger = logger or DatabaseOperationLogger()
        self._exception_handler = exception_handler or DatabaseExceptionHandler()
    
    def __getattr__(self, name: str) -> Any:
        """代理属性访问到原始查询对象"""
        attr = getattr(self._query, name)
        
        # 如果是方法且返回查询构建器，继续包装
        if callable(attr):
            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                # 如果返回的是查询对象，继续包装
                if hasattr(result, 'execute'):
                    return UnifiedQuery(
                        query=result,
                        table_name=self._table_name,
                        operation_type=self._operation_type,
                        operation_data=self._operation_data,
                        logger=self._logger,
                        exception_handler=self._exception_handler
                    )
                return result
            return wrapper
        
        return attr
    
    def execute(self) -> "APIResponse":
        """
        执行查询，协调日志记录和异常处理
        
        Returns:
            查询结果
            
        Raises:
            DatabaseError: 如果数据库操作失败
        """
        # 记录开始时间
        start_time = time.time()
        
        try:
            # 执行查询（同步）
            result = self._query.execute()
            
            # 计算耗时
            duration_ms = (time.time() - start_time) * 1000
            
            # 异步记录成功日志（不阻塞）
            _schedule_coro(self._logger.log_operation(
                table_name=self._table_name,
                operation_type=self._operation_type,
                duration_ms=duration_ms,
                success=True,
                operation_data=self._operation_data
            ))
            
            return result
            
        except Exception as exc:
            # 计算耗时（即使失败也要记录）
            duration_ms = (time.time() - start_time) * 1000
            
            # 异步记录错误日志（不阻塞）
            _schedule_coro(self._logger.log_operation(
                table_name=self._table_name,
                operation_type=self._operation_type,
                duration_ms=duration_ms,
                success=False,
                error=exc
            ))
            
            # 同步处理异常（需要立即返回错误）
            db_error = self._handle_exception_sync(exc, duration_ms)
            
            # 重新抛出标准化的异常
            raise db_error from exc
    
    def _handle_exception_sync(self, exc: Exception, duration_ms: float) -> "DatabaseError":
        """同步处理异常，返回 DatabaseError"""
        from ..exception.exceptions import DatabaseError
        
        db_error = DatabaseError(
            message=f"Database {self._operation_type} operation failed on table '{self._table_name}'",
            table_name=self._table_name,
            operation=self._operation_type,
            original_exception=exc
        )
        
        # 异步记录异常详情（不阻塞）
        _schedule_coro(self._exception_handler.handle_exception(
            exception=exc,
            table_name=self._table_name,
            operation_type=self._operation_type,
            duration_ms=duration_ms
        ))
        
        return db_error


class UnifiedTable:
    """
    统一的表操作对象 - 单一职责：协调表级别的操作
    
    通过组合模式集成日志记录器和异常处理器。
    """
    
    def __init__(
        self, 
        table: Any, 
        table_name: str, 
        logger: Optional[DatabaseOperationLogger] = None,
        exception_handler: Optional[DatabaseExceptionHandler] = None
    ):
        """初始化统一表操作"""
        self._table = table
        self._table_name = table_name
        
        # 使用依赖注入，支持测试
        self._logger = logger or DatabaseOperationLogger()
        self._exception_handler = exception_handler or DatabaseExceptionHandler()
    
    def insert(self, data: Dict[str, Any]) -> UnifiedQuery:
        """插入操作"""
        query = self._table.insert(data)
        return UnifiedQuery(
            query=query,
            table_name=self._table_name,
            operation_type="INSERT",
            operation_data=data,
            logger=self._logger,
            exception_handler=self._exception_handler
        )
    
    def update(self, data: Dict[str, Any]) -> UnifiedQuery:
        """更新操作"""
        query = self._table.update(data)
        return UnifiedQuery(
            query=query,
            table_name=self._table_name,
            operation_type="UPDATE",
            operation_data=data,
            logger=self._logger,
            exception_handler=self._exception_handler
        )
    
    def delete(self) -> UnifiedQuery:
        """删除操作"""
        query = self._table.delete()
        return UnifiedQuery(
            query=query,
            table_name=self._table_name,
            operation_type="DELETE",
            logger=self._logger,
            exception_handler=self._exception_handler
        )
    
    def select(self, columns: str = "*", count: Optional[str] = None) -> UnifiedQuery:
        """查询操作
        
        Args:
            columns: 要查询的列，默认为 "*"
            count: 计数模式，可选值: 'exact', 'planned', 'estimated'
        """
        if count:
            query = self._table.select(columns, count=count)
        else:
            query = self._table.select(columns)
        return UnifiedQuery(
            query=query,
            table_name=self._table_name,
            operation_type="SELECT",
            logger=self._logger,
            exception_handler=self._exception_handler
        )
    
    def upsert(self, data: Dict[str, Any]) -> UnifiedQuery:
        """插入或更新操作"""
        query = self._table.upsert(data)
        return UnifiedQuery(
            query=query,
            table_name=self._table_name,
            operation_type="UPSERT",
            operation_data=data,
            logger=self._logger,
            exception_handler=self._exception_handler
        )
    
    def __getattr__(self, name: str) -> Any:
        """代理其他方法到原始表对象"""
        attr = getattr(self._table, name)
        
        # 如果是方法，包装成 UnifiedQuery
        if callable(attr):
            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                # 如果返回的是查询对象，包装成 UnifiedQuery
                if hasattr(result, 'execute'):
                    return UnifiedQuery(
                        query=result,
                        table_name=self._table_name,
                        operation_type=name.upper(),
                        logger=self._logger,
                        exception_handler=self._exception_handler
                    )
                return result
            return wrapper
        
        return attr


class UnifiedSupabaseClient:
    """
    统一的 Supabase 客户端 - 单一职责：协调数据库客户端操作
    
    这个客户端通过组合模式集成日志记录和异常处理功能，
    而不是直接实现这些功能，从而保持单一职责。
    """
    
    def __init__(
        self, 
        client: Client, 
        exception_context: Optional[ExceptionContext] = None,
        logger: Optional[DatabaseOperationLogger] = None,
        exception_handler: Optional[DatabaseExceptionHandler] = None,
    ):
        """初始化统一 Supabase 客户端"""
        self._client = client
        self._connection_tested = False
        
        # 使用依赖注入，支持测试和模块化
        self._logger = logger or DatabaseOperationLogger()
        self._exception_handler = exception_handler or DatabaseExceptionHandler(exception_context)
    
    def table(self, table_name: str) -> UnifiedTable:
        """获取统一的表操作对象"""
        try:
            # 首次访问时测试连接
            if not self._connection_tested:
                self._test_connection()
                self._connection_tested = True
            
            table = self._client.table(table_name)
            return UnifiedTable(
                table, 
                table_name, 
                logger=self._logger,
                exception_handler=self._exception_handler
            )
            
        except Exception as exc:
            # 处理连接错误
            connection_error = DatabaseError(
                message=f"Failed to access table '{table_name}': connection error",
                table_name=table_name,
                operation="CONNECTION",
                original_exception=exc
            )
            
            # 记录连接错误
            _schedule_coro(self._record_connection_error(connection_error, exc))
            
            # 重新抛出为 DatabaseError
            raise connection_error from exc
    
    def _test_connection(self):
        """测试数据库连接"""
        # 对于 Supabase PostgREST API，不需要预先测试连接
        # 连接问题会在实际操作时被发现和处理
        # 这避免了访问系统表的权限问题
        pass
    
    async def _record_connection_error(self, db_error: DatabaseError, original_exc: Exception):
        """记录数据库连接错误"""
        try:
            # 使用异常处理器来处理连接错误
            await self._exception_handler.handle_exception(
                exception=original_exc,
                table_name="",
                operation_type="CONNECTION",
                duration_ms=0
            )
            
        except Exception as log_exc:
            # 不让日志记录失败影响数据库操作
            import logging
            logging.error(f"Failed to record connection error: {log_exc}", exc_info=True)
    
    def set_context(self, context: ExceptionContext):
        """更新异常上下文"""
        self._exception_handler.set_context(context)
    
    def __getattr__(self, name: str) -> Any:
        """代理其他属性和方法到原始客户端"""
        return getattr(self._client, name)


# 便捷函数
def create_unified_supabase_client(
    client: Client, 
    context: Optional[ExceptionContext] = None,
) -> UnifiedSupabaseClient:
    """
    创建统一的 Supabase 客户端
    
    Args:
        client: 原始 Supabase 客户端
        context: 异常上下文
        
    Returns:
        统一的 Supabase 客户端
    """
    return UnifiedSupabaseClient(client, context)