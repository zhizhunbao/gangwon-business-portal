"""
Supabase Service Layer
提供常用的数据库操作方法
"""
from typing import List, Dict, Any, Optional
from supabase import Client

from .client import get_supabase_client


class SupabaseService:
    """Supabase 服务类"""
    
    def __init__(self):
        self.client: Client = get_supabase_client()
    
    # ============================================================================
    # 通用查询方法
    # ============================================================================
    
    async def count_records(self, table_name: str, filters: Optional[Dict[str, Any]] = None) -> int:
        """统计记录数"""
        query = self.client.table(table_name).select('*', count='exact')
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        result = query.execute()
        return result.count or 0
    
    async def execute_raw_query(self, query: str) -> List[Dict[str, Any]]:
        """执行原始SQL查询（通过RPC）"""
        # 注意：这需要在 Supabase 中创建相应的 RPC 函数
        result = self.client.rpc('execute_sql', {'query': query}).execute()
        return result.data
    
    # ============================================================================
    # Members 相关操作
    # ============================================================================
    
    async def get_members(self, limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
        """获取会员列表"""
        result = self.client.table('members')\
            .select('*')\
            .range(offset, offset + limit - 1)\
            .execute()
        return result.data
    
    async def get_member_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('id', member_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_member(self, member_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新会员"""
        result = self.client.table('members')\
            .insert(member_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create member: no data returned")
        return result.data[0]
    
    async def update_member(self, member_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新会员信息"""
        result = self.client.table('members')\
            .update(update_data)\
            .eq('id', member_id)\
            .execute()
        if not result.data:
            raise ValueError(f"Failed to update member {member_id}: no data returned")
        return result.data[0]
    
    async def delete_member(self, member_id: str) -> bool:
        """删除会员"""
        self.client.table('members')\
            .delete()\
            .eq('id', member_id)\
            .execute()
        return True
    
    async def get_member_by_business_number(self, business_number: str) -> Optional[Dict[str, Any]]:
        """根据事业者登录번호获取会员"""
        # 标准化事业者登录번호（移除破折号和空格）
        normalized = business_number.replace("-", "").replace(" ", "")
        
        # 查询时也标准化数据库中的值进行比较
        result = self.client.table('members')\
            .select('*')\
            .execute()
        
        # 在客户端进行标准化比较
        for member in result.data or []:
            db_normalized = member.get('business_number', '').replace("-", "").replace(" ", "")
            if db_normalized == normalized:
                return member
        return None
    
    async def get_member_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('email', email)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def get_member_by_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """根据重置令牌获取会员"""
        result = self.client.table('members')\
            .select('*')\
            .eq('reset_token', token)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def check_email_uniqueness(self, email: str, exclude_member_id: Optional[str] = None) -> bool:
        """检查邮箱是否已被使用"""
        query = self.client.table('members')\
            .select('id')\
            .eq('email', email)
        
        if exclude_member_id:
            query = query.neq('id', exclude_member_id)
        
        result = query.execute()
        return len(result.data) == 0
    
    async def list_members_with_filters(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        industry: Optional[str] = None,
        region: Optional[str] = None,
        approval_status: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[List[Dict[str, Any]], int]:
        """获取会员列表（带筛选和分页）"""
        # 构建查询
        query = self.client.table('members').select('*')
        
        # 应用筛选
        if approval_status:
            query = query.eq('approval_status', approval_status)
        if status:
            query = query.eq('status', status)
        
        # 获取总数（创建新的查询来获取总数）
        count_query = self.client.table('members').select('*', count='exact')
        if approval_status:
            count_query = count_query.eq('approval_status', approval_status)
        if status:
            count_query = count_query.eq('status', status)
        count_result = count_query.execute()
        total = count_result.count or 0
        
        # 应用分页
        offset = (page - 1) * page_size
        query = query.order('created_at', desc=True)\
            .range(offset, offset + page_size - 1)
        
        # 执行查询
        result = query.execute()
        members = result.data or []
        
        # 获取每个会员的档案信息
        member_ids = [str(m['id']) for m in members]
        
        profiles_map = {}
        
        if member_ids:
            # 批量获取档案
            profiles_result = self.client.table('member_profiles')\
                .select('*')\
                .in_('member_id', member_ids)\
                .execute()
            
            for profile in profiles_result.data or []:
                profile_member_id = str(profile['member_id'])
                profiles_map[profile_member_id] = profile
        
        # 合并会员和档案数据，并应用搜索和筛选
        filtered_members = []
        for member in members:
            member_id = str(member['id'])
            profile = profiles_map.get(member_id)
            
            # 应用搜索筛选（在客户端进行，因为 Supabase 的 ilike 不支持跨表搜索）
            if search:
                search_lower = search.lower()
                company_name_match = search_lower in (member.get('company_name') or '').lower()
                business_number_match = search_lower in (member.get('business_number') or '').lower()
                if not (company_name_match or business_number_match):
                    continue
            
            # 应用行业筛选
            if industry:
                if not profile or profile.get('industry') != industry:
                    continue
            
            # 应用地区筛选
            if region:
                if not profile or profile.get('region') != region:
                    continue
            
            # 添加档案信息到会员对象，并将常用字段提升到顶层
            if profile:
                member['profile'] = profile
                # 将常用字段提升到顶层，方便前端访问
                member['address'] = profile.get('address')
                member['representative'] = profile.get('representative')
                member['legal_number'] = profile.get('legal_number')
                member['phone'] = profile.get('phone')
                member['industry'] = profile.get('industry')
                member['region'] = profile.get('region')
            else:
                member['profile'] = None
                member['address'] = None
                member['representative'] = None
                member['legal_number'] = None
                member['phone'] = None
                member['industry'] = None
                member['region'] = None
            
            filtered_members.append(member)
        
        # 如果应用了搜索或筛选，需要重新计算总数
        if search or industry or region:
            # 重新获取所有符合条件的会员来计算总数
            all_query = self.client.table('members').select('*')
            if approval_status:
                all_query = all_query.eq('approval_status', approval_status)
            if status:
                all_query = all_query.eq('status', status)
            
            all_result = all_query.execute()
            all_members = all_result.data or []
            
            # 获取所有档案
            all_member_ids = [str(m['id']) for m in all_members]
            all_profiles_map = {}
            if all_member_ids:
                all_profiles_result = self.client.table('member_profiles')\
                    .select('*')\
                    .in_('member_id', all_member_ids)\
                    .execute()
                for profile in all_profiles_result.data or []:
                    all_profiles_map[str(profile['member_id'])] = profile
            
            # 重新计算总数
            total = 0
            for member in all_members:
                member_id = str(member['id'])
                profile = all_profiles_map.get(member_id)
                
                if search:
                    search_lower = search.lower()
                    company_name_match = search_lower in (member.get('company_name') or '').lower()
                    business_number_match = search_lower in (member.get('business_number') or '').lower()
                    if not (company_name_match or business_number_match):
                        continue
                
                if industry:
                    if not profile or profile.get('industry') != industry:
                        continue
                
                if region:
                    if not profile or profile.get('region') != region:
                        continue
                
                total += 1
        
        return filtered_members, total
    
    # ============================================================================
    # Member Profile 相关操作
    # ============================================================================
    
    async def get_member_profile(self, member_id: str) -> tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """获取会员和档案"""
        # 获取会员
        member = await self.get_member_by_id(member_id)
        if not member:
            return None, None
        
        # 获取档案
        result = self.client.table('member_profiles')\
            .select('*')\
            .eq('member_id', member_id)\
            .limit(1)\
            .execute()
        profile = result.data[0] if result.data else None
        
        # 将常用字段提升到 member 对象顶层，方便前端访问
        if profile:
            member['address'] = profile.get('address')
            member['representative'] = profile.get('representative')
            member['representativeName'] = profile.get('representative')  # 兼容前端使用的字段名
            member['legalNumber'] = profile.get('legal_number')
            member['phone'] = profile.get('phone')
            member['industry'] = profile.get('industry')
            member['region'] = profile.get('region')
        
        return member, profile
    
    async def get_member_profile_by_id(self, member_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取会员档案"""
        result = self.client.table('member_profiles')\
            .select('*')\
            .eq('member_id', member_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_member_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建会员档案"""
        result = self.client.table('member_profiles')\
            .insert(profile_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create member profile: no data returned")
        return result.data[0]
    
    async def update_member_profile(self, member_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新会员档案（如果不存在则创建）"""
        # 先检查是否存在
        profile = await self.get_member_profile_by_id(member_id)
        
        if profile:
            # 更新
            result = self.client.table('member_profiles')\
                .update(profile_data)\
                .eq('member_id', member_id)\
                .execute()
            if not result.data:
                raise ValueError(f"Failed to update member profile {member_id}: no data returned")
            return result.data[0]
        else:
            # 创建
            profile_data['member_id'] = member_id
            result = self.client.table('member_profiles')\
                .insert(profile_data)\
                .execute()
            if not result.data:
                raise ValueError(f"Failed to create member profile {member_id}: no data returned")
            return result.data[0]
    
    # ============================================================================
    # User/Auth 相关操作（Admin）
    # ============================================================================
    
    async def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取管理员"""
        result = self.client.table('admins')\
            .select('*')\
            .eq('id', admin_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """根据邮箱获取管理员"""
        result = self.client.table('admins')\
            .select('*')\
            .eq('email', email)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    # ============================================================================
    # Dashboard 相关操作
    # ============================================================================
    
    async def get_approved_members_count(self) -> int:
        """获取已批准会员总数"""
        result = self.client.table('members')\
            .select('*', count='exact')\
            .eq('approval_status', 'approved')\
            .execute()
        return result.count or 0
    
    async def get_performance_records(
        self, 
        year: Optional[int] = None, 
        quarter: Optional[int] = None,
        status: str = 'approved'
    ) -> List[Dict[str, Any]]:
        """获取绩效记录"""
        query = self.client.table('performance_records')\
            .select('*')\
            .eq('status', status)
        
        if year:
            query = query.eq('year', year)
        
        if quarter:
            query = query.eq('quarter', quarter)
        
        result = query.execute()
        return result.data or []
    
    async def get_performance_records_for_chart(
        self, 
        year_filter: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """获取用于图表的绩效记录"""
        query = self.client.table('performance_records')\
            .select('*')\
            .eq('status', 'approved')
        
        if year_filter:
            query = query.eq('year', year_filter)
        
        result = query.execute()
        return result.data or []
    
    # ============================================================================
    # Upload/Attachment 相关操作
    # ============================================================================
    
    async def create_attachment(self, attachment_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建附件记录"""
        result = self.client.table('attachments')\
            .insert(attachment_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create attachment: no data returned")
        return result.data[0]
    
    async def get_attachment_by_id(self, attachment_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取附件"""
        result = self.client.table('attachments')\
            .select('*')\
            .eq('id', attachment_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def delete_attachment(self, attachment_id: str) -> bool:
        """删除附件记录"""
        self.client.table('attachments')\
            .delete()\
            .eq('id', attachment_id)\
            .execute()
        return True
    
    # ============================================================================
    # Performance Record 相关操作
    # ============================================================================
    
    async def get_performance_record_by_id(self, performance_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取绩效记录"""
        result = self.client.table('performance_records')\
            .select('*')\
            .eq('id', performance_id)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    async def create_performance_record(self, record_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建绩效记录"""
        result = self.client.table('performance_records')\
            .insert(record_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create performance record: no data returned")
        return result.data[0]
    
    async def update_performance_record(self, performance_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新绩效记录"""
        result = self.client.table('performance_records')\
            .update(update_data)\
            .eq('id', performance_id)\
            .execute()
        if not result.data:
            raise ValueError("Failed to update performance record: no data returned")
        return result.data[0]
    
    async def delete_performance_record(self, performance_id: str) -> bool:
        """删除绩效记录"""
        self.client.table('performance_records')\
            .delete()\
            .eq('id', performance_id)\
            .execute()
        return True
    
    async def list_performance_records_with_filters(
        self,
        member_id: Optional[str] = None,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        status: Optional[str] = None,
        type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        获取绩效记录列表（带筛选和分页）
        
        Returns:
            Tuple of (records list, total count)
        """
        query = self.client.table('performance_records').select('*', count='exact')
        
        # 应用筛选
        if member_id:
            query = query.eq('member_id', member_id)
        if year:
            query = query.eq('year', year)
        if quarter:
            query = query.eq('quarter', quarter)
        if status:
            query = query.eq('status', status)
        if type:
            query = query.eq('type', type)
        
        # 排序
        if order_desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by, desc=False)
        
        # 分页
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)
        
        result = query.execute()
        return result.data or [], result.count or 0
    
    async def export_performance_records(
        self,
        member_id: Optional[str] = None,
        year: Optional[int] = None,
        quarter: Optional[int] = None,
        status: Optional[str] = None,
        type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        导出绩效记录（无分页限制）
        """
        query = self.client.table('performance_records').select('*')
        
        # 应用筛选
        if member_id:
            query = query.eq('member_id', member_id)
        if year:
            query = query.eq('year', year)
        if quarter:
            query = query.eq('quarter', quarter)
        if status:
            query = query.eq('status', status)
        if type:
            query = query.eq('type', type)
        
        # 排序
        query = query.order('submitted_at', desc=True)
        
        result = query.execute()
        return result.data or []
    
    # ============================================================================
    # Performance Review 相关操作
    # ============================================================================
    
    async def create_performance_review(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建绩效审核记录"""
        result = self.client.table('performance_reviews')\
            .insert(review_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create performance review: no data returned")
        return result.data[0]
    
    async def get_performance_reviews_by_performance_id(self, performance_id: str) -> List[Dict[str, Any]]:
        """根据绩效记录ID获取所有审核记录"""
        result = self.client.table('performance_reviews')\
            .select('*')\
            .eq('performance_id', performance_id)\
            .order('reviewed_at', desc=True)\
            .execute()
        return result.data or []
    
    # ============================================================================
    # Project 相关操作
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
            raise ValueError("Failed to update project: no data returned")
        return result.data[0]
    
    async def delete_project(self, project_id: str) -> bool:
        """删除项目"""
        self.client.table('projects')\
            .delete()\
            .eq('id', project_id)\
            .execute()
        return True
    
    async def list_projects_with_filters(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        获取项目列表（带筛选和分页）
        
        Returns:
            Tuple of (projects list, total count)
        """
        query = self.client.table('projects').select('*', count='exact')
        
        # 应用筛选
        if status:
            query = query.eq('status', status)
        else:
            # 默认只显示 active 项目
            query = query.eq('status', 'active')
        
        # 搜索（在客户端进行，因为 Supabase 的 ilike 可能不支持多字段搜索）
        if search:
            # 先获取所有符合条件的项目，然后在客户端进行搜索
            all_query = self.client.table('projects').select('*')
            if status:
                all_query = all_query.eq('status', status)
            else:
                all_query = all_query.eq('status', 'active')
            
            all_result = all_query.execute()
            all_projects = all_result.data or []
            
            # 客户端搜索
            search_lower = search.lower()
            filtered_projects = []
            for project in all_projects:
                title_match = search_lower in (project.get('title') or '').lower()
                desc_match = search_lower in (project.get('description') or '').lower()
                if title_match or desc_match:
                    filtered_projects.append(project)
            
            # 计算总数
            total = len(filtered_projects)
            
            # 应用分页
            offset = (page - 1) * page_size
            paginated_projects = filtered_projects[offset:offset + page_size]
            
            return paginated_projects, total
        
        # 排序
        if order_desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by, desc=False)
        
        # 分页
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)
        
        result = query.execute()
        return result.data or [], result.count or 0
    
    async def export_projects(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        导出项目（无分页限制）
        """
        query = self.client.table('projects').select('*')
        
        # 应用筛选
        if status:
            query = query.eq('status', status)
        
        # 搜索
        if search:
            all_result = query.execute()
            all_projects = all_result.data or []
            search_lower = search.lower()
            filtered_projects = []
            for project in all_projects:
                title_match = search_lower in (project.get('title') or '').lower()
                desc_match = search_lower in (project.get('description') or '').lower()
                if title_match or desc_match:
                    filtered_projects.append(project)
            return filtered_projects
        
        # 排序
        query = query.order('created_at', desc=True)
        
        result = query.execute()
        return result.data or []
    
    async def get_project_application_count(self, project_id: str) -> int:
        """获取项目的申请数量"""
        result = self.client.table('project_applications')\
            .select('*', count='exact')\
            .eq('project_id', project_id)\
            .execute()
        return result.count or 0
    
    # ============================================================================
    # Project Application 相关操作
    # ============================================================================
    
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
            raise ValueError("Failed to update project application: no data returned")
        return result.data[0]
    
    async def check_duplicate_application(self, member_id: str, project_id: str) -> bool:
        """检查是否存在重复申请"""
        result = self.client.table('project_applications')\
            .select('id')\
            .eq('member_id', member_id)\
            .eq('project_id', project_id)\
            .execute()
        return len(result.data) > 0
    
    async def list_project_applications_with_filters(
        self,
        project_id: Optional[str] = None,
        member_id: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "submitted_at",
        order_desc: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        获取项目申请列表（带筛选和分页）
        
        Returns:
            Tuple of (applications list, total count)
        """
        query = self.client.table('project_applications').select('*', count='exact')
        
        # 应用筛选
        if project_id:
            query = query.eq('project_id', project_id)
        if member_id:
            query = query.eq('member_id', member_id)
        if status:
            query = query.eq('status', status)
        
        # 排序
        if order_desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by, desc=False)
        
        # 分页
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)
        
        result = query.execute()
        return result.data or [], result.count or 0
    
    async def export_project_applications(
        self,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        导出项目申请（无分页限制）
        """
        query = self.client.table('project_applications').select('*')
        
        # 应用筛选
        if project_id:
            query = query.eq('project_id', project_id)
        if status:
            query = query.eq('status', status)
        
        # 排序
        query = query.order('submitted_at', desc=True)
        
        result = query.execute()
        return result.data or []


# 创建全局服务实例
supabase_service = SupabaseService()
