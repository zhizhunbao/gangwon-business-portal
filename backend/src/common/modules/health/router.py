"""
Health Check Router
系统健康检查 API 路由
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any

from .service import HealthService
from .adapter import get_auth_dependency

router = APIRouter(prefix="/api/health", tags=["Health"])

# 获取认证依赖
_get_current_admin_user = get_auth_dependency()


@router.get("")
async def get_system_health(
    skip_external: bool = False
) -> Dict[str, Any]:
    """
    获取系统健康状态（公开接口，用于外部监控）
    
    Args:
        skip_external: 是否跳过外部服务检查（防止循环调用）
    """
    return await HealthService.get_system_health(skip_external=skip_external)


@router.get("/detailed")
async def get_detailed_health(
    current_user: dict = Depends(_get_current_admin_user)
) -> Dict[str, Any]:
    """
    获取详细的系统健康状态（需要管理员权限）
    """
    health = await HealthService.get_system_health()
    db_metrics = await HealthService.get_database_metrics()
    
    return {
        **health,
        "database_metrics": db_metrics
    }


@router.get("/database")
async def get_database_health(
    current_user: dict = Depends(_get_current_admin_user)
) -> Dict[str, Any]:
    """
    获取数据库详细指标（需要管理员权限）
    """
    return await HealthService.get_database_metrics()


@router.get("/render")
async def get_render_status(
    current_user: dict = Depends(_get_current_admin_user)
) -> Dict[str, Any]:
    """
    获取 Render 服务状态（需要管理员权限）
    """
    return await HealthService.get_render_status()
