"""
Supabase Integration Module
"""
from .client import get_supabase_client, supabase_client
from .service import supabase_service
from .decorator import log_db_pool_operation

# 导入现有的日志装饰器（用于路由层）
from ..logger.decorator import auto_log

__all__ = [
    'get_supabase_client', 
    'supabase_client', 
    'supabase_service',
    'log_db_pool_operation',   # 数据库连接池日志装饰器
    'auto_log'  # 现有的路由层日志装饰器
]