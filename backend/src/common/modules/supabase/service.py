"""
Supabase service with delegation to specialized services.

This service maintains backward compatibility while delegating to specialized services
that follow the Single Responsibility Principle.
"""
from typing import Dict, Any, List, Optional, Tuple
from .service_factory import (
    get_member_service,
    get_admin_service,
    get_attachment_service,
    get_performance_service,
    get_project_service
)
from .base_service import BaseSupabaseService


class SupabaseService(BaseSupabaseService):
    """
    Unified Supabase service that delegates to specialized services.
    
    This class maintains backward compatibility with the original SupabaseService
    while internally using the new specialized services that follow SRP.
    """
    
    def __init__(self):
        super().__init__()
        # Initialize service references
        self._member_service = get_member_service()
        self._admin_service = get_admin_service()
        self._attachment_service = get_attachment_service()
        self._performance_service = get_performance_service()
        self._project_service = get_project_service()
    
    # ============================================================================
    # Member Operations - Delegate to MemberService
    # ============================================================================
    
    async def get_members(self, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """获取会员列表"""
        return await self._member_service.get_members(limit, offset)
    
    async def get_member_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取会员"""
        return await self._member_service.get_member_by_id(member_id)
    
    async def create_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新会员"""
        return await self._member_service.create_member(member_data)
    
    async def update_member(self, member_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新会员信息"""
        return await self._member_service.update_member(member_id, update_data)
    
    async def delete_member(self, member_id: str) -> bool:
        """删除会员"""
        return await self._member_service.delete_member(member_id)
    
    async def get_member_by_business_number(self, business_number: str) -> Optional[Dict[str, Any]]:
        """根据事业자登록번호获取会员"""
        return await self._member_service.get_member_by_business_number(business_number)
    
    async def get_member_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取会员"""
        return await self._member_service.get_member_by_email(email)
    
    async def get_member_by_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """根据重置令牌获取会员"""
        return await self._member_service.get_member_by_reset_token(token)
    
    async def check_email_uniqueness(self, email: str, exclude_member_id: Optional[str] = None) -> bool:
        """检查邮箱是否已被使用"""
        return await self._member_service.check_email_uniqueness(email, exclude_member_id)
    
    async def get_approved_members_count(self) -> int:
        """获取已批准会员总数"""
        return await self._member_service.get_approved_members_count()
    
    async def list_members_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List members with advanced filtering and search capabilities."""
        return await self._member_service.list_members_with_filters(**kwargs)
    
    # ============================================================================
    # Admin Operations - Delegate to AdminService
    # ============================================================================
    
    async def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取管理员"""
        return await self._admin_service.get_admin_by_id(admin_id)
    
    async def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取管理员"""
        return await self._admin_service.get_admin_by_email(email)
    
    # ============================================================================
    # Member Profile Operations - Now handled by MemberService (merged)
    # ============================================================================
    
    async def get_member_profile(self, member_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """获取会员及其档案信息"""
        return await self._member_service.get_member_profile(member_id)
    
    async def get_member_profile_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取会员档案"""
        return await self._member_service.get_member_profile_by_id(member_id)
    
    async def create_member_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建会员档案"""
        return await self._member_service.create_member_profile(profile_data)
    
    async def update_member_profile(self, member_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新或创建会员档案（upsert 模式）"""
        return await self._member_service.update_member_profile(member_id, profile_data)
    
    # ============================================================================
    # Attachment Operations - Delegate to AttachmentService
    # ============================================================================
    
    async def create_attachment(self, attachment_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建附件记录"""
        return await self._attachment_service.create_attachment(attachment_data)
    
    async def get_attachment_by_id(self, attachment_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取附件"""
        return await self._attachment_service.get_attachment_by_id(attachment_id)
    
    async def delete_attachment(self, attachment_id: str) -> bool:
        """软删除附件记录（设置 deleted_at）"""
        return await self._attachment_service.delete_attachment(attachment_id)
    
    async def get_attachments_by_resource(self, resource_type: str, resource_id: str) -> List[Dict[str, Any]]:
        """根据资源类型和ID获取附件列表"""
        return await self._attachment_service.get_attachments_by_resource(resource_type, resource_id)
    
    # ============================================================================
    # Performance Operations - Delegate to PerformanceService
    # ============================================================================
    
    async def get_performance_record_by_id(self, performance_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取绩效记录"""
        return await self._performance_service.get_performance_record_by_id(performance_id)
    
    async def create_performance_record(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建绩效记录"""
        return await self._performance_service.create_performance_record(record_data)
    
    async def update_performance_record(self, performance_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新绩效记录"""
        return await self._performance_service.update_performance_record(performance_id, update_data)
    
    async def delete_performance_record(self, performance_id: str) -> bool:
        """软删除绩效记录（设置 deleted_at）"""
        return await self._performance_service.delete_performance_record(performance_id)
    
    async def list_performance_records_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List performance records with advanced filtering and search capabilities."""
        return await self._performance_service.list_performance_records_with_filters(**kwargs)
    
    async def create_performance_review(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建绩效审核记录"""
        return await self._performance_service.create_performance_review(review_data)
    
    async def get_performance_reviews_by_performance_id(self, performance_id: str) -> List[Dict[str, Any]]:
        """根据绩效记录ID获取所有审核记录"""
        return await self._performance_service.get_performance_reviews_by_performance_id(performance_id)
    
    async def get_performance_records(self, **kwargs) -> List[Dict[str, Any]]:
        """Get performance records with filters for dashboard."""
        return await self._performance_service.get_performance_records(**kwargs)
    
    async def get_performance_records_for_chart(self, **kwargs) -> List[Dict[str, Any]]:
        """Get performance records for chart data generation."""
        return await self._performance_service.get_performance_records_for_chart(**kwargs)
    
    # ============================================================================
    # Project Operations - Delegate to ProjectService
    # ============================================================================
    
    async def get_project_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取项目"""
        return await self._project_service.get_project_by_id(project_id)
    
    async def create_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新项目"""
        return await self._project_service.create_project(project_data)
    
    async def update_project(self, project_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新项目"""
        return await self._project_service.update_project(project_id, update_data)
    
    async def delete_project(self, project_id: str) -> bool:
        """软删除项目（设置 deleted_at）"""
        return await self._project_service.delete_project(project_id)
    
    async def list_projects_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List projects with advanced filtering and search capabilities."""
        return await self._project_service.list_projects_with_filters(**kwargs)
    
    async def get_project_application_count(self, project_id: str) -> int:
        """获取项目的申请数量"""
        return await self._project_service.get_project_application_count(project_id)
    
    async def get_project_application_by_id(self, application_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取项目申请"""
        return await self._project_service.get_project_application_by_id(application_id)
    
    async def create_project_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建项目申请"""
        return await self._project_service.create_project_application(application_data)
    
    async def update_project_application(self, application_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新项目申请"""
        return await self._project_service.update_project_application(application_id, update_data)
    
    async def delete_project_application(self, application_id: str) -> bool:
        """软删除项目申请（设置 deleted_at）"""
        return await self._project_service.delete_project_application(application_id)
    
    async def list_project_applications_with_filters(self, **kwargs) -> Tuple[List[Dict[str, Any]], int]:
        """List project applications with advanced filtering and search capabilities."""
        return await self._project_service.list_project_applications_with_filters(**kwargs)
    
    # ============================================================================
    # Export Operations - Delegate to respective services
    # ============================================================================
    
    async def export_performance_records(self, **kwargs) -> List[Dict[str, Any]]:
        """Export performance records for download."""
        return await self._performance_service.export_performance_records(**kwargs)
    
    async def export_projects(self, **kwargs) -> List[Dict[str, Any]]:
        """Export projects for download."""
        return await self._project_service.export_projects(**kwargs)
    
    async def export_project_applications(self, **kwargs) -> List[Dict[str, Any]]:
        """Export project applications for download."""
        return await self._project_service.export_project_applications(**kwargs)


# Create singleton instance for backward compatibility
supabase_service = SupabaseService()

__all__ = ['supabase_service', 'SupabaseService']