"""
Messages service.

Business logic for internal messaging system.
Updated to use the unified messages table structure.
"""
import asyncio
from typing import List, Tuple, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone, timedelta

from ...common.modules.exception import NotFoundError, ValidationError
from ...common.modules.supabase.service import supabase_service
from ...common.modules.email.service import EmailService
from ...common.modules.config.settings import settings
from .schemas import (
    MessageCreate, MessageUpdate, ThreadCreate, ThreadMessageCreate, 
    ThreadUpdate, BroadcastCreate
)


class MessageService:
    """Message service class - updated for unified messages table."""
    
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

    async def _get_member_name(self, member_id: str) -> Optional[str]:
        """
        Get member company name by ID.
        
        Args:
            member_id: Member UUID string
            
        Returns:
            Company name or None if not found
        """
        if not member_id:
            return None
        
        member_result = supabase_service.client.table('members').select('company_name').eq('id', member_id).execute()
        return member_result.data[0]['company_name'] if member_result.data else None

    async def _get_admin_name(self, admin_id: str) -> Optional[str]:
        """
        Get admin name by ID.
        
        Args:
            admin_id: Admin ID
            
        Returns:
            Admin name or None if not found
        """
        if not admin_id:
            return "系统管理员"
        
        admin_result = supabase_service.client.table('admins').select('full_name').eq('id', admin_id).execute()
        return admin_result.data[0]['full_name'] if admin_result.data else "系统管理员"

    async def _is_admin(self, user_id: str) -> bool:
        """
        Check if user is an admin.
        
        Args:
            user_id: User UUID string
            
        Returns:
            True if user is an admin, False otherwise
        """
        if not user_id:
            return False
        
        admin_result = supabase_service.client.table('admins').select('id').eq('id', user_id).execute()
        return len(admin_result.data) > 0

    # ============================================================================
    # Core Message Operations (using unified messages table)
    # ============================================================================

    async def get_messages(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None,
        is_important: Optional[bool] = None,
    ) -> Tuple[List[dict], int, int]:
        """
        Get paginated list of messages for a user.

        Args:
            user_id: User UUID
            page: Page number (1-based)
            page_size: Number of messages per page
            category: Filter by category
            is_important: Filter by importance

        Returns:
            Tuple of (messages list, total count, unread count)
        """
        # Build base query for filtering
        base_filter = f'recipient_id.eq.{user_id}'
        
        # Build query
        query = supabase_service.client.table('messages').select('*', count='exact')
        query = query.eq('recipient_id', str(user_id))
        
        if category:
            query = query.eq('category', category)
        if is_important is not None:
            query = query.eq('is_important', is_important)
        
        # Get total count
        count_result = query.execute()
        total_count = count_result.count or 0
        
        # Get unread count
        unread_query = supabase_service.client.table('messages').select('*', count='exact')
        unread_query = unread_query.eq('recipient_id', str(user_id)).eq('is_read', False)
        if category:
            unread_query = unread_query.eq('category', category)
        if is_important is not None:
            unread_query = unread_query.eq('is_important', is_important)
        
        unread_result = unread_query.execute()
        unread_count = unread_result.count or 0
        
        # Get paginated messages
        offset = (page - 1) * page_size
        messages_query = supabase_service.client.table('messages').select('*')
        messages_query = messages_query.eq('recipient_id', str(user_id))
        
        if category:
            messages_query = messages_query.eq('category', category)
        if is_important is not None:
            messages_query = messages_query.eq('is_important', is_important)
        
        messages_query = messages_query.order('created_at', desc=True)
        messages_query = messages_query.range(offset, offset + page_size - 1)
        
        messages_result = messages_query.execute()
        messages = messages_result.data or []
        
        # Enrich messages with sender names
        for message in messages:
            if message.get('sender_type') == 'admin':
                message['sender_name'] = await self._get_admin_name(message.get('sender_id'))
            elif message.get('sender_type') == 'member':
                message['sender_name'] = await self._get_member_name(message.get('sender_id'))
            else:
                message['sender_name'] = "系统"
        
        return messages, total_count, unread_count

    async def get_message_by_id(self, message_id: UUID, user_id: UUID) -> dict:
        """
        Get message by ID and mark as read if user is recipient.

        Args:
            message_id: Message UUID
            user_id: User UUID

        Returns:
            Message dictionary

        Raises:
            NotFoundError: If message not found
        """
        query = supabase_service.client.table('messages').select('*').eq('id', str(message_id))
        result = query.execute()
        
        if not result.data:
            raise NotFoundError("Message")
        
        message = result.data[0]
        
        # Check access (user must be sender or recipient)
        if message.get('sender_id') != str(user_id) and message.get('recipient_id') != str(user_id):
            raise NotFoundError("Message")
        
        # Mark as read if user is recipient and message is unread
        if message.get('recipient_id') == str(user_id) and not message.get('is_read', False):
            update_data = {
                'is_read': True,
                'read_at': datetime.now(timezone.utc).isoformat()
            }
            
            supabase_service.client.table('messages')\
                .update(update_data)\
                .eq('id', str(message_id))\
                .execute()
            
            # Update message in memory
            message.update(update_data)
        
        # Add sender name
        if message.get('sender_type') == 'admin':
            message['sender_name'] = await self._get_admin_name(message.get('sender_id'))
        elif message.get('sender_type') == 'member':
            message['sender_name'] = await self._get_member_name(message.get('sender_id'))
        else:
            message['sender_name'] = "系统"
        
        return message

    async def create_message(
        self, data: MessageCreate, sender_id: UUID
    ) -> dict:
        """
        Create a new message.

        Args:
            data: Message creation data
            sender_id: Sender UUID

        Returns:
            Created message dictionary
        """
        # Check if sender is admin or member
        is_admin = await self._is_admin(str(sender_id))
        
        message_data = {
            "id": str(uuid4()),
            "message_type": self.TYPE_DIRECT,
            "sender_id": str(sender_id),
            "sender_type": self.SENDER_ADMIN if is_admin else self.SENDER_MEMBER,
            "recipient_id": str(data.recipient_id),
            "subject": data.subject,
            "content": data.content,
            "category": data.category if hasattr(data, 'category') else "general",
            "is_important": data.is_important if hasattr(data, 'is_important') else False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = supabase_service.client.table('messages').insert(message_data).execute()
        
        if not result.data:
            raise ValidationError("Failed to create message")
        
        message = result.data[0]
        
        # Add sender name
        if is_admin:
            message['sender_name'] = await self._get_admin_name(str(sender_id))
        else:
            message['sender_name'] = await self._get_member_name(str(sender_id))
        
        return message

    async def update_message(
        self, message_id: UUID, data: MessageUpdate, user_id: UUID
    ) -> dict:
        """
        Update a message (mark as read/unread, important).

        Args:
            message_id: Message UUID
            data: Update data
            user_id: User UUID

        Returns:
            Updated message dictionary

        Raises:
            NotFoundError: If message not found
        """
        # Check if message exists and user has access
        check_result = supabase_service.client.table('messages').select('*').eq('id', str(message_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Message")
        
        message = check_result.data[0]
        
        # Check access (user must be sender or recipient)
        if message.get('sender_id') != str(user_id) and message.get('recipient_id') != str(user_id):
            raise NotFoundError("Message")
        
        # Build update data
        update_data = {}
        if hasattr(data, 'is_read') and data.is_read is not None:
            update_data['is_read'] = data.is_read
            if data.is_read:
                update_data['read_at'] = datetime.now(timezone.utc).isoformat()
        
        if hasattr(data, 'is_important') and data.is_important is not None:
            update_data['is_important'] = data.is_important
        
        if not update_data:
            return message
        
        # Update message
        result = supabase_service.client.table('messages')\
            .update(update_data)\
            .eq('id', str(message_id))\
            .execute()
        
        if not result.data:
            raise NotFoundError("Message")
        
        return result.data[0]

    async def delete_message(self, message_id: UUID, user_id: UUID) -> None:
        """
        Soft delete a message (set deleted_at timestamp).

        Args:
            message_id: Message UUID
            user_id: User UUID

        Raises:
            NotFoundError: If message not found
        """
        # Check if message exists and user has access
        check_result = supabase_service.client.table('messages').select('*').eq('id', str(message_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Message")
        
        message = check_result.data[0]
        
        # Check access (user must be sender or recipient)
        if message.get('sender_id') != str(user_id) and message.get('recipient_id') != str(user_id):
            raise NotFoundError("Message")
        
        # Soft delete
        supabase_service.client.table('messages')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', str(message_id))\
            .execute()

    async def get_unread_count(self, user_id: UUID) -> int:
        """
        Get unread messages count for a user (includes all message types).

        Args:
            user_id: User UUID

        Returns:
            Unread messages count
        """
        # Use the unified method
        result = await self.get_unread_count_unified(
            user_id=user_id,
            is_admin=await self._is_admin(str(user_id))
        )
        
        return result.get('unread_count', 0)

    # ============================================================================
    # Unified Message Operations (merged from UnifiedMessageService)
    # ============================================================================
    
    async def create_direct_message(
        self, 
        sender_id: Optional[UUID], 
        recipient_id: UUID, 
        data: MessageCreate
    ) -> dict:
        """
        Create a direct message.
        
        Args:
            sender_id: Sender UUID (None for system messages)
            recipient_id: Recipient UUID
            data: Message data
            
        Returns:
            Created message dict
        """
        message_data = {
            "id": str(uuid4()),
            "message_type": self.TYPE_DIRECT,
            "sender_id": str(sender_id) if sender_id else None,
            "sender_type": self.SENDER_ADMIN if sender_id else self.SENDER_SYSTEM,
            "recipient_id": str(recipient_id),
            "subject": data.subject,
            "content": data.content,
            "category": "general",
            "is_important": data.is_important if hasattr(data, 'is_important') else False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = supabase_service.client.table('messages').insert(message_data).execute()
        return result.data[0] if result.data else None
    
    async def create_thread_unified(
        self, 
        member_id: UUID, 
        data: ThreadCreate
    ) -> dict:
        """
        Create a new message thread (unified method).
        
        Args:
            member_id: Member UUID who creates the thread
            data: Thread data
            
        Returns:
            Created thread dict
        """
        # Create thread header message
        thread_data = {
            "id": str(uuid4()),
            "message_type": self.TYPE_THREAD,
            "sender_id": str(member_id),
            "sender_type": self.SENDER_MEMBER,
            "recipient_id": str(member_id),
            "subject": data.subject,
            "content": f"Thread: {data.subject}",
            "category": data.category if hasattr(data, 'category') else "general",
            "status": "open",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = supabase_service.client.table('messages').insert(thread_data).execute()
        thread = result.data[0] if result.data else None
        
        # Create first message in thread if content provided
        if thread and hasattr(data, 'content') and data.content:
            await self.create_thread_message_unified(
                UUID(thread['id']), 
                ThreadMessageCreate(content=data.content),
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
        """
        Create a message in an existing thread (unified method).
        
        Args:
            thread_id: Thread UUID
            data: Message data
            sender_id: Sender UUID
            sender_type: Sender type (admin/member)
            
        Returns:
            Created message dict
        """
        # Verify thread exists
        thread_result = supabase_service.client.table('messages')\
            .select('*')\
            .eq('id', str(thread_id))\
            .eq('message_type', self.TYPE_THREAD)\
            .execute()
        
        if not thread_result.data:
            raise NotFoundError("Thread")
        
        thread = thread_result.data[0]
        
        # Create message
        message_data = {
            "id": str(uuid4()),
            "message_type": self.TYPE_THREAD,
            "thread_id": str(thread_id),
            "sender_id": str(sender_id),
            "sender_type": sender_type,
            "recipient_id": thread['recipient_id'],  # Thread owner
            "subject": thread['subject'],
            "content": data.content,
            "category": thread.get('category', 'general'),
            "is_important": data.is_important if hasattr(data, 'is_important') else False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = supabase_service.client.table('messages').insert(message_data).execute()
        return result.data[0] if result.data else None
    
    async def get_unread_count_unified(self, user_id: UUID, is_admin: bool = False) -> dict:
        """
        Get unread message count for a user (unified method).
        
        Args:
            user_id: User UUID
            is_admin: Whether user is admin
            
        Returns:
            Dict with unread counts
        """
        if is_admin:
            # Admin: count unread messages from members
            query = supabase_service.client.table('messages').select('*', count='exact')
            query = query.eq('sender_type', self.SENDER_MEMBER).eq('is_read', False)
            result = query.execute()
            count = result.count or 0
        else:
            # Member: count unread messages sent to them
            query = supabase_service.client.table('messages').select('*', count='exact')
            query = query.eq('recipient_id', str(user_id)).eq('is_read', False)
            result = query.execute()
            count = result.count or 0
        
        return {
            "unread_count": count,
            "direct_count": count,  # For backward compatibility
            "thread_count": 0,  # Deprecated
        }
    
    async def mark_as_read_unified(self, message_id: UUID, user_id: UUID) -> dict:
        """
        Mark a message as read (unified method).
        
        Args:
            message_id: Message UUID
            user_id: User UUID
            
        Returns:
            Updated message dict
        """
        update_data = {
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = supabase_service.client.table('messages')\
            .update(update_data)\
            .eq('id', str(message_id))\
            .eq('recipient_id', str(user_id))\
            .execute()
        
        if not result.data:
            raise NotFoundError("Message")
        
        return result.data[0]

    # ============================================================================
    # Missing Methods Required by Router
    # ============================================================================

    async def get_admin_threads(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        has_unread: Optional[bool] = None,
    ) -> Tuple[List[dict], int]:
        """
        Get all threads for admin with pagination.
        
        Args:
            page: Page number
            page_size: Items per page
            status: Filter by status
            has_unread: Filter threads with unread messages
            
        Returns:
            Tuple of (threads list, total count)
        """
        # Build query for thread messages (message_type = 'thread' and thread_id is NULL means it's a thread header)
        query = supabase_service.client.table('messages').select('*', count='exact')
        query = query.eq('message_type', self.TYPE_THREAD).is_('thread_id', 'null')
        
        if status:
            query = query.eq('status', status)
        
        # Get total count
        count_result = query.execute()
        total_count = count_result.count or 0
        
        # Get paginated threads
        offset = (page - 1) * page_size
        threads_query = supabase_service.client.table('messages').select('*')
        threads_query = threads_query.eq('message_type', self.TYPE_THREAD).is_('thread_id', 'null')
        
        if status:
            threads_query = threads_query.eq('status', status)
        
        threads_query = threads_query.order('created_at', desc=True)
        threads_query = threads_query.range(offset, offset + page_size - 1)
        
        threads_result = threads_query.execute()
        threads = threads_result.data or []
        
        # Enrich threads with additional info
        for thread in threads:
            # Get message count for this thread
            msg_count_query = supabase_service.client.table('messages').select('*', count='exact')
            msg_count_query = msg_count_query.eq('thread_id', thread['id'])
            msg_count_result = msg_count_query.execute()
            thread['message_count'] = msg_count_result.count or 0
            
            # Get unread count for admin (messages from members)
            unread_query = supabase_service.client.table('messages').select('*', count='exact')
            unread_query = unread_query.eq('thread_id', thread['id']).eq('sender_type', self.SENDER_MEMBER).eq('is_read', False)
            unread_result = unread_query.execute()
            thread['admin_unread_count'] = unread_result.count or 0
            
            # Add member name
            thread['member_name'] = await self._get_member_name(thread.get('sender_id'))
            
            # Set additional fields for compatibility
            thread['member_id'] = thread.get('sender_id')
            thread['created_by'] = thread.get('sender_id')
            thread['assigned_to'] = None
            thread['last_message_at'] = thread.get('updated_at', thread.get('created_at'))
            thread['unread_count'] = thread['admin_unread_count']
            thread['category'] = thread.get('category', 'general')
        
        return threads, total_count

    async def get_analytics(self, time_range: str = "7d") -> dict:
        """
        Get message analytics data.
        
        Args:
            time_range: Time range for analytics (7d, 30d, 90d, all)
            
        Returns:
            Analytics data dict
        """
        # Calculate date filter based on time_range
        now = datetime.now(timezone.utc)
        if time_range == "7d":
            start_date = now - timedelta(days=7)
        elif time_range == "30d":
            start_date = now - timedelta(days=30)
        elif time_range == "90d":
            start_date = now - timedelta(days=90)
        else:  # "all"
            start_date = None
        
        # Build base query
        base_query = supabase_service.client.table('messages').select('*', count='exact')
        if start_date:
            base_query = base_query.gte('created_at', start_date.isoformat())
        
        # Get total messages
        total_result = base_query.execute()
        total_messages = total_result.count or 0
        
        # Get unread messages
        unread_query = supabase_service.client.table('messages').select('*', count='exact')
        unread_query = unread_query.eq('is_read', False)
        if start_date:
            unread_query = unread_query.gte('created_at', start_date.isoformat())
        unread_result = unread_query.execute()
        unread_messages = unread_result.count or 0
        
        # Calculate average response time (simplified)
        response_time = 0.0  # TODO: Implement proper response time calculation
        
        return {
            "total_messages": total_messages,
            "unread_messages": unread_messages,
            "response_time": response_time,
            "messages_by_day": [],  # TODO: Implement daily breakdown
            "messages_by_category": [],  # TODO: Implement category breakdown
            "response_time_by_day": [],  # TODO: Implement daily response time
        }

    async def get_member_threads(
        self,
        member_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[List[dict], int]:
        """
        Get threads for a specific member.
        
        Args:
            member_id: Member UUID
            page: Page number
            page_size: Items per page
            status: Filter by status
            
        Returns:
            Tuple of (threads list, total count)
        """
        # Build query for member's threads
        query = supabase_service.client.table('messages').select('*', count='exact')
        query = query.eq('message_type', self.TYPE_THREAD).is_('thread_id', 'null')
        query = query.eq('sender_id', str(member_id))
        
        if status:
            query = query.eq('status', status)
        
        # Get total count
        count_result = query.execute()
        total_count = count_result.count or 0
        
        # Get paginated threads
        offset = (page - 1) * page_size
        threads_query = supabase_service.client.table('messages').select('*')
        threads_query = threads_query.eq('message_type', self.TYPE_THREAD).is_('thread_id', 'null')
        threads_query = threads_query.eq('sender_id', str(member_id))
        
        if status:
            threads_query = threads_query.eq('status', status)
        
        threads_query = threads_query.order('created_at', desc=True)
        threads_query = threads_query.range(offset, offset + page_size - 1)
        
        threads_result = threads_query.execute()
        threads = threads_result.data or []
        
        # Enrich threads with additional info
        for thread in threads:
            # Get message count for this thread
            msg_count_query = supabase_service.client.table('messages').select('*', count='exact')
            msg_count_query = msg_count_query.eq('thread_id', thread['id'])
            msg_count_result = msg_count_query.execute()
            thread['message_count'] = msg_count_result.count or 0
            
            # Get unread count for member (messages from admin)
            unread_query = supabase_service.client.table('messages').select('*', count='exact')
            unread_query = unread_query.eq('thread_id', thread['id']).eq('sender_type', self.SENDER_ADMIN).eq('is_read', False)
            unread_result = unread_query.execute()
            thread['unread_count'] = unread_result.count or 0
            
            # Add member name
            thread['member_name'] = await self._get_member_name(str(member_id))
            
            # Set additional fields for compatibility
            thread['member_id'] = str(member_id)
            thread['created_by'] = str(member_id)
            thread['assigned_to'] = None
            thread['last_message_at'] = thread.get('updated_at', thread.get('created_at'))
            thread['category'] = thread.get('category', 'general')
        
        return threads, total_count

    async def create_thread(self, data: ThreadCreate, member_id: UUID) -> dict:
        """
        Create a new message thread.
        
        Args:
            data: Thread creation data
            member_id: Member UUID who creates the thread
            
        Returns:
            Created thread dict
        """
        return await self.create_thread_unified(member_id, data)

    async def get_thread_with_messages(self, thread_id: UUID, user_id: UUID) -> dict:
        """
        Get thread with all messages.
        
        Args:
            thread_id: Thread UUID
            user_id: User UUID
            
        Returns:
            Dict with thread and messages
        """
        # Get thread header
        thread_query = supabase_service.client.table('messages').select('*')
        thread_query = thread_query.eq('id', str(thread_id)).eq('message_type', self.TYPE_THREAD)
        thread_result = thread_query.execute()
        
        if not thread_result.data:
            raise NotFoundError("Thread")
        
        thread = thread_result.data[0]
        
        # Check access (user must be thread owner or admin)
        is_admin = await self._is_admin(str(user_id))
        if not is_admin and thread.get('sender_id') != str(user_id):
            raise NotFoundError("Thread")
        
        # Get all messages in thread
        messages_query = supabase_service.client.table('messages').select('*')
        messages_query = messages_query.eq('thread_id', str(thread_id))
        messages_query = messages_query.order('created_at', asc=True)
        messages_result = messages_query.execute()
        messages = messages_result.data or []
        
        # Enrich messages with sender names
        for message in messages:
            if message.get('sender_type') == 'admin':
                message['sender_name'] = await self._get_admin_name(message.get('sender_id'))
            elif message.get('sender_type') == 'member':
                message['sender_name'] = await self._get_member_name(message.get('sender_id'))
            else:
                message['sender_name'] = "系统"
            
            # Add attachments (empty for now)
            message['attachments'] = []
        
        # Enrich thread with additional info
        thread['message_count'] = len(messages)
        thread['member_name'] = await self._get_member_name(thread.get('sender_id'))
        thread['member_id'] = thread.get('sender_id')
        thread['created_by'] = thread.get('sender_id')
        thread['assigned_to'] = None
        thread['last_message_at'] = messages[-1]['created_at'] if messages else thread.get('created_at')
        thread['unread_count'] = 0  # TODO: Calculate properly
        thread['category'] = thread.get('category', 'general')
        
        return {
            "thread": thread,
            "messages": messages
        }

    async def create_thread_message(
        self, 
        thread_id: UUID, 
        data: ThreadMessageCreate, 
        sender_id: UUID, 
        sender_type: str
    ) -> dict:
        """
        Create a message in an existing thread.
        
        Args:
            thread_id: Thread UUID
            data: Message data
            sender_id: Sender UUID
            sender_type: Sender type (admin/member)
            
        Returns:
            Created message dict
        """
        message = await self.create_thread_message_unified(thread_id, data, sender_id, sender_type)
        
        # Add sender name
        if sender_type == 'admin':
            message['sender_name'] = await self._get_admin_name(str(sender_id))
        else:
            message['sender_name'] = await self._get_member_name(str(sender_id))
        
        # Add attachments (empty for now)
        message['attachments'] = []
        
        return message

    async def update_thread(self, thread_id: UUID, data: ThreadUpdate, user_id: UUID) -> dict:
        """
        Update thread status or assignment.
        
        Args:
            thread_id: Thread UUID
            data: Update data
            user_id: User UUID (must be admin)
            
        Returns:
            Updated thread dict
        """
        # Check if user is admin
        is_admin = await self._is_admin(str(user_id))
        if not is_admin:
            raise NotFoundError("Thread")
        
        # Check if thread exists
        check_result = supabase_service.client.table('messages').select('*')
        check_result = check_result.eq('id', str(thread_id)).eq('message_type', self.TYPE_THREAD)
        check_result = check_result.execute()
        
        if not check_result.data:
            raise NotFoundError("Thread")
        
        # Build update data
        update_data = {}
        if hasattr(data, 'status') and data.status:
            update_data['status'] = data.status
        
        if not update_data:
            return check_result.data[0]
        
        # Update thread
        result = supabase_service.client.table('messages')\
            .update(update_data)\
            .eq('id', str(thread_id))\
            .execute()
        
        if not result.data:
            raise NotFoundError("Thread")
        
        thread = result.data[0]
        
        # Enrich thread with additional info
        thread['member_name'] = await self._get_member_name(thread.get('sender_id'))
        thread['member_id'] = thread.get('sender_id')
        thread['created_by'] = thread.get('sender_id')
        thread['assigned_to'] = None
        thread['message_count'] = 0  # TODO: Calculate properly
        thread['unread_count'] = 0  # TODO: Calculate properly
        thread['last_message_at'] = thread.get('updated_at', thread.get('created_at'))
        thread['category'] = thread.get('category', 'general')
        
        return thread

    async def create_broadcast(self, data: BroadcastCreate, sender_id: UUID) -> dict:
        """
        Create a broadcast message to multiple members.
        
        Args:
            data: Broadcast data
            sender_id: Sender UUID (admin)
            
        Returns:
            Broadcast summary dict
        """
        # Check if sender is admin
        is_admin = await self._is_admin(str(sender_id))
        if not is_admin:
            raise ValidationError("Only admins can send broadcast messages")
        
        # Get recipient list
        if data.send_to_all:
            # Get all active members
            members_query = supabase_service.client.table('members').select('id')
            members_query = members_query.eq('status', 'active')
            members_result = members_query.execute()
            recipient_ids = [member['id'] for member in members_result.data or []]
        else:
            recipient_ids = [str(rid) for rid in data.recipient_ids]
        
        if not recipient_ids:
            raise ValidationError("No recipients found")
        
        # Create broadcast messages
        broadcast_id = str(uuid4())
        messages_to_insert = []
        
        for recipient_id in recipient_ids:
            message_data = {
                "id": str(uuid4()),
                "message_type": self.TYPE_BROADCAST,
                "thread_id": broadcast_id,  # Use broadcast_id as thread_id for grouping
                "sender_id": str(sender_id),
                "sender_type": self.SENDER_ADMIN,
                "recipient_id": recipient_id,
                "subject": data.subject,
                "content": data.content,
                "category": data.category,
                "is_important": data.is_important,
                "is_broadcast": True,
                "broadcast_count": len(recipient_ids),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "sent_at": datetime.now(timezone.utc).isoformat(),
            }
            messages_to_insert.append(message_data)
        
        # Insert all messages
        result = supabase_service.client.table('messages').insert(messages_to_insert).execute()
        
        if not result.data:
            raise ValidationError("Failed to create broadcast")
        
        # Return broadcast summary
        return {
            "id": broadcast_id,
            "sender_id": str(sender_id),
            "sender_name": await self._get_admin_name(str(sender_id)),
            "subject": data.subject,
            "content": data.content,
            "category": data.category,
            "is_important": data.is_important,
            "send_to_all": data.send_to_all,
            "recipient_count": len(recipient_ids),
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }