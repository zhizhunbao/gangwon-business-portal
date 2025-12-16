"""
Messages service.

Business logic for internal messaging system.
"""
from typing import List, Tuple, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from ...common.modules.exception import NotFoundError, ValidationError
from ...common.modules.supabase.service import supabase_service
from .schemas import MessageCreate, MessageUpdate


class MessageService:
    """Message service class."""

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
            admin_id: Admin UUID string
            
        Returns:
            Admin name or None if not found
        """
        if not admin_id:
            return "系统管理员"
        
        admin_result = supabase_service.client.table('admins').select('full_name, email').eq('id', admin_id).execute()
        if admin_result.data:
            admin = admin_result.data[0]
            return admin.get('full_name') or admin.get('email') or "管理员"
        return "系统管理员"

    async def get_messages(
        self,
        user_id: UUID,
        page: int = 1,
        page_size: int = 20,
        is_read: Optional[bool] = None,
        is_important: Optional[bool] = None,
    ) -> Tuple[List[dict], int, int]:
        """
        Get paginated list of messages for a user.

        Args:
            user_id: User UUID (member or admin)
            page: Page number (1-indexed)
            page_size: Items per page
            is_read: Filter by read status (optional)
            is_important: Filter by important status (optional)

        Returns:
            Tuple of (messages list, total count, unread count)
        """
        # Build query
        query = supabase_service.client.table('messages').select('*', count='exact')
        query = query.or_(f'sender_id.eq.{user_id},recipient_id.eq.{user_id}')
        
        # Apply filters
        if is_read is not None:
            query = query.eq('is_read', 'true' if is_read else 'false')
        if is_important is not None:
            query = query.eq('is_important', 'true' if is_important else 'false')
        
        # Get total count first
        count_result = query.execute()
        total = count_result.count or 0
        
        # Get unread count
        unread_query = supabase_service.client.table('messages').select('*', count='exact')
        unread_query = unread_query.eq('recipient_id', str(user_id)).eq('is_read', 'false')
        unread_result = unread_query.execute()
        unread_count = unread_result.count or 0
        
        # Get paginated results
        query = supabase_service.client.table('messages').select('*')
        query = query.or_(f'sender_id.eq.{user_id},recipient_id.eq.{user_id}')
        
        if is_read is not None:
            query = query.eq('is_read', 'true' if is_read else 'false')
        if is_important is not None:
            query = query.eq('is_important', 'true' if is_important else 'false')
        
        query = query.order('created_at', desc=True).range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        messages = result.data or []

        # Enrich messages with sender/recipient names
        for message in messages:
            sender_id = message.get('sender_id')
            recipient_id = message.get('recipient_id')
            
            if sender_id:
                message['sender_name'] = await self._get_admin_name(sender_id) or await self._get_member_name(sender_id)
            else:
                message['sender_name'] = "系统"
            
            if recipient_id:
                message['recipient_name'] = await self._get_member_name(recipient_id)

        return messages, total, unread_count

    async def get_message_by_id(self, message_id: UUID, user_id: UUID) -> dict:
        """
        Get message by ID and mark as read if user is recipient.

        Args:
            message_id: Message UUID
            user_id: User UUID (to verify access and mark as read)

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
        
        # Check if user has access to this message
        sender_id = message.get('sender_id')
        recipient_id = message.get('recipient_id')
        
        if str(user_id) != str(sender_id) and str(user_id) != str(recipient_id):
            raise NotFoundError("Message")
        
        # Mark as read if user is recipient and message is unread
        if str(user_id) == str(recipient_id) and message.get('is_read') != 'true':
            update_result = supabase_service.client.table('messages').update({
                'is_read': 'true',
                'read_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', str(message_id)).execute()
            
            if update_result.data:
                message = update_result.data[0]
            else:
                message['is_read'] = 'true'
                message['read_at'] = datetime.now(timezone.utc).isoformat()
        
        # Enrich with names
        if sender_id:
            message['sender_name'] = await self._get_admin_name(sender_id) or await self._get_member_name(sender_id)
        else:
            message['sender_name'] = "系统"
        
        if recipient_id:
            message['recipient_name'] = await self._get_member_name(recipient_id)
        
        return message

    async def create_message(
        self, data: MessageCreate, sender_id: UUID
    ) -> dict:
        """
        Create a new message.

        Args:
            data: Message creation data
            sender_id: Sender UUID (admin)

        Returns:
            Created message dictionary
        """
        # Verify recipient exists
        member_result = supabase_service.client.table('members').select('id').eq('id', str(data.recipient_id)).execute()
        if not member_result.data:
            raise NotFoundError("Recipient member")
        
        message_data = {
            'id': str(uuid4()),
            'sender_id': str(sender_id),
            'recipient_id': str(data.recipient_id),
            'subject': data.subject,
            'content': data.content,
            'is_read': 'false',
            'is_important': 'true' if data.is_important else 'false',
        }
        
        result = supabase_service.client.table('messages').insert(message_data).execute()
        message = result.data[0] if result.data else None
        
        if message:
            # Enrich with names
            message['sender_name'] = await self._get_admin_name(str(sender_id))
            message['recipient_name'] = await self._get_member_name(str(data.recipient_id))
        
        return message

    async def update_message(
        self, message_id: UUID, data: MessageUpdate, user_id: UUID
    ) -> dict:
        """
        Update a message (mark as read/unread, important).

        Args:
            message_id: Message UUID
            data: Message update data
            user_id: User UUID (to verify access)

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
        recipient_id = message.get('recipient_id')
        
        # Only recipient can update read status
        if str(user_id) != str(recipient_id):
            raise ValidationError("Only recipient can update message status")
        
        # Build update data
        update_data = {}
        if data.is_read is not None:
            update_data['is_read'] = 'true' if data.is_read else 'false'
            if data.is_read:
                update_data['read_at'] = datetime.now(timezone.utc).isoformat()
            else:
                update_data['read_at'] = None
        
        if data.is_important is not None:
            update_data['is_important'] = 'true' if data.is_important else 'false'
        
        if not update_data:
            # No fields to update, just return existing message
            return message
        
        result = supabase_service.client.table('messages').update(update_data).eq('id', str(message_id)).execute()
        
        if not result.data:
            raise NotFoundError("Message")
        
        message = result.data[0]
        
        # Enrich with names
        sender_id = message.get('sender_id')
        if sender_id:
            message['sender_name'] = await self._get_admin_name(sender_id) or await self._get_member_name(sender_id)
        else:
            message['sender_name'] = "系统"
        
        message['recipient_name'] = await self._get_member_name(recipient_id)
        
        return message

    async def delete_message(self, message_id: UUID, user_id: UUID) -> None:
        """
        Delete a message.

        Args:
            message_id: Message UUID
            user_id: User UUID (to verify access)

        Raises:
            NotFoundError: If message not found
        """
        # Check if message exists and user has access
        check_result = supabase_service.client.table('messages').select('*').eq('id', str(message_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Message")
        
        message = check_result.data[0]
        sender_id = message.get('sender_id')
        recipient_id = message.get('recipient_id')
        
        # Only sender or recipient can delete
        if str(user_id) != str(sender_id) and str(user_id) != str(recipient_id):
            raise ValidationError("You don't have permission to delete this message")
        
        # Delete the message
        supabase_service.client.table('messages').delete().eq('id', str(message_id)).execute()

    async def get_unread_count(self, user_id: UUID) -> int:
        """
        Get unread messages count for a user.

        Args:
            user_id: User UUID

        Returns:
            Unread messages count
        """
        query = supabase_service.client.table('messages').select('*', count='exact')
        query = query.eq('recipient_id', str(user_id)).eq('is_read', 'false')
        
        result = query.execute()
        return result.count or 0

