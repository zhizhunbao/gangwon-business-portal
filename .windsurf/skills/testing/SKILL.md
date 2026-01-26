---
name: "testing"
description: "Testing workflow for gangwon-business-portal (Vitest + Playwright + Pytest)"
version: "1.0.0"
author: "Development Team"
tags: ["testing", "vitest", "playwright", "pytest", "e2e", "unit", "integration"]
---

# Testing Skill

## 描述
这个技能专门用于处理江原道创业企业绩效管理门户的测试工作，涵盖前端测试、后端测试和端到端测试。

## 测试架构特点
- **Frontend Testing**: Vitest (单元测试) + Playwright (E2E测试)
- **Backend Testing**: Pytest + pytest-asyncio (异步测试)
- **Test Coverage**: 覆盖率报告和可视化
- **Mock Services**: MSW for API mocking
- **Test Data**: Faker for test data generation

## 使用场景
- 编写单元测试
- 创建集成测试
- 端到端测试开发
- 测试数据生成
- 测试覆盖率分析
- 性能测试
- 可访问性测试

## 测试命令
```bash
# Frontend Tests
npm run test              # 运行 Vitest 单元测试
npm run test:coverage     # 生成覆盖率报告
npm run test:ui           # Vitest UI 界面
npm run test:e2e          # 运行 Playwright E2E 测试
npm run test:e2e:ui       # Playwright UI 界面
npm run test:e2e:headed   # 有头模式运行 E2E 测试

# Backend Tests
pytest                    # 运行所有测试
pytest --cov             # 生成覆盖率报告
pytest -v                # 详细输出
pytest -k "test_name"    # 运行特定测试
```

## 测试结构
```
tests/
├── unit/                 # 单元测试
├── integration/          # 集成测试
├── e2e/                  # 端到端测试
├── fixtures/             # 测试数据
├── mocks/               # Mock 数据
└── utils/               # 测试工具
```

## 包含资源
- 单元测试模板
- 集成测试模板
- E2E测试模板
- 测试数据生成器
- Mock 服务模板
- 测试工具函数

## 调用方式
当任务涉及测试编写、测试执行或测试分析时自动触发。
