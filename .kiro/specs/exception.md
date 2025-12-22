# 异常（AOP）方案

## 目录结构

### 前端
```
src/shared/aop/
├── exception/
│   ├── index.js              # 异常模块入口
│   ├── exception.handler.js  # 异常处理核心
│   ├── exception.global.js   # 全局异常捕获
│   ├── exception.service.js  # 异常上报服务
│   └── exception.boundary.jsx # React 错误边界
│
└── hooks/exception/
    ├── useStoreException.js
    ├── useHookException.js
    ├── useComponentException.js
    ├── useAuthException.js
    └── usePerformanceException.js
```

### 后端
```
src/common/modules/exception/
├── __init__.py
├── exceptions.py       # 自定义异常类
├── handlers.py         # 全局异常处理器
├── service.py          # 异常记录服务
├── middleware.py       # 异常中间件
├── schemas.py          # 异常数据模型
└── router.py           # 异常查询 API
```

## 异常格式（通用）

```json
{
  "source": "frontend/backend",
  "level": "ERROR",
  "layer": "Exception",
  "message": "错误消息",
  "file": "文件路径",
  "line": 42,
  "function": "函数名",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_id": "550e8400-e29b-41d4-a716-446655440000-001",
  "user_id": "uuid",
  "created_at": "2023-12-21 14:30:00.123",
  "exception_type": "TypeError",
  "stack_trace": "...",
  "context": {}
}
```

## 单一职责

### 前端

| 文件 | 职责 |
|---|---|
| `exception/index.js` | 异常模块入口 |
| `exception/exception.handler.js` | 异常处理核心 |
| `exception/exception.global.js` | 全局异常捕获 |
| `exception/exception.service.js` | 异常上报服务 |
| `exception/exception.boundary.jsx` | React 错误边界 |
| `hooks/exception/useStoreException.js` | Store 异常 Hook |
| `hooks/exception/useHookException.js` | 自定义 Hook 异常 Hook |
| `hooks/exception/useComponentException.js` | 组件异常 Hook |
| `hooks/exception/useAuthException.js` | 认证异常 Hook |
| `hooks/exception/usePerformanceException.js` | 性能异常 Hook |

### 后端

| 文件 | 职责 |
|---|---|
| `exceptions.py` | 自定义异常类定义 |
| `handlers.py` | 全局异常处理器注册 |
| `service.py` | 异常记录、上报 |
| `middleware.py` | HTTP 异常中间件 |
| `schemas.py` | 异常数据模型 |
| `router.py` | 异常查询 API |
