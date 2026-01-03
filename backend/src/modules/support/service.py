"""
Support service.

Business logic for support management (FAQs).
"""
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4

from ...common.modules.exception import NotFoundError
from ...common.modules.supabase.service import supabase_service
from .schemas import FAQCreate, FAQUpdate


class SupportService:
    """Support service class."""

    # ============================================================================
    # FAQ Management - Using Supabase Service Helper Methods
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
        # Use direct client for complex ordering (display_order + created_at)
        query = supabase_service.client.table('faqs').select('*')
        
        if category:
            query = query.eq('category', category)
        
        query = query.order('display_order', desc=False).order('created_at', desc=False)
        
        result = query.execute()
        return result.data or []

    async def create_faq(self, data: FAQCreate) -> Dict[str, Any]:
        """
        Create a new FAQ.

        Args:
            data: FAQ creation data

        Returns:
            Created FAQ dictionary
        """
        faq_data = {
            'id': str(uuid4()),
            'category': data.category,
            'question': data.question,
            'answer': data.answer,
            'display_order': data.display_order,
        }
        
        # Use generic helper method
        return await supabase_service.create_record('faqs', faq_data)

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
        # Check if FAQ exists using generic helper
        existing_faq = await supabase_service.get_by_id('faqs', str(faq_id))
        if not existing_faq:
            raise NotFoundError(resource_type="FAQ")

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
            # No fields to update, return existing FAQ
            return existing_faq
        
        # Use generic helper method
        return await supabase_service.update_record('faqs', str(faq_id), update_data)

    async def delete_faq(self, faq_id: UUID) -> None:
        """
        Delete an FAQ (hard delete).

        Args:
            faq_id: FAQ UUID

        Raises:
            NotFoundError: If FAQ not found
        """
        # Check if FAQ exists using generic helper
        existing_faq = await supabase_service.get_by_id('faqs', str(faq_id))
        if not existing_faq:
            raise NotFoundError(resource_type="FAQ")
        
        # Use generic hard delete method
        await supabase_service.hard_delete_record('faqs', str(faq_id))

    async def get_faq_by_id(self, faq_id: UUID) -> Dict[str, Any]:
        """
        Get FAQ by ID.

        Args:
            faq_id: FAQ UUID

        Returns:
            FAQ dictionary

        Raises:
            NotFoundError: If FAQ not found
        """
        # Use generic helper method
        faq = await supabase_service.get_by_id('faqs', str(faq_id))
        if not faq:
            raise NotFoundError(resource_type="FAQ")
        return faq

    async def list_faqs_with_pagination(
        self,
        page: int = 1,
        page_size: int = 20,
        category: Optional[str] = None
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        List FAQs with pagination.

        Args:
            page: Page number
            page_size: Items per page
            category: Optional category filter

        Returns:
            Tuple of (FAQs list, total count)
        """
        filters = {}
        if category:
            filters['category'] = category

        # Use generic pagination helper, but with custom ordering
        # For simple cases, we can use the helper method
        if not category:
            # Simple case - use helper method
            return await supabase_service.list_with_pagination(
                table='faqs',
                page=page,
                page_size=page_size,
                order_by='display_order',
                order_desc=False,
                exclude_deleted=False  # FAQs don't use soft delete
            )
        else:
            # Complex case with category filter - use direct client
            # Get total count first
            total = await supabase_service.count_records('faqs', filters)
            
            # Get paginated results
            query = supabase_service.client.table('faqs').select('*')
            query = query.eq('category', category)
            query = query.order('display_order', desc=False).order('created_at', desc=False)
            
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)
            
            result = query.execute()
            return result.data or [], total

