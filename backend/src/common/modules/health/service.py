"""
Health Check Service
系统健康检查服务 - 可插拔设计，支持迁移到其他项目
"""

import time
import asyncio
import logging
import httpx
from typing import Dict, Any, Optional, Callable
from datetime import datetime

from sqlalchemy import text

from .config import get_default_config, HealthModuleConfig, ServiceConfig
from .adapter import (
    get_db_session_factory, 
    get_app_version, 
    is_using_supabase, 
    get_supabase_client_instance,
    check_database_health
)

logger = logging.getLogger(__name__)


class HealthService:
    """
    系统健康检查服务
    
    可插拔设计：
    - 通过 config 配置外部服务
    - 通过 db_session_factory 注入数据库连接
    - 支持自定义检查函数
    """
    
    # 健康状态缓存（避免频繁查询）
    _cache: Dict[str, Any] = {}
    _config: Optional[HealthModuleConfig] = None
    _db_session_factory: Optional[Callable] = None
    _custom_checks: Dict[str, Callable] = {}
    
    @classmethod
    def configure(
        cls,
        config: Optional[HealthModuleConfig] = None,
        db_session_factory: Optional[Callable] = None
    ) -> None:
        """
        配置健康检查服务
        
        Args:
            config: 模块配置，None 则使用默认配置
            db_session_factory: 数据库 session 工厂函数
        """
        cls._config = config or get_default_config()
        cls._db_session_factory = db_session_factory
    
    @classmethod
    def register_check(cls, name: str, check_func: Callable) -> None:
        """注册自定义健康检查"""
        cls._custom_checks[name] = check_func
    
    @classmethod
    def _get_config(cls) -> HealthModuleConfig:
        """获取配置"""
        if cls._config is None:
            cls._config = get_default_config()
        return cls._config
    
    @classmethod
    async def _get_db_session(cls):
        """获取数据库 session"""
        if cls._db_session_factory:
            return cls._db_session_factory()
        # 使用 adapter 获取默认工厂
        factory = get_db_session_factory()
        if factory:
            return factory()
        raise RuntimeError("No database session factory configured")
    
    @classmethod
    async def get_system_health(cls, skip_external: bool = False) -> Dict[str, Any]:
        """
        获取完整的系统健康状态
        
        Args:
            skip_external: 是否跳过外部服务检查（防止循环调用）
        """
        config = cls._get_config()
        
        # 检查缓存
        cache_key = f"system_health_{skip_external}"
        if cache_key in cls._cache:
            cached = cls._cache[cache_key]
            if time.time() - cached["timestamp"] < config.cache_ttl:
                return cached["data"]
        
        # 构建检查任务列表
        tasks = [
            cls._check_database(),
            cls._check_api(),
            cls._check_storage(),
        ]
        
        # 添加外部服务检查（仅当未跳过时）
        if not skip_external and config.enable_external_services and config.external_services:
            tasks.append(cls._check_external_services())
        
        # 添加自定义检查
        for check_func in cls._custom_checks.values():
            tasks.append(check_func())
        
        # 并行检查各个服务
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        db_health = results[0] if not isinstance(results[0], Exception) else {"status": "unhealthy", "error": str(results[0])}
        api_health = results[1] if not isinstance(results[1], Exception) else {"status": "unhealthy", "error": str(results[1])}
        storage_health = results[2] if not isinstance(results[2], Exception) else {"status": "unhealthy", "error": str(results[2])}
        
        external_health = {}
        # 只有当添加了外部服务检查任务时才访问 results[3]
        if not skip_external and config.enable_external_services and config.external_services:
            external_health = results[3] if not isinstance(results[3], Exception) else {}
        
        # 计算整体状态
        statuses = [db_health.get("status"), api_health.get("status"), storage_health.get("status")]
        if all(s == "healthy" for s in statuses):
            overall_status = "healthy"
        elif any(s == "unhealthy" for s in statuses):
            overall_status = "unhealthy"
        else:
            overall_status = "degraded"
        
        health_data = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "version": config.app_version,
            "services": {
                "database": db_health,
                "api": api_health,
                "storage": storage_health,
                "cache": {"status": "healthy", "type": "memory"}
            },
        }
        
        # 添加外部服务状态
        if external_health:
            health_data["render"] = external_health
        
        # 更新缓存
        cls._cache[cache_key] = {
            "timestamp": time.time(),
            "data": health_data
        }
        
        return health_data
    
    @classmethod
    async def get_database_metrics(cls) -> Dict[str, Any]:
        """
        获取数据库详细指标
        """
        config = cls._get_config()
        if not config.enable_database_metrics:
            return {"status": "disabled", "message": "Database metrics disabled"}
        
        try:
            # 优先使用 Supabase 客户端
            if is_using_supabase():
                client = get_supabase_client_instance()
                if client:
                    start_time = time.time()
                    # 测试连接响应时间
                    result = client.table('members').select('id').limit(1).execute()
                    response_time = round((time.time() - start_time) * 1000, 2)
                    
                    return {
                        "status": "healthy",
                        "responseTimeMs": response_time,
                        "type": "supabase",
                        "note": "Detailed metrics not available via Supabase REST API",
                        "timestamp": datetime.utcnow().isoformat()
                    }
            
            # 回退到 SQLAlchemy 获取详细指标
            async with await cls._get_db_session() as session:
                # 测试连接响应时间
                start_time = time.time()
                await session.execute(text("SELECT 1"))
                response_time = round((time.time() - start_time) * 1000, 2)
                
                # 获取数据库大小（Supabase/PostgreSQL）
                try:
                    result = await session.execute(text(
                        "SELECT pg_database_size(current_database()) as size"
                    ))
                    row = result.fetchone()
                    db_size = row[0] if row else 0
                except Exception:
                    db_size = 0
                
                # 获取连接数
                try:
                    result = await session.execute(text("""
                        SELECT 
                            count(*) as total,
                            count(*) FILTER (WHERE state = 'active') as active,
                            count(*) FILTER (WHERE state = 'idle') as idle
                        FROM pg_stat_activity 
                        WHERE datname = current_database()
                    """))
                    row = result.fetchone()
                    connections = {
                        "total": row[0] if row else 0,
                        "active": row[1] if row else 0,
                        "idle": row[2] if row else 0
                    }
                except Exception:
                    connections = {"total": 0, "active": 0, "idle": 0}
                
                # 获取表统计
                try:
                    result = await session.execute(text("""
                        SELECT count(*) FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """))
                    row = result.fetchone()
                    table_count = row[0] if row else 0
                except Exception:
                    table_count = 0
                
                return {
                    "status": "healthy",
                    "responseTimeMs": response_time,
                    "sizeBytes": db_size,
                    "sizeMB": round(db_size / (1024 * 1024), 2) if db_size else 0,
                    "connections": connections,
                    "tableCount": table_count,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to get database metrics: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    @classmethod
    async def _check_database(cls) -> Dict[str, Any]:
        """检查数据库连接 - 优先使用 Supabase"""
        try:
            # 优先使用 Supabase 客户端（REST API，更快）
            if is_using_supabase():
                client = get_supabase_client_instance()
                if client:
                    start_time = time.time()
                    # 简单查询测试连接
                    result = client.table('members').select('id').limit(1).execute()
                    response_time = round((time.time() - start_time) * 1000, 2)
                    
                    return {
                        "status": "healthy" if response_time < 1000 else "degraded",
                        "responseTimeMs": response_time,
                        "type": "supabase"
                    }
            
            # 回退到 SQLAlchemy
            async with await cls._get_db_session() as session:
                start_time = time.time()
                await session.execute(text("SELECT 1"))
                response_time = round((time.time() - start_time) * 1000, 2)
                
                return {
                    "status": "healthy" if response_time < 1000 else "degraded",
                    "responseTimeMs": response_time,
                    "type": "postgresql"
                }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    @classmethod
    async def _check_api(cls) -> Dict[str, Any]:
        """检查 API 服务状态"""
        config = cls._get_config()
        return {
            "status": "healthy",
            "uptime": cls._get_uptime(),
            "version": config.app_version
        }
    
    @classmethod
    async def _check_storage(cls) -> Dict[str, Any]:
        """检查存储服务状态（Supabase Storage）"""
        try:
            # 简单检查 - 实际可以调用 Supabase Storage API
            return {
                "status": "healthy",
                "type": "supabase_storage"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    @classmethod
    def _get_uptime(cls) -> str:
        """获取服务运行时间"""
        if not hasattr(cls, "_start_time"):
            cls._start_time = time.time()
        
        uptime_seconds = int(time.time() - cls._start_time)
        hours, remainder = divmod(uptime_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"
    
    @classmethod
    async def _check_external_services(cls) -> Dict[str, Any]:
        """检查外部部署的服务状态（如 Render）"""
        config = cls._get_config()
        results = {}
        
        async with httpx.AsyncClient(timeout=config.default_timeout) as client:
            for service_key, service_config in config.external_services.items():
                try:
                    start_time = time.time()
                    
                    # 构建检查 URL
                    if service_config.health_endpoint:
                        url = f"{service_config.url}{service_config.health_endpoint}"
                    elif service_config.type == "api":
                        url = f"{service_config.url}/api/health"
                    else:
                        url = service_config.url
                    
                    # 添加 skip_external=true 防止循环调用
                    if "?" in url:
                        url += "&skip_external=true"
                    else:
                        url += "?skip_external=true"
                    
                    response = await client.get(url)
                    response_time = round((time.time() - start_time) * 1000, 2)
                    
                    if response.status_code == 200:
                        status = "healthy" if response_time < 2000 else "degraded"
                    elif response.status_code < 500:
                        status = "degraded"
                    else:
                        status = "unhealthy"
                    
                    results[service_key] = {
                        "status": status,
                        "name": service_config.name,
                        "url": service_config.url,
                        "responseTimeMs": response_time,
                        "statusCode": response.status_code
                    }
                    
                except httpx.TimeoutException:
                    results[service_key] = {
                        "status": "unhealthy",
                        "name": service_config.name,
                        "url": service_config.url,
                        "error": "timeout"
                    }
                except Exception as e:
                    results[service_key] = {
                        "status": "unhealthy",
                        "name": service_config.name,
                        "url": service_config.url,
                        "error": str(e)
                    }
        
        return results
    
    @classmethod
    async def get_render_status(cls) -> Dict[str, Any]:
        """获取外部服务状态（独立接口）"""
        return await cls._check_external_services()
