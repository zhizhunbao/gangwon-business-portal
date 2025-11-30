# E2E Tests with Playwright

端到端测试使用 Playwright 框架。

## 目录结构

```
e2e/
├── fixtures/          # 测试数据和认证辅助
│   ├── test-data.js  # 测试数据
│   └── auth.js       # 认证 fixtures
├── utils/            # 工具函数
│   └── helpers.js    # 测试辅助函数
├── auth/             # 认证相关测试
│   ├── login.spec.js
│   ├── register.spec.js
│   └── password-reset.spec.js
├── member/           # 会员相关测试
│   ├── member-flow.spec.js
│   └── member-approval.spec.js
├── performance/      # 绩效管理测试
│   ├── performance-entry.spec.js
│   └── performance-approval.spec.js
├── project/          # 项目管理测试
│   ├── project-browse.spec.js
│   └── project-apply.spec.js
├── content/          # 内容管理测试
│   ├── notice.spec.js
│   ├── news.spec.js
│   ├── faq.spec.js
│   └── banner.spec.js
├── support/          # 支持服务测试
│   └── inquiry.spec.js
├── admin/            # 管理员功能测试
│   └── dashboard.spec.js
└── edge-cases/       # 边界和异常测试
    ├── invalid-input.spec.js
    ├── permission.spec.js
    └── file-upload.spec.js
```

## 运行测试

```bash
# 安装 Playwright 浏览器
npx playwright install

# 运行所有测试
npm run test:e2e

# 运行特定模块测试
npx playwright test e2e/auth

# 以 UI 模式运行
npm run test:e2e:ui

# 以有头模式运行（显示浏览器）
npm run test:e2e:headed

# 调试模式
npm run test:e2e:debug

# 查看测试报告
npm run test:e2e:report

# 生成详细测试报告文档（Markdown）
npm run test:e2e:report:generate

# 运行测试并生成报告
npm run test:e2e:full
```

## 测试报告格式

所有测试结果和报告都统一保存在 `test-results/` 目录中：

1. **HTML 报告**（交互式）:
   - 位置: `test-results/html-report/index.html`
   - 查看: `npm run test:e2e:report`
   - 包含完整的测试执行详情、截图、视频等

2. **Markdown 报告**（文档）:
   - 位置: `test-results/test-report.md` (自动生成)
   - 详细报告: `test-results/test-report-detailed.md` (运行 `npm run test:e2e:report:generate`)

3. **JSON 报告**（程序化处理）:
   - 位置: `test-results/results.json`
   - 包含完整的测试执行数据

4. **JUnit XML**（CI/CD 集成）:
   - 位置: `test-results/junit.xml`
   - 用于 CI/CD 系统集成

5. **测试输出**（失败测试的详细信息）:
   - 位置: `test-results/[test-name]/`
   - 包含错误上下文、截图、视频等

## 测试数据

测试使用以下测试账户（由 `generate_test_data.py` 创建）：

- **管理员账户**:
  - Username: `000-00-00000`
  - Password: `password123`

- **测试会员账户**:
  - Business Number: `999-99-99999`
  - Password: `password123`

## 注意事项

1. 运行测试前确保：
   - 后端服务器运行在 `http://localhost:8000`
   - 前端开发服务器运行在 `http://localhost:3000`
   - 测试数据已生成（运行 `python backend/scripts/generate_test_data.py`）

2. 测试会自动启动前端开发服务器（如果未运行）

3. 测试会在多个浏览器中运行（Chromium, Firefox, WebKit）

4. 失败的测试会自动截图和录制视频

## 编写新测试

参考现有测试文件的结构：

```javascript
import { test, expect } from '../fixtures/auth';
import { testUsers } from '../fixtures/test-data';
import { fillForm } from '../utils/helpers';

test.describe('Feature Name', () => {
  test('should do something', async ({ memberPage }) => {
    await memberPage.goto('/member/route');
    // Test implementation
  });
});
```

