# 前端验证方案

## 验证类型

| 类型 | 说明 | 示例 |
|---|---|---|
| 表单验证 | 输入格式、必填项 | 邮箱格式、密码强度 |
| 业务验证 | 服务端返回的业务错误 | 密码错误、账号未批准 |
| 权限验证 | 访问控制、会话状态 | 无权限、登录过期 |

## 提示方式

| 方式 | 使用场景 | 特点 |
|---|---|---|
| 字段提示 | 表单输入错误 | 精确定位、实时反馈 |
| Toast | 操作结果、轻量提示 | 自动消失（3秒）、不阻断操作 |
| Modal | 重要提示、需要确认 | 阻断操作、强制关注 |
| Banner | 系统公告、维护通知 | 持续显示、全局可见 |

---

## 目录结构

```
src/shared/
├── validation/
│   ├── index.js              # 验证模块入口
│   ├── rules.js              # 验证规则（内置 + 自定义）
│   ├── messages.js           # 错误消息模板
│   ├── errorCodes.js         # 错误码映射
│   ├── validator.js          # 验证器核心
│   └── hooks/
│       ├── useFormValidation.js   # 表单验证 Hook
│       └── useFieldValidation.js  # 字段验证 Hook
│
└── hooks/
    └── useFeedback.js        # 统一反馈 Hook（封装 toast/modal）
```

---

## 挂载方式

### 验证时机

| 时机 | 说明 | 使用场景 |
|---|---|---|
| 实时验证 | 输入时立即验证 | 格式校验、密码强度 |
| 失焦验证 | 离开字段时验证 | 异步校验（如用户名重复） |
| 提交验证 | 表单提交时验证 | 完整性校验 |
| 服务端验证 | API 返回错误 | 业务逻辑校验 |

### 提示方式选择

| 场景 | 错误码 | 提示方式 |
|---|---|---|
| 密码错误 | `AUTH_INVALID_PASSWORD` | Toast |
| 账号不存在 | `AUTH_USER_NOT_FOUND` | Toast |
| 账号未批准 | `AUTH_USER_PENDING` | Modal |
| 账号被禁用 | `AUTH_USER_DISABLED` | Modal |
| 会话过期 | `AUTH_TOKEN_EXPIRED` | Modal + 跳转 |
| 表单格式错误 | - | 字段提示 |

---

## 示例

### 验证规则
```javascript
// validation/rules.js
export const rules = {
  required: (value) => !!value || '请输入此字段',
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || '请输入有效的邮箱地址',
  phone: (value) => /^1[3-9]\d{9}$/.test(value) || '请输入有效的手机号码',
  min: (min) => (value) => value.length >= min || `至少${min}个字符`,
  max: (max) => (value) => value.length <= max || `最多${max}个字符`,
  password: (value) => {
    if (value.length < 8) return '密码至少8位';
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) return '密码必须包含字母和数字';
    return true;
  },
};
```

### 错误码映射
```javascript
// validation/errorCodes.js
export const errorCodeMessages = {
  AUTH_INVALID_PASSWORD: '密码错误，请重新输入',
  AUTH_USER_NOT_FOUND: '账号不存在，请检查输入',
  AUTH_USER_PENDING: '您的账号正在审核中，请等待管理员批准',
  AUTH_USER_DISABLED: '您的账号已被禁用，请联系管理员',
  AUTH_TOKEN_EXPIRED: '登录已过期，请重新登录',
};

export const feedbackTypes = {
  AUTH_INVALID_PASSWORD: 'toast',
  AUTH_USER_NOT_FOUND: 'toast',
  AUTH_USER_PENDING: 'modal',
  AUTH_USER_DISABLED: 'modal',
  AUTH_TOKEN_EXPIRED: 'modal',
};

export function getErrorMessage(code) {
  return errorCodeMessages[code] || '未知错误，请稍后重试';
}

export function getFeedbackType(code) {
  return feedbackTypes[code] || 'toast';
}
```

### 表单验证 Hook
```javascript
// validation/hooks/useFormValidation.js
export function useFormValidation(schema) {
  const [errors, setErrors] = useState({});
  
  const validate = (data) => {
    const newErrors = {};
    for (const [field, rules] of Object.entries(schema)) {
      for (const rule of rules) {
        const result = rule(data[field]);
        if (result !== true) {
          newErrors[field] = result;
          break;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  return { errors, validate, setErrors };
}
```

### 统一反馈 Hook
```javascript
// hooks/useFeedback.js - 统一反馈入口，封装 UI 库调用
import { message, Modal } from 'antd';  // 或其他 UI 库

export function useFeedback() {
  return {
    toast: {
      success: (msg) => message.success(msg),
      error: (msg) => message.error(msg),
      warning: (msg) => message.warning(msg),
    },
    modal: {
      warning: (opts) => Modal.warning(opts),
      confirm: (opts) => Modal.confirm(opts),
    },
  };
}
```

---

## 现状

| 能力 | 状态 | 文件 | 说明 |
|---|---|---|---|
| 密码强度验证 | ✅ | `validation.js` | `validatePassword()` |
| 密码确认验证 | ✅ | `validation.js` | `passwordsMatch()` |
| 文件验证 | ✅ | `fileValidation.js` | 大小、扩展名、MIME 类型 |
| 表单验证 | ⚠️ | 各组件内 | 无统一验证框架 |
| 错误码映射 | ⚠️ | `LoginModal.jsx` | 仅登录场景，硬编码 |
| Toast 服务 | ❌ | - | 未实现 |
| 统一反馈 Hook | ❌ | - | 未实现 |

---

## 迁移计划

### 阶段一：验证基础设施（Week 1）

| 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|
| 实现 `errorCodes.js` 统一映射 | P0 | - | ❌ |
| 实现 `useFormValidation` Hook | P0 | - | ❌ |
| 实现 Toast 服务 | P0 | - | ❌ |
| 实现 `useFeedback` Hook | P1 | Toast | ❌ |

### 阶段二：组件迁移（Week 2）

| 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|
| 迁移 `LoginModal.jsx` | P0 | 阶段一 | ❌ |
| 迁移其他表单组件 | P1 | 阶段一 | ❌ |
| 删除硬编码错误处理 | P1 | 迁移完成 | ❌ |

### 回滚策略

| 场景 | 回滚方式 |
|---|---|
| 验证 Hook 异常 | 切回组件内验证 |
| Toast 服务异常 | 使用 alert() |

---

## 附录

### 单一职责

| 文件 | 职责 |
|---|---|
| `validation/index.js` | 验证模块入口 |
| `validation/rules.js` | 验证规则定义 |
| `validation/messages.js` | 错误消息模板 |
| `validation/errorCodes.js` | 错误码映射 |
| `validation/validator.js` | 验证逻辑执行 |
| `validation/hooks/useFormValidation.js` | 表单级验证 Hook |
| `validation/hooks/useFieldValidation.js` | 字段级验证 Hook |
| `hooks/useFeedback.js` | 统一反馈入口（封装 toast/modal） |

### 内置验证规则

| 规则 | 说明 | 参数 |
|---|---|---|
| `required` | 必填 | - |
| `email` | 邮箱格式 | - |
| `phone` | 手机号格式 | - |
| `min` | 最小长度/值 | `min: number` |
| `max` | 最大长度/值 | `max: number` |
| `pattern` | 正则匹配 | `pattern: RegExp` |
| `confirm` | 确认匹配 | `field: string` |
| `password` | 密码强度 | - |
