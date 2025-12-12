# UPGRADE.md 执行计划

> 基于 `UPGRADE.md` 的详细开发执行计划  
> 创建日期: 2025-01-XX  
> 状态: 规划中

---

## 📋 执行计划概览

| 模块 | 任务数 | 优先级 | 预计工作量 | 状态 |
|------|--------|--------|-----------|------|
| 1. 登录/菜单功能 | 3 | P0 | 2-3天 | ⏳ 待开始 |
| 2. 注册验证 | 3 | P0 | 3-4天 | ⏳ 待开始 |
| 3. 注册UI改进 | 4 | P1 | 2-3天 | ⏳ 待开始 |
| 4. 电话号码格式 | 1 | P1 | 0.5天 | ⏳ 待开始 |
| 5. 登录批准状态 | 2 | P0 | 1-2天 | ⏳ 待开始 |
| 6. 登录保护页面 | 1 | P0 | 1天 | ⏳ 待开始 |
| 7. 管理员注册 | 8 | P1 | 4-5天 | ⏳ 待开始 |
| 8. 后端数据验证 | 2 | P0 | 2天 | ⏳ 待开始 |
| 9. 日期/文件处理 | 4 | P1 | 2-3天 | ⏳ 待开始 |

**总计**: 28个任务，预计 17-23 个工作日

---

## 🎯 优先级说明

- **P0**: 核心功能，必须优先完成
- **P1**: 重要改进，建议尽快完成
- **P2**: 优化项，可延后处理

---

## 📦 模块 1: Frontend 登录/菜单功能

### 1.1 初始进入时登录状态显示修正
**优先级**: P0  
**预计工作量**: 1天  
**负责**: Frontend

#### 任务描述
- 未登录状态下，不显示"已登录"的UI（隐藏用户菜单/个人资料）
- 登录必需菜单（如项目）点击时，统一跳转到登录页面或显示登录弹窗

#### 实施步骤
1. **检查当前认证状态逻辑**
   - 文件: `frontend/src/shared/stores/authStore.js`
   - 文件: `frontend/src/shared/hooks/useAuth.js`
   - 确保 `isAuthenticated` 状态准确反映登录状态

2. **修改 Header/导航组件**
   - 文件: `frontend/src/member/layouts/Header.jsx`
   - 文件: `frontend/src/admin/layouts/Header.jsx`
   - 根据 `isAuthenticated` 条件渲染不同UI
   - 未登录时显示"登录"按钮，隐藏用户菜单

3. **修改菜单点击处理**
   - 文件: `frontend/src/member/layouts/Sidebar.jsx` (如存在)
   - 文件: `frontend/src/router.jsx`
   - 登录必需路由点击时，检查认证状态
   - 未登录则显示登录弹窗或跳转登录页

#### 验收标准
- [ ] 未登录时Header不显示用户信息
- [ ] 点击登录必需菜单时触发登录流程
- [ ] 登录后UI正确更新

---

### 1.2 登录必需页面进入时统一行为
**优先级**: P0  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 所有需要认证的页面（如项目）在未登录访问时，统一显示登录弹窗

#### 实施步骤
1. **创建登录弹窗组件**
   - 新建: `frontend/src/shared/components/LoginModal.jsx`
   - 可复用现有登录表单逻辑
   - 支持关闭和登录成功回调

2. **创建路由守卫Hook**
   - 新建: `frontend/src/shared/hooks/useAuthGuard.js`
   - 检查认证状态，未登录则显示弹窗

3. **应用路由守卫**
   - 文件: `frontend/src/router.jsx`
   - 在需要认证的路由上应用守卫
   - 或使用 React Router 的 `ProtectedRoute` 组件

#### 验收标准
- [ ] 未登录访问保护页面时显示登录弹窗
- [ ] 登录成功后自动关闭弹窗并继续访问
- [ ] 所有保护页面行为一致

---

### 1.3 管理员登录页面UI修改
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 移除管理员登录页面的注册链接
- 添加"需要管理员账户？请联系系统管理员"提示

#### 实施步骤
1. **修改管理员登录页面**
   - 文件: `frontend/src/admin/modules/auth/Login.jsx`
   - 移除注册相关链接/按钮
   - 添加提示文本（支持i18n）

2. **更新翻译文件**
   - 文件: `frontend/src/admin/layouts/locales/*.json`
   - 添加提示文本的翻译

#### 验收标准
- [ ] 管理员登录页面无注册链接
- [ ] 显示管理员账户申请提示
- [ ] 提示文本支持多语言

---

## 📦 模块 2: 注册 - 营业执照号/邮箱/密码验证

### 2.1 营业执照号中复实时检查
**优先级**: P0  
**预计工作量**: 1.5天  
**负责**: Frontend + Backend

#### 任务描述
- 营业执照号输入后（debounce），调用后端检查中复
- 显示实时状态消息（"可用" / "已注册"）
- 只有有效且不重复的营业执照号才能进入下一步

#### 实施步骤

**Backend (0.5天)**
1. **创建中复检查API**
   - 文件: `backend/src/modules/user/router.py`
   - 新增: `GET /api/auth/check-business-number/:business_number`
   - 或: `POST /api/auth/check-business-number`
   - 返回: `{ available: bool, message: str }`
   - 无需认证（public endpoint）

2. **实现检查逻辑**
   - 文件: `backend/src/modules/user/service.py`
   - 在 `AuthService` 中添加 `check_business_number` 方法
   - 查询 `Member` 表检查中复

**Frontend (1天)**
1. **创建验证服务**
   - 文件: `frontend/src/shared/services/auth.service.js`
   - 添加 `checkBusinessNumber` 方法

2. **修改注册表单**
   - 文件: `frontend/src/member/modules/auth/Register.jsx`
   - 在营业执照号输入框添加实时验证
   - 使用 debounce（建议 500ms）
   - 显示验证状态消息
   - 根据验证结果禁用/启用"下一步"按钮

3. **添加i18n文本**
   - 文件: `frontend/src/member/modules/auth/locales/*.json`
   - 添加验证消息文本

#### 验收标准
- [ ] 输入营业执照号后自动检查中复
- [ ] 显示清晰的验证状态消息
- [ ] 只有可用时才能进入下一步
- [ ] API响应时间合理（<500ms）

---

### 2.2 邮箱中复实时检查
**优先级**: P0  
**预计工作量**: 1.5天  
**负责**: Frontend + Backend

#### 任务描述
- 邮箱输入时调用后端检查中复
- 显示实时状态消息
- 格式验证（前端）+ 中复验证（后端）都通过才能继续

#### 实施步骤

**Backend (0.5天)**
1. **创建邮箱检查API**
   - 文件: `backend/src/modules/user/router.py`
   - 新增: `GET /api/auth/check-email/:email` 或 `POST /api/auth/check-email`
   - 返回: `{ available: bool, message: str }`
   - 检查 `Member` 和 `Admin` 表（管理员注册也需要）

2. **实现检查逻辑**
   - 文件: `backend/src/modules/user/service.py`
   - 添加 `check_email` 方法
   - 同时检查 `Member` 和 `Admin` 表

**Frontend (1天)**
1. **添加验证服务方法**
   - 文件: `frontend/src/shared/services/auth.service.js`
   - 添加 `checkEmail` 方法

2. **修改注册表单**
   - 文件: `frontend/src/member/modules/auth/Register.jsx`
   - 邮箱输入框添加实时验证
   - 先进行格式验证，再调用后端检查中复
   - 显示验证状态消息

#### 验收标准
- [ ] 邮箱格式验证在前端完成
- [ ] 格式正确后自动检查中复
- [ ] 显示清晰的验证状态
- [ ] 只有可用时才能继续

---

### 2.3 密码有效性/匹配实时显示
**优先级**: P0  
**预计工作量**: 1天  
**负责**: Frontend

#### 任务描述
- 密码输入时实时显示验证条件（长度、组合等）
- 密码确认字段实时显示匹配状态
- 两个字段都有效且匹配时才能提交

#### 实施步骤
1. **定义密码策略**
   - 文件: `frontend/src/shared/utils/validation.js` (新建或更新)
   - 定义密码验证规则（最小8位等）

2. **创建密码验证组件**
   - 新建: `frontend/src/shared/components/PasswordStrength.jsx`
   - 显示密码强度指示器
   - 显示验证条件清单（✓/✗）

3. **修改注册表单**
   - 文件: `frontend/src/member/modules/auth/Register.jsx`
   - 集成密码强度组件
   - 添加密码确认匹配检查
   - 实时显示匹配状态

4. **更新表单验证逻辑**
   - 确保密码和确认密码都有效且匹配时，提交按钮才启用

#### 验收标准
- [ ] 密码输入时实时显示验证条件
- [ ] 密码确认实时显示匹配状态
- [ ] 只有满足所有条件时才能提交
- [ ] UI清晰易读

---

## 📦 模块 3: 注册 - 地址/日期/文件上传UI

### 3.1 地址搜索后弹窗自动关闭
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 地址搜索弹窗中选择地址后，表单字段填充完成，弹窗自动关闭

#### 实施步骤
1. **检查地址搜索组件**
   - 文件: `frontend/src/shared/components/AddressSearch.jsx`
   - 检查 `handleAddressSelect` 回调

2. **修改地址选择处理**
   - 确保地址填充后自动关闭弹窗
   - 检查是否有状态管理问题

#### 验收标准
- [ ] 选择地址后弹窗自动关闭
- [ ] 地址字段正确填充

---

### 3.2 法人设立日期输入统一行为
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 日期图标和输入框点击时都打开日历
- 允许手动输入和日历选择
- 无效输入显示验证错误

#### 实施步骤
1. **检查日期输入组件**
   - 文件: `frontend/src/member/modules/auth/Register.jsx`
   - 查找日期输入相关代码

2. **统一日期输入行为**
   - 输入框点击时打开日历
   - 保持手动输入功能
   - 添加输入验证

#### 验收标准
- [ ] 输入框和图标点击都打开日历
- [ ] 手动输入和日历选择都可用
- [ ] 无效输入显示错误

---

### 3.3 日期格式统一 (YYYY-MM-DD)
**优先级**: P1  
**预计工作量**: 1天  
**负责**: Frontend + Backend

#### 任务描述
- 所有日期显示/输入/传输统一为 `YYYY-MM-DD` 格式

#### 实施步骤

**Frontend (0.5天)**
1. **创建日期格式化工具**
   - 文件: `frontend/src/shared/utils/format.js`
   - 添加 `formatDate` 和 `parseDate` 函数

2. **更新所有日期输入**
   - 文件: `frontend/src/member/modules/auth/Register.jsx`
   - 应用统一格式
   - 更新 placeholder

**Backend (0.5天)**
1. **确保日期格式验证**
   - 文件: `backend/src/modules/user/schemas.py`
   - 使用 Pydantic `date` 类型或自定义验证器
   - 确保接受 `YYYY-MM-DD` 格式

2. **统一日期响应格式**
   - 所有返回日期的API统一格式

#### 验收标准
- [ ] 所有日期显示为 `YYYY-MM-DD`
- [ ] 输入 placeholder 显示正确格式
- [ ] 后端接受并返回统一格式

---

### 3.4 文件上传 - 删除时文本也重置
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 文件删除时，文件名文本也立即清除
- 相同文件名再次选择时也能正常触发上传事件

#### 实施步骤
1. **检查文件上传组件**
   - 文件: `frontend/src/member/modules/auth/Register.jsx`
   - 查找文件上传相关代码

2. **修复文件删除逻辑**
   - 删除时清除文件状态和显示文本
   - 重置 `<input type="file">` 的值（设置 `value=""`）

#### 验收标准
- [ ] 删除文件时文本立即清除
- [ ] 相同文件可再次选择
- [ ] 上传事件正常触发

---

## 📦 模块 4: 注册 - 电话号码/邮箱格式

### 4.1 电话号码自动格式移除
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 移除电话号码自动格式化
- 只保留数字/特殊字符验证
- 在 placeholder 或帮助文本中提供格式示例

#### 实施步骤
1. **检查电话号码格式化**
   - 文件: `frontend/src/shared/utils/format.js`
   - 查找 `formatPhoneNumber` 函数

2. **移除自动格式化**
   - 从注册表单中移除格式化调用
   - 保留基本验证（如只允许数字和特定字符）

3. **更新帮助文本**
   - 在 placeholder 或帮助文本中提供格式示例

#### 验收标准
- [ ] 电话号码输入时无自动格式化
- [ ] 用户可自由输入
- [ ] 有格式示例提示

---

## 📦 模块 5: 登录批准状态处理

### 5.1 未批准账户登录时警告消息
**优先级**: P0  
**预计工作量**: 1天  
**负责**: Frontend + Backend

#### 任务描述
- 未批准账户登录时显示明确的警告消息
- 根据后端响应代码/消息区分批准状态

#### 实施步骤

**Backend (0.5天)**
1. **检查登录逻辑**
   - 文件: `backend/src/modules/user/service.py`
   - 查找 `authenticate_member` 方法

2. **添加批准状态检查**
   - 检查 `Member.status` 或 `Member.is_approved`
   - 未批准时返回明确的错误代码和消息
   - 例如: `403 Forbidden` + `{ code: "PENDING_APPROVAL", message: "..." }`

**Frontend (0.5天)**
1. **更新登录处理**
   - 文件: `frontend/src/member/modules/auth/Login.jsx`
   - 捕获批准相关错误
   - 显示友好的提示消息（Toast/Modal）

2. **添加错误消息映射**
   - 根据后端错误代码显示对应消息
   - 支持i18n

#### 验收标准
- [ ] 未批准账户登录时显示警告
- [ ] 消息清晰易懂
- [ ] 支持多语言

---

### 5.2 注册完成后的移动路径修改
**优先级**: P0  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 注册完成后跳转到主页（而非登录页）
- 登录页登录时，未批准账户显示"等待管理员批准"提示

#### 实施步骤
1. **修改注册完成逻辑**
   - 文件: `frontend/src/member/modules/auth/Register.jsx`
   - 注册成功后跳转到 `/member` 或主页

2. **更新登录错误处理**
   - 文件: `frontend/src/member/modules/auth/Login.jsx`
   - 未批准错误时显示模态框提示

3. **配置化路径**
   - 将跳转路径提取为配置/常量
   - 便于后续修改

#### 验收标准
- [ ] 注册完成后跳转到主页
- [ ] 未批准登录时显示提示
- [ ] 路径可配置

---

## 📦 模块 6: 登录必需页面通用处理

### 6.1 登录必需菜单点击时弹窗/重定向通用逻辑
**优先级**: P0  
**预计工作量**: 1天  
**负责**: Frontend

#### 任务描述
- 创建通用的登录守卫
- 所有保护页面统一使用登录弹窗

#### 实施步骤
1. **创建登录守卫组件**
   - 新建: `frontend/src/shared/components/ProtectedRoute.jsx`
   - 或创建 Hook: `frontend/src/shared/hooks/useRequireAuth.js`

2. **创建登录弹窗组件**
   - 新建: `frontend/src/shared/components/LoginModal.jsx`
   - 复用登录表单逻辑

3. **应用守卫**
   - 文件: `frontend/src/router.jsx`
   - 在需要认证的路由上应用守卫
   - 或使用 React Router v6 的 `Outlet` + 守卫

4. **统一错误处理**
   - 文件: `frontend/src/shared/services/api.service.js`
   - 401/403 响应时触发登录弹窗

#### 验收标准
- [ ] 所有保护页面行为一致
- [ ] 未登录时显示登录弹窗
- [ ] 登录成功后继续访问

---

## 📦 模块 7: 管理员注册功能

### 7.1 Frontend - 管理员注册页面
**优先级**: P1  
**预计工作量**: 2天  
**负责**: Frontend

#### 任务描述
- 创建独立的管理员注册页面
- 包含: 邮箱(ID)、密码、密码确认、姓名、电话、注册日期

#### 实施步骤
1. **创建管理员注册页面**
   - 新建: `frontend/src/admin/modules/auth/Register.jsx`
   - 参考会员注册页面结构
   - 简化字段（仅必需项）

2. **添加注册链接**
   - 文件: `frontend/src/admin/modules/auth/Login.jsx`
   - 在登录页面底部添加"管理员注册"链接

3. **添加路由**
   - 文件: `frontend/src/router.jsx`
   - 添加 `/admin/register` 路由

4. **添加i18n文本**
   - 文件: `frontend/src/admin/layouts/locales/*.json`
   - 添加注册相关文本

#### 验收标准
- [ ] 管理员注册页面独立存在
- [ ] 包含所有必需字段
- [ ] 从登录页可访问

---

### 7.2 Frontend - 邮箱中复实时检查（管理员）
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 管理员注册时邮箱中复实时检查
- 复用模块2.2的后端API

#### 实施步骤
1. **在管理员注册表单中添加验证**
   - 文件: `frontend/src/admin/modules/auth/Register.jsx`
   - 使用 `authService.checkEmail` 方法
   - 添加 debounce 和状态显示

#### 验收标准
- [ ] 邮箱输入时自动检查中复
- [ ] 显示验证状态

---

### 7.3 Frontend - 密码策略实时验证（管理员）
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 密码输入时实时显示验证条件
- 8位以上、大小写、数字、特殊字符

#### 实施步骤
1. **复用密码强度组件**
   - 使用模块2.3创建的 `PasswordStrength` 组件
   - 在管理员注册表单中集成

2. **定义密码策略**
   - 与会员注册保持一致
   - 或提取为共享配置

#### 验收标准
- [ ] 实时显示密码验证条件
- [ ] 所有条件满足时才能提交

---

### 7.4 Frontend - 密码确认匹配验证（管理员）
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Frontend

#### 任务描述
- 密码确认字段实时显示匹配状态

#### 实施步骤
1. **在管理员注册表单中添加匹配检查**
   - 文件: `frontend/src/admin/modules/auth/Register.jsx`
   - 实时比较密码和确认密码

#### 验收标准
- [ ] 实时显示匹配状态
- [ ] 匹配时才能提交

---

### 7.5 Backend - 管理员注册API
**优先级**: P1  
**预计工作量**: 1天  
**负责**: Backend

#### 任务描述
- 实现 `POST /api/admin/auth/register` 端点
- 注册时状态设为 `pending_approval`
- 角色设为 `admin`，但需超级管理员批准

#### 实施步骤
1. **创建注册请求Schema**
   - 文件: `backend/src/modules/user/schemas.py`
   - 添加 `AdminRegisterRequest` 类
   - 字段: email, password, name, phone, registration_date

2. **创建注册路由**
   - 文件: `backend/src/modules/user/router.py`
   - 或新建: `backend/src/modules/admin/router.py`
   - 添加 `POST /api/admin/auth/register` 端点

3. **实现注册服务**
   - 文件: `backend/src/modules/user/service.py`
   - 添加 `register_admin` 方法
   - 检查邮箱中复（Member + Admin表）
   - 验证密码策略
   - 创建 `Admin` 记录，状态为 `pending_approval`

4. **检查Admin模型**
   - 文件: `backend/src/common/modules/db/models.py`
   - 确保 `Admin` 模型有 `status` 或 `is_approved` 字段
   - 如无，创建数据库迁移

#### 验收标准
- [ ] API端点正常工作
- [ ] 注册时状态为 `pending_approval`
- [ ] 邮箱中复检查正确
- [ ] 密码策略验证正确

---

### 7.6 Backend - 邮箱中复检查API（管理员）
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Backend

#### 任务描述
- 实现管理员邮箱检查API
- 检查 Member 和 Admin 表

#### 实施步骤
1. **创建检查端点**
   - 文件: `backend/src/modules/user/router.py`
   - 添加 `GET /api/admin/auth/check-email/:email`
   - 或复用模块2.2的端点（已检查两个表）

2. **确保检查逻辑**
   - 同时检查 `Member` 和 `Admin` 表

#### 验收标准
- [ ] 正确检查两个表
- [ ] 返回准确的可用性状态

---

### 7.7 Backend - 密码策略验证
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Backend

#### 任务描述
- 密码策略定义为常量
- 注册时验证密码策略

#### 实施步骤
1. **定义密码策略常量**
   - 文件: `backend/src/common/modules/config/settings.py`
   - 或新建: `backend/src/common/modules/config/password_policy.py`
   - 定义: 最小8位、大小写、数字、特殊字符

2. **创建密码验证函数**
   - 文件: `backend/src/modules/user/service.py`
   - 添加 `validate_password_policy` 方法

3. **应用验证**
   - 在 `register_member` 和 `register_admin` 中应用

#### 验收标准
- [ ] 密码策略定义为常量
- [ ] 注册时验证密码
- [ ] 违反策略时返回明确错误

---

### 7.8 Backend - 超级管理员批准流程
**优先级**: P1  
**预计工作量**: 1天  
**负责**: Backend

#### 任务描述
- 实现管理员批准API
- 批准后状态改为 `active`
- 记录审计日志

#### 实施步骤
1. **创建批准端点**
   - 文件: `backend/src/modules/admin/router.py` (新建或现有)
   - 添加 `POST /api/admin/users/:id/approve`
   - 需要超级管理员权限

2. **实现批准逻辑**
   - 文件: `backend/src/modules/admin/service.py` (新建或现有)
   - 更新 `Admin.status` 为 `active`
   - 记录审计日志

3. **更新登录逻辑**
   - 文件: `backend/src/modules/user/service.py`
   - `authenticate_admin` 方法检查状态
   - 未批准时返回 403 + 明确消息

4. **检查权限系统**
   - 确保有超级管理员角色/权限区分
   - 如无，需要设计权限系统

#### 验收标准
- [ ] 批准API正常工作
- [ ] 批准后状态正确更新
- [ ] 审计日志正确记录
- [ ] 未批准账户无法登录

---

## 📦 模块 8: Backend - 数据验证和错误处理

### 8.1 输入数据验证强化
**优先级**: P0  
**预计工作量**: 1天  
**负责**: Backend

#### 任务描述
- 使用 Pydantic 验证所有API请求
- 营业执照号、邮箱使用正则验证格式
- 验证失败时返回字段级错误消息

#### 实施步骤
1. **检查现有Schema**
   - 文件: `backend/src/modules/user/schemas.py`
   - 确保所有字段有适当验证

2. **添加格式验证器**
   - 为营业执照号添加正则验证
   - 邮箱使用 `EmailStr`（已使用）
   - 添加自定义验证器

3. **统一错误响应格式**
   - 创建统一的错误响应Schema
   - 文件: `backend/src/common/modules/exception/schemas.py` (新建或更新)

#### 验收标准
- [ ] 所有API请求都经过验证
- [ ] 格式错误返回明确消息
- [ ] 错误消息字段级

---

### 8.2 错误响应格式统一
**优先级**: P0  
**预计工作量**: 1天  
**负责**: Backend

#### 任务描述
- 所有API错误响应统一格式
- 定义错误代码常量

#### 实施步骤
1. **创建错误响应Schema**
   - 文件: `backend/src/common/modules/exception/schemas.py`
   - 定义: `{ code: str, message: str, details: dict }`

2. **创建错误代码常量**
   - 文件: `backend/src/common/modules/exception/error_codes.py`
   - 定义所有错误代码

3. **更新异常处理**
   - 文件: `backend/src/common/modules/exception/handlers.py`
   - 确保所有异常返回统一格式

4. **更新路由错误处理**
   - 所有路由使用统一错误处理

#### 验收标准
- [ ] 所有错误响应格式一致
- [ ] 错误代码清晰
- [ ] 前端易于处理

---

## 📦 模块 9: Backend - 日期和文件处理

### 9.1 日期格式统一和验证
**优先级**: P1  
**预计工作量**: 0.5天  
**负责**: Backend

#### 任务描述
- 所有日期输入接受 `YYYY-MM-DD` 格式
- 使用 Pydantic `date` 类型或自定义验证器
- 无效日期返回明确错误

#### 实施步骤
1. **检查日期字段**
   - 文件: `backend/src/modules/user/schemas.py`
   - 确保日期字段使用正确类型

2. **添加日期验证**
   - 使用 Pydantic `date` 类型
   - 或创建自定义验证器确保 `YYYY-MM-DD` 格式

3. **统一日期响应**
   - 确保所有日期响应为 `YYYY-MM-DD` 格式

#### 验收标准
- [ ] 所有日期接受统一格式
- [ ] 无效日期返回错误
- [ ] 日期响应格式一致

---

### 9.2 文件上传验证和处理
**优先级**: P1  
**预计工作量**: 1天  
**负责**: Backend

#### 任务描述
- 文件上传时验证大小、扩展名、MIME类型
- 验证规则配置化
- 文件删除API

#### 实施步骤
1. **检查文件上传端点**
   - 文件: `backend/src/modules/upload/router.py`
   - 检查现有验证逻辑

2. **添加文件验证**
   - 验证文件大小
   - 验证扩展名
   - 验证MIME类型

3. **配置化验证规则**
   - 文件: `backend/src/common/modules/config/settings.py`
   - 定义文件大小、允许扩展名等配置

4. **实现文件删除API**
   - 文件: `backend/src/modules/upload/router.py`
   - 添加 `DELETE /api/upload/:fileId` 端点

#### 验收标准
- [ ] 文件大小验证正确
- [ ] 扩展名验证正确
- [ ] MIME类型验证正确
- [ ] 文件删除API正常

---

### 9.3 文件上传容量限制环境配置
**优先级**: P1  
**预计工作量**: 1天  
**负责**: Frontend + Backend

#### 任务描述
- Frontend和Backend都从环境配置读取容量限制
- 图片和文档分别设置

#### 实施步骤

**Backend (0.5天)**
1. **添加环境变量**
   - 文件: `backend/.env.example`
   - 添加: `MAX_IMAGE_SIZE`, `MAX_DOCUMENT_SIZE`

2. **读取配置**
   - 文件: `backend/src/common/modules/config/settings.py`
   - 读取环境变量

3. **应用验证**
   - 文件: `backend/src/modules/upload/router.py`
   - 使用配置值验证文件大小

**Frontend (0.5天)**
1. **添加环境变量**
   - 文件: `frontend/.env.example`
   - 添加: `VITE_MAX_IMAGE_SIZE`, `VITE_MAX_DOCUMENT_SIZE`

2. **读取配置**
   - 文件: `frontend/src/shared/utils/fileValidation.js`
   - 读取环境变量

3. **应用验证**
   - 文件选择时验证文件大小
   - 显示用户友好的错误消息（MB单位）

#### 验收标准
- [ ] 前后端都从环境配置读取
- [ ] 图片和文档分别限制
- [ ] 错误消息清晰（MB单位）

---

### 9.4 文件上传扩展名限制环境配置
**优先级**: P1  
**预计工作量**: 1天  
**负责**: Frontend + Backend

#### 任务描述
- Frontend和Backend都从环境配置读取允许扩展名
- 图片和文档分别管理

#### 实施步骤

**Backend (0.5天)**
1. **添加环境变量**
   - 文件: `backend/.env.example`
   - 添加: `ALLOWED_IMAGE_EXTENSIONS`, `ALLOWED_DOCUMENT_EXTENSIONS`

2. **读取配置**
   - 文件: `backend/src/common/modules/config/settings.py`
   - 解析逗号分隔的扩展名列表

3. **应用验证**
   - 文件: `backend/src/modules/upload/router.py`
   - 验证扩展名（大小写不敏感）
   - 验证MIME类型

**Frontend (0.5天)**
1. **添加环境变量**
   - 文件: `frontend/.env.example`
   - 添加: `VITE_ALLOWED_IMAGE_EXTENSIONS`, `VITE_ALLOWED_DOCUMENT_EXTENSIONS`

2. **读取配置**
   - 文件: `frontend/src/shared/utils/fileValidation.js`
   - 解析扩展名列表

3. **应用验证**
   - 文件选择时验证扩展名
   - 显示用户友好的错误消息

#### 验收标准
- [ ] 前后端都从环境配置读取
- [ ] 扩展名验证大小写不敏感
- [ ] MIME类型也验证
- [ ] 错误消息清晰

---

## 🔄 依赖关系图

```
模块1 (登录/菜单) 
  └─> 模块6 (登录保护) [需要先完成1.2的登录弹窗]

模块2 (注册验证)
  └─> 模块7.2 (管理员邮箱检查) [复用2.2的API]

模块5 (登录批准)
  └─> 模块7.8 (管理员批准) [需要批准流程]

模块7 (管理员注册)
  ├─> 模块2.2 (邮箱检查API)
  ├─> 模块2.3 (密码验证组件)
  └─> 模块8 (数据验证)

模块8 (数据验证)
  └─> 模块9 (日期/文件处理) [验证规则]

模块9.3 (文件容量)
  └─> 模块9.2 (文件上传验证)

模块9.4 (文件扩展名)
  └─> 模块9.2 (文件上传验证)
```

---

## 📅 建议执行顺序

### 第一阶段 (P0 - 核心功能)
1. **模块1**: 登录/菜单功能 (2-3天)
2. **模块2**: 注册验证 (3-4天)
3. **模块5**: 登录批准状态 (1-2天)
4. **模块6**: 登录保护页面 (1天)
5. **模块8**: 数据验证和错误处理 (2天)

**预计**: 9-12天

### 第二阶段 (P1 - 重要改进)
6. **模块3**: 注册UI改进 (2-3天)
7. **模块4**: 电话号码格式 (0.5天)
8. **模块7**: 管理员注册 (4-5天)
9. **模块9**: 日期/文件处理 (2-3天)

**预计**: 8.5-11.5天

---

## 📝 开发注意事项

### 代码规范
- 遵循现有代码风格
- 使用 TypeScript/类型提示
- 添加必要的注释

### 测试
- 每个功能完成后进行手动测试
- 关键功能添加单元测试（如可能）
- 进行端到端测试

### 文档
- 更新API文档（如使用Swagger）
- 更新i18n翻译文件
- 更新README（如需要）

### Git工作流
- 每个模块独立分支
- 提交信息清晰
- 代码审查后合并

---

## ✅ 完成检查清单

每个模块完成后检查:
- [ ] 功能按需求实现
- [ ] 代码通过lint检查
- [ ] 手动测试通过
- [ ] 错误处理完善
- [ ] i18n文本完整
- [ ] 代码审查通过
- [ ] 文档更新（如需要）

---

## 📞 协作点

### Frontend ↔ Backend 协作
- **模块2.1/2.2**: 邮箱/营业执照号检查API接口定义
- **模块5.1**: 登录批准错误代码和消息格式
- **模块7.5**: 管理员注册API接口定义
- **模块8.2**: 错误响应格式统一
- **模块9.3/9.4**: 文件验证配置项定义

### 建议沟通方式
- API接口变更时及时沟通
- 错误代码和消息格式提前确认
- 环境变量配置项提前确认

---

**文档版本**: v1.0  
**最后更新**: 2025-01-XX  
**维护者**: 开发团队

