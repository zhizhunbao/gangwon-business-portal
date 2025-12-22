"""
Service factory for Supabase services.

Provides centralized access to all Supabase services with singleton pattern.
"""
from .member_service import MemberService
from .admin_service import AdminService
from .attachment_service import AttachmentService
from .performance_service import PerformanceService
from .project_service import ProjectService
from .content_service import ContentService
from .message_service import MessageService
from .log_service import LogService
from .nice_dnb_service import NiceDnbService


class SupabaseServiceFactory:
    """Factory class for creating and managing Supabase service instances."""
    
    _instances = {}
    
    @classmethod
    def get_member_service(cls) -> MemberService:
        """Get or create MemberService instance."""
        if 'member' not in cls._instances:
            cls._instances['member'] = MemberService()
        return cls._instances['member']
    
    @classmethod
    def get_admin_service(cls) -> AdminService:
        """Get or create AdminService instance."""
        if 'admin' not in cls._instances:
            cls._instances['admin'] = AdminService()
        return cls._instances['admin']
    
    @classmethod
    def get_attachment_service(cls) -> AttachmentService:
        """Get or create AttachmentService instance."""
        if 'attachment' not in cls._instances:
            cls._instances['attachment'] = AttachmentService()
        return cls._instances['attachment']
    
    @classmethod
    def get_performance_service(cls) -> PerformanceService:
        """Get or create PerformanceService instance."""
        if 'performance' not in cls._instances:
            cls._instances['performance'] = PerformanceService()
        return cls._instances['performance']
    
    @classmethod
    def get_project_service(cls) -> ProjectService:
        """Get or create ProjectService instance."""
        if 'project' not in cls._instances:
            cls._instances['project'] = ProjectService()
        return cls._instances['project']
    
    @classmethod
    def get_content_service(cls) -> ContentService:
        """Get or create ContentService instance."""
        if 'content' not in cls._instances:
            cls._instances['content'] = ContentService()
        return cls._instances['content']
    
    @classmethod
    def get_message_service(cls) -> MessageService:
        """Get or create MessageService instance."""
        if 'message' not in cls._instances:
            cls._instances['message'] = MessageService()
        return cls._instances['message']
    
    @classmethod
    def get_log_service(cls) -> LogService:
        """Get or create LogService instance."""
        if 'log' not in cls._instances:
            cls._instances['log'] = LogService()
        return cls._instances['log']
    
    @classmethod
    def get_nice_dnb_service(cls) -> NiceDnbService:
        """Get or create NiceDnbService instance."""
        if 'nice_dnb' not in cls._instances:
            cls._instances['nice_dnb'] = NiceDnbService()
        return cls._instances['nice_dnb']
    
    @classmethod
    def clear_instances(cls):
        """Clear all service instances (useful for testing)."""
        cls._instances.clear()


# Convenience functions for direct access
def get_member_service() -> MemberService:
    """Get MemberService instance."""
    return SupabaseServiceFactory.get_member_service()


def get_admin_service() -> AdminService:
    """Get AdminService instance."""
    return SupabaseServiceFactory.get_admin_service()


def get_attachment_service() -> AttachmentService:
    """Get AttachmentService instance."""
    return SupabaseServiceFactory.get_attachment_service()


def get_performance_service() -> PerformanceService:
    """Get PerformanceService instance."""
    return SupabaseServiceFactory.get_performance_service()


def get_project_service() -> ProjectService:
    """Get ProjectService instance."""
    return SupabaseServiceFactory.get_project_service()


def get_content_service() -> ContentService:
    """Get ContentService instance."""
    return SupabaseServiceFactory.get_content_service()


def get_message_service() -> MessageService:
    """Get MessageService instance."""
    return SupabaseServiceFactory.get_message_service()


def get_log_service() -> LogService:
    """Get LogService instance."""
    return SupabaseServiceFactory.get_log_service()


def get_nice_dnb_service() -> NiceDnbService:
    """Get NiceDnbService instance."""
    return SupabaseServiceFactory.get_nice_dnb_service()