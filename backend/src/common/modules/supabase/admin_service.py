"""
Admin management service.

Handles all admin-related database operations.
"""
from typing import Dict, Any, Optional
from .base_service import BaseSupabaseService


class AdminService(BaseSupabaseService):
    """Service for admin management operations."""
    
    async def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取管理员"""
        result = self.client.table('admins')\
            .select('*')\
            .eq('id', admin_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取管理员"""
        result = self.client.table('admins')\
            .select('*')\
            .eq('email', email)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_admin(self, admin_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新管理员"""
        result = self.client.table('admins')\
            .insert(admin_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create admin: no data returned")
        return result.data[0]
    
    async def update_admin(self, admin_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新管理员信息"""
        result = self.client.table('admins')\
            .update(update_data)\
            .eq('id', admin_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update admin {admin_id}: no data returned")
        return result.data[0]
    
    async def delete_admin(self, admin_id: str) -> bool:
        """删除管理员（硬删除）"""
        self.client.table('admins')\
            .delete()\
            .eq('id', admin_id)\
            .execute()
        return True
    
    async def check_admin_email_uniqueness(self, email: str, exclude_admin_id: Optional[str] = None) -> bool:
        """检查管理员邮箱是否已被使用"""
        query = self.client.table('admins').select('id').eq('email', email)
        
        if exclude_admin_id:
            query = query.neq('id', exclude_admin_id)
        
        result = query.execute()
        return len(result.data) == 0