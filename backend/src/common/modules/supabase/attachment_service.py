"""
Attachment management service.

Handles all attachment-related database operations.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from .base_service import BaseSupabaseService


class AttachmentService(BaseSupabaseService):
    """Service for attachment management operations."""
    
    async def create_attachment(self, attachment_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建附件记录"""
        result = self.client.table('attachments')\
            .insert(attachment_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create attachment: no data returned")
        return result.data[0]
    
    async def get_attachment_by_id(self, attachment_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取附件"""
        result = self.client.table('attachments')\
            .select('*')\
            .eq('id', attachment_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def delete_attachment(self, attachment_id: str) -> bool:
        """软删除附件记录（设置 deleted_at）"""
        self.client.table('attachments')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', attachment_id)\
            .execute()
        return True
    
    async def get_attachments_by_resource(self, resource_type: str, resource_id: str) -> List[Dict[str, Any]]:
        """根据资源类型和ID获取附件列表"""
        result = self.client.table('attachments')\
            .select('*')\
            .eq('resource_type', resource_type)\
            .eq('resource_id', resource_id)\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)\
            .execute()
        return result.data or []
    
    async def get_attachments_by_resource_ids(self, resource_type: str, resource_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """批量获取多个资源的附件"""
        if not resource_ids:
            return {}
        
        result = self.client.table('attachments')\
            .select('id, resource_id, original_name, file_size')\
            .eq('resource_type', resource_type)\
            .in_('resource_id', resource_ids)\
            .is_('deleted_at', 'null')\
            .execute()
        
        # 按 resource_id 分组
        attachments_map = {}
        for attachment in result.data or []:
            resource_id = attachment['resource_id']
            if resource_id not in attachments_map:
                attachments_map[resource_id] = []
            attachments_map[resource_id].append(attachment)
        
        return attachments_map
    
    async def update_attachment(self, attachment_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新附件信息"""
        result = self.client.table('attachments')\
            .update(update_data)\
            .eq('id', attachment_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update attachment {attachment_id}: no data returned")
        return result.data[0]
    
    async def get_attachments_by_user(self, user_id: str, resource_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取用户上传的所有附件"""
        query = self.client.table('attachments')\
            .select('*')\
            .eq('uploaded_by', user_id)\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)
        
        if resource_type:
            query = query.eq('resource_type', resource_type)
        
        result = query.execute()
        return result.data or []