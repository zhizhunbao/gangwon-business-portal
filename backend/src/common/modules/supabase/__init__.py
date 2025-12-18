"""
Supabase Integration Module
"""
from .client import get_supabase_client, supabase_client
from .service import supabase_service

# 导入现有的日志装饰器（用于路由层）
from ..logger.decorator import auto_log

__all__ = [
    'get_supabase_client', 
    'supabase_client', 
    'supabase_service',
    'auto_log'  # 路由层日志装饰器
]