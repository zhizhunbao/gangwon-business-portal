"""
Supabase Client Configuration and Health Check
Supabase Python 客户端配置和健康检查
"""
import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
from supabase.client import ClientOptions

from ..config import settings
from .decorator import log_db_pool_operation


class SupabaseClient:
    """Supabase 客户端单例"""
    
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """获取 Supabase 客户端实例"""
        if cls._instance is None:
            cls._instance = cls._create_client()
        return cls._instance
    
    @classmethod
    @log_db_pool_operation(operation_name="supabase_client_initialized", log_level="INFO")
    def _create_client(cls) -> Client:
        """创建 Supabase 客户端"""
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_KEY
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
        
        # 配置客户端选项
        options = ClientOptions(
            postgrest_client_timeout=30,  # PostgREST 客户端超时
            storage_client_timeout=30,    # Storage 客户端超时
            schema="public",              # 默认 schema
            auto_refresh_token=True,      # 自动刷新 token
            persist_session=False,        # 不持久化会话（服务端应用）
        )
        
        client = create_client(url, key, options=options)
        return client


# 便捷函数
def get_supabase_client() -> Client:
    """获取 Supabase 客户端实例"""
    return SupabaseClient.get_client()


# 导出客户端实例
supabase_client = get_supabase_client()


# 健康检查
@log_db_pool_operation(operation_name="supabase_health_check", log_level="INFO")
async def check_supabase_health() -> Dict[str, Any]:
    """
    检查 Supabase 连接健康状态
    
    Returns:
        健康状态信息
    """
    client = get_supabase_client()
    
    # 执行简单查询测试连接
    result = client.table('members').select('count', count='exact').limit(1).execute()
    
    health_info = {
        "status": "healthy",
        "connection": "ok",
        "client_type": "supabase",
        "response_time_ms": None,  # 可以添加响应时间测量
        "total_records": result.count
    }
    
    return health_info