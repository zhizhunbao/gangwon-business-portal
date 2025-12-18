"""
Messages service.

Business logic for internal messaging system.
"""
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
    """Message service class."""
    
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
        return bool(admin_result.data)

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
        # Build base query for filtering (exclude soft-deleted messages)
        base_filter = f'sender_id.eq.{user_id},recipient_id.eq.{user_id}'
        
        # Get total count (exclude soft-deleted)
        count_query = supabase_service.client.table('messages').select('*', count='exact')
        count_query = count_query.or_(base_filter).is_('deleted_at', 'null')
        if is_read is not None:
            count_query = count_query.eq('is_read', 'true' if is_read else 'false')
        if is_important is not None:
            count_query = count_query.eq('is_important', 'true' if is_important else 'false')
        count_result = count_query.execute()
        total = count_result.count or 0
        
        # Get unread count (only for recipient, exclude soft-deleted)
        unread_query = supabase_service.client.table('messages').select('*', count='exact')
        unread_query = unread_query.eq('recipient_id', str(user_id)).eq('is_read', 'false').is_('deleted_at', 'null')
        unread_result = unread_query.execute()
        unread_count = unread_result.count or 0
        
        # Get paginated results (exclude soft-deleted)
        query = supabase_service.client.table('messages').select('*')
        query = query.or_(base_filter).is_('deleted_at', 'null')
        if is_read is not None:
            query = query.eq('is_read', 'true' if is_read else 'false')
        if is_important is not None:
            query = query.eq('is_important', 'true' if is_important else 'false')
        query = query.order('created_at', desc=True).range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        messages = result.data or []

        # Batch fetch all names to avoid N+1 queries
        sender_ids = set()
        recipient_ids = set()
        for message in messages:
            if message.get('sender_id'):
                sender_ids.add(str(message['sender_id']))
            if message.get('recipient_id'):
                recipient_ids.add(str(message['recipient_id']))
        
        # Batch fetch admin names
        admin_names = {}
        if sender_ids:
            admin_result = supabase_service.client.table('admins').select('id, full_name, email').in_('id', list(sender_ids)).execute()
            for admin in (admin_result.data or []):
                admin_id = str(admin['id'])
                admin_names[admin_id] = admin.get('full_name') or admin.get('email') or "管理员"
        
        # Batch fetch member names (for both senders and recipients)
        member_names = {}
        all_member_ids = sender_ids.union(recipient_ids)
        if all_member_ids:
            member_result = supabase_service.client.table('members').select('id, company_name').in_('id', list(all_member_ids)).execute()
            for member in (member_result.data or []):
                member_id = str(member['id'])
                member_names[member_id] = member.get('company_name') or "会员"
        
        # Enrich messages with names from cached data
        for message in messages:
            sender_id = message.get('sender_id')
            recipient_id = message.get('recipient_id')
            
            if sender_id:
                sender_id_str = str(sender_id)
                message['sender_name'] = admin_names.get(sender_id_str) or member_names.get(sender_id_str) or "系统"
            else:
                message['sender_name'] = "系统"
            
            if recipient_id:
                recipient_id_str = str(recipient_id)
                message['recipient_name'] = member_names.get(recipient_id_str) or "会员"

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
        query = supabase_service.client.table('messages').select('*').eq('id', str(message_id)).is_('deleted_at', 'null')
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
            
            # Send email notification
            recipient_email_result = supabase_service.client.table('members').select('email').eq('id', str(data.recipient_id)).execute()
            recipient_email = recipient_email_result.data[0]['email'] if recipient_email_result.data else None
            if recipient_email:
                frontend_url = settings.FRONTEND_URL.rstrip('/')
                message_link = f"{frontend_url}/member/messages"
                await self.email_service.send_new_message_notification(
                    to_email=recipient_email,
                    sender_name=message['sender_name'],
                    subject=data.subject,
                    message_link=message_link
                )
        
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
        # Check if message exists and user has access (exclude soft-deleted)
        check_result = supabase_service.client.table('messages').select('*').eq('id', str(message_id)).is_('deleted_at', 'null').execute()
        
        if not check_result.data:
            raise NotFoundError("Message")
        
        message = check_result.data[0]
        recipient_id = message.get('recipient_id')
        
        # Check if user is admin
        admin_check = supabase_service.client.table('admins').select('id').eq('id', str(user_id)).execute()
        is_admin = bool(admin_check.data)
        
        # Only recipient or admin can update message status
        if not is_admin and str(user_id) != str(recipient_id):
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
        Soft delete a message (set deleted_at timestamp).

        Args:
            message_id: Message UUID
            user_id: User UUID (to verify access)

        Raises:
            NotFoundError: If message not found
        """
        # Check if message exists and user has access
        check_result = supabase_service.client.table('messages').select('*').eq('id', str(message_id)).is_('deleted_at', 'null').execute()
        
        if not check_result.data:
            raise NotFoundError("Message")
        
        message = check_result.data[0]
        sender_id = message.get('sender_id')
        recipient_id = message.get('recipient_id')
        
        # Check if user is admin
        admin_check = supabase_service.client.table('admins').select('id').eq('id', str(user_id)).execute()
        is_admin = bool(admin_check.data)
        
        # Only sender, recipient, or admin can delete
        if not is_admin and str(user_id) != str(sender_id) and str(user_id) != str(recipient_id):
            raise ValidationError("You don't have permission to delete this message")
        
        # Soft delete the message (set deleted_at)
        supabase_service.client.table('messages').update({
            'deleted_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', str(message_id)).execute()

    async def get_unread_count(self, user_id: UUID) -> int:
        """
        Get unread messages count for a user.

        Args:
            user_id: User UUID

        Returns:
            Unread messages count
        """
        query = supabase_service.client.table('messages').select('*', count='exact')
        query = query.eq('recipient_id', str(user_id)).eq('is_read', 'false').is_('deleted_at', 'null')
        
        result = query.execute()
        return result.count or 0

    # Thread-related methods

    async def create_thread(self, data: ThreadCreate, member_id: UUID) -> dict:
        """
        Create a new message thread.

        Args:
            data: Thread creation data
            member_id: Member UUID who creates the thread

        Returns:
            Created thread dictionary
        """
        thread_id = str(uuid4())
        
        # Create thread
        thread_data = {
            'id': thread_id,
            'subject': data.subject,
            'category': data.category,
            'status': 'open',
            'member_id': str(member_id),
            'created_by': str(member_id),
            'message_count': 1,
            'unread_count': 1,
            'last_message_at': datetime.now(timezone.utc).isoformat()
        }
        
        thread_result = supabase_service.client.table('message_threads').insert(thread_data).execute()
        thread = thread_result.data[0] if thread_result.data else None
        
        if not thread:
            raise ValidationError("Failed to create thread")
        
        # Create initial message
        message_data = {
            'id': str(uuid4()),
            'thread_id': thread_id,
            'sender_id': str(member_id),
            'sender_type': 'member',
            'content': data.content,
            'is_read': 'false',
            'is_important': 'false'
        }
        
        message_result = supabase_service.client.table('thread_messages').insert(message_data).execute()
        
        # Handle attachments if any
        if data.attachments:
            for attachment in data.attachments:
                attachment_data = {
                    'id': str(uuid4()),
                    'message_id': message_data['id'],
                    'file_name': attachment['fileName'],
                    'file_path': attachment['filePath'],
                    'file_size': attachment['fileSize'],
                    'mime_type': attachment['mimeType']
                }
                supabase_service.client.table('message_attachments').insert(attachment_data).execute()
        
        # Enrich thread with member name
        thread['member_name'] = await self._get_member_name(str(member_id))
        
        # Send email notification to admins
        admins_result = supabase_service.client.table('admins').select('email').execute()
        admin_emails = [admin['email'] for admin in (admins_result.data or [])]
        if admin_emails:
            frontend_url = settings.FRONTEND_URL.rstrip('/')
            thread_link = f"{frontend_url}/admin/messages/threads/{thread_id}"
            for admin_email in admin_emails:
                await self.email_service.send_admin_new_thread_notification(
                    to_email=admin_email,
                    member_name=thread['member_name'],
                    subject=data.subject,
                    thread_link=thread_link
                )
        
        return thread

    async def get_thread_with_messages(self, thread_id: UUID, user_id: UUID) -> dict:
        """
        Get thread with all messages.

        Args:
            thread_id: Thread UUID
            user_id: User UUID (for access control)

        Returns:
            Dictionary with thread and messages

        Raises:
            NotFoundError: If thread not found or no access
        """
        # Get thread
        thread_result = supabase_service.client.table('message_threads').select('*').eq('id', str(thread_id)).execute()
        
        if not thread_result.data:
            raise NotFoundError("Thread")
        
        thread = thread_result.data[0]
        
        # Check access (member or admin)
        # Allow access if user is the member or an admin
        is_admin = await self._is_admin(str(user_id))
        member_id = thread.get('member_id')
        
        if not is_admin and str(member_id) != str(user_id):
            raise NotFoundError("Thread")
        
        # Get messages
        messages_result = supabase_service.client.table('thread_messages').select('*').eq('thread_id', str(thread_id)).order('created_at').execute()
        messages = messages_result.data or []
        
        # Enrich messages with attachments and sender names
        for message in messages:
            # Get attachments
            attachments_result = supabase_service.client.table('message_attachments').select('*').eq('message_id', message['id']).execute()
            message['attachments'] = attachments_result.data or []
            
            # Get sender name
            sender_id = message.get('sender_id')
            sender_type = message.get('sender_type')
            
            if sender_type == 'admin':
                message['sender_name'] = await self._get_admin_name(sender_id)
            else:
                message['sender_name'] = await self._get_member_name(sender_id)
        
        # Enrich thread with member name
        thread['member_name'] = await self._get_member_name(thread['member_id'])
        
        return {
            'thread': thread,
            'messages': messages
        }

    async def get_member_threads(self, member_id: UUID, page: int = 1, page_size: int = 20, status: Optional[str] = None) -> tuple:
        """
        Get paginated list of threads for a member.

        Args:
            member_id: Member UUID
            page: Page number (default: 1)
            page_size: Items per page (default: 20)
            status: Optional status filter (open, resolved, closed)

        Returns:
            Tuple of (threads list, total count)
        """
        # Build base query
        query = supabase_service.client.table('message_threads').select('*', count='exact')
        query = query.eq('member_id', str(member_id))
        
        if status:
            query = query.eq('status', status)
        
        # Get total count
        count_result = query.execute()
        total = count_result.count or 0
        
        # Get paginated threads
        query = supabase_service.client.table('message_threads').select('*')
        query = query.eq('member_id', str(member_id))
        
        if status:
            query = query.eq('status', status)
        
        query = query.order('last_message_at', desc=True)
        query = query.range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        threads = result.data or []
        
        # Enrich threads with member names
        for thread in threads:
            thread['member_name'] = await self._get_member_name(thread['member_id'])
        
        return threads, total

    async def create_thread_message(self, thread_id: UUID, data: ThreadMessageCreate, sender_id: UUID, sender_type: str) -> dict:
        """
        Create a message in an existing thread.

        Args:
            thread_id: Thread UUID
            data: Message creation data
            sender_id: Sender UUID
            sender_type: 'admin' or 'member'

        Returns:
            Created message dictionary

        Raises:
            NotFoundError: If thread not found
        """
        # Verify thread exists
        thread_result = supabase_service.client.table('message_threads').select('*').eq('id', str(thread_id)).execute()
        
        if not thread_result.data:
            raise NotFoundError("Thread")
        
        thread = thread_result.data[0]
        
        # Create message
        message_data = {
            'id': str(uuid4()),
            'thread_id': str(thread_id),
            'sender_id': str(sender_id),
            'sender_type': sender_type,
            'content': data.content,
            'is_read': 'false',
            'is_important': 'true' if data.is_important else 'false'
        }
        
        message_result = supabase_service.client.table('thread_messages').insert(message_data).execute()
        message = message_result.data[0] if message_result.data else None
        
        if not message:
            raise ValidationError("Failed to create message")
        
        # Handle attachments
        if data.attachments:
            for attachment in data.attachments:
                attachment_data = {
                    'id': str(uuid4()),
                    'message_id': message['id'],
                    'file_name': attachment['fileName'],
                    'file_path': attachment['filePath'],
                    'file_size': attachment['fileSize'],
                    'mime_type': attachment['mimeType']
                }
                supabase_service.client.table('message_attachments').insert(attachment_data).execute()
        
        # Update thread counters
        new_message_count = thread['message_count'] + 1
        new_unread_count = thread['unread_count'] + 1
        
        supabase_service.client.table('message_threads').update({
            'message_count': new_message_count,
            'unread_count': new_unread_count,
            'last_message_at': datetime.now(timezone.utc).isoformat()
        }).eq('id', str(thread_id)).execute()
        
        # Enrich message with sender name
        if sender_type == 'admin':
            message['sender_name'] = await self._get_admin_name(str(sender_id))
        else:
            message['sender_name'] = await self._get_member_name(str(sender_id))
        
        # Send email notification to the other party
        if sender_type == 'admin':
            # Admin replied, notify member
            member_email_result = supabase_service.client.table('members').select('email').eq('id', str(thread['member_id'])).execute()
            member_email = member_email_result.data[0]['email'] if member_email_result.data else None
            if member_email:
                frontend_url = settings.FRONTEND_URL.rstrip('/')
                thread_link = f"{frontend_url}/member/messages/threads/{thread_id}"
                await self.email_service.send_thread_reply_notification(
                    to_email=member_email,
                    sender_name=message['sender_name'],
                    subject=thread['subject'],
                    thread_link=thread_link
                )
        
        return message

    async def update_thread(self, thread_id: UUID, data: ThreadUpdate, user_id: UUID) -> dict:
        """
        Update thread status or assignment.

        Args:
            thread_id: Thread UUID
            data: Thread update data
            user_id: User UUID (admin only)

        Returns:
            Updated thread dictionary

        Raises:
            NotFoundError: If thread not found
        """
        # Check if thread exists
        thread_result = supabase_service.client.table('message_threads').select('*').eq('id', str(thread_id)).execute()
        
        if not thread_result.data:
            raise NotFoundError("Thread")
        
        # Build update data
        update_data = {}
        if data.status is not None:
            update_data['status'] = data.status
        if data.assigned_to is not None:
            update_data['assigned_to'] = str(data.assigned_to)
        
        if not update_data:
            return thread_result.data[0]
        
        # Update thread
        result = supabase_service.client.table('message_threads').update(update_data).eq('id', str(thread_id)).execute()
        
        if not result.data:
            raise NotFoundError("Thread")
        
        thread = result.data[0]
        thread['member_name'] = await self._get_member_name(thread['member_id'])
        
        return thread

    # Broadcast methods

    async def create_broadcast(self, data: BroadcastCreate, sender_id: UUID) -> dict:
        """
        Create and send a broadcast message.

        Args:
            data: Broadcast creation data
            sender_id: Admin UUID who sends the broadcast

        Returns:
            Created broadcast dictionary
        """
        broadcast_id = str(uuid4())
        
        # Get recipients
        if data.send_to_all:
            members_result = supabase_service.client.table('members').select('id').eq('approval_status', 'approved').execute()
            recipient_ids = [member['id'] for member in (members_result.data or [])]
        else:
            recipient_ids = [str(rid) for rid in data.recipient_ids]
        
        # Create broadcast
        broadcast_data = {
            'id': broadcast_id,
            'sender_id': str(sender_id),
            'subject': data.subject,
            'content': data.content,
            'category': data.category,
            'is_important': 'true' if data.is_important else 'false',
            'send_to_all': 'true' if data.send_to_all else 'false',
            'recipient_count': len(recipient_ids),
            'sent_at': datetime.now(timezone.utc).isoformat()
        }
        
        broadcast_result = supabase_service.client.table('broadcast_messages').insert(broadcast_data).execute()
        broadcast = broadcast_result.data[0] if broadcast_result.data else None
        
        if not broadcast:
            raise ValidationError("Failed to create broadcast")
        
        # Create recipient records
        recipient_records = []
        for recipient_id in recipient_ids:
            recipient_records.append({
                'id': str(uuid4()),
                'broadcast_id': broadcast_id,
                'member_id': recipient_id,
                'is_read': 'false'
            })
        
        if recipient_records:
            supabase_service.client.table('broadcast_recipients').insert(recipient_records).execute()
        
        # Handle attachments
        if data.attachments:
            attachment_records = []
            for attachment in data.attachments:
                attachment_records.append({
                    'id': str(uuid4()),
                    'broadcast_id': broadcast_id,
                    'file_name': attachment['fileName'],
                    'file_path': attachment['filePath'],
                    'file_size': attachment['fileSize'],
                    'mime_type': attachment['mimeType']
                })
            
            if attachment_records:
                supabase_service.client.table('broadcast_attachments').insert(attachment_records).execute()
        
        # Enrich with sender name
        broadcast['sender_name'] = await self._get_admin_name(str(sender_id))
        
        # Send email notifications to all recipients
        if recipient_ids:
            members_result = supabase_service.client.table('members').select('id, email').in_('id', recipient_ids).execute()
            frontend_url = settings.FRONTEND_URL.rstrip('/')
            messages_link = f"{frontend_url}/member/messages"
            for member in (members_result.data or []):
                member_email = member.get('email')
                if member_email:
                    await self.email_service.send_broadcast_notification(
                        to_email=member_email,
                        sender_name=broadcast['sender_name'],
                        subject=data.subject,
                        is_important=data.is_important,
                        messages_link=messages_link
                    )
        
        return broadcast

    # Analytics methods

    async def get_analytics(self, time_range: str = '7d') -> dict:
        """
        Get message analytics data.

        Args:
            time_range: Time range ('7d', '30d', '90d', 'all' for all time)

        Returns:
            Analytics data dictionary
        """
        # Calculate date range - support 'all' for all time
        if time_range == 'all':
            start_date = None
            days = 90  # Default to 90 days for chart display
        else:
            days = {'7d': 7, '30d': 30, '90d': 90}.get(time_range, 7)
            start_date = datetime.now(timezone.utc) - timedelta(days=days)
            start_date_str = start_date.isoformat()
        
        # Get total messages count from all message types
        # 1. Regular messages (messages table)
        regular_query = supabase_service.client.table('messages').select('*', count='exact').is_('deleted_at', 'null')
        if start_date:
            regular_query = regular_query.gte('created_at', start_date_str)
        regular_messages_result = regular_query.execute()
        regular_count = regular_messages_result.count or 0
        
        # 2. Thread messages (thread_messages table)
        thread_query = supabase_service.client.table('thread_messages').select('*', count='exact')
        if start_date:
            thread_query = thread_query.gte('created_at', start_date_str)
        thread_messages_result = thread_query.execute()
        thread_count = thread_messages_result.count or 0
        
        # 3. Broadcast messages (broadcast_messages table)
        broadcast_query = supabase_service.client.table('broadcast_messages').select('*', count='exact')
        if start_date:
            broadcast_query = broadcast_query.gte('created_at', start_date_str)
        broadcast_messages_result = broadcast_query.execute()
        broadcast_count = broadcast_messages_result.count or 0
        
        total_messages = regular_count + thread_count + broadcast_count
        
        # Get unread messages count
        # Regular messages
        unread_regular_query = supabase_service.client.table('messages').select('*', count='exact').eq('is_read', 'false').is_('deleted_at', 'null')
        if start_date:
            unread_regular_query = unread_regular_query.gte('created_at', start_date_str)
        unread_regular_result = unread_regular_query.execute()
        unread_regular = unread_regular_result.count or 0
        
        # Thread messages
        unread_thread_query = supabase_service.client.table('thread_messages').select('*', count='exact').eq('is_read', 'false')
        if start_date:
            unread_thread_query = unread_thread_query.gte('created_at', start_date_str)
        unread_thread_result = unread_thread_query.execute()
        unread_thread = unread_thread_result.count or 0
        
        # Broadcast recipients (count unread broadcast recipients)
        unread_broadcast_result = supabase_service.client.table('broadcast_recipients').select('*', count='exact').eq('is_read', 'false').execute()
        unread_broadcast = unread_broadcast_result.count or 0
        
        unread_messages = unread_regular + unread_thread + unread_broadcast
        
        # Calculate average response time from thread messages
        # Batch fetch all threads and their first admin replies to avoid N+1 queries
        threads_query = supabase_service.client.table('message_threads').select('id, created_at')
        if start_date:
            threads_query = threads_query.gte('created_at', start_date_str)
        threads_result = threads_query.execute()
        threads = threads_result.data or []
        
        # Initialize first_replies outside if block for later use
        first_replies = {}
        response_times = []
        
        if threads:
            # Batch fetch all admin replies for all threads
            thread_ids = [str(thread['id']) for thread in threads]
            
            # Get all admin replies for these threads, ordered by created_at
            all_admin_replies_query = supabase_service.client.table('thread_messages').select('thread_id, created_at').in_('thread_id', thread_ids).eq('sender_type', 'admin').order('created_at')
            all_admin_replies_result = all_admin_replies_query.execute()
            all_admin_replies = all_admin_replies_result.data or []
            
            # Group replies by thread_id, keeping only the first (earliest) reply
            for reply in all_admin_replies:
                thread_id = str(reply['thread_id'])
                if thread_id not in first_replies:
                    first_replies[thread_id] = reply['created_at']
            
            # Calculate response times
            for thread in threads:
                thread_id = str(thread['id'])
                thread_created = datetime.fromisoformat(thread['created_at'].replace('Z', '+00:00'))
                
                if thread_id in first_replies:
                    reply_time = datetime.fromisoformat(first_replies[thread_id].replace('Z', '+00:00'))
                    time_diff = (reply_time - thread_created).total_seconds() / 60  # Convert to minutes
                    if time_diff > 0:
                        response_times.append(time_diff)
        
        response_time = sum(response_times) / len(response_times) if response_times else 0.0
        
        # Get messages by day - optimize by fetching all data and grouping in memory
        chart_start_date = start_date if start_date else (datetime.now(timezone.utc) - timedelta(days=90))
        chart_days = days if start_date else 90
        
        # Batch fetch all messages in the time range
        chart_start_str = chart_start_date.isoformat()
        chart_end_date = chart_start_date + timedelta(days=chart_days)
        chart_end_str = chart_end_date.isoformat()
        
        # Fetch all messages at once
        all_regular = supabase_service.client.table('messages').select('created_at').gte('created_at', chart_start_str).lt('created_at', chart_end_str).is_('deleted_at', 'null').execute()
        all_thread = supabase_service.client.table('thread_messages').select('created_at').gte('created_at', chart_start_str).lt('created_at', chart_end_str).execute()
        all_broadcast = supabase_service.client.table('broadcast_messages').select('created_at').gte('created_at', chart_start_str).lt('created_at', chart_end_str).execute()
        
        # Group by day in memory
        day_counts = {}
        for i in range(chart_days):
            day = chart_start_date + timedelta(days=i)
            day_key = day.strftime('%Y-%m-%d')
            day_counts[day_key] = 0
        
        # Count regular messages by day
        for msg in (all_regular.data or []):
            msg_date = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
            day_key = msg_date.strftime('%Y-%m-%d')
            if day_key in day_counts:
                day_counts[day_key] += 1
        
        # Count thread messages by day
        for msg in (all_thread.data or []):
            msg_date = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
            day_key = msg_date.strftime('%Y-%m-%d')
            if day_key in day_counts:
                day_counts[day_key] += 1
        
        # Count broadcast messages by day
        for msg in (all_broadcast.data or []):
            msg_date = datetime.fromisoformat(msg['created_at'].replace('Z', '+00:00'))
            day_key = msg_date.strftime('%Y-%m-%d')
            if day_key in day_counts:
                day_counts[day_key] += 1
        
        # Format messages_by_day
        messages_by_day = [
            {'date': day_key, 'count': count}
            for day_key, count in sorted(day_counts.items())
        ]
        
        # Get messages by category from threads and broadcasts
        category_counts = {}
        
        # Get categories from threads
        threads_categories_query = supabase_service.client.table('message_threads').select('category')
        if start_date:
            threads_categories_query = threads_categories_query.gte('created_at', start_date_str)
        threads_categories = threads_categories_query.execute()
        for thread in (threads_categories.data or []):
            category = thread.get('category', 'general')
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Get categories from broadcasts
        broadcasts_categories_query = supabase_service.client.table('broadcast_messages').select('category')
        if start_date:
            broadcasts_categories_query = broadcasts_categories_query.gte('created_at', start_date_str)
        broadcasts_categories = broadcasts_categories_query.execute()
        for broadcast in (broadcasts_categories.data or []):
            category = broadcast.get('category', 'general')
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Format messages by category
        messages_by_category = [
            {'category': cat, 'count': count}
            for cat, count in category_counts.items()
        ]
        
        # If no categories, provide defaults
        if not messages_by_category:
            messages_by_category = [
                {'category': 'general', 'count': 0},
                {'category': 'support', 'count': 0},
                {'category': 'performance', 'count': 0}
            ]
        
        # Response time by day - use already fetched data
        response_time_by_day = []
        
        # Group threads by day (only for threads in chart time range)
        threads_by_day = {}
        for thread in threads:
            thread_date = datetime.fromisoformat(thread['created_at'].replace('Z', '+00:00'))
            # Only include threads within chart time range
            if thread_date >= chart_start_date and thread_date < chart_end_date:
                day_key = thread_date.strftime('%Y-%m-%d')
                if day_key not in threads_by_day:
                    threads_by_day[day_key] = []
                threads_by_day[day_key].append(thread)
        
        # Calculate response time for each day
        for i in range(chart_days):
            day = chart_start_date + timedelta(days=i)
            day_key = day.strftime('%Y-%m-%d')
            day_response_times = []
            
            if day_key in threads_by_day:
                for thread in threads_by_day[day_key]:
                    thread_id = str(thread['id'])
                    thread_created = datetime.fromisoformat(thread['created_at'].replace('Z', '+00:00'))
                    
                    # Use already fetched first_replies
                    if thread_id in first_replies:
                        reply_time = datetime.fromisoformat(first_replies[thread_id].replace('Z', '+00:00'))
                        time_diff = (reply_time - thread_created).total_seconds() / 60
                        if time_diff > 0:
                            day_response_times.append(time_diff)
            
            avg_day_response = sum(day_response_times) / len(day_response_times) if day_response_times else (response_time if response_time > 0 else 0.0)
            
            response_time_by_day.append({
                'date': day_key,
                'response_time': round(avg_day_response, 1)
            })
        
        return {
            'total_messages': total_messages,
            'unread_messages': unread_messages,
            'response_time': round(response_time, 1),
            'messages_by_day': messages_by_day,
            'messages_by_category': messages_by_category,
            'response_time_by_day': response_time_by_day
        }

