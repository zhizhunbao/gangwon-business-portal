---
name: dev-tdd_workflow
description: TDD 工作流专家。专注于江原道企业门户项目，通过测试验证业务流程（如审核、申报）。要求 80%+ 覆盖率。
---

# 测试驱动开发工作流 (江原道企业门户专项)

确保所有代码开发遵循 TDD 原则，具有全面的测试覆盖，特别关注多语言及多端业务逻辑。

## 触发场景

- 编写新功能或特性（如：企业端项目申报、管理端审核）
- 修复 bug 或问题
- 重构现有代码（如：优化 `frontend/src/shared` 下的通用 Service）
- 添加 API 端点
- 创建新组件（React 组件需配套单元测试）

## 前置依赖

> **⚠️ 开始开发前，必须先检查以下 skill：**
>
> 1. **`dev-terminology`** - 确保命名符合项目术语字典
> 2. **`dev-libs_compatibility`** - 添加新依赖时检查兼容性

## 核心原则

### 1. 测试先于代码

始终先写测试，然后实现代码使测试通过。

### 2. 覆盖率要求

- **最低 80% 覆盖率**（单元 + 集成）
- 重点覆盖：多语言解析逻辑、权限校验、表单提交验证。

### 3. 测试类型

#### 单元测试 (Vitest/Pytest)

- 纯逻辑函数（如日期转换、金额格式化）
- React 基础组件（Button, Input, Alert）
- 后端 Service 逻辑

#### 集成测试

- 前端 Service 与 Mock Server (MSW) 的交互
- 后端 API 端点（FastAPI/Flask）
- 数据库 CRUD 操作

## TDD 工作流步骤

### 步骤 1: 生成测试用例

对需求定义的 AC（验收标准）创建全面的测试用例。

#### 后端示例 (Pytest)

```python
# 测试企业入驻申报逻辑
def test_enterprise_application_submission():
    # 1. Arrange: 准备测试数据
    payload = {"name": "Test Enterprise", "tax_id": "123-45-67890"}

    # 2. Act: 调用 Service
    result = enterprise_service.apply(payload)

    # 3. Assert: 验证结果
    assert result.status == "PENDING"
    assert result.enterprise_name == "Test Enterprise"
```

#### 前端示例 (Vitest)

```typescript
// 测试多语言文字切换
describe('LanguageSwitcher', () => {
  it('should display Korean text when ko is selected', () => {
    render(<App />);
    fireEvent.click(screen.getByText('한국어'));
    expect(screen.getByText('공고')).toBeInTheDocument(); // 公告
  });
});
```

### 步骤 2: 运行测试（应失败）

```bash
npm test # 前端
pytest # 后端
```

### 步骤 3: 实现代码

编写最少的代码使测试通过。

### 步骤 4: 再次运行测试并重构

通过后进行代码重构，保持测试绿色。

---

## 最佳实践

1. **Mock 外部依赖**：使用 MSW 拦截前端请求，使用 Mock 模拟后端数据库。
2. **测试多语言**：确保在 `zh` 和 `ko` 环境下，组件加载的都是正确的 i18n key。
3. **隔离性**：每个测试用例应独立，不依赖前一个测试的状态。

---

_本规范由 dev-tdd_workflow skill 为江原道企业门户项目定制生成。_
