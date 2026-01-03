"""
Messages service.

Business logic for internal messaging system.
All database operations are delegated to message_db_service.
"""
from typing import List, Tuple, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone, timedelta

from ...common.modules.exception import NotFoundError, ValidationError, CMessageTemplate
from ...common.modules.supabase.message_service import message_db_service
from ...common.modules.supabase.service import supabase_service
from ...common.modules.email.service import EmailService
from .schemas import (
    MessageCreate, MessageUpdate, ThreadCreate, ThreadMessageCreate,
    ThreadUpdate, BroadcastCreate
)


class MessageService:
    """Message service class - all DB operations via message_db_service."""

    # Message types
    TYPE_DIRECT = "direct"
    TYPE_THREAD = "thread"
    TYPE_BROADCAST = "broadcast"

    # Sender types
    SENDER_ADMIN = "admin"
    SENDER_MEMBER = "member"
    SENDER_SYSTEM = "system"

    def __init__(self):
        self.email_service = EmailService()
        self.db = message_db_service

    # ============================================================================
    # Helper Methods
    # ============================================================================

    async def _get_member_name(self, member_id: str) -> Optional[str]:
        return await self.db.get_member_name(member_id)

    async def _get_admin_name(self, admin_id: str) -> Optional[str]:
        return await self.db.get_admin_name(admin_id)

    async def _is_admin(self, user_id: str) -> bool:
        return await self.db.is_admin(user_id)

    async def _enrich_message_with_sender(self, message: dict) -> dict:
        """Add sender_name to message based on sender_type."""
        sender_type = message.get('sender_type')
        if sender_type == 'admin':
            message['sender_name'] = await self._get_admin_name(message.get('sender_id'))
        elif sender_type == 'member':
            message['sender_name'] = await self._get_member_name(message.get('sender_id'))
        else:
            message['sender_name'] = "System"
        return message

    async def _enrich_messages_with_senders_batch(self, messages: List[dict]) -> List[dict]:
        """Batch enrich messages with sender names to avoid N+1 queries."""
        if not messages:
            return messages

        # Collect unique sender IDs by type
        admin_ids = set()
        member_ids = set()

        for msg in messages:
            sender_type = msg.get('sender_type')
            sender_id = msg.get('sender_id')
            if sender_id:
                if sender_type == 'admin':
                    admin_ids.add(sender_id)
                elif sender_type == 'member':
                    member_ids.add(sender_id)

        # Batch fetch names
        admin_names = {}
        member_names = {}

        if admin_ids:
            admin_names = await self.db.get_admin_names_batch(list(admin_ids))

        if member_ids:
            member_names = await self.db.get_member_names_batch(list(member_ids))

        # Enrich messages
        for msg in messages:
            sender_type = msg.get('sender_type')
            sender_id = msg.get('sender_id')

            if sender_type == 'admin':
                msg['sender_name'] = admin_names.get(sender_id, "System Admin")
            elif sender_type == 'member':
                msg['sender_name'] = member_names.get(sender_id)
            else:
                msg['sender_name'] = "System"

        return messages

    # ============================================================================
    # Core Message Operations
    # ============================================================================

    async def get_messages(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None,
        is_important: Optional[bool] = None,
        is_admin: bool = False,
    ) -> Tuple[List[dict], int, int]:
        """Get paginated list of messages for a user."""
        messages, total_count, unread_count = await self.db.get_messages_paginated(
            user_id=str(user_id),
            page=page,
            page_size=page_size,
            category=category,
            is_important=is_important,
            is_admin=is_admin
        )

        # Enrich messages with sender names
        for message in messages:
            await self._enrich_message_with_sender(message)

        return messages, total_count, unread_count

    async def get_message_by_id(self, message_id: UUID, user_id: UUID) -> dict:
        """Get message by ID and mark as read if user is recipient."""
        message = await self.db.get_message_with_access_check(str(message_id), str(user_id))

        if not message:
            raise NotFoundError(resource_type="Message")

        # Mark as read if user is recipient and message is unread
        if message.get('recipient_id') == str(user_id) and not message.get('is_read', False):
            await self.db.mark_as_read(str(message_id))
            message['is_read'] = True
            message['read_at'] = datetime.now(timezone.utc).isoformat()

        await self._enrich_message_with_sender(message)
        return message

    async def create_message(self, data: MessageCreate, sender_id: UUID) -> dict:
        """Create a new message."""
        is_admin = await self._is_admin(str(sender_id))

        message_data = {
            "id": str(uuid4()),
            "message_type": self.TYPE_DIRECT,
            "sender_id": str(sender_id),
            "sender_type": self.SENDER_ADMIN if is_admin else self.SENDER_MEMBER,
            "recipient_id": str(data.recipient_id),
            "subject": data.subject,
            "content": data.content,
            "category": getattr(data, 'category', "general"),
            "is_important": getattr(data, 'is_important', False),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        message = await self.db.insert_message(message_data)
        if not message:
            raise ValidationError(
                CMessageTemplate.VALIDATION_OPERATION_FAILED.format(operation="create message")
            )

        await self._enrich_message_with_sender(message)
        return message

    async def update_message(self, message_id: UUID, data: MessageUpdate, user_id: UUID) -> dict:
        """Update a message (mark as read/unread, important)."""
        message = await self.db.get_message_with_access_check(str(message_id), str(user_id))
        if not message:
            raise NotFoundError(resource_type="Message")

        update_data = {}
        if hasattr(data, 'is_read') and data.is_read is not None:
            update_data['is_read'] = data.is_read
            if data.is_read:
                update_data['read_at'] = datetime.now(timezone.utc).isoformat()

        if hasattr(data, 'is_important') and data.is_important is not None:
            update_data['is_important'] = data.is_important

        if not update_data:
            return message

        updated = await self.db.update_message(str(message_id), update_data)
        return updated

    async def delete_message(self, message_id: UUID, user_id: UUID) -> None:
        """Soft delete a message."""
        message = await self.db.get_message_with_access_check(str(message_id), str(user_id))
        if not message:
            raise NotFoundError(resource_type="Message")

        await self.db.soft_delete_message(str(message_id))

    # ============================================================================
    # Unified Message Operations
    # ============================================================================

    async def get_unread_count_unified(self, user_id: UUID, is_admin: bool = False) -> dict:
        """Get unread message count for a user."""
        count = await self.db.get_unread_count(str(user_id), is_admin)
        return {
            "unread_count": count,
            "direct_count": count,
            "thread_count": 0,
        }

    async def create_direct_message(
        self,
        sender_id: Optional[UUID],
        recipient_id: UUID,
        data: MessageCreate
    ) -> dict:
        """Create a direct message."""
        message_data = {
            "id": str(uuid4()),
            "message_type": self.TYPE_DIRECT,
            "sender_id": str(sender_id) if sender_id else None,
            "sender_type": self.SENDER_ADMIN if sender_id else self.SENDER_SYSTEM,
            "recipient_id": str(recipient_id),
            "subject": data.subject,
            "content": data.content,
            "category": "general",
            "is_important": getattr(data, 'is_important', False),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        return await self.db.insert_message(message_data)

    async def mark_as_read_unified(self, message_id: UUID, user_id: UUID) -> dict:
        """Mark a message as read."""
        message = await self.db.get_message_by_id(str(message_id))
        if not message or message.get('recipient_id') != str(user_id):
            raise NotFoundError(resource_type="Message")

        await self.db.mark_as_read(str(message_id))
        message['is_read'] = True
        message['read_at'] = datetime.now(timezone.utc).isoformat()
        return message

    # ============================================================================
    # Thread Operations
    # ============================================================================

    async def get_admin_threads(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        has_unread: Optional[bool] = None,
    ) -> Tuple[List[dict], int]:
        """Get all threads for admin with pagination."""
        threads, total_count = await self.db.get_threads_paginated(
            page=page,
            page_size=page_size,
            status=status
        )

        if not threads:
            return threads, total_count

        # Batch get stats and member names
        thread_ids = [t['id'] for t in threads]
        thread_stats = await self.db.get_thread_stats_batch(thread_ids, for_admin=True)

        member_ids = list(set(t.get('sender_id') for t in threads if t.get('sender_id')))
        member_names = await self.db.get_member_names_batch(member_ids)

        for thread in threads:
            stats = thread_stats.get(thread['id'], {'message_count': 0, 'unread_count': 0})
            thread['message_count'] = stats['message_count']
            thread['admin_unread_count'] = stats['unread_count']
            thread['unread_count'] = stats['unread_count']
            thread['member_name'] = member_names.get(thread.get('sender_id'))
            thread['member_id'] = thread.get('sender_id')
            thread['created_by'] = thread.get('sender_id')
            thread['assigned_to'] = None
            thread['last_message_at'] = thread.get('updated_at', thread.get('created_at'))
            thread['category'] = thread.get('category', 'general')

        return threads, total_count

    async def get_member_threads(
        self,
        member_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[List[dict], int]:
        """Get threads for a specific member."""
        threads, total_count = await self.db.get_threads_paginated(
            page=page,
            page_size=page_size,
            status=status,
            sender_id=str(member_id)
        )

        if not threads:
            return threads, total_count

        thread_ids = [t['id'] for t in threads]
        thread_stats = await self.db.get_thread_stats_batch(thread_ids, for_admin=False)
        member_name = await self.db.get_member_name(str(member_id))

        for thread in threads:
            stats = thread_stats.get(thread['id'], {'message_count': 0, 'unread_count': 0})
            thread['message_count'] = stats['message_count']
            thread['unread_count'] = stats['unread_count']
            thread['member_name'] = member_name
            thread['member_id'] = str(member_id)
            thread['created_by'] = str(member_id)
            thread['assigned_to'] = None
            thread['last_message_at'] = thread.get('updated_at', thread.get('created_at'))
            thread['category'] = thread.get('category', 'general')

        return threads, total_count

    async def create_thread(self, data: ThreadCreate, member_id: UUID) -> dict:
        """Create a new message thread."""
        thread_data = {
            "id": str(uuid4()),
            "message_type": self.TYPE_THREAD,
            "sender_id": str(member_id),
            "sender_type": self.SENDER_MEMBER,
            "recipient_id": str(member_id),
            "subject": data.subject,
            "content": f"Thread: {data.subject}",
            "category": getattr(data, 'category', "general"),
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        thread = await self.db.insert_message(thread_data)

        # Create first message if content provided
        if thread and hasattr(data, 'content') and data.content:
            # 传递附件到第一条消息
            first_message_data = ThreadMessageCreate(
                content=data.content,
                attachments=getattr(data, 'attachments', [])
            )
            await self.create_thread_message_unified(
                UUID(thread['id']),
                first_message_data,
                member_id,
                self.SENDER_MEMBER
            )

        return thread

    async def create_thread_message_unified(
        self,
        thread_id: UUID,
        data: ThreadMessageCreate,
        sender_id: UUID,
        sender_type: str
    ) -> dict:
        """Create a message in an existing thread."""
        thread = await self.db.get_thread_by_id(str(thread_id))
        if not thread:
            raise NotFoundError(resource_type="Thread")

        now = datetime.now(timezone.utc)
        message_id = str(uuid4())
        message_data = {
            "id": message_id,
            "message_type": self.TYPE_THREAD,
            "thread_id": str(thread_id),
            "sender_id": str(sender_id),
            "sender_type": sender_type,
            "recipient_id": thread['recipient_id'],
            "subject": thread['subject'],
            "content": data.content,
            "category": thread.get('category', 'general'),
            "is_important": getattr(data, 'is_important', False),
            "created_at": now.isoformat(),
        }

        message = await self.db.insert_message(message_data)
        
        # 保存附件到 attachments 表
        attachments = getattr(data, 'attachments', [])
        saved_attachments = []
        if attachments and message:
            for att in attachments:
                # 附件数据来自前端上传后返回的信息
                original_name = att.get('fileName') or att.get('original_name') or att.get('name')
                file_url = att.get('filePath') or att.get('file_url') or att.get('url')
                # stored_name 如果没有，则从 file_url 提取或使用 original_name
                stored_name = att.get('storedName') or att.get('stored_name')
                if not stored_name and file_url:
                    # 从 URL 中提取文件名作为 stored_name
                    stored_name = file_url.split('/')[-1].split('?')[0]
                if not stored_name:
                    stored_name = original_name
                
                attachment_data = {
                    "id": str(uuid4()),
                    "resource_type": "thread",
                    "resource_id": message_id,
                    "file_type": att.get('fileType') or att.get('file_type') or 'document',
                    "file_url": file_url,
                    "original_name": original_name,
                    "stored_name": stored_name,
                    "file_size": att.get('fileSize') or att.get('file_size') or att.get('size'),
                    "mime_type": att.get('mimeType') or att.get('mime_type'),
                }
                saved_att = await supabase_service.create_record('attachments', attachment_data)
                if saved_att:
                    saved_attachments.append({
                        'id': saved_att['id'],
                        'file_url': saved_att['file_url'],
                        'file_name': saved_att['original_name'],
                        'file_size': saved_att['file_size'],
                        'mime_type': saved_att['mime_type']
                    })
        
        # 将附件信息添加到返回的消息中
        if message:
            message['attachments'] = saved_attachments
        
        # 更新 thread 的 updated_at（用于计算 last_message_at）
        await self.db.update_thread_status(str(thread_id), {
            "updated_at": now.isoformat()
        })
        
        return message

    # Alias for router compatibility
    async def create_thread_message(
        self,
        thread_id: UUID,
        data: ThreadMessageCreate,
        sender_id: UUID,
        sender_type: str
    ) -> dict:
        """Alias for create_thread_message_unified."""
        return await self.create_thread_message_unified(thread_id, data, sender_id, sender_type)

    async def get_thread_with_messages(self, thread_id: UUID, user_id: UUID) -> dict:
        """Get thread with all messages (optimized with batch queries)."""
        thread = await self.db.get_thread_by_id(str(thread_id))
        if not thread:
            raise NotFoundError(resource_type="Thread")

        # Check access
        is_admin = await self._is_admin(str(user_id))
        if not is_admin and thread.get('sender_id') != str(user_id):
            raise NotFoundError(resource_type="Thread")

        # Get messages and member name in parallel-ish (could use asyncio.gather for true parallel)
        messages = await self.db.get_thread_messages_list(str(thread_id))
        member_name = await self._get_member_name(thread.get('sender_id'))

        # Mark messages as read (fire and forget style, don't wait)
        reader_type = 'admin' if is_admin else 'member'
        await self.db.mark_thread_messages_as_read(str(thread_id), reader_type)

        # Batch enrich messages with sender names (optimized)
        await self._enrich_messages_with_senders_batch(messages)

        # Add thread metadata
        thread['member_name'] = member_name
        thread['member_id'] = thread.get('sender_id')
        thread['created_by'] = thread.get('sender_id')
        thread['assigned_to'] = None
        thread['last_message_at'] = messages[-1]['created_at'] if messages else thread.get('created_at')
        thread['unread_count'] = 0
        thread['category'] = thread.get('category', 'general')

        return {'thread': thread, 'messages': messages}

    async def update_thread(self, thread_id: UUID, data: ThreadUpdate, user_id: UUID) -> dict:
        """Update thread status."""
        thread = await self.db.get_thread_by_id(str(thread_id))
        if not thread:
            raise NotFoundError(resource_type="Thread")

        # Check access
        is_admin = await self._is_admin(str(user_id))
        if not is_admin and thread.get('sender_id') != str(user_id):
            raise NotFoundError(resource_type="Thread")

        update_data = {}
        if hasattr(data, 'status') and data.status:
            update_data['status'] = data.status
        if hasattr(data, 'subject') and data.subject:
            update_data['subject'] = data.subject

        if not update_data:
            return thread

        updated = await self.db.update_thread_status(str(thread_id), update_data)
        return updated if updated else thread

    # ============================================================================
    # Broadcast Operations
    # ============================================================================

    async def create_broadcast(self, data: BroadcastCreate, sender_id: UUID) -> dict:
        """Create and send a broadcast message."""
        is_admin = await self._is_admin(str(sender_id))
        if not is_admin:
            raise ValidationError(CMessageTemplate.MESSAGE_BROADCAST_ADMIN_ONLY)

        # Get recipient IDs
        if data.send_to_all:
            recipient_ids = await self.db.get_active_member_ids()
        else:
            recipient_ids = [str(rid) for rid in (data.recipient_ids or [])]

        if not recipient_ids:
            raise ValidationError(CMessageTemplate.MESSAGE_NO_RECIPIENTS)

        # Create messages for each recipient
        messages_to_insert = []
        broadcast_id = str(uuid4())

        for recipient_id in recipient_ids:
            messages_to_insert.append({
                "id": str(uuid4()),
                "message_type": self.TYPE_BROADCAST,
                "thread_id": broadcast_id,
                "sender_id": str(sender_id),
                "sender_type": self.SENDER_ADMIN,
                "recipient_id": recipient_id,
                "subject": data.subject,
                "content": data.content,
                "category": getattr(data, 'category', "announcement"),
                "is_important": getattr(data, 'is_important', False),
                "is_broadcast": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

        result = await self.db.insert_messages_batch(messages_to_insert)
        if not result:
            raise ValidationError(
                CMessageTemplate.VALIDATION_OPERATION_FAILED.format(operation="create broadcast")
            )

        return {
            "broadcast_id": broadcast_id,
            "recipient_count": len(recipient_ids),
            "messages": result
        }

    # ============================================================================
    # Analytics
    # ============================================================================

    async def get_analytics(self, time_range: str = "7d") -> dict:
        """Get message analytics data."""
        now = datetime.now(timezone.utc)

        if time_range == "7d":
            start_date = (now - timedelta(days=7)).isoformat()
        elif time_range == "30d":
            start_date = (now - timedelta(days=30)).isoformat()
        elif time_range == "90d":
            start_date = (now - timedelta(days=90)).isoformat()
        else:
            start_date = None

        data = await self.db.get_analytics_data(start_date)

        return {
            "total_messages": data['total_messages'],
            "unread_messages": data['unread_messages'],
            "response_time": data.get('response_time', 0.0),
            "messages_by_day": data.get('messages_by_day', []),
            "messages_by_category": data.get('messages_by_category', []),
            "response_time_by_day": data.get('response_time_by_day', []),
        }


# Singleton instance
service = MessageService()
