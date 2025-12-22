"""
Message management service.

Handles all message-related database operations for the unified messages table.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from .base_service import BaseSupabaseService


class MessageService(BaseSupabaseService):
    """Service for message management operations using unified messages table."""
    
    # ============================================================================
    # Basic Message Operations
    # ============================================================================
    
    async def get_message_by_id(self, message_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取消息"""
        result = self.client.table('messages')\
            .select('*')\
            .eq('id', message_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建消息"""
        result = self.client.table('messages')\
            .insert(message_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create message: no data returned")
        return result.data[0]
    
    async def update_message(self, message_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新消息"""
        result = self.client.table('messages')\
            .update(update_data)\
            .eq('id', message_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update message {message_id}: no data returned")
        return result.data[0]
    
    async def delete_message(self, message_id: str) -> bool:
        """删除消息（硬删除）"""
        self.client.table('messages')\
            .delete()\
            .eq('id', message_id)\
            .execute()
        return True
    
    # ============================================================================
    # Direct Messages
    # ============================================================================
    
    async def create_direct_message(
        self,
        sender_id: Optional[str],
        recipient_id: str,
        subject: str,
        content: str,
        category: str = "general",
        priority: str = "normal",
        sender_type: str = "member"
    ) -> Dict[str, Any]:
        """创建直接消息"""
        message_data = {
            "message_type": "direct",
            "sender_id": sender_id,
            "sender_type": sender_type,
            "recipient_id": recipient_id,
            "subject": subject,
            "content": content,
            "category": category,
            "priority": priority,
            "status": "sent",
            "is_read": False,
            "is_important": priority in ["high", "urgent"],
            "is_broadcast": False,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        return await self.create_message(message_data)
    
    async def get_direct_messages_for_user(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        is_read: Optional[bool] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取用户的直接消息"""
        filters = {
            "message_type": "direct",
            "recipient_id": user_id
        }
        if is_read is not None:
            filters["is_read"] = is_read
        
        total = await self.count_records('messages', filters)
        
        query = self.client.table('messages').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    async def mark_message_as_read(self, message_id: str, user_id: str) -> Dict[str, Any]:
        """标记消息为已读"""
        update_data = {
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat()
        }
        
        # 验证用户权限
        message = await self.get_message_by_id(message_id)
        if not message or message.get("recipient_id") != user_id:
            raise ValueError("Message not found or access denied")
        
        return await self.update_message(message_id, update_data)
    
    async def get_unread_count_for_user(self, user_id: str) -> int:
        """获取用户未读消息数量"""
        filters = {
            "recipient_id": user_id,
            "is_read": False
        }
        return await self.count_records('messages', filters)
    
    # ============================================================================
    # Thread Messages
    # ============================================================================
    
    async def create_thread_message(
        self,
        thread_id: str,
        sender_id: Optional[str],
        recipient_id: str,
        subject: str,
        content: str,
        parent_id: Optional[str] = None,
        sender_type: str = "member"
    ) -> Dict[str, Any]:
        """创建线程消息"""
        message_data = {
            "message_type": "thread",
            "thread_id": thread_id,
            "parent_id": parent_id,
            "sender_id": sender_id,
            "sender_type": sender_type,
            "recipient_id": recipient_id,
            "subject": subject,
            "content": content,
            "category": "thread",
            "status": "sent",
            "is_read": False,
            "is_broadcast": False,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        return await self.create_message(message_data)
    
    async def get_thread_messages(
        self,
        thread_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取线程中的所有消息"""
        filters = {
            "message_type": "thread",
            "thread_id": thread_id
        }
        
        total = await self.count_records('messages', filters)
        
        query = self.client.table('messages').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        query = query.order('created_at', desc=False)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # Broadcast Messages
    # ============================================================================
    
    async def create_broadcast_message(
        self,
        sender_id: Optional[str],
        subject: str,
        content: str,
        category: str = "announcement",
        priority: str = "normal",
        sender_type: str = "admin"
    ) -> Dict[str, Any]:
        """创建广播消息模板"""
        message_data = {
            "message_type": "broadcast",
            "sender_id": sender_id,
            "sender_type": sender_type,
            "subject": subject,
            "content": content,
            "category": category,
            "priority": priority,
            "status": "sent",
            "is_read": False,
            "is_important": priority in ["high", "urgent"],
            "is_broadcast": True,
            "broadcast_count": 0,  # Will be updated when recipients are added
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        return await self.create_message(message_data)
    
    async def send_broadcast_to_recipients(
        self,
        broadcast_template_id: str,
        recipient_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """向多个接收者发送广播消息"""
        # Get the broadcast template
        template = await self.get_message_by_id(broadcast_template_id)
        if not template or template.get("message_type") != "broadcast":
            raise ValueError("Invalid broadcast template")
        
        # Create individual messages for each recipient
        created_messages = []
        for recipient_id in recipient_ids:
            message_data = {
                "message_type": "broadcast",
                "thread_id": broadcast_template_id,  # Link to original broadcast
                "sender_id": template["sender_id"],
                "sender_type": template["sender_type"],
                "recipient_id": recipient_id,
                "subject": template["subject"],
                "content": template["content"],
                "category": template["category"],
                "priority": template["priority"],
                "status": "sent",
                "is_read": False,
                "is_important": template["is_important"],
                "is_broadcast": True,
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }
            
            created_message = await self.create_message(message_data)
            created_messages.append(created_message)
        
        # Update broadcast count
        await self.update_message(broadcast_template_id, {
            "broadcast_count": len(recipient_ids)
        })
        
        return created_messages
    
    async def get_broadcast_messages(
        self,
        limit: int = 20,
        offset: int = 0,
        category: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取广播消息模板列表"""
        filters = {
            "message_type": "broadcast",
            "recipient_id": None  # Templates don't have specific recipients
        }
        if category:
            filters["category"] = category
        
        total = await self.count_records('messages', filters)
        
        query = self.client.table('messages').select('*')
        
        for key, value in filters.items():
            if key == "recipient_id" and value is None:
                query = query.is_('recipient_id', 'null')
            else:
                query = query.eq(key, value)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # Message Search and Filtering
    # ============================================================================
    
    async def search_messages(
        self,
        user_id: str,
        search_term: str,
        message_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """搜索用户的消息"""
        filters = {
            "recipient_id": user_id
        }
        if message_type:
            filters["message_type"] = message_type
        
        search_fields = ['subject', 'content']
        
        return await self._fuzzy_search_with_filters(
            'messages', search_fields, search_term, filters, limit, offset
        )
    
    async def get_messages_by_category(
        self,
        user_id: str,
        category: str,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """根据分类获取消息"""
        filters = {
            "recipient_id": user_id,
            "category": category
        }
        
        total = await self.count_records('messages', filters)
        
        query = self.client.table('messages').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    async def get_important_messages(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取重要消息"""
        filters = {
            "recipient_id": user_id,
            "is_important": True
        }
        
        total = await self.count_records('messages', filters)
        
        query = self.client.table('messages').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total