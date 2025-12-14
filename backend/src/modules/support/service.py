"""
Support service.

Business logic for support management (FAQs and inquiries).
"""
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from datetime import datetime

from ...common.modules.exception import NotFoundError, ForbiddenError
from ...common.modules.supabase.service import supabase_service
from .schemas import FAQCreate, FAQUpdate, InquiryCreate, InquiryReplyRequest


class SupportService:
    """Support service class."""

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

    # ============================================================================
    # FAQ Management - Using Supabase Client
    # ============================================================================

    async def get_faqs(
        self, category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get FAQs, optionally filtered by category.

        Args:
            category: Optional category filter

        Returns:
            List of FAQ dictionaries ordered by display_order
        """
        query = supabase_service.client.table('faqs').select('*')
        
        if category:
            query = query.eq('category', category)
        
        query = query.order('display_order', desc=False).order('created_at', desc=False)
        
        result = query.execute()
        return result.data

    async def create_faq(self, data: FAQCreate) -> Dict[str, Any]:
        """
        Create a new FAQ.

        Args:
            data: FAQ creation data

        Returns:
            Created FAQ dictionary
        """
        faq_data = {
            'category': data.category,
            'question': data.question,
            'answer': data.answer,
            'display_order': data.display_order,
        }
        
        result = supabase_service.client.table('faqs').insert(faq_data).execute()
        return result.data[0] if result.data else None

    async def update_faq(
        self, faq_id: UUID, data: FAQUpdate
    ) -> Dict[str, Any]:
        """
        Update an FAQ.

        Args:
            faq_id: FAQ UUID
            data: FAQ update data

        Returns:
            Updated FAQ dictionary

        Raises:
            NotFoundError: If FAQ not found
        """
        # Build update data (only include non-None fields)
        update_data = {}
        if data.category is not None:
            update_data['category'] = data.category
        if data.question is not None:
            update_data['question'] = data.question
        if data.answer is not None:
            update_data['answer'] = data.answer
        if data.display_order is not None:
            update_data['display_order'] = data.display_order
        
        if not update_data:
            # No fields to update, just return existing FAQ
            result = supabase_service.client.table('faqs').select('*').eq('id', str(faq_id)).execute()
            if not result.data:
                raise NotFoundError("FAQ")
            return result.data[0]
        
        result = supabase_service.client.table('faqs').update(update_data).eq('id', str(faq_id)).execute()
        
        if not result.data:
            raise NotFoundError("FAQ")
        
        return result.data[0]

    async def delete_faq(self, faq_id: UUID) -> None:
        """
        Delete an FAQ.

        Args:
            faq_id: FAQ UUID

        Raises:
            NotFoundError: If FAQ not found
        """
        # Check if FAQ exists first
        check_result = supabase_service.client.table('faqs').select('id').eq('id', str(faq_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("FAQ")
        
        # Delete the FAQ
        supabase_service.client.table('faqs').delete().eq('id', str(faq_id)).execute()

    # Inquiry Management - Using Supabase Client

    async def create_inquiry(
        self, data: InquiryCreate, member_id: UUID
    ) -> Dict[str, Any]:
        """
        Create a new inquiry.

        Args:
            data: Inquiry creation data
            member_id: Member UUID

        Returns:
            Created inquiry dictionary
        """
        inquiry_data = {
            'member_id': str(member_id),
            'subject': data.subject,
            'content': data.content,
            'status': 'pending',
            'admin_reply': None,
            'replied_at': None
        }
        
        result = supabase_service.client.table('inquiries').insert(inquiry_data).execute()
        return result.data[0] if result.data else None

    async def get_member_inquiries(
        self,
        member_id: UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get member's own inquiries with pagination.

        Args:
            member_id: Member UUID
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (inquiries list, total count)
        """
        # Get total count first
        count_query = supabase_service.client.table('inquiries').select('*', count='exact').eq('member_id', str(member_id))
        count_result = count_query.execute()
        total = count_result.count or 0
        
        # Get paginated results
        query = supabase_service.client.table('inquiries').select('*').eq('member_id', str(member_id))
        query = query.order('created_at', desc=True).range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        inquiries = result.data or []

        return inquiries, total

    async def get_inquiry_by_id(
        self, inquiry_id: UUID, member_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """
        Get inquiry by ID with ownership verification.

        Args:
            inquiry_id: Inquiry UUID
            member_id: Optional member ID for ownership check (if None, admin access)

        Returns:
            Inquiry dictionary

        Raises:
            NotFoundError: If inquiry not found
            ForbiddenError: If member tries to access another member's inquiry
        """
        query = supabase_service.client.table('inquiries').select('*').eq('id', str(inquiry_id))
        result = query.execute()
        
        if not result.data:
            raise NotFoundError("Inquiry")
        
        inquiry = result.data[0]

        # If member_id is provided, verify ownership
        if member_id is not None and inquiry['member_id'] != str(member_id):
            raise ForbiddenError("You can only access your own inquiries")

        return inquiry

    async def get_all_inquiries_admin(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get all inquiries for admin with pagination and filtering.

        Args:
            page: Page number (1-indexed)
            page_size: Items per page
            status: Optional status filter (pending, replied, closed)

        Returns:
            Tuple of (inquiries list with member_name, total count)
        """
        # Build query with optional status filter
        count_query = supabase_service.client.table('inquiries').select('*', count='exact')
        query = supabase_service.client.table('inquiries').select('*')
        
        if status:
            count_query = count_query.eq('status', status)
            query = query.eq('status', status)
        
        # Get total count
        count_result = count_query.execute()
        total = count_result.count or 0
        
        # Get paginated results
        query = query.order('created_at', desc=True).range((page - 1) * page_size, page * page_size - 1)
        
        result = query.execute()
        inquiries = result.data or []
        
        # Add member names
        for inquiry in inquiries:
            inquiry['member_name'] = await self._get_member_name(inquiry.get('member_id'))

        return inquiries, total

    async def reply_to_inquiry(
        self, inquiry_id: UUID, reply_data: InquiryReplyRequest
    ) -> Dict[str, Any]:
        """
        Reply to an inquiry (admin only).

        Args:
            inquiry_id: Inquiry UUID
            reply_data: Reply content

        Returns:
            Updated inquiry dictionary

        Raises:
            NotFoundError: If inquiry not found
        """
        from datetime import datetime, timezone
        
        # Check if inquiry exists first
        check_result = supabase_service.client.table('inquiries').select('id').eq('id', str(inquiry_id)).execute()
        
        if not check_result.data:
            raise NotFoundError("Inquiry")
        
        # Update inquiry with reply
        update_data = {
            'admin_reply': reply_data.admin_reply,
            'status': 'replied',
            'replied_at': datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase_service.client.table('inquiries').update(update_data).eq('id', str(inquiry_id)).execute()
        
        if not result.data:
            raise NotFoundError("Inquiry")
        
        inquiry = result.data[0]
        inquiry['member_name'] = await self._get_member_name(inquiry.get('member_id'))
        
        return inquiry

