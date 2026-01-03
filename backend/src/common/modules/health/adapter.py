"""
Health Module Adapter
模块适配器 - 迁移到其他项目时只需修改此文件

使用方式:
    1. 复制整个 health 文件夹到新项目
    2. 修改此文件中的 import 路径，适配新项目的数据库和配置
    3. 在 main.py 中注册路由
"""

import logging

logger = logging.getLogger(__name__)

# ============================================================
# 数据库适配 - 优先使用 Supabase 客户端
# ============================================================

# Lazy initialization to avoid circular imports
SUPABASE_CLIENT = None
USE_SUPABASE = False
_supabase_initialized = False

def _init_supabase():
    """Lazy initialize Supabase client"""
    global SUPABASE_CLIENT, USE_SUPABASE, _supabase_initialized
    if _supabase_initialized:
        return
    _supabase_initialized = True
    
    try:
        from ..supabase.client import get_supabase_client
        SUPABASE_CLIENT = get_supabase_client()
        USE_SUPABASE = True
        logger.info("[Health Module] Using Supabase client for health checks")
    except Exception as e:
        SUPABASE_CLIENT = None
        USE_SUPABASE = False
        logger.warning(f"[Health Module] Supabase client not available: {e}, falling back to SQLAlchemy")

# Fallback to SQLAlchemy (legacy)
try:
    from ..db.session import AsyncSessionLocal
except ImportError:
    AsyncSessionLocal = None
    logger.warning("[Health Module] SQLAlchemy session not found")


# ============================================================
# 配置适配
# 迁移时修改这个 import 路径指向新项目的配置
# ============================================================

try:
    from ..config import settings
    APP_VERSION = getattr(settings, 'APP_VERSION', '1.0.0')
except ImportError:
    import os
    APP_VERSION = os.getenv('APP_VERSION', '1.0.0')


# ============================================================
# 认证适配
# 迁移时修改这个 import 路径指向新项目的认证中间件
# ============================================================

try:
    from ..interceptor.auth import get_current_admin_user
except ImportError:
    # 如果没有认证中间件，提供一个空实现
    async def get_current_admin_user():
        return {"id": "anonymous", "role": "admin"}


# ============================================================
# 工厂函数
# ============================================================

def get_db_session_factory():
    """获取数据库 session 工厂（仅用于 SQLAlchemy 回退）"""
    if AsyncSessionLocal is None:
        return None
    return AsyncSessionLocal


def get_supabase_client_instance():
    """获取 Supabase 客户端实例"""
    _init_supabase()
    return SUPABASE_CLIENT


def is_using_supabase():
    """检查是否使用 Supabase 客户端"""
    _init_supabase()
    return USE_SUPABASE


async def check_database_health():
    """检查数据库健康状态（自动选择 Supabase 或 SQLAlchemy）"""
    _init_supabase()
    if USE_SUPABASE:
        try:
            from ..supabase.client import check_supabase_health
            return await check_supabase_health()
        except Exception:
            pass
    return None


def get_app_version():
    """获取应用版本"""
    return APP_VERSION


def get_auth_dependency():
    """获取认证依赖"""
    return get_current_admin_user
