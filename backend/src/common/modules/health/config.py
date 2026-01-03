"""
Health Module Configuration
健康检查模块配置 - 支持可插拔部署
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import os


class ServiceConfig(BaseModel):
    """服务检查配置"""
    name: str
    url: str
    type: str = "api"  # api, static, database
    health_endpoint: Optional[str] = None  # 自定义健康检查端点
    timeout: float = 3.0  # Reduced from 5.0 to fail faster on cold starts


class HealthModuleConfig(BaseModel):
    """健康检查模块配置"""
    
    # 缓存配置
    cache_ttl: int = 60  # Increased from 30 to reduce external service checks
    
    # 检查超时
    default_timeout: float = 3.0  # Reduced from 5.0 for faster failure on cold starts
    
    # 外部服务配置（如 Render 部署的服务）
    external_services: Dict[str, ServiceConfig] = {}
    
    # 功能开关
    enable_database_metrics: bool = True
    enable_external_services: bool = True
    
    # 应用信息
    app_version: str = "1.0.0"


# 默认配置
_default_config: Optional[HealthModuleConfig] = None


def get_default_config() -> HealthModuleConfig:
    """获取默认配置，从环境变量读取"""
    global _default_config
    
    if _default_config is None:
        # 从环境变量构建外部服务配置
        external_services = {}
        
        # Render 服务配置（可通过环境变量覆盖）
        backend_url = os.getenv("HEALTH_BACKEND_URL", "https://gangwon-business-portal.onrender.com")
        frontend_url = os.getenv("HEALTH_FRONTEND_URL", "https://gangwon-business-portal-frontend.onrender.com")
        
        if os.getenv("HEALTH_ENABLE_RENDER", "true").lower() == "true":
            external_services = {
                "backend": ServiceConfig(
                    name="gangwon-business-portal",
                    url=backend_url,
                    type="api",
                    health_endpoint="/api/health"
                ),
                "frontend": ServiceConfig(
                    name="gangwon-business-portal-frontend",
                    url=frontend_url,
                    type="static"
                )
            }
        
        _default_config = HealthModuleConfig(
            cache_ttl=int(os.getenv("HEALTH_CACHE_TTL", "60")),  # Cache for 60s to reduce DB queries
            default_timeout=float(os.getenv("HEALTH_TIMEOUT", "5.0")),
            external_services=external_services,
            enable_database_metrics=os.getenv("HEALTH_ENABLE_DB_METRICS", "true").lower() == "true",
            enable_external_services=os.getenv("HEALTH_ENABLE_EXTERNAL", "true").lower() == "true",
            app_version=os.getenv("APP_VERSION", "1.0.0")
        )
    
    return _default_config


def configure(config: HealthModuleConfig) -> None:
    """设置模块配置（用于自定义配置）"""
    global _default_config
    _default_config = config
