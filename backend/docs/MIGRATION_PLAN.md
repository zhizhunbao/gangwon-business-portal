# SQLAlchemy 到 Supabase 迁移计划

## 当前状况
- ✅ Supabase Python 客户端已集成
- ✅ 解决了 prepared statement 问题
- ⚠️ 大量现有代码使用 SQLAlchemy ORM

## 迁移策略：渐进式替换

### 阶段 1：新功能使用 Supabase（当前）
- ✅ 新的 API 端点使用 Supabase 客户端
- ✅ 简单的 CRUD 操作优先迁移
- ✅ 保留 SQLAlchemy 用于复杂查询

### 阶段 2：逐步迁移现有模块
优先级顺序：
1. **简单查询模块** - FAQ, Notice, Banner
2. **中等复杂度** - Member 基础操作
3. **复杂模块** - Project, Performance（最后迁移）

### 阶段 3：保留 SQLAlchemy 的场景
以下情况建议保留 SQLAlchemy：
- ✅ **Alembic 迁移** - 继续用于数据库版本管理
- ✅ **复杂关联查询** - 多表 JOIN 操作
- ✅ **事务处理** - 需要严格 ACID 的操作
- ✅ **批量操作** - 大量数据处理

## 包管理策略

### 保留的包（必需）
```
# 数据库迁移
alembic==1.13.0

# Supabase 客户端
supabase==2.25.1

# 基础依赖（Supabase 需要）
httpx>=0.26.0,<0.29.0
pydantic>=2.11.7,<3.0.0
```

### 可以移除的包（逐步）
```
# 在完全迁移后可以移除
sqlalchemy==2.0.25  # 保留用于 Alembic
asyncpg==0.29.0     # 可以移除
```

## 实施建议

### 1. 创建混合服务层
```python
# 新的统一数据库服务
class DatabaseService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.sqlalchemy_session = AsyncSessionLocal
    
    # 简单操作使用 Supabase
    async def get_members_simple(self):
        return await supabase_service.get_members()
    
    # 复杂操作使用 SQLAlchemy
    async def get_members_with_projects(self):
        # 复杂 JOIN 查询仍用 SQLAlchemy
        pass
```

### 2. 保留现有 API 兼容性
- 不改变现有 API 接口
- 内部逐步替换实现
- 确保向后兼容

### 3. 性能监控
- 对比 Supabase vs SQLAlchemy 性能
- 监控错误率变化
- 逐步切换流量

## 时间线

### 第1周：准备工作
- [x] 集成 Supabase 客户端
- [x] 解决 prepared statement 问题
- [x] 创建混合服务层
- [x] Support 模块完全迁移完成（FAQ + Inquiry）

### 第2-3周：简单模块迁移
- [x] FAQ 模块 ✅ 已完成 Supabase 迁移
- [x] Notice 模块 ✅ 已完成 Supabase 迁移
- [x] Banner 模块 ✅ 已完成 Supabase 迁移
- [x] Press Release 模块 ✅ 已完成 Supabase 迁移
- [x] SystemInfo 模块 ✅ 已完成 Supabase 迁移

### 第4-6周：核心模块迁移
- [x] Dashboard 模块 ✅ 已完成 Supabase 迁移
- [x] User 模块 ✅ 已完成 Supabase 迁移
- [x] Upload 模块 ✅ 已完成 Supabase 迁移
- [x] Member 模块 ✅ 已完成 Supabase 迁移

### 第7-8周：复杂模块评估
- [ ] Project 模块分析
- [ ] Performance 模块分析
- [ ] 决定是否迁移或保留 SQLAlchemy

## 已完成的迁移

### FAQ 模块迁移 ✅ (2024-12-14)

**迁移内容:**
- ✅ `SupportService.get_faqs()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `SupportService.create_faq()` - 从 SQLAlchemy 迁移到 Supabase  
- ✅ `SupportService.update_faq()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `SupportService.delete_faq()` - 从 SQLAlchemy 迁移到 Supabase

**技术细节:**
- 保持了原有的方法签名，确保 API 兼容性
- 返回类型从 SQLAlchemy 对象改为字典
- 更新了 router 中的响应处理 (`model_validate` → `**dict`)
- 移除了所有 FAQ 端点的 `db` 依赖
- 所有异常处理保持一致

**测试:**
- 创建了 `test_faq_migration.py` 测试脚本
- 验证所有 CRUD 操作正常工作
- 确认分类筛选功能正常

### Inquiry 模块迁移 ✅ (2024-12-14)

**迁移内容:**
- ✅ `SupportService.create_inquiry()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `SupportService.get_member_inquiries()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `SupportService.get_inquiry_by_id()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `SupportService.get_all_inquiries_admin()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `SupportService.reply_to_inquiry()` - 从 SQLAlchemy 迁移到 Supabase

**技术细节:**
- 保持了原有的方法签名和权限验证逻辑
- 返回类型从 SQLAlchemy 对象改为字典
- 更新了 router 中的响应处理
- 移除了所有 Inquiry 端点的 `db` 依赖
- 移除了不需要的 SQLAlchemy 导入
- 保持了分页、筛选和权限控制功能

**测试:**
- 创建了 `test_inquiry_migration.py` 测试脚本
- 验证所有 CRUD 操作和权限控制
- 确认分页和状态筛选功能正常

**性能提升:**
- 消除了 prepared statement 冲突
- 简化了数据库连接管理
- 减少了 ORM 开销

### Content 模块完全迁移 ✅ (2024-12-14)

**迁移内容:**
- ✅ Notice 管理 - 从 SQLAlchemy 迁移到 Supabase
- ✅ Banner 管理 - 从 SQLAlchemy 迁移到 Supabase  
- ✅ Press Release 管理 - 从 SQLAlchemy 迁移到 Supabase
- ✅ SystemInfo 管理 - 从 SQLAlchemy 迁移到 Supabase

**技术细节:**
- 保持了原有的方法签名和业务逻辑
- 返回类型从 SQLAlchemy 对象改为字典
- 更新了 router 中的响应处理
- 移除了所有 Content 端点的 `db` 依赖
- 移除了不需要的 SQLAlchemy 导入
- 保持了分页、筛选、排序和权限控制功能
- Banner 类型验证和 SystemInfo 的 upsert 模式保持不变

**测试:**
- 创建了 `test_banner_migration.py` 测试脚本
- 验证所有 CRUD 操作和业务逻辑
- 确认类型验证和特殊功能正常

**性能提升:**
- 消除了 prepared statement 冲突
- 简化了数据库连接管理
- 减少了 ORM 开销

### Notice 模块迁移 ✅ (2024-12-14)

**迁移内容:**
- ✅ `ContentService.get_notices()` - 从 SQLAlchemy 迁移到 Supabase（支持分页和搜索）
- ✅ `ContentService.get_notice_latest5()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `ContentService.get_notice_by_id()` - 从 SQLAlchemy 迁移到 Supabase（包含浏览量自增）
- ✅ `ContentService.create_notice()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `ContentService.update_notice()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `ContentService.delete_notice()` - 从 SQLAlchemy 迁移到 Supabase

**技术细节:**
- 保持了原有的方法签名和返回类型结构
- 实现了复杂的分页查询（先获取总数，再获取分页数据）
- 保留了搜索功能（使用 Supabase 的 `ilike` 操作）
- 实现了浏览量自动增加功能
- 更新了 router 中的作者信息查询逻辑

**测试:**
- 创建了 `test_notice_migration.py` 测试脚本
- 验证所有 CRUD 操作、分页、搜索功能
- 确认浏览量自增功能正常

**特殊功能:**
- 支持 HTML 内容存储和检索
- 支持按标题搜索（模糊匹配）
- 支持分页查询
- 自动浏览量统计

### Dashboard 模块迁移 ✅ (2024-12-14)

**迁移内容:**
- ✅ `DashboardService.get_dashboard_stats()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `DashboardService._generate_chart_data()` - 从 SQLAlchemy 迁移到 Supabase

**技术细节:**
- 保持了原有的方法签名和业务逻辑
- 返回类型从 SQLAlchemy 对象改为字典
- 更新了 router 中移除 `db` 依赖
- 移除了不需要的 SQLAlchemy 导入
- 保持了复杂的统计聚合逻辑和图表数据生成
- 支持按年份和季度筛选功能

**新增 Supabase 服务方法:**
- `get_approved_members_count()` - 获取已批准会员总数
- `get_performance_records()` - 获取绩效记录（支持年份、季度筛选）
- `get_performance_records_for_chart()` - 获取用于图表的绩效记录

**测试:**
- 创建了 `test_dashboard_simple.py` 测试脚本
- 验证所有统计聚合和筛选功能
- 确认图表数据生成逻辑正常

**统计数据验证:**
- 总会员数: 19 个已批准会员
- 绩效记录: 59 条（16条销售，24条知识产权，19条支持）
- 总销售额: 892,510,268
- 2024年记录: 20 条

**性能提升:**
- 消除了 prepared statement 冲突
- 简化了数据库连接管理
- 减少了 ORM 开销

### User 模块迁移 ✅ (2024-12-14)

**迁移内容:**
- ✅ `AuthService.register_member()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.authenticate()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.get_member_by_id()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.is_admin()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.authenticate_admin()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.create_password_reset_request()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.reset_password_with_token()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.change_password()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.check_business_number()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `AuthService.check_email()` - 从 SQLAlchemy 迁移到 Supabase

**技术细节:**
- 保持了原有的方法签名和业务逻辑
- 返回类型从 SQLAlchemy 对象改为字典
- 更新了 router 中移除所有 `db` 依赖
- 更新了 dependencies 中的认证逻辑
- 移除了不需要的 SQLAlchemy 导入
- 保持了密码哈希、JWT 令牌、Nice D&B 集成等功能
- 支持事业자등록번호标准化比较（移除破折号和空格）

**新增 Supabase 服务方法:**
- `get_member_by_business_number()` - 根据事业자등록번호获取会员（支持标准化比较）
- `get_member_by_email()` - 根据邮箱获取会员
- `create_member()` - 创建新会员
- `create_member_profile()` - 创建会员档案
- `update_member()` - 更新会员信息
- `get_admin_by_id()` - 根据ID获取管理员
- `get_admin_by_email()` - 根据邮箱获取管理员
- `get_member_by_reset_token()` - 根据重置令牌获取会员

**测试:**
- 创建了 `test_user_migration.py` 测试脚本
- 验证所有认证和授权功能
- 确认数据库查询和业务逻辑正常

**数据验证:**
- 会员总数: 75 个
- 管理员总数: 5 个
- 会员档案总数: 75 个
- 事业자등록번호查询: 正常
- 邮箱查询: 正常

**重要更新:**
- 所有 router 方法移除了 `db: AsyncSession` 参数
- 所有 dependencies 更新为返回字典而不是 SQLAlchemy 对象
- 保持了 JWT 认证和权限控制的完整功能
- Nice D&B 集成功能保持不变

**性能提升:**
- 消除了 prepared statement 冲突
- 简化了数据库连接管理
- 减少了 ORM 开销

### Upload 模块迁移 ✅ (2024-12-14)

**迁移内容:**
- ✅ `UploadService.upload_public_file()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `UploadService.upload_private_file()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `UploadService.get_file()` - 从 SQLAlchemy 迁移到 Supabase
- ✅ `UploadService.delete_file()` - 从 SQLAlchemy 迁移到 Supabase

**技术细节:**
- 保持了原有的方法签名和业务逻辑
- 返回类型从 SQLAlchemy 对象改为字典
- 更新了 router 中移除所有 `db` 依赖
- 移除了不需要的 SQLAlchemy 导入
- 保持了文件验证、存储路径生成、权限检查等功能
- Supabase Storage 集成保持不变（已经在使用）
- 支持公共和私有文件的不同处理逻辑

**新增 Supabase 服务方法:**
- `create_attachment()` - 创建附件记录
- `get_attachment_by_id()` - 根据ID获取附件
- `delete_attachment()` - 删除附件记录

**测试:**
- 创建了 `test_upload_migration.py` 测试脚本
- 验证所有文件上传和管理功能
- 确认数据库查询和业务逻辑正常

**数据验证:**
- 附件总数: 100 个
- 资源类型分布: performance(54), project_application(28), project(18)
- 文件类型分布: document(51), image(49)
- 总文件大小: 213.47 MB
- 平均文件大小: 2185.91 KB

**重要更新:**
- 所有 router 方法移除了 `db: AsyncSession` 参数
- 文件上传和下载功能保持完整
- 权限检查逻辑更新为使用新的 AuthService
- 文件存储路径生成逻辑保持不变
- 支持签名URL生成用于私有文件访问

**性能提升:**
- 消除了 prepared statement 冲突
- 简化了数据库连接管理
- 减少了 ORM 开销

## 风险控制

### 1. 回滚策略
- 保留原有 SQLAlchemy 代码
- 使用功能开关控制切换
- 快速回滚机制

### 2. 数据一致性
- 确保 Supabase 和 SQLAlchemy 操作同一数据库
- 事务边界清晰定义
- 避免混合事务

### 3. 测试策略
- 对每个迁移的模块进行全面测试
- 性能基准测试
- 错误处理测试