"""
Supabase Integration Module

This module provides both the original monolithic service (for backward compatibility)
and the new refactored services that follow Single Responsibility Principle.

Usage:
    # For backward compatibility (uses specialized services internally)
    from .service import supabase_service
    
    # For new code, use specific services
    from .service_factory import (
        get_member_service,
        get_admin_service,
        get_attachment_service,
        get_performance_service,
        get_project_service,
        get_content_service,
        get_message_service,
        get_log_service
    )
"""
from .client import get_supabase_client, supabase_client

# Import the unified service that maintains backward compatibility
from .service import SupabaseService, supabase_service

# Import service factory for new usage patterns
from .service_factory import (
    SupabaseServiceFactory,
    get_member_service,
    get_admin_service,
    get_attachment_service,
    get_performance_service,
    get_project_service,
    get_content_service,
    get_message_service,
    get_log_service
)

__all__ = [
    # Client
    'get_supabase_client', 
    'supabase_client',
    
    # Backward compatibility
    'supabase_service',
    'SupabaseService',
    
    # New services
    'SupabaseServiceFactory',
    'get_member_service',
    'get_admin_service',
    'get_attachment_service',
    'get_performance_service',
    'get_project_service',
    'get_content_service',
    'get_message_service',
    'get_log_service',
]