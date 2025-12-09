# Frontend Logging Refactor Plan / 前端日志改造计划

**文档版本**: 1.0  
**创建日期**: 2025-12-02  
**状态**: 待实施  
**预计工期**: 2-3 周  
**优先级**: P0（高优先级）

---

## 📋 一、改造概述

### 1.1 改造目标

将前端日志系统从**手动调用方式**改造为**自动化和 Hook 方式**，包括：

**服务层改造**：
- ✅ 代码更简洁，减少重复代码
- ✅ 自动提取资源ID和结果数量
- ✅ 自动处理成功和失败情况
- ✅ 统一日志格式，便于维护
- ✅ 提高开发效率

**组件层改造**：
- ✅ 创建组件日志 Hook（用户交互、生命周期、CSS、性能）
- ✅ 实现 CSS 日志收集，支持后续自动调整 CSS
- ✅ 统一组件日志格式
- ✅ 提供组件日志最佳实践

### 1.2 当前状态

**服务层统计**：
- 📁 **服务文件数量**: 9 个
- 📝 **日志调用点**: 183 个
- 🔧 **日志方式**: 全部为手动调用
- ⚠️ **问题**: 代码重复、维护成本高、容易遗漏日志记录

**组件层统计**：
- 📁 **组件文件数量**: 80+ 个
- 📝 **日志调用点**: 50+ 个（分散在各组件中）
- 🔧 **日志方式**: 直接调用 loggerService
- ⚠️ **问题**: 没有统一的组件日志方案，缺少 CSS 日志支持

**涉及的服务文件**：
1. `auth.service.js` - 认证服务（32个调用点）
2. `member.service.js` - 会员服务（9个调用点）
3. `admin.service.js` - 管理员服务（48个调用点）
4. `performance.service.js` - 绩效管理服务（18个调用点）
5. `content.service.js` - 内容管理服务（57个调用点）
6. `project.service.js` - 项目管理服务（12个调用点）
7. `upload.service.js` - 文件上传服务（1个调用点）
8. `support.service.js` - 支持服务（4个调用点）
9. `api.service.js` - API服务（2个调用点，主要是拦截器，无需改造）

### 1.3 目标状态

**服务层改造后**：
- ✅ 创建 `@autoLog` 装饰器工具
- ✅ 所有标准 CRUD 操作使用装饰器
- ✅ 复杂业务逻辑保留手动调用（可选）
- ✅ 代码量减少 30-40%
- ✅ 日志格式统一，便于分析

**组件层改造后**：
- ✅ 创建组件日志 Hook（useLogLayout, useLogStyle）
- ✅ 关键组件使用日志 Hook
- ✅ 布局问题检测和记录（仅在问题发生时）
- ✅ 布局日志数据结构标准化
- ✅ 支持布局问题分析和修复建议

---

## 🎯 二、改造范围

### 2.1 需要改造的服务

| 优先级 | 服务文件 | 调用点数 | 复杂度 | 预计工时 |
|--------|---------|---------|--------|---------|
| **P0** | `auth.service.js` | 32 | 高 | 4小时 |
| **P0** | `member.service.js` | 9 | 中 | 2小时 |
| **P1** | `admin.service.js` | 48 | 高 | 6小时 |
| **P1** | `content.service.js` | 57 | 高 | 6小时 |
| **P1** | `performance.service.js` | 18 | 中 | 3小时 |
| **P1** | `project.service.js` | 12 | 中 | 2小时 |
| **P2** | `support.service.js` | 4 | 低 | 1小时 |
| **P2** | `upload.service.js` | 1 | 低 | 0.5小时 |
| **N/A** | `api.service.js` | 2 | - | 无需改造 |

**服务层总计**: 183个调用点，预计 24.5 小时（约 3 个工作日）

**组件层改造**：
- 📁 **Hook 文件**: 2 个（useLogLayout, useLogStyle）
- 📝 **预计工时**: 4-6 小时（约 0.5-1 个工作日）
- 📝 **组件应用**: 按优先级逐步应用（预计 2-3 天）
- 📝 **重点**: useLogLayout（布局问题检测）+ useLogStyle（样式快照，用于自动调整风格）

**总计**: 服务层 + 组件层，预计 4-5 周完成

### 2.2 不需要改造的部分

- ✅ `api.service.js` 的拦截器（只负责基础设施功能，不记录日志）
- ✅ `exception.service.js` 的全局异常捕获（自动记录，无需改造）
- ✅ `logger.service.js` 核心功能（保持不变）

---

## 🛠️ 三、实施步骤

### 阶段一：基础设施准备（1-2天）

#### 步骤 1.1: 创建装饰器工具文件

**文件**: `frontend/src/shared/utils/decorators.js`

**功能要求**：
- ✅ 实现 `@autoLog` 装饰器工厂函数
- ✅ 支持参数配置（operationName, successMessage, errorMessage, logResourceId, logResultCount, logLevel）
- ✅ 自动提取资源ID（从返回值中提取 id, member_id, user_id 等）
- ✅ 自动提取结果数量（从返回值中提取 total, count, items.length 等）
- ✅ 自动处理异常并记录错误日志
- ✅ 自动关联请求上下文（trace_id, user_id, request_path 等）
- ✅ 支持类方法和实例方法

**实现要点**：
```javascript
// 装饰器签名
@autoLog(operationName, options)

// 选项参数
{
  successMessage?: string,      // 自定义成功消息
  errorMessage?: string,        // 自定义错误消息
  logResourceId?: boolean,      // 是否记录资源ID（默认：true）
  logResultCount?: boolean,     // 是否记录结果数量（默认：false）
  logLevel?: string,            // 成功日志级别（默认："INFO"）
  skipException?: boolean        // 是否跳过异常记录（默认：false）
}
```

**验收标准**：
- [ ] 装饰器可以正确包装异步函数
- [ ] 自动提取资源ID功能正常
- [ ] 自动提取结果数量功能正常
- [ ] 异常处理正确
- [ ] 日志格式符合规范
- [ ] 单元测试通过

#### 步骤 1.2: 编写单元测试

**文件**: `frontend/src/shared/utils/__tests__/decorators.test.js`

**测试用例**：
- ✅ 装饰器基本功能测试
- ✅ 资源ID提取测试
- ✅ 结果数量提取测试
- ✅ 异常处理测试
- ✅ 参数配置测试
- ✅ 边界情况测试

**验收标准**：
- [ ] 测试覆盖率 > 80%
- [ ] 所有测试用例通过

#### 步骤 1.3: 更新文档

**文件**: `docs/FRONTEND_LOGGING_GUIDE.md`

**更新内容**：
- ✅ 添加装饰器使用示例
- ✅ 更新服务层日志记录标准章节
- ✅ 添加装饰器 vs 手动调用对比

**验收标准**：
- [ ] 文档示例代码可运行
- [ ] 文档内容准确完整

### 阶段二：P0 优先级服务改造（2-3天）

#### 步骤 2.1: 改造认证服务（auth.service.js）

**改造内容**：
- ✅ `login()` - 使用 `@autoLog('login', { logResourceId: true })`
- ✅ `adminLogin()` - 使用 `@autoLog('admin_login', { logResourceId: true })`
- ✅ `logout()` - 使用 `@autoLog('logout')`
- ✅ `refreshToken()` - 使用 `@autoLog('refresh_token')`
- ✅ `register()` - 使用 `@autoLog('register', { logResourceId: true })`
- ✅ `requestPasswordReset()` - 使用 `@autoLog('request_password_reset')`
- ✅ `resetPassword()` - 使用 `@autoLog('reset_password')`
- ✅ `verifyEmail()` - 使用 `@autoLog('verify_email')`
- ✅ 其他认证相关方法

**改造策略**：
1. 逐个方法改造，保留原有业务逻辑
2. 移除手动日志调用代码
3. 保留必要的异常处理（如果需要特殊上下文）
4. 测试每个改造后的方法

**验收标准**：
- [ ] 所有方法改造完成
- [ ] 功能测试通过
- [ ] 日志记录正常
- [ ] 代码审查通过

#### 步骤 2.2: 改造会员服务（member.service.js）

**改造内容**：
- ✅ `getProfile()` - 使用 `@autoLog('get_member_profile', { logResourceId: true })`
- ✅ `verifyCompany()` - 使用 `@autoLog('verify_company')`
- ✅ `updateProfile()` - 使用 `@autoLog('update_member_profile', { logResourceId: true })`
- ✅ `changePassword()` - 使用 `@autoLog('change_password')`
- ✅ 其他会员相关方法

**验收标准**：
- [ ] 所有方法改造完成
- [ ] 功能测试通过
- [ ] 日志记录正常
- [ ] 代码审查通过

### 阶段三：P1 优先级服务改造（3-4天）

#### 步骤 3.1: 改造管理员服务（admin.service.js）

**改造内容**：
- ✅ 所有 CRUD 操作使用装饰器
- ✅ 列表查询使用 `logResultCount: true`
- ✅ 创建/更新/删除使用 `logResourceId: true`
- ✅ 复杂业务逻辑保留手动调用（可选）

**验收标准**：
- [ ] 所有标准操作改造完成
- [ ] 功能测试通过
- [ ] 日志记录正常

#### 步骤 3.2: 改造内容管理服务（content.service.js）

**改造内容**：
- ✅ 新闻管理相关方法
- ✅ 公告管理相关方法
- ✅ 横幅管理相关方法
- ✅ 系统信息管理相关方法

**验收标准**：
- [ ] 所有方法改造完成
- [ ] 功能测试通过
- [ ] 日志记录正常

#### 步骤 3.3: 改造绩效管理服务（performance.service.js）

**改造内容**：
- ✅ 绩效数据查询
- ✅ 绩效数据提交
- ✅ 绩效数据更新

**验收标准**：
- [ ] 所有方法改造完成
- [ ] 功能测试通过
- [ ] 日志记录正常

#### 步骤 3.4: 改造项目管理服务（project.service.js）

**改造内容**：
- ✅ 项目列表查询
- ✅ 项目详情查询
- ✅ 项目创建/更新/删除

**验收标准**：
- [ ] 所有方法改造完成
- [ ] 功能测试通过
- [ ] 日志记录正常

### 阶段四：P2 优先级服务改造（1天）

#### 步骤 4.1: 改造支持服务（support.service.js）

**改造内容**：
- ✅ 支持请求相关方法

**验收标准**：
- [ ] 所有方法改造完成
- [ ] 功能测试通过

#### 步骤 4.2: 改造文件上传服务（upload.service.js）

**改造内容**：
- ✅ 文件上传相关方法

**验收标准**：
- [ ] 所有方法改造完成
- [ ] 功能测试通过

### 阶段五：测试和优化（2-3天）

#### 步骤 5.1: 端到端测试

**测试内容**：
- ✅ 所有改造后的服务功能测试
- ✅ 日志记录完整性测试
- ✅ 异常处理测试
- ✅ 性能测试（确保装饰器不影响性能）

**测试文件**: `backend/scripts/e2e_test_all_modules.py`（如需要）

**验收标准**：
- [ ] 所有功能测试通过
- [ ] 日志记录正常
- [ ] 性能无明显下降

#### 步骤 5.2: 代码审查和优化

**审查内容**：
- ✅ 代码风格统一
- ✅ 装饰器使用规范
- ✅ 日志格式统一
- ✅ 异常处理合理

**验收标准**：
- [ ] 代码审查通过
- [ ] 无明显的代码质量问题

#### 步骤 5.3: 文档更新

**更新内容**：
- ✅ 更新 `FRONTEND_LOGGING_GUIDE.md`
- ✅ 更新项目 README（如需要）
- ✅ 添加改造总结文档

**验收标准**：
- [ ] 文档更新完成
- [ ] 文档内容准确

---

## 📐 四、改造模板

### 4.1 创建操作模板

**改造前**：
```javascript
async createMember(data) {
  try {
    loggerService.info('Create member attempt', {
      module: 'MemberService',
      function: 'createMember',
      request_path: '/api/v1/members'
    });

    const response = await apiService.post('/api/v1/members', data);
    
    loggerService.info('Create member successful', {
      module: 'MemberService',
      function: 'createMember',
      user_id: response.id,
      response_status: 200
    });
    
    return response;
  } catch (error) {
    loggerService.error('Create member failed', {
      module: 'MemberService',
      function: 'createMember',
      request_path: '/api/v1/members',
      error_message: error.message,
      error_code: error.code
    });
    
    exceptionService.recordException(error, {
      request_method: 'POST',
      request_path: '/api/v1/members',
      error_code: error.code || 'CREATE_MEMBER_FAILED'
    });
    
    throw error;
  }
}
```

**改造后**：
```javascript
@autoLog('create_member', { logResourceId: true })
async createMember(data) {
  const response = await apiService.post('/api/v1/members', data);
  return response;
  // 装饰器自动记录：成功日志（包含 member.id）+ 失败日志
}
```

### 4.2 列表查询模板

**改造前**：
```javascript
async listMembers(params = {}) {
  try {
    loggerService.info('List members', {
      module: 'MemberService',
      function: 'listMembers',
      request_path: '/api/v1/members'
    });

    const response = await apiService.get('/api/v1/members', { params });
    
    loggerService.info('List members successful', {
      module: 'MemberService',
      function: 'listMembers',
      response_status: 200,
      result_count: response.items?.length || 0
    });
    
    return response;
  } catch (error) {
    loggerService.error('List members failed', {
      module: 'MemberService',
      function: 'listMembers',
      request_path: '/api/v1/members',
      error_message: error.message
    });
    
    throw error;
  }
}
```

**改造后**：
```javascript
@autoLog('list_members', { logResultCount: true })
async listMembers(params = {}) {
  const response = await apiService.get('/api/v1/members', { params });
  return response;
  // 装饰器自动记录：成功日志（包含 total 数量）+ 失败日志
}
```

### 4.3 更新操作模板

**改造前**：
```javascript
async updateMember(id, data) {
  try {
    loggerService.info('Update member attempt', {
      module: 'MemberService',
      function: 'updateMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id
    });

    const response = await apiService.put(`/api/v1/members/${id}`, data);
    
    loggerService.info('Update member successful', {
      module: 'MemberService',
      function: 'updateMember',
      member_id: id,
      response_status: 200
    });
    
    return response;
  } catch (error) {
    loggerService.error('Update member failed', {
      module: 'MemberService',
      function: 'updateMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id,
      error_message: error.message
    });
    
    exceptionService.recordException(error, {
      request_method: 'PUT',
      request_path: `/api/v1/members/${id}`,
      error_code: error.code || 'UPDATE_MEMBER_FAILED'
    });
    
    throw error;
  }
}
```

**改造后**：
```javascript
@autoLog('update_member', {
  successMessage: 'Member updated successfully',
  logResourceId: true
})
async updateMember(id, data) {
  const response = await apiService.put(`/api/v1/members/${id}`, data);
  return response;
  // 装饰器自动记录：成功日志（自定义消息 + member.id）+ 失败日志
}
```

### 4.4 删除操作模板

**改造前**：
```javascript
async deleteMember(id) {
  try {
    loggerService.info('Delete member attempt', {
      module: 'MemberService',
      function: 'deleteMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id
    });

    await apiService.delete(`/api/v1/members/${id}`);
    
    loggerService.info('Delete member successful', {
      module: 'MemberService',
      function: 'deleteMember',
      member_id: id,
      response_status: 200
    });
  } catch (error) {
    loggerService.error('Delete member failed', {
      module: 'MemberService',
      function: 'deleteMember',
      request_path: `/api/v1/members/${id}`,
      member_id: id,
      error_message: error.message
    });
    
    exceptionService.recordException(error, {
      request_method: 'DELETE',
      request_path: `/api/v1/members/${id}`,
      error_code: error.code || 'DELETE_MEMBER_FAILED'
    });
    
    throw error;
  }
}
```

**改造后**：
```javascript
@autoLog('delete_member', { logResourceId: true })
async deleteMember(id) {
  await apiService.delete(`/api/v1/members/${id}`);
  // 装饰器自动记录：成功日志（包含 member_id）+ 失败日志
}
```

### 4.5 复杂业务逻辑模板

**对于复杂业务逻辑，可以保留手动调用或混合使用**：

```javascript
@autoLog('approve_member', { logResourceId: true })
async approveMember(id, data) {
  try {
    // 业务逻辑
    const response = await apiService.put(`/api/v1/members/${id}/approve`, data);
    
    // 如果需要额外的业务日志
    if (response.status === 'approved') {
      loggerService.info('Member approval workflow completed', {
        module: 'MemberService',
        function: 'approveMember',
        member_id: id,
        approval_date: response.approval_date
      });
    }
    
    return response;
  } catch (error) {
    // 装饰器会自动记录错误日志
    // 如果需要额外的错误处理，可以在这里添加
    throw error;
  }
}
```

---

## ⚠️ 五、风险和注意事项

### 5.1 技术风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| 装饰器兼容性问题 | 中 | 低 | 充分测试，确保支持所有浏览器 |
| 性能影响 | 低 | 低 | 性能测试，确保无明显性能下降 |
| 日志格式不一致 | 中 | 中 | 统一测试，确保日志格式一致 |
| 异常处理遗漏 | 高 | 中 | 代码审查，确保异常处理正确 |

### 5.2 业务风险

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| 日志丢失 | 高 | 低 | 充分测试，确保所有日志正常记录 |
| 功能回归 | 高 | 中 | 完整的端到端测试 |
| 用户体验影响 | 低 | 低 | 日志记录是异步的，不影响用户体验 |

### 5.3 注意事项

1. **保持向后兼容**：
   - 确保改造后的代码功能不变
   - 确保日志格式与现有格式兼容
   - 确保异常处理逻辑不变

2. **逐步改造**：
   - 不要一次性改造所有服务
   - 按优先级逐步改造
   - 每个阶段完成后进行测试

3. **充分测试**：
   - 每个服务改造后立即测试
   - 确保功能正常
   - 确保日志记录正常

4. **代码审查**：
   - 每个阶段完成后进行代码审查
   - 确保代码质量
   - 确保装饰器使用规范

5. **文档更新**：
   - 及时更新文档
   - 确保文档准确
   - 添加使用示例

---

## 📊 六、验收标准

### 6.1 功能验收

- [ ] 所有服务功能正常
- [ ] 所有日志正常记录
- [ ] 异常处理正确
- [ ] 性能无明显下降

### 6.2 代码质量验收

- [ ] 代码风格统一
- [ ] 装饰器使用规范
- [ ] 无明显的代码质量问题
- [ ] 代码审查通过

### 6.3 文档验收

- [ ] 文档更新完成
- [ ] 文档内容准确
- [ ] 使用示例可运行

### 6.4 测试验收

- [ ] 单元测试通过
- [ ] 功能测试通过
- [ ] 端到端测试通过
- [ ] 日志记录测试通过

---

## 📅 七、时间计划

### 第1周：基础设施准备 + P0 优先级改造

- **Day 1-2**: 创建装饰器工具、编写测试、更新文档
- **Day 3-4**: 改造认证服务（auth.service.js）
- **Day 5**: 改造会员服务（member.service.js）+ 测试

### 第2周：P1 优先级改造

- **Day 1-2**: 改造管理员服务（admin.service.js）
- **Day 3**: 改造内容管理服务（content.service.js）
- **Day 4**: 改造绩效管理服务（performance.service.js）
- **Day 5**: 改造项目管理服务（project.service.js）

### 第3周：P2 优先级改造 + 组件日志 Hook 开发

- **Day 1**: 改造支持服务和文件上传服务
- **Day 2-3**: 创建组件日志 Hook（useLogLayout, useLogStyle）
- **Day 4**: 编写组件日志 Hook 测试
- **Day 5**: 在关键组件中应用日志 Hook（P0 优先级）

### 第4周：组件日志应用 + 测试优化

- **Day 1-2**: 在更多组件中应用日志 Hook（P1 优先级）
- **Day 3**: 端到端测试（服务层 + 组件层）
- **Day 4**: 代码审查和优化
- **Day 5**: 文档更新和总结

**总计**: 约 20 个工作日（4 周）

---

## 📝 八、改造检查清单

### 阶段一：基础设施准备

- [ ] 创建 `frontend/src/shared/utils/decorators.js`
- [ ] 实现 `@autoLog` 装饰器
- [ ] 编写单元测试
- [ ] 测试通过
- [ ] 更新文档

### 阶段二：P0 优先级改造

- [ ] 改造 `auth.service.js`
- [ ] 改造 `member.service.js`
- [ ] 功能测试通过
- [ ] 日志记录测试通过

### 阶段三：P1 优先级改造

- [ ] 改造 `admin.service.js`
- [ ] 改造 `content.service.js`
- [ ] 改造 `performance.service.js`
- [ ] 改造 `project.service.js`
- [ ] 功能测试通过

### 阶段四：P2 优先级改造

- [ ] 改造 `support.service.js`
- [ ] 改造 `upload.service.js`
- [ ] 功能测试通过

### 阶段五：组件日志 Hook 开发

- [x] 创建 `useLogLayout.js`（布局问题检测）
- [x] 创建 `useLogStyle.js`（样式快照，用于自动调整风格）
- [ ] 编写单元测试（可选）
- [ ] 测试通过（可选）

### 阶段六：组件日志应用

- [ ] 在 P0 优先级组件中应用日志 Hook
- [ ] 在 P1 优先级组件中应用日志 Hook
- [ ] 功能测试通过
- [ ] 布局问题检测正常

### 阶段七：测试和优化

- [ ] 端到端测试通过（服务层 + 组件层）
- [ ] 性能测试通过
- [ ] 代码审查通过
- [ ] 文档更新完成

---

## 🔗 九、组件日志和 CSS 日志处理方案

### 9.1 组件日志处理原则

组件级别的日志与服务层日志不同，专注于**样式和布局**信息，用于自动调整响应式布局和风格：

| 日志类型 | 记录内容 | 记录时机 | 用途 |
|---------|---------|---------|------|
| **布局问题日志** | 溢出、重叠、尺寸异常 | 问题发生时 | 响应式布局问题检测、CSS 优化 |
| **样式快照日志** | 颜色、字体、间距、边框、阴影、设计令牌 | 组件挂载、断点变化时 | 自动调整风格（韩国政府风格、现代 GPT 风格等） |

### 9.2 组件日志 Hook 设计

我们只保留两个核心 Hook，专注于样式和布局信息收集，用于自动调整响应式布局和风格：

#### 9.2.1 useLogLayout - 布局问题检测（重点）

**文件**: `frontend/src/shared/hooks/useLogLayout.js`

**功能**：
- 使用 ResizeObserver 自动检测元素尺寸变化
- 检测布局问题（溢出、重叠、尺寸异常）
- 仅在检测到问题时记录日志（不记录正常变化）
- 轻量级实现，对性能影响最小

**使用示例**：
```javascript
import { useLogLayout } from '@shared/hooks';

function ResponsiveCard() {
  const cardRef = useRef(null);
  
  // 检测布局问题
  useLogLayout('ResponsiveCard', {
    element_ref: cardRef,
    detect_overflow: true,      // 检测溢出
    detect_overlap: true,       // 检测重叠
    detect_size_anomalies: true, // 检测尺寸异常
    threshold: {
      overflow: 10,            // 溢出阈值（像素）
      overlap: 5               // 重叠阈值（像素）
    }
  });
  
  return (
    <div ref={cardRef} className="card">
      {/* 组件内容 */}
    </div>
  );
}
```

**布局日志数据结构**（仅在检测到问题时记录）：

**日志名称**: `layout_issue`（统一使用此名称，便于后端识别和 AI 分析）

**完整日志结构**：
```javascript
{
  "source": "frontend",
  "level": "WARNING",
  "message": "Layout issue detected: ResponsiveCard overflow",
  "module": "ResponsiveCard",
  "function": "useLogLayout",
  "trace_id": "1701504045123-abc123def",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "layout_issue": {
    // 问题基本信息
    "issue_type": "overflow" | "overlap" | "size_anomaly" | "responsive_breakpoint_issue",
    "severity": "low" | "medium" | "high",
    "component_name": "ResponsiveCard",
    "element_selector": ".card",
    "element_id": "card-123",  // 如果有 ID
    "element_classes": ["card", "responsive"],  // 所有类名
    
    // 问题详情
    "issue_details": {
      // 溢出问题
      "overflow_x": 15,        // 水平溢出像素（仅 overflow 类型）
      "overflow_y": 0,         // 垂直溢出像素（仅 overflow 类型）
      "overflow_direction": "horizontal" | "vertical" | "both",
      
      // 重叠问题
      "overlap_area": 120,     // 重叠面积（像素²，仅 overlap 类型）
      "overlap_with": ".other-element",  // 与哪个元素重叠
      
      // 尺寸异常
      "size_ratio": 2.5,       // 尺寸比例（仅 size_anomaly 类型）
      "expected_size": { "width": 100, "height": 50 },
      "actual_size": { "width": 250, "height": 125 }
    },
    
    // 布局信息
    "layout_info": {
      "offset_width": 1039,
      "offset_height": 600,
      "client_width": 1024,
      "client_height": 600,
      "scroll_width": 1039,
      "scroll_height": 600,
      "offset_left": 0,
      "offset_top": 0,
      "computed_style": {
        "width": "100%",
        "height": "auto",
        "display": "flex",
        "flex_direction": "column",
        "overflow": "visible",
        "position": "relative"
      }
    },
    
    // 视口和响应式信息
    "viewport": {
      "width": 1024,
      "height": 768,
      "device_pixel_ratio": 2,
      "orientation": "landscape" | "portrait"
    },
    "responsive_breakpoint": "tablet",  // mobile | tablet | desktop
    "breakpoint_ranges": {
      "mobile": "< 768px",
      "tablet": "768px - 1024px",
      "desktop": "> 1024px"
    },
    
    // CSS 相关信息（用于 AI 分析）
    "css_context": {
      "parent_element": ".container",
      "parent_classes": ["container", "fluid"],
      "sibling_elements": [".card-header", ".card-body"],
      "media_queries": [
        "@media (max-width: 768px) { .card { width: 100%; } }"
      ],
      "related_css_rules": [
        ".card { width: 100%; max-width: 1200px; }",
        ".card.responsive { flex-direction: column; }"
      ]
    },
    
    // 上下文信息
    "page_context": {
      "url": "https://example.com/member/projects",
      "route": "/member/projects",
      "page_title": "Projects",
      "user_role": "member"
    },
    
    "timestamp": "2025-12-02T10:30:00.000Z"
  },
  "extra_data": {
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "browser": "Chrome",
    "browser_version": "120.0.0.0",
    "os": "Windows",
    "screen_resolution": "1920x1080",
    "window_size": "1024x768"
  }
}
```

**关键字段说明**：

| 字段 | 说明 | 用途 |
|------|------|------|
| `layout_issue.issue_type` | 问题类型 | AI 分析时分类问题 |
| `layout_issue.severity` | 严重程度 | 优先级排序 |
| `layout_issue.component_name` | 组件名 | 定位问题组件 |
| `layout_issue.element_selector` | 元素选择器 | 定位问题元素 |
| `layout_issue.issue_details` | 问题详情 | 具体问题数据 |
| `layout_issue.layout_info` | 布局信息 | 元素尺寸和位置 |
| `layout_issue.viewport` | 视口信息 | 响应式问题分析 |
| `layout_issue.responsive_breakpoint` | 响应式断点 | 识别断点相关问题 |
| `layout_issue.css_context` | CSS 上下文 | AI 分析需要修改的 CSS |
| `layout_issue.page_context` | 页面上下文 | 问题发生的页面 |


#### 9.2.2 useLogStyle - 样式快照（重点）

**文件**: `frontend/src/shared/hooks/useLogStyle.js`

**功能**：
- 记录组件样式信息（颜色、字体、间距、边框、阴影等）
- 记录设计系统信息（korean_gov、modern_gpt、custom 等）
- 记录响应式断点变化时的样式差异
- 提取 CSS 变量（设计令牌）
- 用于 AI 自动调整风格和响应式布局

**使用示例**：
```javascript
import { useLogStyle } from '@shared/hooks';

function ResponsiveCard() {
  const cardRef = useRef(null);
  
  // 记录样式快照（用于自动调整风格）
  useLogStyle('ResponsiveCard', {
    element_ref: cardRef,
    design_system: 'korean_gov', // 或 'modern_gpt', 'custom'
    log_on_mount: true,           // 组件挂载时记录
    log_breakpoint_changes: true, // 断点变化时记录
    style_categories: {
      colors: true,       // 记录颜色信息
      typography: true,   // 记录字体信息
      spacing: true,      // 记录间距信息
      borders: true,      // 记录边框信息
      shadows: true,      // 记录阴影信息
      animations: false,  // 不记录动画（可选）
    }
  });
  
  return (
    <div ref={cardRef} className="card">
      {/* 组件内容 */}
    </div>
  );
}
```

**样式快照数据结构**：
```javascript
{
  "component_name": "ResponsiveCard",
  "design_system": "korean_gov",
  "responsive_breakpoint": "tablet",
  "styles": {
    "colors": {
      "background_color": "rgb(255, 255, 255)",
      "color": "rgb(0, 0, 0)",
      "background_rgb": { "r": 255, "g": 255, "b": 255 }
    },
    "typography": {
      "font_family": "Noto Sans KR, sans-serif",
      "font_size": "16px",
      "font_size_px": 16,
      "line_height": "24px"
    },
    "spacing": {
      "padding_top_px": 16,
      "padding_bottom_px": 16,
      "margin_top_px": 24,
      "gap_px": 8
    },
    "borders": {
      "border_radius_px": 8,
      "border_width_px": 1
    },
    "shadows": {
      "has_box_shadow": true,
      "box_shadow": "0 2px 4px rgba(0,0,0,0.1)"
    }
  },
  "design_tokens": {
    "--primary-color": "#0066cc",
    "--spacing-unit": "8px",
    "--border-radius": "8px"
  }
}
```

### 9.3 布局问题收集和分析方案

#### 9.3.1 布局问题收集（前端）

**目标**：收集布局问题日志，发送到后端存储，用于后续 AI 分析

**收集内容**：
- 溢出问题（水平溢出、垂直溢出）
- 重叠问题（元素重叠）
- 尺寸异常（元素尺寸异常大或小）
- 响应式断点问题（特定断点下的布局问题）
- 视口信息（问题发生时的视口尺寸）
- CSS 上下文（相关 CSS 规则，便于 AI 分析）

**收集策略**：
- ✅ **仅在检测到问题时记录**（不记录正常变化）
- ✅ **使用防抖机制**（避免频繁记录）
- ✅ **采样记录**（相同问题在短时间内只记录一次）
- ✅ **通过 loggerService 发送到后端**（存储在 `app_logs` 表中）

**前端实现**：
```javascript
// useLogLayout Hook 内部实现
import loggerService from '@shared/services/logger.service';

function useLogLayout(componentName, options) {
  const detectIssue = (issueType, details) => {
    // 构建布局日志
    loggerService.warn(`Layout issue detected: ${componentName} ${issueType}`, {
      module: componentName,
      function: 'useLogLayout',
      layout_issue: {
        issue_type: issueType,
        component_name: componentName,
        // ... 其他布局信息
      }
    });
    // loggerService 会自动发送到后端 /api/v1/logging/logs 端点
  };
}
```

#### 9.3.2 布局问题存储（后端）

**存储位置**：后端数据库 `app_logs` 表

**存储方式**：
- 通过现有的日志 API 端点接收：`POST /api/v1/logging/logs`
- 日志数据存储在 `app_logs` 表的 `extra_data` 字段（JSON）
- 使用 `layout_issue` 作为标识，便于查询和过滤

**查询布局问题日志**：
```sql
-- 查询所有布局问题
SELECT * FROM app_logs 
WHERE extra_data->>'layout_issue' IS NOT NULL
ORDER BY created_at DESC;

-- 查询特定类型的布局问题
SELECT * FROM app_logs 
WHERE extra_data->'layout_issue'->>'issue_type' = 'overflow'
ORDER BY created_at DESC;

-- 查询特定组件的布局问题
SELECT * FROM app_logs 
WHERE extra_data->'layout_issue'->>'component_name' = 'ResponsiveCard'
ORDER BY created_at DESC;
```

**导出布局日志**（用于 AI 分析）：
```python
# 后端脚本：导出布局日志
def export_layout_logs(time_range='7d', format='json'):
    """导出布局问题日志，用于 AI 分析"""
    logs = query_layout_logs(time_range)
    return format_logs_for_ai(logs, format)
```

#### 9.3.3 布局问题 AI 分析方案

**目标**：将布局日志导出后传给 AI，自动生成修复方案和响应式检查建议

**工作流程**：

1. **导出布局日志**：
   ```bash
   # 从后端导出布局日志（JSON 格式）
   python scripts/export_layout_logs.py --time-range 7d --format json > layout_issues.json
   ```

2. **AI 分析提示词模板**：
   ```
   你是一个前端 CSS 专家。请分析以下布局问题日志，给出修复方案。
   
   要求：
   1. 识别所有布局问题（溢出、重叠、尺寸异常、响应式问题）
   2. 为每个问题提供具体的 CSS 修复方案
   3. 检查响应式断点问题，给出断点优化建议
   4. 按优先级排序（严重程度 + 频率）
   5. 提供需要检查的组件列表
   
   布局日志数据：
   [粘贴 layout_issues.json 内容]
   
   请以以下格式输出：
   ## 布局问题分析报告
   
   ### 高优先级问题
   1. [组件名] - [问题类型]
      - 问题描述：[描述]
      - 发生频率：[次数]
      - 影响断点：[mobile/tablet/desktop]
      - CSS 修复方案：
        ```css
        [修复代码]
        ```
      - 需要检查的文件：[文件路径]
   
   ### 响应式问题
   [列出所有响应式相关的问题和建议]
   
   ### 需要检查的组件
   - [组件1] - [原因]
   - [组件2] - [原因]
   ```

3. **AI 分析输出示例**：
   ```
   ## 布局问题分析报告
   
   ### 高优先级问题
   1. ResponsiveCard - overflow
      - 问题描述：在 tablet 断点（768px-1024px）下，水平溢出 15px
      - 发生频率：45 次（7天内）
      - 影响断点：tablet
      - CSS 修复方案：
        ```css
        .card {
          width: 100%;
          max-width: 100%;
          overflow-x: auto; /* 或调整容器宽度 */
        }
        
        @media (max-width: 1024px) {
          .card {
            padding: 0 10px; /* 减少内边距 */
          }
        }
        ```
      - 需要检查的文件：
        - frontend/src/shared/components/Card.css
        - frontend/src/member/modules/projects/ProjectList.jsx
   
   2. DataTable - overlap
      - 问题描述：在 mobile 断点下，表格与侧边栏重叠
      - 发生频率：32 次
      - 影响断点：mobile
      - CSS 修复方案：
        ```css
        @media (max-width: 768px) {
          .data-table {
            margin-left: 0;
            width: 100%;
          }
          .sidebar {
            display: none; /* 或改为折叠 */
          }
        }
        ```
   
   ### 响应式问题
   - ResponsiveCard 在 tablet 断点下需要优化
   - DataTable 在 mobile 断点下需要重新布局
   - 建议添加新的断点：@media (max-width: 480px) 用于小屏手机
   
   ### 需要检查的组件
   - ResponsiveCard - 频繁溢出问题
   - DataTable - 移动端布局问题
   - Chart - 尺寸异常问题
   ```

4. **自动化脚本**（可选）：
   ```python
   # scripts/analyze_layout_with_ai.py
   import json
   import openai  # 或其他 AI API
   
   def analyze_layout_issues():
       # 1. 导出布局日志
       logs = export_layout_logs('7d')
       
       # 2. 构建 AI 提示词
       prompt = build_ai_prompt(logs)
       
       # 3. 调用 AI API
       analysis = openai.ChatCompletion.create(
           model="gpt-4",
           messages=[{"role": "user", "content": prompt}]
       )
       
       # 4. 保存分析结果
       with open('layout_analysis_report.md', 'w') as f:
           f.write(analysis.choices[0].message.content)
       
       print("分析报告已保存到 layout_analysis_report.md")
   ```

**AI 分析的关键信息**：

1. **问题分类**：
   - 溢出问题 → 需要调整宽度或添加 overflow
   - 重叠问题 → 需要调整定位或布局
   - 尺寸异常 → 需要检查 CSS 规则
   - 响应式问题 → 需要优化媒体查询

2. **响应式检查**：
   - 识别问题发生的断点
   - 检查是否需要新增断点
   - 检查现有媒体查询是否合理
   - 提供断点优化建议

3. **CSS 修复方案**：
   - 基于 `css_context` 中的 CSS 规则
   - 提供具体的修复代码
   - 考虑响应式兼容性
   - 提供最佳实践建议

### 9.4 组件日志最佳实践

#### ✅ 应该做的

1. **在响应式组件中使用 useLogStyle**：
   ```javascript
   const cardRef = useRef(null);
   useLogStyle('ResponsiveCard', {
     element_ref: cardRef,
     design_system: 'korean_gov', // 明确指定设计系统
     log_breakpoint_changes: true // 记录断点变化
   });
   ```

2. **在关键布局组件中使用 useLogLayout**：
   ```javascript
   const containerRef = useRef(null);
   useLogLayout('MainContainer', {
     element_ref: containerRef,
     detect_overflow: true,  // 检测溢出
     detect_overlap: true    // 检测重叠
   });
   ```

3. **同时使用两个 Hook**（推荐）：
   ```javascript
   function ResponsiveCard() {
     const cardRef = useRef(null);
     
     // 记录样式快照（用于自动调整风格）
     useLogStyle('ResponsiveCard', {
       element_ref: cardRef,
       design_system: 'korean_gov',
       log_breakpoint_changes: true
     });
     
     // 检测布局问题（用于自动修复）
     useLogLayout('ResponsiveCard', {
       element_ref: cardRef,
       detect_overflow: true
     });
     
     return <div ref={cardRef}>...</div>;
   }
   ```

#### ❌ 不应该做的

1. **不要在非响应式组件中使用**：
   ```javascript
   // ❌ 不好的示例（静态组件不需要）
   useLogStyle('StaticText', { element_ref: textRef });
   
   // ✅ 好的示例（只在响应式组件中使用）
   useLogStyle('ResponsiveCard', { element_ref: cardRef });
   ```

2. **不要过度记录**：
   ```javascript
   // ❌ 不好的示例（每个组件都记录）
   useLogStyle('EveryComponent', { element_ref: ref });
   
   // ✅ 好的示例（只在关键组件中使用）
   useLogStyle('MainLayout', { element_ref: layoutRef });
   ```

3. **不要忘记传递 element_ref**：
   ```javascript
   // ❌ 不好的示例（缺少 ref）
   useLogStyle('Card', { design_system: 'korean_gov' });
   
   // ✅ 好的示例（正确传递 ref）
   const cardRef = useRef(null);
   useLogStyle('Card', { element_ref: cardRef, design_system: 'korean_gov' });
   ```

### 9.5 组件日志改造计划

#### 阶段 1: 创建组件日志 Hook（已完成）

- [x] 创建 `useLogLayout.js`（布局问题检测）
- [x] 创建 `useLogStyle.js`（样式快照，用于自动调整风格）
- [ ] 编写单元测试（可选）

#### 阶段 2: 在关键组件中应用（2-3天）

**优先级组件**：
- P0: 登录组件、表单组件、响应式组件
- P1: 列表组件、详情组件、图表组件
- P2: 其他组件

#### 阶段 3: 布局问题分析工具（可选）

- [ ] 创建布局问题分析工具
- [ ] 实现问题统计和报告功能
- [ ] 实现修复建议生成（可选）

### 9.6 布局日志规范总结

#### 9.6.1 日志命名规范

**统一使用**: `layout_issue` 作为日志标识

**原因**：
- 便于后端识别和过滤布局问题日志
- 便于 AI 分析时识别日志类型
- 统一命名，避免混淆

#### 9.6.2 数据结构设计原则

**设计原则**：
- ✅ **仅在检测到问题时记录**（不记录正常变化）
- ✅ **包含完整的上下文信息**（便于 AI 分析）
- ✅ **包含 CSS 上下文**（相关 CSS 规则，便于生成修复方案）
- ✅ **包含响应式信息**（视口、断点，便于响应式问题分析）
- ✅ **使用防抖机制**（避免重复记录相同问题）
- ✅ **通过 loggerService 发送到后端**（统一日志管理）

#### 9.6.3 后端存储和查询

**存储**：
- 存储在 `app_logs` 表的 `extra_data` 字段（JSON）
- 使用 `layout_issue` 字段标识布局问题
- 支持按时间范围、问题类型、组件名查询

**导出格式**：
- JSON 格式（便于 AI 分析）
- 包含所有必要的上下文信息
- 支持按时间范围、组件、问题类型过滤

#### 9.6.4 AI 分析流程

1. **导出日志** → 从后端导出布局问题日志（JSON）
2. **构建提示词** → 使用模板构建 AI 分析提示词
3. **AI 分析** → 传给 AI（GPT-4/Claude 等）进行分析
4. **生成报告** → AI 生成包含修复方案和响应式检查建议的报告
5. **实施修复** → 根据报告修复 CSS 和响应式问题

**AI 分析输出内容**：
- 问题分类和优先级
- 具体的 CSS 修复方案
- 响应式断点优化建议
- 需要检查的组件列表
- 需要修改的文件路径

---

## 🔗 十、相关文档

- [前端日志指南](./FRONTEND_LOGGING_GUIDE.md)
- [后端日志指南](./BACKEND_LOGGING_GUIDE.md)
- [项目架构](./ARCHITECTURE.md)

---

## 📌 十一、改造总结（改造完成后填写）

### 改造统计

- **改造文件数**: ___ / 8
- **改造方法数**: ___ / 183
- **代码减少量**: ___ %
- **改造耗时**: ___ 天

### 改造成果

- ✅ 装饰器工具已实现
- ✅ 所有服务已改造
- ✅ 测试全部通过
- ✅ 文档已更新

### 遇到的问题

1. 
2. 
3. 

### 改进建议

1. 
2. 
3. 

---

**文档维护**: 改造过程中及时更新本文档  
**最后更新**: 2025-12-02

---

## 📝 十二、重要变更记录

### 2025-12-02 更新

#### 组件日志 Hook 简化
- ✅ **保留**: `useLogLayout`（布局问题检测）
- ✅ **保留**: `useLogStyle`（样式快照，用于自动调整风格）
- ❌ **移除**: `useLogInteraction`（用户交互日志）
- ❌ **移除**: `useLogComponentLifecycle`（组件生命周期日志）
- ❌ **移除**: `useLogPerformance`（性能日志）

**原因**: 专注于自动调整响应式布局和风格的需求，简化 Hook 数量，提高可维护性。

#### 拦截器日志优化
- ✅ **移除**: 拦截器中的成功响应日志（由装饰器统一处理）
- ✅ **移除**: 拦截器中的错误日志（由装饰器和全局异常处理统一处理）
- ✅ **移除**: 拦截器中的异常记录（由装饰器和全局异常处理统一处理）
- ✅ **保留**: X-Trace-Id 头传递（用于调用链追踪）
- ✅ **保留**: Token 自动刷新
- ✅ **保留**: 其他基础设施功能

**原因**: 避免重复日志，统一由装饰器处理业务日志，拦截器专注于基础设施功能。

