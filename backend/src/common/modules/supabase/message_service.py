"""
Message management service.

Handles all message-related database operations for the unified messages table.
"""
from typing import Dict, Any, List, Optional, Tuple
from .service import SupabaseService
from ...utils.formatters import now_iso


class MessageService(SupabaseService):
    """Service for message management operations using unified messages table."""
    
    # Message types
    TYPE_DIRECT = "direct"
    TYPE_THREAD = "thread"
    TYPE_BROADCAST = "broadcast"
    
    # Sender types
    SENDER_ADMIN = "admin"
    SENDER_MEMBER = "member"
    SENDER_SYSTEM = "system"
    
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
    # User/Admin Lookup (批量优化)
    # ============================================================================
    
    async def get_member_name(self, member_id: str) -> Optional[str]:
        """获取会员公司名称"""
        if not member_id:
            return None
        result = self.client.table('members').select('company_name').eq('id', member_id).execute()
        return result.data[0]['company_name'] if result.data else None
    
    async def get_member_names_batch(self, member_ids: List[str]) -> Dict[str, str]:
        """批量获取会员公司名称"""
        if not member_ids:
            return {}
        unique_ids = list(set(mid for mid in member_ids if mid))
        if not unique_ids:
            return {}
        result = self.client.table('members').select('id, company_name').in_('id', unique_ids).execute()
        return {m['id']: m['company_name'] for m in (result.data or [])}
    
    async def get_admin_name(self, admin_id: str) -> Optional[str]:
        """Get admin name by ID"""
        if not admin_id:
            return "System Admin"
        result = self.client.table('admins').select('full_name').eq('id', admin_id).execute()
        return result.data[0]['full_name'] if result.data else "System Admin"
    
    async def get_admin_names_batch(self, admin_ids: List[str]) -> Dict[str, str]:
        """Batch get admin names by IDs"""
        if not admin_ids:
            return {}
        unique_ids = list(set(aid for aid in admin_ids if aid))
        if not unique_ids:
            return {}
        result = self.client.table('admins').select('id, full_name').in_('id', unique_ids).execute()
        return {a['id']: a['full_name'] for a in (result.data or [])}
    
    async def is_admin(self, user_id: str) -> bool:
        """Check if user is admin"""
        if not user_id:
            return False
        result = self.client.table('admins').select('id').eq('id', user_id).execute()
        return len(result.data) > 0
    
    # ============================================================================
    # Unread Count (优化版)
    # ============================================================================
    
    async def get_unread_count(self, user_id: str, is_admin: bool = False) -> int:
        """
        获取未读消息数量（优化版，只查询 count）
        
        Args:
            user_id: 用户ID
            is_admin: 是否是管理员
        """
        query = self.client.table('messages').select('id', count='exact')
        
        if is_admin:
            # 管理员：统计会员发送的未读消息
            query = query.eq('sender_type', self.SENDER_MEMBER).eq('is_read', False)
        else:
            # 会员：统计发送给自己的未读消息
            query = query.eq('recipient_id', user_id).eq('is_read', False)
        
        result = query.execute()
        return result.count or 0
    
    # ============================================================================
    # Thread Operations (批量优化)
    # ============================================================================
    
    async def get_threads_paginated(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        sender_id: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        获取分页的 thread 列表
        
        Args:
            page: 页码
            page_size: 每页数量
            status: 状态过滤
            sender_id: 发送者ID过滤（用于会员端）
        """
        # 构建查询
        query = self.client.table('messages').select('*', count='exact')
        query = query.eq('message_type', self.TYPE_THREAD).is_('thread_id', 'null')
        
        if status:
            query = query.eq('status', status)
        if sender_id:
            query = query.eq('sender_id', sender_id)
        
        # 获取总数
        count_result = query.execute()
        total_count = count_result.count or 0
        
        # 获取分页数据
        offset = (page - 1) * page_size
        threads_query = self.client.table('messages').select('*')
        threads_query = threads_query.eq('message_type', self.TYPE_THREAD).is_('thread_id', 'null')
        
        if status:
            threads_query = threads_query.eq('status', status)
        if sender_id:
            threads_query = threads_query.eq('sender_id', sender_id)
        
        threads_query = threads_query.order('created_at', desc=True)
        threads_query = threads_query.range(offset, offset + page_size - 1)
        
        result = threads_query.execute()
        return result.data or [], total_count
    
    async def get_thread_stats_batch(self, thread_ids: List[str], for_admin: bool = False) -> Dict[str, Dict[str, int]]:
        """
        批量获取 thread 的消息统计
        
        Args:
            thread_ids: thread ID 列表
            for_admin: 是否是管理员视角（影响未读数计算）
            
        Returns:
            {thread_id: {'message_count': int, 'unread_count': int}}
        """
        if not thread_ids:
            return {}
        
        # 一次查询获取所有相关消息
        query = self.client.table('messages').select('thread_id, sender_type, is_read')
        query = query.in_('thread_id', thread_ids)
        result = query.execute()
        
        # 构建统计
        stats = {tid: {'message_count': 0, 'unread_count': 0} for tid in thread_ids}
        
        for msg in (result.data or []):
            tid = msg['thread_id']
            if tid in stats:
                stats[tid]['message_count'] += 1
                # 未读数计算
                if not msg['is_read']:
                    if for_admin and msg['sender_type'] == self.SENDER_MEMBER:
                        stats[tid]['unread_count'] += 1
                    elif not for_admin and msg['sender_type'] == self.SENDER_ADMIN:
                        stats[tid]['unread_count'] += 1
        
        return stats

    async def get_thread_by_id(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """获取单个 thread"""
        result = self.client.table('messages')\
            .select('*')\
            .eq('id', thread_id)\
            .eq('message_type', self.TYPE_THREAD)\
            .is_('thread_id', 'null')\
            .execute()
        return result.data[0] if result.data else None
    
    async def get_thread_messages_list(self, thread_id: str) -> List[Dict[str, Any]]:
        """获取 thread 下的所有消息（包含附件）"""
        result = self.client.table('messages')\
            .select('*')\
            .eq('thread_id', thread_id)\
            .order('created_at', desc=False)\
            .execute()
        
        messages = result.data or []
        if not messages:
            return messages
        
        # 附件数据已经存储在 messages 表的 attachments 字段中（JSONB）
        # 确保 attachments 字段存在且为数组格式
        for msg in messages:
            if msg.get('attachments') is None:
                msg['attachments'] = []
            elif not isinstance(msg.get('attachments'), list):
                msg['attachments'] = []
        
        return messages
    
    async def mark_thread_messages_as_read(
        self, 
        thread_id: str, 
        reader_type: str
    ) -> int:
        """
        标记 thread 中的消息为已读
        
        Args:
            thread_id: thread ID
            reader_type: 阅读者类型 ('admin' 或 'member')
            
        Returns:
            更新的消息数量
        """
        sender_type = self.SENDER_MEMBER if reader_type == 'admin' else self.SENDER_ADMIN
        
        result = self.client.table('messages')\
            .update({
                'is_read': True,
                'read_at': now_iso()
            })\
            .eq('thread_id', thread_id)\
            .eq('sender_type', sender_type)\
            .eq('is_read', False)\
            .execute()
        
        return len(result.data) if result.data else 0
    
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
            "sent_at": now_iso(),
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
            "read_at": now_iso()
        }
        
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
            "sent_at": now_iso(),
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
            "broadcast_count": 0,
            "sent_at": now_iso(),
        }
        return await self.create_message(message_data)
    
    async def send_broadcast_to_recipients(
        self,
        broadcast_template_id: str,
        recipient_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """向多个接收者发送广播消息"""
        template = await self.get_message_by_id(broadcast_template_id)
        if not template or template.get("message_type") != "broadcast":
            raise ValueError("Invalid broadcast template")
        
        created_messages = []
        for recipient_id in recipient_ids:
            message_data = {
                "message_type": "broadcast",
                "thread_id": broadcast_template_id,
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
                "sent_at": now_iso(),
            }
            
            created_message = await self.create_message(message_data)
            created_messages.append(created_message)
        
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
        query = self.client.table('messages').select('*', count='exact')
        query = query.eq('message_type', 'broadcast').is_('recipient_id', 'null')
        
        if category:
            query = query.eq('category', category)
        
        count_result = query.execute()
        total = count_result.count or 0
        
        data_query = self.client.table('messages').select('*')
        data_query = data_query.eq('message_type', 'broadcast').is_('recipient_id', 'null')
        
        if category:
            data_query = data_query.eq('category', category)
        
        data_query = data_query.order('created_at', desc=True).range(offset, offset + limit - 1)
        
        result = data_query.execute()
        return result.data or [], total

    # ============================================================================
    # Extended Operations (for messages/service.py)
    # ============================================================================
    
    async def get_messages_paginated(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None,
        is_important: Optional[bool] = None,
        is_read: Optional[bool] = None,
        is_admin: bool = False
    ) -> Tuple[List[Dict[str, Any]], int, int]:
        """
        获取用户消息列表（分页）
        
        Args:
            user_id: 用户ID
            page: 页码
            page_size: 每页数量
            category: 分类过滤
            is_important: 重要性过滤
            is_read: 已读状态过滤
            is_admin: 是否是管理员（管理员查看所有直接消息）
        
        Returns:
            (messages, total_count, unread_count)
        """
        # 构建基础过滤条件
        query = self.client.table('messages').select('*', count='exact')
        
        if is_admin:
            # 管理员：只查看发送给管理员的消息或管理员发送的消息
            # 排除 sender_id 为 null 且 recipient_id 不是管理员的消息（系统发给会员的通知）
            query = query.eq('message_type', 'direct')
            query = query.eq('recipient_id', user_id)
        else:
            # 会员：只查看发送给自己的消息
            query = query.eq('recipient_id', user_id)
        
        if category:
            query = query.eq('category', category)
        if is_important is not None:
            query = query.eq('is_important', is_important)
        if is_read is not None:
            query = query.eq('is_read', is_read)
        
        count_result = query.execute()
        total_count = count_result.count or 0
        
        # 获取未读数
        unread_query = self.client.table('messages').select('id', count='exact')
        if is_admin:
            # 管理员：只统计发送给管理员的未读消息
            unread_query = unread_query.eq('message_type', 'direct').eq('is_read', False)
            unread_query = unread_query.eq('recipient_id', user_id)
        else:
            unread_query = unread_query.eq('recipient_id', user_id).eq('is_read', False)
        
        if category:
            unread_query = unread_query.eq('category', category)
        if is_important is not None:
            unread_query = unread_query.eq('is_important', is_important)
        
        unread_result = unread_query.execute()
        unread_count = unread_result.count or 0
        
        # 获取分页数据
        offset = (page - 1) * page_size
        messages_query = self.client.table('messages').select('*')
        
        if is_admin:
            # 管理员：只查看发送给管理员的消息
            messages_query = messages_query.eq('message_type', 'direct')
            messages_query = messages_query.eq('recipient_id', user_id)
        else:
            messages_query = messages_query.eq('recipient_id', user_id)
        
        if category:
            messages_query = messages_query.eq('category', category)
        if is_important is not None:
            messages_query = messages_query.eq('is_important', is_important)
        if is_read is not None:
            messages_query = messages_query.eq('is_read', is_read)
        
        messages_query = messages_query.order('created_at', desc=True)
        messages_query = messages_query.range(offset, offset + page_size - 1)
        
        result = messages_query.execute()
        return result.data or [], total_count, unread_count
    
    async def get_message_with_access_check(
        self,
        message_id: str,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """获取消息并检查访问权限"""
        result = self.client.table('messages').select('*').eq('id', message_id).execute()
        
        if not result.data:
            return None
        
        message = result.data[0]
        
        # 检查访问权限
        if message.get('sender_id') != user_id and message.get('recipient_id') != user_id:
            return None
        
        return message
    
    async def mark_as_read(self, message_id: str) -> Dict[str, Any]:
        """标记消息为已读"""
        update_data = {
            'is_read': True,
            'read_at': now_iso()
        }
        result = self.client.table('messages').update(update_data).eq('id', message_id).execute()
        return result.data[0] if result.data else {}
    
    async def soft_delete_message(self, message_id: str) -> bool:
        """软删除消息"""
        self.client.table('messages')\
            .update({'deleted_at': now_iso()})\
            .eq('id', message_id)\
            .execute()
        return True
    
    async def insert_message(self, message_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """插入消息"""
        result = self.client.table('messages').insert(message_data).execute()
        return result.data[0] if result.data else None
    
    async def insert_messages_batch(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """批量插入消息"""
        if not messages:
            return []
        result = self.client.table('messages').insert(messages).execute()
        return result.data or []
    
    async def update_thread_status(self, thread_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """更新 thread 状态"""
        result = self.client.table('messages')\
            .update(update_data)\
            .eq('id', thread_id)\
            .eq('message_type', self.TYPE_THREAD)\
            .execute()
        return result.data[0] if result.data else None
    
    async def get_active_member_ids(self) -> List[str]:
        """获取所有活跃会员ID"""
        result = self.client.table('members').select('id').eq('status', 'active').execute()
        return [m['id'] for m in (result.data or [])]
    
    async def get_analytics_data(self, start_date: Optional[str] = None) -> Dict[str, Any]:
        """获取分析数据"""
        from datetime import datetime as dt
        
        # 总消息数
        total_query = self.client.table('messages').select('id', count='exact')
        if start_date:
            total_query = total_query.gte('created_at', start_date)
        total_result = total_query.execute()
        
        # 未读消息数
        unread_query = self.client.table('messages').select('id', count='exact').eq('is_read', False)
        if start_date:
            unread_query = unread_query.gte('created_at', start_date)
        unread_result = unread_query.execute()
        
        # 按天统计消息数
        messages_by_day = []
        messages_by_category = []
        response_time_by_day = []
        avg_response_time = 0.0
        
        # 获取消息列表用于统计
        messages_query = self.client.table('messages').select('created_at, category, thread_id, sender_type')
        if start_date:
            messages_query = messages_query.gte('created_at', start_date)
        messages_result = messages_query.execute()
        
        if messages_result.data:
            # 按天分组
            day_counts = {}
            category_counts = {}
            
            # 用于计算响应时间的数据结构
            thread_messages = {}  # thread_id -> list of messages
            
            for msg in messages_result.data:
                # 按天统计
                if msg.get('created_at'):
                    day = msg['created_at'][:10]  # YYYY-MM-DD
                    day_counts[day] = day_counts.get(day, 0) + 1
                
                # 按分类统计
                category = msg.get('category') or 'general'
                category_counts[category] = category_counts.get(category, 0) + 1
                
                # 收集线程消息用于计算响应时间
                thread_id = msg.get('thread_id')
                if thread_id:
                    if thread_id not in thread_messages:
                        thread_messages[thread_id] = []
                    thread_messages[thread_id].append(msg)
            
            # 转换为列表格式
            messages_by_day = [
                {'date': day, 'count': count}
                for day, count in sorted(day_counts.items())
            ]
            messages_by_category = [
                {'category': cat, 'count': count}
                for cat, count in category_counts.items()
            ]
            
            # 计算响应时间（从会员消息到管理员回复的时间）
            response_times = []
            day_response_times = {}
            
            for thread_id, msgs in thread_messages.items():
                # 按时间排序
                sorted_msgs = sorted(msgs, key=lambda x: x.get('created_at', ''))
                
                # 找到第一条会员消息和第一条管理员回复
                first_member_msg = None
                first_admin_reply = None
                
                for msg in sorted_msgs:
                    sender_type = msg.get('sender_type')
                    if sender_type == 'member' and first_member_msg is None:
                        first_member_msg = msg
                    elif sender_type == 'admin' and first_member_msg and first_admin_reply is None:
                        first_admin_reply = msg
                        break
                
                if first_member_msg and first_admin_reply:
                    try:
                        created_at = first_member_msg['created_at']
                        replied_at = first_admin_reply['created_at']
                        created = dt.fromisoformat(created_at.replace('Z', '+00:00'))
                        replied = dt.fromisoformat(replied_at.replace('Z', '+00:00'))
                        response_minutes = (replied - created).total_seconds() / 60
                        
                        if response_minutes >= 0:
                            response_times.append(response_minutes)
                            day = created_at[:10]
                            if day not in day_response_times:
                                day_response_times[day] = []
                            day_response_times[day].append(response_minutes)
                    except (ValueError, TypeError):
                        pass
            
            # 计算平均响应时间
            if response_times:
                avg_response_time = sum(response_times) / len(response_times)
            
            # 按天计算平均响应时间
            response_time_by_day = [
                {'date': day, 'responseTime': round(sum(times) / len(times), 1)}
                for day, times in sorted(day_response_times.items())
            ]
        
        return {
            'total_messages': total_result.count or 0,
            'unread_messages': unread_result.count or 0,
            'messages_by_day': messages_by_day,
            'messages_by_category': messages_by_category,
            'response_time': round(avg_response_time, 1),
            'response_time_by_day': response_time_by_day,
        }


# 单例实例
message_db_service = MessageService()
