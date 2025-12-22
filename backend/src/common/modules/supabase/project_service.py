"""
Project management service.

Handles all project and project application-related database operations.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from .base_service import BaseSupabaseService


class ProjectService(BaseSupabaseService):
    """Service for project management operations."""
    
    # ============================================================================
    # Projects
    # ============================================================================
    
    async def get_project_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取项目"""
        result = self.client.table('projects')\
            .select('*')\
            .eq('id', project_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新项目"""
        result = self.client.table('projects')\
            .insert(project_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create project: no data returned")
        return result.data[0]
    
    async def update_project(self, project_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新项目"""
        result = self.client.table('projects')\
            .update(update_data)\
            .eq('id', project_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update project {project_id}: no data returned")
        return result.data[0]
    
    async def delete_project(self, project_id: str) -> bool:
        """软删除项目（设置 deleted_at）"""
        self.client.table('projects')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', project_id)\
            .execute()
        return True
    
    async def list_projects_with_filters(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        year: Optional[int] = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List projects with advanced filtering and search capabilities.
        
        Args:
            limit: Maximum number of results per page
            offset: Number of results to skip
            search: Search term for fuzzy matching
            status: Filter by status
            category: Filter by category
            year: Filter by year
            sort_by: Field to sort by
            sort_order: Sort order ('asc' or 'desc')
            
        Returns:
            Tuple of (projects_list, total_count)
        """
        if search and len(search.strip()) > 0:
            return await self._list_projects_search(
                search.strip(), limit, offset, status, category, year
            )
        else:
            return await self._list_projects_normal(
                limit, offset, status, category, year, sort_by, sort_order
            )
    
    async def _list_projects_normal(
        self,
        limit: int,
        offset: int,
        status: Optional[str],
        category: Optional[str],
        year: Optional[int],
        sort_by: str,
        sort_order: str
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List projects without search (normal filtering)."""
        # Build filters
        filters = {'deleted_at': None}  # Only non-deleted records
        if status:
            filters['status'] = status
        if category:
            filters['category'] = category
        if year:
            filters['year'] = year
        
        # Count total
        total = await self.count_records('projects', filters)
        
        # Get data
        query = self.client.table('projects').select('*')
        
        # Apply filters
        for key, value in filters.items():
            if key == 'deleted_at' and value is None:
                query = query.is_('deleted_at', 'null')
            elif value is not None:
                query = query.eq(key, value)
        
        # Apply sorting
        if sort_order == 'desc':
            query = query.order(sort_by, desc=True)
        else:
            query = query.order(sort_by, desc=False)
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        projects = result.data or []
        
        # Enrich with application count
        enriched_projects = await self._enrich_projects_with_application_count(projects)
        
        return enriched_projects, total
    
    async def _list_projects_search(
        self,
        search_term: str,
        limit: int,
        offset: int,
        status: Optional[str],
        category: Optional[str],
        year: Optional[int]
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List projects with search functionality."""
        # Build filters
        filters = {'deleted_at': None}  # Only non-deleted records
        if status:
            filters['status'] = status
        if category:
            filters['category'] = category
        if year:
            filters['year'] = year
        
        # Define searchable fields
        search_fields = ['title', 'description', 'objectives']
        
        # Use fuzzy search
        projects, total = await self._fuzzy_search_with_filters(
            'projects', search_fields, search_term, filters, limit, offset
        )
        
        # Enrich with application count
        enriched_projects = await self._enrich_projects_with_application_count(projects)
        
        return enriched_projects, total
    
    async def _enrich_projects_with_application_count(self, projects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich projects with application count using batch query for better performance."""
        if not projects:
            return projects
        
        project_ids = [project['id'] for project in projects]
        
        # Batch query for all application counts at once
        try:
            # Use a single query to get counts for all projects
            result = self.client.table('project_applications')\
                .select('project_id')\
                .in_('project_id', project_ids)\
                .is_('deleted_at', 'null')\
                .execute()
            
            # Count applications per project
            application_counts = {}
            for app in result.data or []:
                project_id = app['project_id']
                application_counts[project_id] = application_counts.get(project_id, 0) + 1
            
        except Exception as e:
            # Fallback: if batch query fails, set all counts to 0
            import logging
            logging.warning(f"Failed to batch query application counts: {e}")
            application_counts = {}
        
        # Add counts to projects
        enriched_projects = []
        for project in projects:
            enriched_project = project.copy()
            enriched_project['application_count'] = application_counts.get(project['id'], 0)
            enriched_projects.append(enriched_project)
        
        return enriched_projects
    
    # ============================================================================
    # Project Applications
    # ============================================================================
    
    async def get_project_application_count(self, project_id: str) -> int:
        """获取项目的申请数量"""
        result = self.client.table('project_applications')\
            .select('*', count='exact')\
            .eq('project_id', project_id)\
            .execute()
        return result.count or 0
    
    async def get_project_application_by_id(self, application_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取项目申请"""
        result = self.client.table('project_applications')\
            .select('*')\
            .eq('id', application_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_project_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建项目申请"""
        result = self.client.table('project_applications')\
            .insert(application_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create project application: no data returned")
        return result.data[0]
    
    async def update_project_application(self, application_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新项目申请"""
        result = self.client.table('project_applications')\
            .update(update_data)\
            .eq('id', application_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update project application {application_id}: no data returned")
        return result.data[0]
    
    async def delete_project_application(self, application_id: str) -> bool:
        """软删除项目申请（设置 deleted_at）"""
        self.client.table('project_applications')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', application_id)\
            .execute()
        return True
    
    async def list_project_applications_with_filters(
        self,
        limit: int = 20,
        offset: int = 0,
        search: Optional[str] = None,
        status: Optional[str] = None,
        project_id: Optional[str] = None,
        member_id: Optional[str] = None,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        List project applications with advanced filtering and search capabilities.
        
        Args:
            limit: Maximum number of results per page
            offset: Number of results to skip
            search: Search term for fuzzy matching
            status: Filter by status
            project_id: Filter by project ID
            member_id: Filter by member ID
            sort_by: Field to sort by
            sort_order: Sort order ('asc' or 'desc')
            
        Returns:
            Tuple of (applications_list, total_count)
        """
        # Build filters
        filters = {'deleted_at': None}  # Only non-deleted records
        if status:
            filters['status'] = status
        if project_id:
            filters['project_id'] = project_id
        if member_id:
            filters['member_id'] = member_id
        
        if search and len(search.strip()) > 0:
            # Define searchable fields
            search_fields = ['application_reason', 'expected_outcomes']
            
            # Use fuzzy search
            applications, total = await self._fuzzy_search_with_filters(
                'project_applications', search_fields, search.strip(), filters, limit, offset
            )
        else:
            # Count total
            total = await self.count_records('project_applications', filters)
            
            # Get data
            query = self.client.table('project_applications').select('*')
            
            # Apply filters
            for key, value in filters.items():
                if key == 'deleted_at' and value is None:
                    query = query.is_('deleted_at', 'null')
                elif value is not None:
                    query = query.eq(key, value)
            
            # Apply sorting
            if sort_order == 'desc':
                query = query.order(sort_by, desc=True)
            else:
                query = query.order(sort_by, desc=False)
            
            # Apply pagination
            query = query.range(offset, offset + limit - 1)
            
            result = query.execute()
            applications = result.data or []
        
        # Enrich with related data
        enriched_applications = await self._enrich_project_applications(applications)
        
        return enriched_applications, total
    
    async def _enrich_project_applications(self, applications: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich project applications with related data (project info, member info)."""
        if not applications:
            return applications
        
        project_ids = list(set(app['project_id'] for app in applications if app.get('project_id')))
        member_ids = list(set(app['member_id'] for app in applications if app.get('member_id')))
        
        # 批量获取项目信息
        projects_map = {}
        if project_ids:
            projects_result = self.client.table('projects')\
                .select('id, title, category')\
                .in_('id', project_ids)\
                .execute()
            
            for project in projects_result.data or []:
                projects_map[project['id']] = project
        
        # 批量获取会员信息
        members_map = {}
        if member_ids:
            members_result = self.client.table('members')\
                .select('id, company_name, business_number')\
                .in_('id', member_ids)\
                .execute()
            
            for member in members_result.data or []:
                members_map[member['id']] = member
        
        # 组装数据
        enriched_applications = []
        for application in applications:
            enriched_application = application.copy()
            
            # 添加项目信息
            project_info = projects_map.get(application.get('project_id'))
            if project_info:
                enriched_application['project_title'] = project_info.get('title')
                enriched_application['project_category'] = project_info.get('category')
            
            # 添加会员信息
            member_info = members_map.get(application.get('member_id'))
            if member_info:
                enriched_application['member_company_name'] = member_info.get('company_name')
                enriched_application['member_business_number'] = member_info.get('business_number')
            
            enriched_applications.append(enriched_application)
        
        return enriched_applications
    
    async def export_projects(
        self,
        status: Optional[str] = None,
        category: Optional[str] = None,
        year: Optional[int] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Export projects for download.
        
        Args:
            status: Filter by status
            category: Filter by category
            year: Filter by year
            search: Search term
            
        Returns:
            List of projects for export
        """
        if search and len(search.strip()) > 0:
            # Build filters
            filters = {'deleted_at': None}
            if status:
                filters['status'] = status
            if category:
                filters['category'] = category
            if year:
                filters['year'] = year
            
            # Define searchable fields
            search_fields = ['title', 'description', 'objectives']
            
            # Use fuzzy search
            projects, _ = await self._fuzzy_search_with_filters(
                'projects', search_fields, search.strip(), filters, 10000, 0
            )
        else:
            # Normal query
            query = self.client.table('projects')\
                .select('*')\
                .is_('deleted_at', 'null')\
                .order('created_at', desc=True)
            
            if status:
                query = query.eq('status', status)
            if category:
                query = query.eq('category', category)
            if year:
                query = query.eq('year', year)
            
            result = query.execute()
            projects = result.data or []
        
        # Enrich with application count
        return await self._enrich_projects_with_application_count(projects)
    
    async def export_project_applications(
        self,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
        member_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Export project applications for download.
        
        Args:
            project_id: Filter by project ID
            status: Filter by status
            member_id: Filter by member ID
            
        Returns:
            List of project applications for export
        """
        query = self.client.table('project_applications')\
            .select('*')\
            .is_('deleted_at', 'null')\
            .order('created_at', desc=True)
        
        if project_id:
            query = query.eq('project_id', project_id)
        if status:
            query = query.eq('status', status)
        if member_id:
            query = query.eq('member_id', member_id)
        
        result = query.execute()
        applications = result.data or []
        
        # Enrich with related data
        return await self._enrich_project_applications(applications)