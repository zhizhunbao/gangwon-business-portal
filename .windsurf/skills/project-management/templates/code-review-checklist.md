# 代码审查清单 - {{ReviewType}}

## 📋 审查基本信息

**审查类型**: {{ReviewType}}
**项目名称**: 江原道创业企业绩效管理门户
**分支名称**: {{BranchName}}
**Pull Request**: {{PRNumber}}
**审查者**: {{ReviewerName}}
**提交者**: {{SubmitterName}}
**审查时间**: {{ReviewDate}}
**审查范围**: {{ReviewScope}}

## 🔍 代码质量检查

### ✅ 代码结构和组织
- [ ] **代码结构合理**: 文件和目录结构符合项目规范
- [ ] **命名规范**: 变量、函数、类命名清晰且符合约定
- [ ] **模块化设计**: 代码模块职责单一，耦合度低
- [ ] **代码复用**: 避免重复代码，提取公共逻辑
- [ ] **注释完整**: 关键逻辑有必要的注释说明

### 🎯 功能实现
- [ ] **需求实现**: 完全实现了产品需求
- [ ] **边界条件**: 处理了各种边界情况和异常
- [ ] **数据验证**: 输入数据验证完整
- [ ] **错误处理**: 错误处理机制完善
- [ ] **性能考虑**: 考虑了性能影响

### 🛡️ 安全性检查
- [ ] **输入验证**: 防止SQL注入、XSS等安全漏洞
- [ ] **权限控制**: 实现了适当的权限检查
- [ ] **敏感信息**: 没有硬编码敏感信息
- [ ] **数据加密**: 敏感数据进行了适当加密
- [ ] **API安全**: API接口有适当的安全措施

### 📱 前端特定检查

#### React 组件
- [ ] **组件设计**: 组件职责单一，可复用性好
- [ ] **状态管理**: 状态管理合理，避免不必要的重渲染
- [ ] **Props验证**: PropTypes或TypeScript类型定义完整
- [ ] **生命周期**: 正确使用React Hooks或生命周期方法
- [ ] **性能优化**: 使用了memo、useMemo、useCallback等优化

#### 样式和UI
- [ ] **响应式设计**: 支持不同屏幕尺寸
- [ ] **可访问性**: 符合WCAG可访问性标准
- [ ] **国际化**: 支持多语言，文本使用i18n
- [ ] **样式规范**: 遵循项目CSS/样式约定
- [ ] **用户体验**: 交互体验良好，加载状态明确

#### 状态管理
- [ ] **Zustand使用**: 正确使用Zustand进行状态管理
- [ ] **React Query**: 合理使用React Query处理服务端状态
- [ ] **数据流**: 数据流向清晰，状态更新逻辑正确
- [ ] **缓存策略**: 设置了合适的缓存策略

### 🔧 后端特定检查

#### API设计
- [ ] **RESTful规范**: 遵循RESTful API设计原则
- [ ] **HTTP状态码**: 正确使用HTTP状态码
- [ ] **API文档**: API文档完整且准确
- [ ] **版本控制**: API有适当的版本控制
- [ ] **错误响应**: 错误响应格式统一

#### 数据库操作
- [ ] **SQL优化**: SQL查询高效，避免N+1问题
- [ ] **事务处理**: 正确使用数据库事务
- [ ] **数据一致性**: 保证数据一致性
- [ ] **索引使用**: 合理使用数据库索引
- [ ] **连接管理**: 数据库连接管理正确

#### 业务逻辑
- [ ] **业务规则**: 业务逻辑实现正确
- [ ] **数据验证**: 服务端数据验证完整
- [ ] **异常处理**: 异常处理机制完善
- [ ] **日志记录**: 关键操作有日志记录
- [ ] **性能监控**: 添加了必要的性能监控

## 🧪 测试检查

### 单元测试
- [ ] **测试覆盖**: 关键逻辑有单元测试覆盖
- [ ] **测试质量**: 测试用例设计合理
- [ ] **边界测试**: 包含边界条件测试
- [ ] **Mock使用**: 正确使用Mock对象
- [ ] **断言清晰**: 测试断言清晰明确

### 集成测试
- [ ] **API测试**: API接口有集成测试
- [ ] **数据库测试**: 数据库操作有测试
- [ ] **第三方服务**: 第三方服务集成有测试
- [ ] **端到端测试**: 关键流程有E2E测试

### 测试质量
- [ ] **测试覆盖率**: 达到项目要求的覆盖率
- [ ] **测试维护**: 测试代码可维护性好
- [ ] **测试数据**: 测试数据管理合理
- [ ] **测试环境**: 测试环境配置正确

## 📊 性能检查

### 前端性能
- [ ] **加载性能**: 页面加载时间合理
- [ ] **运行时性能**: 运行时性能良好
- [ ] **内存使用**: 没有内存泄漏
- [ ] **包大小**: 打包大小合理
- [ ] **图片优化**: 图片资源优化

### 后端性能
- [ ] **响应时间**: API响应时间合理
- [ ] **并发处理**: 支持预期的并发量
- [ ] **数据库性能**: 数据库查询性能良好
- [ ] **缓存使用**: 合理使用缓存
- [ ] **资源使用**: 服务器资源使用合理

## 🔧 开发规范

### Git规范
- [ ] **提交信息**: 提交信息格式规范
- [ ] **分支管理**: 分支命名和管理规范
- [ ] **合并策略**: 使用合适的合并策略
- [ ] **冲突解决**: 代码冲突解决干净

### 代码风格
- [ ] **格式化**: 代码格式符合项目规范
- [ ] **Lint检查**: 通过了所有Lint检查
- [ ] **TypeScript**: TypeScript类型定义完整
- [ ] **导入导出**: 模块导入导出规范

### 文档更新
- [ ] **API文档**: 更新了相关API文档
- [ ] **README**: 更新了README文档
- [ ] **变更日志**: 更新了CHANGELOG
- [ ] **技术文档**: 更新了相关技术文档

## 🚨 发现的问题

### 🔴 严重问题 (必须修复)
1. **{{CriticalIssue1}}**
   - **位置**: {{CriticalIssue1Location}}
   - **描述**: {{CriticalIssue1Description}}
   - **建议**: {{CriticalIssue1Suggestion}}
   - **优先级**: P0

2. **{{CriticalIssue2}}**
   - **位置**: {{CriticalIssue2Location}}
   - **描述**: {{CriticalIssue2Description}}
   - **建议**: {{CriticalIssue2Suggestion}}
   - **优先级**: P0

### 🟡 中等问题 (建议修复)
1. **{{MediumIssue1}}**
   - **位置**: {{MediumIssue1Location}}
   - **描述**: {{MediumIssue1Description}}
   - **建议**: {{MediumIssue1Suggestion}}
   - **优先级**: P1

2. **{{MediumIssue2}}**
   - **位置**: {{MediumIssue2Location}}
   - **描述**: {{MediumIssue2Description}}
   - **建议**: {{MediumIssue2Suggestion}}
   - **优先级**: P1

### 🟢 轻微问题 (可选修复)
1. **{{MinorIssue1}}**
   - **位置**: {{MinorIssue1Location}}
   - **描述**: {{MinorIssue1Description}}
   - **建议**: {{MinorIssue1Suggestion}}
   - **优先级**: P2

## ✅ 优秀实践

### 👍 值得表扬的地方
1. **{{GoodPractice1}}**
   - **描述**: {{GoodPractice1Description}}
   - **价值**: {{GoodPractice1Value}}

2. **{{GoodPractice2}}**
   - **描述**: {{GoodPractice2Description}}
   - **价值**: {{GoodPractice2Value}}

3. **{{GoodPractice3}}**
   - **描述**: {{GoodPractice3Description}}
   - **价值**: {{GoodPractice3Value}}

## 📈 审查结果

### 总体评价
- **代码质量**: {{CodeQualityRating}}/10
- **功能完整性**: {{FunctionalityRating}}/10
- **测试覆盖**: {{TestCoverageRating}}/10
- **性能表现**: {{PerformanceRating}}/10
- **安全性**: {{SecurityRating}}/10

### 审查结论
**审查状态**: {{ReviewStatus}}
- [ ] **通过**: 代码质量良好，可以合并
- [ ] **有条件通过**: 修复关键问题后可以合并
- [ ] **不通过**: 需要重大修改，重新审查

### 后续行动
1. **{{Action1}}** - 负责人: {{Action1Owner}} - 截止: {{Action1Deadline}}
2. **{{Action2}}** - 负责人: {{Action2Owner}} - 截止: {{Action2Deadline}}
3. **{{Action3}}** - 负责人: {{Action3Owner}} - 截止: {{Action3Deadline}}

## 📝 审查者反馈

### 总体反馈
{{OverallFeedback}}

### 具体建议
1. {{Suggestion1}}
2. {{Suggestion2}}
3. {{Suggestion3}}

### 学习建议
- {{LearningRecommendation1}}
- {{LearningRecommendation2}}

## 📊 统计信息

- **审查文件数**: {{FilesReviewed}}
- **代码行数**: {{LinesOfCode}}
- **发现问题数**: {{IssuesFound}}
- **修复问题数**: {{IssuesFixed}}
- **审查耗时**: {{ReviewDuration}}

---

**审查完成时间**: {{ReviewCompletionTime}}
**下次跟进**: {{NextFollowup}}
**审查文档**: {{ReviewDocumentationLink}}
