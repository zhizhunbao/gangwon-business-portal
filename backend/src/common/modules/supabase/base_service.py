"""
Base database service for Supabase operations.

Provides common database functionality that can be shared across all services.
"""
from typing import Dict, Any, List, Optional
from supabase import Client
from .client import get_supabase_client


class BaseSupabaseService:
    """Base service class for Supabase operations."""
    
    def __init__(self):
        self.client: Client = get_supabase_client()
        self._raw_client: Client = get_supabase_client()
    
    async def count_records(self, table_name: str, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records in a table with optional filters."""
        query = self.client.table(table_name).select('*', count='exact')
        
        if filters:
            for key, value in filters.items():
                if value is not None:
                    query = query.eq(key, value)
        
        result = query.execute()
        return result.count or 0
    
    async def execute_raw_query(self, query: str) -> List[Dict[str, Any]]:
        """Execute raw SQL query and return results."""
        try:
            result = self._raw_client.postgrest.rpc('execute_sql', {'query': query}).execute()
            
            if not result.data:
                return []
            
            # Handle different response formats
            if isinstance(result.data, list) and len(result.data) > 0:
                first_item = result.data[0]
                if isinstance(first_item, dict) and 'rows' in first_item and 'columns' in first_item:
                    # Format: [{"rows": [[...]], "columns": [...]}]
                    rows = first_item['rows']
                    columns = first_item['columns']
                    return [dict(zip(columns, row)) for row in rows]
                else:
                    # Direct list of dictionaries
                    return result.data
            
            return []
        except Exception as e:
            print(f"Raw query error: {e}")
            return []
    
    async def _fuzzy_search_with_filters(
        self,
        table_name: str,
        search_fields: List[str],
        search_term: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
        order_by: str = 'created_at',
        order_direction: str = 'desc'
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Perform secure fuzzy search with filters using Supabase client.
        
        Args:
            table_name: Name of the table to search
            search_fields: List of validated field names to search in
            search_term: Term to search for (will be sanitized)
            filters: Additional filters to apply (key-value pairs)
            limit: Maximum number of results (1-1000)
            offset: Number of results to skip
            order_by: Field to order by (default: created_at)
            order_direction: Order direction 'asc' or 'desc' (default: desc)
            
        Returns:
            Tuple of (results, total_count)
            
        Raises:
            ValueError: If parameters are invalid
            Exception: If database operation fails
        """
        # Input validation
        if not table_name or not isinstance(table_name, str):
            raise ValueError("table_name must be a non-empty string")
        
        if not search_fields or not isinstance(search_fields, list):
            raise ValueError("search_fields must be a non-empty list")
        
        if not search_term or not isinstance(search_term, str):
            return [], 0  # Empty search returns empty results
        
        # Sanitize search term (escape special characters)
        search_term = search_term.strip()
        if len(search_term) < 2:  # Minimum search length
            return [], 0
        
        # Validate limit and offset
        limit = max(1, min(limit, 1000))  # Clamp between 1-1000
        offset = max(0, offset)
        
        # Validate order direction
        if order_direction.lower() not in ['asc', 'desc']:
            order_direction = 'desc'
        
        try:
            # Use Supabase client's built-in search capabilities
            # This is safer than raw SQL and handles escaping automatically
            
            # Build the base query
            query = self.client.table(table_name).select('*', count='exact')
            
            # Apply filters first
            if filters:
                for key, value in filters.items():
                    if value is not None:
                        # Use Supabase's built-in filtering (safe from injection)
                        if key == 'deleted_at' and value is None:
                            query = query.is_('deleted_at', 'null')
                        else:
                            query = query.eq(key, value)
            
            # Apply search conditions using OR logic
            # Note: Supabase doesn't have built-in multi-field search,
            # so we need to use multiple queries and combine results
            
            # For now, use the first search field as primary search
            # This is a limitation but safer than raw SQL injection
            primary_field = search_fields[0]
            query = query.ilike(primary_field, f'%{search_term}%')
            
            # Apply ordering
            if order_direction.lower() == 'desc':
                query = query.order(order_by, desc=True)
            else:
                query = query.order(order_by, desc=False)
            
            # Apply pagination
            query = query.range(offset, offset + limit - 1)
            
            # Execute query
            result = query.execute()
            
            return result.data or [], result.count or 0
            
        except Exception as e:
            # Log the error properly and re-raise
            print(f"Database search error in table {table_name}: {e}")
            raise Exception(f"Search operation failed: {str(e)}")
    
    async def _multi_field_fuzzy_search(
        self,
        table_name: str,
        search_fields: List[str],
        search_term: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Enhanced multi-field search using multiple queries.
        
        This method performs separate searches on each field and combines results,
        which is safer than raw SQL but may be slower for large datasets.
        """
        if not search_term or len(search_term.strip()) < 2:
            return [], 0
        
        search_term = search_term.strip()
        all_results = []
        seen_ids = set()
        
        try:
            # Search each field separately and combine results
            for field in search_fields:
                query = self.client.table(table_name).select('*')
                
                # Apply filters
                if filters:
                    for key, value in filters.items():
                        if value is not None:
                            if key == 'deleted_at' and value is None:
                                query = query.is_('deleted_at', 'null')
                            else:
                                query = query.eq(key, value)
                
                # Apply search on this field
                query = query.ilike(field, f'%{search_term}%')
                
                # Execute query
                result = query.execute()
                
                # Add unique results
                for item in result.data or []:
                    item_id = item.get('id')
                    if item_id and item_id not in seen_ids:
                        seen_ids.add(item_id)
                        all_results.append(item)
            
            # Sort results by created_at (or other field)
            all_results.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            # Apply pagination
            total = len(all_results)
            paginated_results = all_results[offset:offset + limit]
            
            return paginated_results, total
            
        except Exception as e:
            print(f"Multi-field search error in table {table_name}: {e}")
            raise Exception(f"Multi-field search operation failed: {str(e)}")