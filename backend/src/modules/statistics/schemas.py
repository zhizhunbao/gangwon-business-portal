from typing import List, Optional
from pydantic import BaseModel, Field, validator
from enum import Enum

# 统计排序字段枚举
class SortField(str, Enum):
    ENTERPRISE_NAME = "enterprise_name"
    TOTAL_INVESTMENT = "total_investment"
    PATENT_COUNT = "patent_count"
    ANNUAL_REVENUE = "annual_revenue"

# 排序方向枚举
class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"

# 性别枚举
class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"

# 单条企业统计数据模型
class StatisticsItem(BaseModel):
    business_reg_no: str
    enterprise_name: str
    industry_type: Optional[str] = None
    startup_stage: Optional[str] = None
    policy_tags: List[str] = Field(default_factory=list)
    total_investment: float = 0.0
    patent_count: int = 0
    annual_revenue: float = 0.0
    export_amount: float = 0.0

# 统计数据列表响应模型
class StatisticsResponse(BaseModel):
    items: List[StatisticsItem]
    total: int
    page: int
    page_size: int

# 统计查询参数模型
class StatisticsQuery(BaseModel):
    year: Optional[int] = None
    quarter: Optional[int] = None
    month: Optional[int] = None
    major_industry_codes: List[str] = Field(default_factory=list)
    gangwon_industry_codes: List[str] = Field(default_factory=list)
    policy_tags: List[str] = Field(default_factory=list)
    has_investment: Optional[bool] = None
    min_investment: Optional[float] = None
    max_investment: Optional[float] = None
    min_patents: Optional[int] = None
    max_patents: Optional[int] = None
    gender: Optional[Gender] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    search_query: Optional[str] = None
    startup_stages: List[str] = Field(default_factory=list)
    min_work_years: Optional[int] = None
    max_work_years: Optional[int] = None
    page: int = 1

    page_size: int = 10
    sort_by: SortField = SortField.ENTERPRISE_NAME
    sort_order: SortOrder = SortOrder.ASC


    # 验证月份合法性
    @validator("month")
    def validate_month(cls, v):
        if v is not None and not (1 <= v <= 12):
            raise ValueError("月份必须在 1 到 12 之间")
        return v

    # 验证季度合法性
    @validator("quarter")
    def validate_quarter(cls, v):
        if v is not None and not (1 <= v <= 4):
            raise ValueError("季度必须在 1 到 4 之间")
        return v

