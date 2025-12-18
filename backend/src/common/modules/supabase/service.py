"""
Supabase Service Layer
提供常用的数据库操作方法
"""
from typing import List, Dict, Any, Optional, Tuple
from uuid import uuid4
from supabase import Client

from .client import get_supabase_client
from ..db.session import fuzzy_search_all_columns, AsyncSessionLocal


class SupabaseService:
    """Supabase 服务类"""
    
    def __init__(self):
        self.client: Client = get_supabase_client()
    
    # ============================================================================
    # 通用查询方法
    # ============================================================================
    
    async def _fuzzy_search_with_filters(
        self,
        table_name: str,
        search_keyword: str,
        search_columns: List[str],
        base_filters: Optional[Dict[str, Any]] = None,
        limit: int = 100,
        offset: int = 0,
        order_by: Optional[str] = None,
        case_sensitive: bool = False,
        filter_deleted: bool = True,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        使用 fuzzy_search_all_columns 进行模糊搜索，支持基础筛选条件
        
        Args:
            table_name: 表名
            search_keyword: 搜索关键词
            search_columns: 要搜索的列名列表（必需）
            base_filters: 基础筛选条件（如 {'status': 'active'}），会在结果中应用
            limit: 返回结果的最大数量
            offset: 跳过的记录数
            order_by: 排序字段（如 'created_at DESC'）
            case_sensitive: 是否区分大小写
            filter_deleted: 是否过滤 deleted_at IS NULL 的记录
        
        Returns:
            Tuple[List[Dict[str, Any]], int]: (结果列表, 总记录数)
        """
        if not search_keyword or not search_keyword.strip():
            return [], 0
        
        if not search_columns:
            raise ValueError("search_columns parameter is required and cannot be empty")
        
        # 先获取所有匹配搜索关键词的记录（使用较大的 limit 以获取所有结果用于筛选）
        async with AsyncSessionLocal() as session:
            all_results, _ = await fuzzy_search_all_columns(
                session=session,
                table_name=table_name,
                search_keyword=search_keyword.strip(),
                columns=search_columns,
                limit=10000,  # 足够大的限制
                offset=0,
                order_by=None,  # 先不排序，等筛选后再排序
                case_sensitive=case_sensitive,
            )
        
        # 应用基础筛选条件
        if base_filters:
            all_results = [
                r for r in all_results
                if all(r.get(key) == value for key, value in base_filters.items())
            ]
        
        # 过滤已删除的记录
        if filter_deleted:
            all_results = [r for r in all_results if r.get('deleted_at') is None]
        
        # 计算总数
        total = len(all_results)
        
        # 应用排序
        if order_by:
            try:
                # 解析排序字段和方向
                parts = order_by.strip().split()
                if len(parts) >= 2:
                    sort_field = parts[0]
                    sort_desc = parts[1].upper() == 'DESC'
                else:
                    sort_field = parts[0]
                    sort_desc = True
                
                all_results.sort(
                    key=lambda x: x.get(sort_field) or '',
                    reverse=sort_desc
                )
            except (IndexError, KeyError, TypeError):
                # 如果排序失败，按创建时间降序
                all_results.sort(
                    key=lambda x: x.get('created_at') or '',
                    reverse=True
                )
        else:
            # 默认按创建时间降序
            all_results.sort(
                key=lambda x: x.get('created_at') or '',
                reverse=True
            )
        
        # 应用分页
        paginated_results = all_results[offset:offset + limit]
        
        return paginated_results, total
    
    
    async def count_records(self, table_name: str, filters: Optional[Dict[str, Any]] = None) -> int:
        """统计记录数"""
        query = self.client.table(table_name).select('*', count='exact')
        
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        result = query.execute()
        return result.count or 0
    
    async def execute_raw_query(self, query: str) -> List[Dict[str, Any]]:
        """
        执行原始SQL查询
        
        注意：Supabase Python 客户端不直接支持执行原始 SQL。
        此方法使用 PostgreSQL 直接连接来执行 SQL。
        
        Args:
            query: 原始 SQL 查询语句
            
        Returns:
            查询结果列表
        """
        from sqlalchemy import text
        from ..db.session import AsyncSessionLocal
        
        async with AsyncSessionLocal() as session:
            result = await session.execute(text(query))
            # 将结果转换为字典列表
            rows = result.fetchall()
            columns = result.keys()
            return [dict(zip(columns, row)) for row in rows]
    
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
    
    
    async def _list_members_normal(
        self,
        page: int = 1,
        page_size: int = 20,
        industry: Optional[str] = None,
        region: Optional[str] = None,
        approval_status: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[List[Dict[str, Any]], int]:
        """常规查询会员列表（使用 Supabase 客户端）"""
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
        
        # 合并会员和档案数据，并应用筛选
        filtered_members = []
        for member in members:
            member_id = str(member['id'])
            profile = profiles_map.get(member_id)
            
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
        
        # 如果应用了筛选，需要重新计算总数
        if industry or region:
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
                
                if industry:
                    if not profile or profile.get('industry') != industry:
                        continue
                
                if region:
                    if not profile or profile.get('region') != region:
                        continue
                
                total += 1
        else:
            total = len(filtered_members)
        
        return filtered_members, total
    
    async def _list_members_search(
        self,
        search_keyword: str,
        page: int = 1,
        page_size: int = 20,
        industry: Optional[str] = None,
        region: Optional[str] = None,
        approval_status: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[List[Dict[str, Any]], int]:
        """模糊查询会员列表（使用原生 SQL）"""
        # 处理搜索关键词：去掉 business_number 中的 -（因为数据库中没有 -）
        normalized_keyword = search_keyword.strip().replace("-", "")
        
        # 使用 fuzzy_search_all_columns 搜索 members 表（已包含排序）
        async with AsyncSessionLocal() as session:
            all_search_results, _ = await fuzzy_search_all_columns(
                session=session,
                table_name='members',
                search_keyword=normalized_keyword,
                columns=['company_name', 'business_number', 'email'],
                limit=10000,  # 获取所有匹配的会员用于筛选
                offset=0,
                order_by='created_at DESC',
                case_sensitive=False,
            )
        
        # 应用基础筛选条件
        search_results = all_search_results
        if approval_status:
            search_results = [r for r in search_results if r.get('approval_status') == approval_status]
        if status:
            search_results = [r for r in search_results if r.get('status') == status]
        
        # 获取搜索结果的会员ID
        search_member_ids = [str(m['id']) for m in search_results]
        
        # 如果搜索后没有结果，直接返回
        if not search_member_ids:
            return [], 0
        
        # 重新获取这些会员的档案信息
        search_profiles_map = {}
        if search_member_ids:
            search_profiles_result = self.client.table('member_profiles')\
                .select('*')\
                .in_('member_id', search_member_ids)\
                .execute()
            for profile in search_profiles_result.data or []:
                search_profiles_map[str(profile['member_id'])] = profile
        
        # 应用行业和地区筛选，并合并数据
        filtered_members = []
        for member in search_results:
            member_id = str(member['id'])
            profile = search_profiles_map.get(member_id)
            
            # 应用行业筛选
            if industry:
                if not profile or profile.get('industry') != industry:
                    continue
            
            # 应用地区筛选
            if region:
                if not profile or profile.get('region') != region:
                    continue
            
            # 添加档案信息到会员对象
            if profile:
                member['profile'] = profile
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
        
        # 应用分页
        offset = (page - 1) * page_size
        paginated_members = filtered_members[offset:offset + page_size]
        
        # 计算总数（考虑行业和地区筛选）
        total = len(filtered_members)
        
        return paginated_members, total
    
    async def list_members_with_filters(
        self,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """获取会员列表（返回所有数据，不进行筛选和分页）"""
        # 获取所有会员数据（不应用任何筛选）
        query = self.client.table('members').select('*')
        
        # 应用排序
        if order_desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by, desc=False)
        
        # 执行查询（获取所有数据）
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
        
        # 合并会员和档案数据
        for member in members:
            member_id = str(member['id'])
            profile = profiles_map.get(member_id)
            
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
        
        # 返回所有数据
        total = len(members)
        return members, total
    
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
            .eq('status', status)\
            .is_('deleted_at', 'null')
        
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
            .eq('status', 'approved')\
            .is_('deleted_at', 'null')
        
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
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    
    
    async def delete_attachment(self, attachment_id: str) -> bool:
        """软删除附件记录（设置 deleted_at）"""
        from datetime import datetime, timezone
        self.client.table('attachments')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', attachment_id)\
            .execute()
        return True
    
    
    async def get_attachments_by_resource(self, resource_type: str, resource_id: str) -> List[Dict[str, Any]]:
        """根据资源类型和ID获取附件列表"""
        result = self.client.table('attachments')\
            .select('*')\
            .eq('resource_type', resource_type)\
            .eq('resource_id', resource_id)\
            .is_('deleted_at', 'null')\
            .order('uploaded_at', desc=True)\
            .execute()
        return result.data or []
    
    # ============================================================================
    # Performance Record 相关操作
    # ============================================================================
    
    
    async def get_performance_record_by_id(self, performance_id: str) -> Optional[Dict[str, Any]]:
        """根据ID获取绩效记录"""
        result = self.client.table('performance_records')\
            .select('*')\
            .eq('id', performance_id)\
            .is_('deleted_at', 'null')\
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
        """软删除绩效记录（设置 deleted_at）"""
        from datetime import datetime, timezone
        self.client.table('performance_records')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', performance_id)\
            .execute()
        return True
    
    
    async def _enrich_performance_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """为绩效记录添加关联信息（reviews, members, attachments）"""
        if not records:
            return records
        
        record_ids = [str(r["id"]) for r in records]
        
        # 批量获取 reviews 信息（避免 N+1 查询）
        reviews_map = {}
        reviews_result = self.client.table('performance_reviews')\
            .select('*')\
            .in_('performance_id', record_ids)\
            .order('reviewed_at', desc=True)\
            .execute()
        
        if reviews_result.data:
            for review in reviews_result.data:
                perf_id = str(review['performance_id'])
                if perf_id not in reviews_map:
                    reviews_map[perf_id] = []
                reviews_map[perf_id].append(review)
        
        # 批量获取 member 信息（避免 N+1 查询）
        member_ids = list(set([str(r["member_id"]) for r in records]))
        members_map = {}
        
        members_result = self.client.table('members')\
            .select('id, company_name, business_number')\
            .in_('id', member_ids)\
            .execute()
        
        if members_result.data:
            for member in members_result.data:
                members_map[str(member['id'])] = {
                    "company_name": member.get("company_name"),
                    "business_number": member.get("business_number"),
                }
        
        # 批量获取附件信息
        attachments_map = {}
        attachments_result = self.client.table('attachments')\
            .select('id, resource_id, original_name, file_size')\
            .eq('resource_type', 'performance')\
            .in_('resource_id', record_ids)\
            .is_('deleted_at', 'null')\
            .execute()
        
        if attachments_result.data:
            for att in attachments_result.data:
                res_id = str(att['resource_id'])
                if res_id not in attachments_map:
                    attachments_map[res_id] = []
                attachments_map[res_id].append({
                    "id": att['id'],
                    "original_name": att.get('original_name'),
                    "file_size": att.get('file_size'),
                })
        
        # 添加关联信息到每个记录
        for record in records:
            record_id = str(record["id"])
            member_id = str(record["member_id"])
            
            record["reviews"] = reviews_map.get(record_id, [])
            if member_id in members_map:
                record["member_company_name"] = members_map[member_id]["company_name"]
                record["member_business_number"] = members_map[member_id]["business_number"]
            else:
                record["member_company_name"] = None
                record["member_business_number"] = None
            record["attachments"] = attachments_map.get(record_id, [])
        
        return records
    
    async def _list_performance_records_normal(
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
        """常规查询绩效记录列表（使用 Supabase 客户端）"""
        query = self.client.table('performance_records').select('*', count='exact').is_('deleted_at', 'null')
        
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
        records = result.data or []
        total_count = result.count or 0
        
        # 添加关联信息
        records = await self._enrich_performance_records(records)
        
        return records, total_count
    
    async def _list_performance_records_search(
        self,
        search_keyword: str,
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
        """模糊查询绩效记录列表（使用原生 SQL 搜索 members，然后用 Supabase 查询 records）"""
        keyword = search_keyword.strip()
        
        # 处理搜索关键词：去掉 business_number 中的 -（因为数据库中没有 -）
        search_keyword_normalized = keyword.replace("-", "")
        
        # 使用 fuzzy_search_all_columns 查询匹配的 member IDs（企业名称或营业执照号）
        matched_ids = set()
        
        # 使用 fuzzy_search_all_columns 搜索 members 表（支持企业名称和营业执照号）
        async with AsyncSessionLocal() as session:
            search_results, _ = await fuzzy_search_all_columns(
                session=session,
                table_name='members',
                search_keyword=search_keyword_normalized,
                columns=['company_name', 'business_number'],
                limit=10000,  # 获取所有匹配的会员
                offset=0,
                order_by=None,
                case_sensitive=False,
            )
        
        # 提取匹配的 member IDs
        if search_results:
            for member in search_results:
                matched_ids.add(member['id'])
        
        matched_member_ids = list(matched_ids) if matched_ids else []
        
        # 检查是否是数字（可能是年度），但只有在没有匹配到 member 时才考虑按年度处理
        search_year = None
        if keyword.isdigit() and not matched_member_ids:
            # 只有4位数字才可能是年度（如 2024），避免将营业执照号误判为年度
            if len(keyword) == 4:
                search_year = int(keyword)
        
        # 构建查询
        query = self.client.table('performance_records').select('*', count='exact').is_('deleted_at', 'null')
        
        # 应用筛选 - member_id 过滤优先级最高（用于会员端只查看自己的记录）
        if member_id:
            query = query.eq('member_id', member_id)
            # 会员端：如果有搜索关键词，也支持年度搜索
            if search_year is not None:
                query = query.eq('year', search_year)
        elif matched_member_ids:
            # 管理员端：如果有搜索关键词匹配的 member IDs（企业名称或营业执照号）
            query = query.in_('member_id', matched_member_ids)
        elif search_year is None:
            # 如果没有匹配的 member 也没有年度搜索，返回空
            return [], 0
        
        # 年度筛选
        if year:
            query = query.eq('year', year)
        elif search_year is not None and not member_id:
            # 如果搜索关键词是4位数字且没有匹配的 member（管理员端），按年度筛选
            query = query.eq('year', search_year)
        
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
        records = result.data or []
        total_count = result.count or 0
        
        # 如果同时有年度搜索和 member 匹配，需要在结果中进一步过滤
        if search_year is not None and matched_member_ids:
            # 过滤出匹配年度或 member_id 的记录
            matched_member_ids_set = set(matched_member_ids)
            filtered_records = [
                r for r in records 
                if r.get('year') == search_year or str(r.get('member_id')) in matched_member_ids_set
            ]
            records = filtered_records
            # 更新总数（这里简化处理，实际应该重新查询总数）
            total_count = len(filtered_records)
        
        # 添加关联信息
        records = await self._enrich_performance_records(records)
        
        return records, total_count
    
    async def list_performance_records_with_filters(
        self,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        获取绩效记录列表（返回所有数据，不进行筛选和分页）
        
        Returns:
            Tuple of (records list, total count)
        """
        # 获取所有绩效记录（不应用任何筛选，只过滤已删除的）
        query = self.client.table('performance_records').select('*').is_('deleted_at', 'null')
        
        # 排序
        if order_desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by, desc=False)
        
        # 执行查询（获取所有数据）
        result = query.execute()
        records = result.data or []
        total_count = len(records)
        
        # 添加关联信息
        records = await self._enrich_performance_records(records)
        
        return records, total_count
    
    
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
        query = self.client.table('performance_records').select('*').is_('deleted_at', 'null')
        
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
        """创建绩效审核记录

        注意：Supabase 中的 performance_reviews.id 字段为 NOT NULL 且无默认值，
        因此在插入记录时必须显式提供 UUID。
        """
        # Ensure ID is present to satisfy NOT NULL constraint in Supabase
        if not review_data.get("id"):
            review_data = {
                **review_data,
                "id": str(uuid4()),
            }

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
            .is_('deleted_at', 'null')\
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
        """软删除项目（设置 deleted_at）"""
        from datetime import datetime, timezone
        self.client.table('projects')\
            .update({'deleted_at': datetime.now(timezone.utc).isoformat()})\
            .eq('id', project_id)\
            .execute()
        return True
    
    
    async def _list_projects_normal(
        self,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "created_at",
        order_desc: bool = True,
        admin_mode: bool = False,
    ) -> tuple[List[Dict[str, Any]], int]:
        """常规查询项目列表（使用 Supabase 客户端）"""
        query = self.client.table('projects').select('*', count='exact').is_('deleted_at', 'null')
        
        # 应用筛选
        if status:
            query = query.eq('status', status)
        elif not admin_mode:
            # 非管理员模式：默认只显示 active 项目
            query = query.eq('status', 'active')
        # admin_mode=True 且 status=None 时，不添加状态筛选，显示所有状态的项目
        
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
    
    async def _list_projects_search(
        self,
        search_keyword: str,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: str = "created_at",
        order_desc: bool = True,
        admin_mode: bool = False,
    ) -> tuple[List[Dict[str, Any]], int]:
        """模糊查询项目列表（使用原生 SQL）"""
        # 处理搜索关键词：去掉 business_number 中的 -（因为数据库中没有 -）
        normalized_keyword = search_keyword.strip().replace("-", "")
        
        # 构建排序字符串
        order_by_str = None
        if order_by:
            order_by_str = f"{order_by} {'DESC' if order_desc else 'ASC'}"
        
        # 使用 fuzzy_search_all_columns 搜索 projects 表（已包含排序）
        # 搜索字段：项目名称、目标企业名称、营业执照号
        async with AsyncSessionLocal() as session:
            all_search_results, _ = await fuzzy_search_all_columns(
                session=session,
                table_name='projects',
                search_keyword=normalized_keyword,
                columns=['title', 'target_company_name', 'target_business_number'],
                limit=10000,  # 获取所有匹配的项目用于筛选
                offset=0,
                order_by=order_by_str if order_by_str else 'created_at DESC',
                case_sensitive=False,
            )
        
        # 应用筛选条件
        filtered_results = []
        for r in all_search_results:
            # 过滤已删除的记录
            if r.get('deleted_at') is not None:
                continue
            # 应用状态筛选
            if status:
                if r.get('status') != status:
                    continue
            elif not admin_mode:
                if r.get('status') != 'active':
                    continue
            filtered_results.append(r)
        
        # 应用分页（排序已在 fuzzy_search_all_columns 中完成）
        offset = (page - 1) * page_size
        total = len(filtered_results)
        paginated_results = filtered_results[offset:offset + page_size]
        
        return paginated_results, total
    
    async def list_projects_with_filters(
        self,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        获取项目列表（返回所有数据，不进行筛选和分页）
        
        Args:
            order_by: 排序字段
            order_desc: 是否降序
        
        Returns:
            Tuple of (projects list, total count)
        """
        # 获取所有项目（不应用任何筛选，只过滤已删除的）
        query = self.client.table('projects').select('*').is_('deleted_at', 'null')
        
        # 排序
        if order_desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by, desc=False)
        
        # 执行查询（获取所有数据）
        result = query.execute()
        projects = result.data or []
        return projects, len(projects)
    
    
    async def export_projects(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        导出项目（无分页限制）
        """
        # 如果有搜索关键词，使用模糊查询（获取所有结果）
        if search and search.strip():
            # 处理搜索关键词：去掉 business_number 中的 -（因为数据库中没有 -）
            normalized_keyword = search.strip().replace("-", "")
            
            # 使用 fuzzy_search_all_columns 进行搜索（无分页限制）
            # 搜索字段：项目名称、目标企业名称、营业执照号
            async with AsyncSessionLocal() as session:
                search_results, _ = await fuzzy_search_all_columns(
                    session=session,
                    table_name='projects',
                    search_keyword=normalized_keyword,
                    columns=['title', 'target_company_name', 'target_business_number'],
                    limit=10000,  # 足够大的限制以获取所有结果
                    offset=0,
                    order_by='created_at DESC',
                    case_sensitive=False,
                )
            
            # 应用筛选条件
            filtered_results = []
            for r in search_results:
                # 过滤已删除的记录
                if r.get('deleted_at') is not None:
                    continue
                # 应用状态筛选
                if status and r.get('status') != status:
                    continue
                filtered_results.append(r)
            
            return filtered_results
        
        # 否则使用常规查询
        query = self.client.table('projects').select('*').is_('deleted_at', 'null')
        
        # 应用筛选
        if status:
            query = query.eq('status', status)
        
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
        order_by: str = "submitted_at",
        order_desc: bool = True,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        获取项目申请列表（返回所有数据，不进行筛选和分页）
        
        Args:
            order_by: 排序字段
            order_desc: 是否降序
        
        Returns:
            Tuple of (applications list, total count)
        """
        # Join with projects and members to get project title and company name
        # 获取所有项目申请（不应用任何筛选）
        query = self.client.table('project_applications').select(
            '*,' 
            'projects(title),'
            'members(company_name)'
        )
        
        # 排序
        if order_desc:
            query = query.order(order_by, desc=True)
        else:
            query = query.order(order_by, desc=False)
        
        # 执行查询（获取所有数据）
        result = query.execute()
        
        # Flatten the nested data structure
        applications = []
        for app in result.data or []:
            flattened_app = {
                **app,
                'project_title': app.get('projects', {}).get('title') if app.get('projects') else None,
                'company_name': app.get('members', {}).get('company_name') if app.get('members') else None,
            }
            # Remove nested objects to avoid serialization issues
            flattened_app.pop('projects', None)
            flattened_app.pop('members', None)
            applications.append(flattened_app)
        
        return applications, len(applications)
    
    
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
