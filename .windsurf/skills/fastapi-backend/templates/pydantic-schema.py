"""
{{FeatureName}} Pydantic Schemas

@description {{description}}
@author {{author}}
@created {{date}}
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, validator, ConfigDict

from src.schemas.user import UserResponse


class {{FeatureName}}Base(BaseModel):
    """
    {{FeatureName}} 基础模式
    """
    name: str = Field(..., min_length=1, max_length=255, description="名称")
    description: Optional[str] = Field(None, max_length=1000, description="描述")
    code: str = Field(..., min_length=1, max_length=100, description="编码")
    status: Optional[str] = Field("active", description="状态")
    sort_order: Optional[int] = Field(0, description="排序顺序")
    is_featured: Optional[bool] = Field(False, description="是否推荐")
    config: Optional[Dict[str, Any]] = Field(None, description="配置信息")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('名称不能为空')
        return v.strip()

    @validator('code')
    def validate_code(cls, v):
        if not v or not v.strip():
            raise ValueError('编码不能为空')
        # 只允许字母、数字、下划线和连字符
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('编码只能包含字母、数字、下划线和连字符')
        return v.strip().lower()

    @validator('status')
    def validate_status(cls, v):
        allowed_statuses = ['active', 'inactive', 'pending', 'completed', 'cancelled']
        if v not in allowed_statuses:
            raise ValueError(f'状态必须是以下之一: {", ".join(allowed_statuses)}')
        return v


class {{FeatureName}}Create({{FeatureName}}Base):
    """
    创建{{feature_name}}的模式
    """
    pass


class {{FeatureName}}Update(BaseModel):
    """
    更新{{feature_name}}的模式
    """
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="名称")
    description: Optional[str] = Field(None, max_length=1000, description="描述")
    code: Optional[str] = Field(None, min_length=1, max_length=100, description="编码")
    status: Optional[str] = Field(None, description="状态")
    sort_order: Optional[int] = Field(None, description="排序顺序")
    is_featured: Optional[bool] = Field(None, description="是否推荐")
    config: Optional[Dict[str, Any]] = Field(None, description="配置信息")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

    @validator('name')
    def validate_name(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('名称不能为空')
        return v.strip() if v else v

    @validator('code')
    def validate_code(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError('编码不能为空')
            import re
            if not re.match(r'^[a-zA-Z0-9_-]+$', v):
                raise ValueError('编码只能包含字母、数字、下划线和连字符')
            return v.strip().lower()
        return v

    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            allowed_statuses = ['active', 'inactive', 'pending', 'completed', 'cancelled']
            if v not in allowed_statuses:
                raise ValueError(f'状态必须是以下之一: {", ".join(allowed_statuses)}')
        return v


class {{FeatureName}}Response({{FeatureName}}Base):
    """
    {{feature_name}}响应模式
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="主键ID")
    created_by: Optional[int] = Field(None, description="创建者ID")
    updated_by: Optional[int] = Field(None, description="更新者ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    deleted_at: Optional[datetime] = Field(None, description="删除时间")
    
    # 关联数据
    creator: Optional[UserResponse] = Field(None, description="创建者信息")
    updater: Optional[UserResponse] = Field(None, description="更新者信息")

    @property
    def is_active(self) -> bool:
        """是否活跃"""
        return self.status == "active"

    @property
    def is_deleted(self) -> bool:
        """是否已删除"""
        return self.deleted_at is not None


class {{FeatureName}}ListResponse(BaseModel):
    """
    {{feature_name}}列表响应模式
    """
    items: List[{{FeatureName}}Response] = Field(..., description="{{feature_name}}列表")
    total: int = Field(..., description="总数量")
    page: int = Field(..., description="当前页码")
    limit: int = Field(..., description="每页数量")
    pages: int = Field(..., description="总页数")


class {{FeatureName}}Statistics(BaseModel):
    """
    {{feature_name}}统计信息模式
    """
    total: int = Field(..., description="总数量")
    active: int = Field(..., description="活跃数量")
    inactive: int = Field(..., description="非活跃数量")
    pending: int = Field(..., description="待处理数量")
    completed: int = Field(..., description="已完成数量")
    cancelled: int = Field(..., description="已取消数量")
    featured: int = Field(..., description="推荐数量")
    recent_created: int = Field(..., description="最近创建数量")


class {{FeatureName}}SearchRequest(BaseModel):
    """
    {{feature_name}}搜索请求模式
    """
    query: str = Field(..., min_length=1, max_length=100, description="搜索关键词")
    filters: Optional[Dict[str, Any]] = Field(None, description="筛选条件")
    limit: Optional[int] = Field(10, ge=1, le=50, description="返回结果数量")


class {{FeatureName}}BulkOperation(BaseModel):
    """
    {{feature_name}}批量操作模式
    """
    action: str = Field(..., description="操作类型: delete, update_status, etc.")
    item_ids: List[int] = Field(..., description="操作的项目ID列表")
    data: Optional[Dict[str, Any]] = Field(None, description="操作数据")

    @validator('action')
    def validate_action(cls, v):
        allowed_actions = ['delete', 'update_status', 'update_featured']
        if v not in allowed_actions:
            raise ValueError(f'操作类型必须是以下之一: {", ".join(allowed_actions)}')
        return v


class {{FeatureName}}ExportRequest(BaseModel):
    """
    {{feature_name}}导出请求模式
    """
    format: str = Field("xlsx", description="导出格式: xlsx, csv")
    filters: Optional[Dict[str, Any]] = Field(None, description="筛选条件")
    fields: Optional[List[str]] = Field(None, description="导出字段")

    @validator('format')
    def validate_format(cls, v):
        allowed_formats = ['xlsx', 'csv']
        if v not in allowed_formats:
            raise ValueError(f'导出格式必须是以下之一: {", ".join(allowed_formats)}')
        return v


class {{FeatureName}}ImportResult(BaseModel):
    """
    {{feature_name}}导入结果模式
    """
    total_rows: int = Field(..., description="总行数")
    success_count: int = Field(..., description="成功数量")
    error_count: int = Field(..., description="错误数量")
    errors: List[Dict[str, Any]] = Field(..., description="错误详情")
    created_count: int = Field(..., description="新建数量")
    updated_count: int = Field(..., description="更新数量")
