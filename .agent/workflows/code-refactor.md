---
description: 系统的代码重构流程 (Refactoring)
---

# Code Refactoring Workflow

本工作流用于指导对现有代码进行重构，无论是小规模的代码清理还是大规模的架构调整。重构的核心原则是：**不改变软件可观察行为的前提下，改善其内部结构。**

## 1. 准备阶段 (Preparation)

在触碰代码之前：

- [ ] **确认测试覆盖**: 运行相关模块的测试，必须全部通过 (Green)。如果没有测试，**必须**参考 `dev-testing_standards` 补充测试后再重构。
- [ ] **代码理解**: 深入理解现有逻辑。如果是架构级重构，请加载 `dev-architecture_refactor` Skill 获取指导。
- [ ] **快照**: 确保 Git 工作区是干净的，或者新建一个 `refactor/` 分支。

## 2. 策略制定 (Strategy)

选择你的重构目标：

- **代码异味清理**: 参考 `project-standards` 中的 "Common Code Smells" (如长函数、重复代码)。
- **架构调整**: 如移动目录、拆分服务。请参考 `dev-architecture_refactor`。
- **性能优化**: 只有在有性能测试数据支持的情况下才进行。

## 3. 执行重构 (Execution)

执行 **小步快跑 (Baby Steps)** 策略：

1.  **做小改动**: 例如提取一个函数、重命名一个变量。
2.  **编译/运行**: 确保代码没有语法错误。
3.  **运行测试**: 立即运行相关测试。如果失败，立即回滚 (Revert) 或修复。
4.  **提交 (Commit)**: `refactor: extract validation logic to service`.

> **⚠️ 警告**: 严禁在重构过程中顺手添加新功能 (Feature) 或修复 Bug。重构就是重构。

## 4. 规范检查 (Standards Check)

验证重构后的代码是否符合项目标准：

- [ ] **文件大小**: 是否成功拆分了 >800 行的文件？
- [ ] **函数大小**: 核心函数是否在 50 行以内？
- [ ] **不可变性**: 是否消除了不必要的 Mutation？
- [ ] **服务层**: Service 逻辑是否纯净（无数据转换）？

## 5. 最终验证 (Final Verification)

- [ ] 运行全量测试套件 (Regression Test)。
- [ ] (可选) 让他人进行 Code Review，或者使用 `dev-code_quality_check` 进行自我审查。
