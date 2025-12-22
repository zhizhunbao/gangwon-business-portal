# Implementation Plan

## Phase 1: 后端基础设施

- [x] 1. 实现 HTTP 日志中间件





  - [x] 1.1 创建 `middleware.py` 实现 HTTP 请求/响应日志记录


    - 提取或生成 traceId 和 requestId
    - 记录请求方法、路径、IP 地址
    - 记录响应状态码和耗时
    - 慢请求（>1s）记录 WARNING 级别
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 1.2 编写属性测试：HTTP Middleware Request Logging
    - **Property 14: HTTP Middleware Request Logging**
    - **Validates: Requirements 6.1**
  - [ ]* 1.3 编写属性测试：HTTP Middleware Response Logging
    - **Property 15: HTTP Middleware Response Logging**
    - **Validates: Requirements 6.2**
  - [ ]* 1.4 编写属性测试：Slow HTTP Request Warning
    - **Property 16: Slow HTTP Request Warning**
    - **Validates: Requirements 6.3**


  - [x] 1.5 在 `main.py` 中注册中间件





    - _Requirements: 6.1_

- [x] 2. 实现 requestId 生成与传递




  - [x] 2.1 更新 `request.py` 添加 requestId 生成逻辑


    - 格式: `{traceId}-{sequence}`
    - 从请求头提取或自动生成
    - _Requirements: 2.2, 2.5, 2.6_
  - [ ]* 2.2 编写属性测试：RequestId Format Validity
    - **Property 4: RequestId Format Validity**
    - **Validates: Requirements 2.2**
  - [ ]* 2.3 编写属性测试：Backend TraceId Extraction or Generation
    - **Property 6: Backend TraceId Extraction or Generation**
    - **Validates: Requirements 2.5, 2.6**

- [x] 3. Checkpoint - 确保所有测试通过


  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: 后端 AOP 封装




- [x] 4. 实现 LoggedSupabaseClient AOP 封装
  - [x] 4.1 创建 `LoggedSupabaseClient` 类
    - 封装原生 Supabase Client
    - 返回 `LoggedTable` 对象
    - _Requirements: 7.1, 7.2, 7.3_
    - **注意：功能已集成到 UnifiedSupabaseClient 中**
  - [x] 4.2 实现 `LoggedTable` 类
    - 封装 insert/update/delete 操作
    - 返回 `LoggedQuery` 对象
    - _Requirements: 7.1, 7.2, 7.3_
    - **注意：功能已集成到 UnifiedSupabaseClient 中**
  - [x] 4.3 实现 `LoggedQuery` 类
    - execute 时自动记录日志
    - 记录表名、操作类型、耗时
    - 慢查询（>500ms）记录 WARNING 级别
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
    - **注意：功能已集成到 UnifiedSupabaseClient 中**
  - [x]* 4.4 编写属性测试：Database Operation Logging

    - **Property 17: Database Operation Logging**
    - **Validates: Requirements 7.1, 7.2, 7.3**




  - [-]* 4.5 编写属性测试：Slow Database Query Warning

    - **Property 18: Slow Database Query Warning**

    - **Validates: Requirements 7.4**

- [x] 5. 替换现有 Supabase Client 调用
  - [x] 5.1 更新 `supabase/client.py` 导出 LoggedSupabaseClient
    - 保持向后兼容
    - _Requirements: 7.1_
    - **注意：现在导出 UnifiedSupabaseClient，LoggedSupabaseClient 作为别名**
  - [x] 5.2 更新业务模块使用 LoggedSupabaseClient
    - _Requirements: 7.1_
    - **注意：现在使用 UnifiedSupabaseClient**

- [ ] 6. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: 前端日志核心

- [x] 7. 重构前端日志核心模块

  - [x] 7.1 创建 `logger.core.js` 日志核心



    - 实现日志级别（DEBUG=10, INFO=20, WARNING=30, ERROR=40, CRITICAL=50）
    - 实现日志格式化（JSON，时间戳格式 yyyy-MM-dd HH:mm:ss.SSS）
    - 实现必填字段验证
    - _Requirements: 1.1, 1.3-1.8_
  - [ ]* 7.2 编写属性测试：Log Entry Required Fields Completeness
    - **Property 1: Log Entry Required Fields Completeness**
    - **Validates: Requirements 1.1**
  - [x]* 7.3 编写属性测试：Log Entry JSON Serialization Round-Trip

    - **Property 2: Log Entry JSON Serialization Round-Trip**
    - **Validates: Requirements 1.8**




- [x] 8. 实现上下文管理器



  - [ ] 8.1 创建 `logger.context.js` 上下文管理
    - 实现 traceId 生成（UUID v4）

    - 实现 requestId 生成（{traceId}-{sequence}）
    - 管理 userId
    - _Requirements: 2.1, 2.2_



  - [ ]* 8.2 编写属性测试：TraceId UUID v4 Format Validity
    - **Property 3: TraceId UUID v4 Format Validity**


    - **Validates: Requirements 2.1**


- [ ] 9. 实现去重机制
  - [x] 9.1 创建 `logger.dedup.js` 去重模块



    - 10 秒时间窗口内相同日志不重复记录
    - 定期清理过期记录
    - _Requirements: 5.4_
  - [ ]* 9.2 编写属性测试：Deduplication Within Window
    - **Property 12: Deduplication Within Window**




    - **Validates: Requirements 5.4**


- [ ] 10. 实现日志传输
  - [-] 10.1 创建 `logger.transport.js` 传输模块

    - 批量上报（10 条/批 或 5 秒/批）
    - 失败重试（3 次，指数退避 1s/2s/4s）
    - 敏感信息过滤
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [ ]* 10.2 编写属性测试：Batch Transport Threshold
    - **Property 11: Batch Transport Threshold**
    - **Validates: Requirements 5.1, 5.2**
  - [ ]* 10.3 编写属性测试：Sensitive Data Filtering
    - **Property 13: Sensitive Data Filtering**
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [ ] 11. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: 前端拦截器

- [x] 12. 重构 API 拦截器


  - [x] 12.1 更新 `api.interceptor.js` 使用新日志核心

    - 记录请求方法、路径、开始时间


    - 记录响应状态、耗时
    - 慢 API（>2s）记录 WARNING 级别
    - 添加 X-Trace-Id 和 X-Request-Id 请求头
    - _Requirements: 3.1, 3.2, 3.3, 2.3, 2.4_
  - [ ]* 12.2 编写属性测试：API Interceptor Request Logging
    - **Property 7: API Interceptor Request Logging**


    - **Validates: Requirements 3.1**
  - [x]* 12.3 编写属性测试：API Interceptor Response Logging


    - **Property 8: API Interceptor Response Logging**


    - **Validates: Requirements 3.2**
  - [ ]* 12.4 编写属性测试：Slow API Warning Threshold
    - **Property 9: Slow API Warning Threshold**

    - **Validates: Requirements 3.3**


  - [ ]* 12.5 编写属性测试：API Request Header Propagation
    - **Property 5: API Request Header Propagation**
    - **Validates: Requirements 2.3, 2.4**

- [x] 13. 更新路由拦截器



  - [x] 13.1 更新 `RouteLogger.jsx` 使用新日志核心

    - 记录路径和导航动作（PUSH, POP, REPLACE）
    - _Requirements: 3.4_
  - [ ]* 13.2 编写属性测试：Route Change Logging
    - **Property 10: Route Change Logging**


    - **Validates: Requirements 3.4**

- [x] 14. 实现认证拦截器

  - [x] 14.1 创建 `auth.interceptor.js` Proxy AOP 代理

    - 拦截 login/logout/register/refreshToken 方法


    - 自动记录认证动作和结果
    - _Requirements: 3.5_
  - [x] 14.2 在 `auth.service.js` 中应用代理

    - _Requirements: 3.5_

- [ ] 15. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.





## Phase 5: 前端日志 Hooks


- [x] 16. 实现 Store 日志 Hook


  - [x] 16.1 创建 `useStoreLog.js` Hook

    - 记录 store 名称和触发变更的 action
    - _Requirements: 4.1_

  - [ ]* 16.2 编写单元测试
    - _Requirements: 4.1_

- [ ] 17. 实现 Hook 日志 Hook
  - [x] 17.1 创建 `useHookLog.js` Hook

    - 记录 hook 名称和执行上下文



    - _Requirements: 4.2_
  - [x]* 17.2 编写单元测试


    - _Requirements: 4.2_

- [ ] 18. 实现组件日志 Hook
  - [x] 18.1 创建 `useComponentLog.js` Hook

    - 记录组件 mount/unmount 事件
    - _Requirements: 4.3, 4.4_
  - [ ]* 18.2 编写单元测试
    - _Requirements: 4.3, 4.4_

- [ ] 19. 完善性能日志 Hook
  - [ ] 19.1 创建/更新 `usePerformanceLog.js` Hook
    - 记录组件渲染耗时
    - 渲染超过 100ms 记录 WARNING
    - 收集 Web Vitals（FCP, LCP, TTI）
    - FCP > 2s, LCP > 2.5s, TTI > 3.8s 记录 WARNING
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.9_
  - [ ]* 19.2 编写单元测试
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.9_

- [ ] 20. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: 后端存储优化

- [ ] 21. 优化文件写入器
  - [ ] 21.1 更新 `file_writer.py` 添加性能日志支持
    - 写入 `performance.log`
    - _Requirements: 9.9_
  - [ ]* 21.2 编写属性测试：File Rotation on Date Change
    - **Property 20: File Rotation on Date Change**
    - **Validates: Requirements 9.2**
  - [ ]* 21.3 编写属性测试：Old File Cleanup
    - **Property 21: Old File Cleanup**
    - **Validates: Requirements 9.4**

- [ ] 22. 优化数据库写入器
  - [ ] 22.1 更新 `db_writer.py` 添加性能日志批处理
    - 50 条/批 或 5 秒/批
    - _Requirements: 10.5_
  - [ ]* 22.2 编写属性测试：Database Batch Write Threshold
    - **Property 22: Database Batch Write Threshold**
    - **Validates: Requirements 10.1**

- [ ] 23. 完善审计日志
  - [x] 23.1 更新审计装饰器确保双写（数据库 + 文件）

    - _Requirements: 8.3_
  - [ ]* 23.2 编写属性测试：Audit Log Completeness
    - **Property 19: Audit Log Completeness**
    - **Validates: Requirements 8.1, 8.2**

- [x] 24. Checkpoint - 确保所有测试通过



  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: 异常处理集成

- [ ] 25. 完善后端异常处理日志
  - [ ] 25.1 更新 `handlers.py` 确保异常日志包含 traceId/requestId
    - _Requirements: 12.1, 12.3_
  - [ ]* 25.2 编写属性测试：Exception Log Correlation
    - **Property 23: Exception Log Correlation**
    - **Validates: Requirements 12.3**

- [ ] 26. 完善前端异常处理日志
  - [ ] 26.1 更新 `ErrorBoundary.jsx` 使用新日志核心
    - 记录组件栈和 traceId
    - _Requirements: 12.2, 12.3_
  - [ ] 26.2 更新 `errorHandler.js` 使用新日志核心
    - _Requirements: 12.2_

- [ ] 27. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
