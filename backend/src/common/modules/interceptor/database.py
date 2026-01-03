"""
Database Interceptor - DB 层拦截器

提供数据库操作的 AOP 拦截：
- 自动记录 SQL 操作日志
- 慢查询警告
- 异常捕获和标准化
"""
import time
import asyncio
import threading
import logging
from typing import Any, Dict, Optional, TYPE_CHECKING

from .config import DatabaseConfig, SENSITIVE_FIELDS

if TYPE_CHECKING:
    from supabase import Client
    from postgrest import APIResponse

logger = logging.getLogger(__name__)


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


def _get_database_error():
    """延迟导入避免循环依赖"""
    from ..exception.exceptions import DatabaseError
    return DatabaseError


def _schedule_coro(coro):
    """安全地调度协程"""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)
    except RuntimeError:
        threading.Thread(target=lambda: asyncio.run(coro), daemon=True).start()


def _filter_sensitive_data(data: Dict[str, Any], sensitive_fields: set = SENSITIVE_FIELDS) -> Dict[str, Any]:
    """过滤敏感字段"""
    if not isinstance(data, dict):
        return data
    
    filtered = {}
    for k, v in data.items():
        if any(s in k.lower() for s in sensitive_fields):
            filtered[k] = "[FILTERED]"
        elif isinstance(v, dict):
            filtered[k] = _filter_sensitive_data(v, sensitive_fields)
        else:
            filtered[k] = v
    return filtered


# =============================================================================
# Database Operation Logger
# =============================================================================

class DatabaseOperationLogger:
    """数据库操作日志记录器"""
    
    def __init__(self, config: DatabaseConfig = None):
        self.config = config or DatabaseConfig()
        self._slow_query_threshold_ms = self.config.slow_threshold_ms
    
    async def log_operation(
        self,
        table_name: str,
        operation_type: str,
        duration_ms: float,
        success: bool,
        error: Optional[Exception] = None,
        operation_data: Optional[Dict] = None,
    ):
        """记录数据库操作"""
        try:
            context = _get_request_context()
            is_slow = duration_ms > self._slow_query_threshold_ms
            
            level = "ERROR" if error else ("WARNING" if is_slow else "DEBUG")
            status = "OK" if success else "FAILED"
            slow_indicator = " [SLOW]" if is_slow else ""
            
            message = f"DB {operation_type} {table_name} {status} ({duration_ms:.2f}ms){slow_indicator}"
            
            # 构建额外数据（扁平化）
            extra_data = {
                "table_name": table_name,
                "operation_type": operation_type,
            }
            
            if self.config.log_query_params and operation_data:
                filtered = _filter_sensitive_data(operation_data, self.config.sensitive_fields)
                # 直接展开 operation_data 到 extra_data
                if isinstance(filtered, dict):
                    for k, v in filtered.items():
                        if k != "extra_data":
                            extra_data[f"param_{k}"] = v
            
            if error:
                extra_data["error"] = str(error)
                extra_data["error_type"] = type(error).__name__
            
            AppLogCreate = _get_app_log_create()
            await _get_logging_service().log(AppLogCreate(
                source="backend",
                level=level,
                message=message,
                layer="Database",
                module="common.modules.interceptor",
                function="log_operation",
                line_number=68,
                file_path="src/common/modules/interceptor/database.py",
                trace_id=context.get("trace_id"),
                request_id=context.get("request_id"),
                user_id=context.get("user_id"),
                duration_ms=int(duration_ms),
                extra_data=extra_data,
            ))
            
        except Exception as log_exc:
            logger.error(f"Failed to log DB operation: {log_exc}", exc_info=True)


# =============================================================================
# Database Exception Handler
# =============================================================================

class DatabaseExceptionHandler:
    """数据库异常处理器"""
    
    def __init__(self, exception_context=None):
        from ..exception.service import ExceptionContext
        self._exception_context = exception_context or ExceptionContext()
    
    async def handle_exception(
        self,
        exception: Exception,
        table_name: str,
        operation_type: str,
        duration_ms: float
    ):
        """处理数据库异常"""
        try:
            from ..exception.service import exception_service, ExceptionContext
            
            DatabaseError = _get_database_error()
            db_error = DatabaseError(
                message=f"Database {operation_type} operation failed on table '{table_name}'",
                table_name=table_name,
                operation=operation_type,
                original_exception=exception
            )
            
            context = ExceptionContext(
                trace_id=self._exception_context.trace_id,
                request_id=self._exception_context.request_id,
                user_id=self._exception_context.user_id,
                additional_data={
                    'table_name': table_name,
                    'operation': operation_type,
                    'duration_ms': duration_ms,
                    'original_exception_type': type(exception).__name__,
                }
            )
            
            await exception_service.record_exception(db_error, context, source="backend")
            return db_error
            
        except Exception as handle_exc:
            logger.error(f"Failed to handle DB exception: {handle_exc}", exc_info=True)
            DatabaseError = _get_database_error()
            return DatabaseError(
                message=f"Database {operation_type} operation failed on table '{table_name}'",
                table_name=table_name,
                operation=operation_type,
                original_exception=exception
            )
    
    def set_context(self, context):
        """更新异常上下文"""
        self._exception_context = context


# =============================================================================
# Unified Query Wrapper
# =============================================================================

class UnifiedQuery:
    """统一的查询包装器"""
    
    def __init__(
        self,
        query: Any,
        table_name: str,
        operation_type: str,
        operation_data: Optional[Dict] = None,
        logger: Optional[DatabaseOperationLogger] = None,
        exception_handler: Optional[DatabaseExceptionHandler] = None,
    ):
        self._query = query
        self._table_name = table_name
        self._operation_type = operation_type
        self._operation_data = operation_data
        self._logger = logger or DatabaseOperationLogger()
        self._exception_handler = exception_handler or DatabaseExceptionHandler()
    
    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._query, name)
        if callable(attr):
            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                if hasattr(result, 'execute'):
                    return UnifiedQuery(
                        result, self._table_name, self._operation_type,
                        self._operation_data, self._logger, self._exception_handler
                    )
                return result
            return wrapper
        return attr
    
    def execute(self) -> "APIResponse":
        """执行查询并记录日志"""
        start_time = time.time()
        
        try:
            result = self._query.execute()
            duration_ms = (time.time() - start_time) * 1000
            
            _schedule_coro(self._logger.log_operation(
                self._table_name, self._operation_type, duration_ms, True,
                operation_data=self._operation_data
            ))
            
            return result
            
        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000
            
            _schedule_coro(self._logger.log_operation(
                self._table_name, self._operation_type, duration_ms, False, error=exc
            ))
            
            DatabaseError = _get_database_error()
            raise DatabaseError(
                message=f"Database {self._operation_type} operation failed on table '{self._table_name}'",
                table_name=self._table_name,
                operation=self._operation_type,
                original_exception=exc
            ) from exc


# =============================================================================
# Unified Table Wrapper
# =============================================================================

class UnifiedTable:
    """统一的表操作包装器"""
    
    def __init__(
        self,
        table: Any,
        table_name: str,
        logger: Optional[DatabaseOperationLogger] = None,
        exception_handler: Optional[DatabaseExceptionHandler] = None,
    ):
        self._table = table
        self._table_name = table_name
        self._logger = logger or DatabaseOperationLogger()
        self._exception_handler = exception_handler or DatabaseExceptionHandler()
    
    def select(self, columns: str = "*", count: Optional[str] = None) -> UnifiedQuery:
        query = self._table.select(columns, count=count) if count else self._table.select(columns)
        return UnifiedQuery(query, self._table_name, "SELECT", logger=self._logger, exception_handler=self._exception_handler)
    
    def insert(self, data: Dict) -> UnifiedQuery:
        return UnifiedQuery(self._table.insert(data), self._table_name, "INSERT", data, self._logger, self._exception_handler)
    
    def update(self, data: Dict) -> UnifiedQuery:
        return UnifiedQuery(self._table.update(data), self._table_name, "UPDATE", data, self._logger, self._exception_handler)
    
    def delete(self) -> UnifiedQuery:
        return UnifiedQuery(self._table.delete(), self._table_name, "DELETE", logger=self._logger, exception_handler=self._exception_handler)
    
    def upsert(self, data: Dict) -> UnifiedQuery:
        return UnifiedQuery(self._table.upsert(data), self._table_name, "UPSERT", data, self._logger, self._exception_handler)
    
    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._table, name)
        if callable(attr):
            def wrapper(*args, **kwargs):
                result = attr(*args, **kwargs)
                if hasattr(result, 'execute'):
                    return UnifiedQuery(result, self._table_name, name.upper(), logger=self._logger, exception_handler=self._exception_handler)
                return result
            return wrapper
        return attr


# =============================================================================
# Unified Supabase Client
# =============================================================================

class UnifiedSupabaseClient:
    """
    统一的 Supabase 客户端包装器
    
    自动拦截所有数据库操作，记录日志和处理异常。
    """
    
    def __init__(self, client: "Client", exception_context=None, config: DatabaseConfig = None):
        self._client = client
        self._config = config or DatabaseConfig()
        self._connection_tested = False
        self._logger = DatabaseOperationLogger(self._config)
        self._exception_handler = DatabaseExceptionHandler(exception_context)
    
    def table(self, table_name: str) -> UnifiedTable:
        """获取表操作对象"""
        return UnifiedTable(
            self._client.table(table_name),
            table_name,
            self._logger,
            self._exception_handler
        )
    
    def set_context(self, context):
        """更新异常上下文"""
        self._exception_handler.set_context(context)
    
    def __getattr__(self, name: str) -> Any:
        return getattr(self._client, name)


# =============================================================================
# 便捷函数
# =============================================================================

def create_unified_supabase_client(client: "Client", context=None, config: DatabaseConfig = None) -> UnifiedSupabaseClient:
    """创建统一的 Supabase 客户端"""
    return UnifiedSupabaseClient(client, context, config)


# 别名，向后兼容
DatabaseLogger = DatabaseOperationLogger
create_unified_client = create_unified_supabase_client
