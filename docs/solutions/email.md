# 邮件方案

## 邮件类型

| 类型 | 触发时机 | 模板 | 发送方式 |
|---|---|---|---|
| 验证邮件 | 用户注册 | `verification.html` | 同步 |
| 密码重置 | 忘记密码请求 | `password_reset.html` | 同步 |
| 审批通过 | 管理员审批会员 | `approval_approved.html` | 异步 |
| 审批拒绝 | 管理员拒绝会员 | `approval_rejected.html` | 异步 |
| 系统通知 | 系统事件 | `notification.html` | 异步 |

## 邮件日志

| 字段 | 类型 | 说明 |
|---|---|---|
| `email_type` | string | 邮件类型 |
| `recipient` | string | 收件人 |
| `subject` | string | 邮件主题 |
| `status` | string | pending/sent/failed |
| `error_message` | string | 失败原因 |
| `sent_at` | timestamp | 发送时间 |
| `trace_id` | string | 追踪 ID |

---

## 目录结构

### 前端
```
src/shared/
├── services/
│   └── email.service.js         # 邮件 API 服务
├── hooks/
│   └── useEmailVerification.js  # 邮件验证 Hook
└── components/
    ├── EmailVerificationForm.jsx  # 验证码输入表单
    └── ResendButton.jsx           # 重发按钮（带倒计时）
```

### 后端
```
src/common/modules/email/
├── __init__.py
├── config.py           # 邮件配置（SMTP、发件人）
├── service.py          # 邮件发送服务
├── templates.py        # 模板加载
├── queue.py            # 异步队列
├── schemas.py          # 数据模型
└── router.py           # API 路由

src/templates/email/
├── base.html           # 基础模板
├── verification.html   # 验证邮件
├── password_reset.html # 密码重置
├── approval_approved.html  # 审批通过
├── approval_rejected.html  # 审批拒绝
└── notification.html   # 系统通知
```

---

## 挂载方式

### 前端

| 场景 | 触发时机 | API |
|---|---|---|
| 注册验证 | 用户注册后 | `POST /api/v1/email/verify` |
| 密码重置 | 点击忘记密码 | `POST /api/v1/email/reset-password` |
| 账号审批通知 | 管理员审批后 | 后端自动触发 |
| 系统通知 | 后端事件触发 | 后端自动触发 |

### 后端

| 场景 | 触发方式 | 发送方式 |
|---|---|---|
| 验证邮件 | API 调用 | 同步发送 |
| 密码重置 | API 调用 | 同步发送 |
| 审批通知 | 审批服务调用 | 异步队列 |
| 系统通知 | 事件触发 | 异步队列 |

---

## 示例

### 前端

#### email.service.js
```javascript
export const emailService = {
  sendVerification(email) {
    return apiService.post('/api/v1/email/verify', { email });
  },
  verifyCode(email, code) {
    return apiService.post('/api/v1/email/verify/confirm', { email, code });
  },
  sendPasswordReset(email) {
    return apiService.post('/api/v1/email/reset-password', { email });
  },
};
```

#### useEmailVerification.js
```javascript
export function useEmailVerification() {
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  
  const sendCode = async (email) => {
    setIsSending(true);
    await emailService.sendVerification(email);
    setCountdown(60);
    setIsSending(false);
  };
  
  return { countdown, isSending, sendCode };
}
```

### 后端

#### service.py
```python
class EmailService:
    def send_verification(self, email: str, code: str):
        template = self.templates.render('verification.html', { 'code': code })
        self._send_sync(email, '验证码', template)
    
    def send_approval_notification(self, email: str, status: str):
        template_name = f'approval_{status}.html'
        template = self.templates.render(template_name, {})
        self.queue.enqueue(email, '审批结果通知', template)
```

#### router.py
```python
@router.post("/verify")
async def send_verification(email: str):
    code = generate_code()
    await email_service.send_verification(email, code)
    return {"message": "验证码已发送"}

@router.post("/verify/confirm")
async def verify_code(email: str, code: str):
    if not verify_code_valid(email, code):
        raise ValidationError("验证码错误")
    return {"message": "验证成功"}
```

---

## 现状

### 前端

| 能力 | 状态 | 说明 |
|---|---|---|
| 发送验证邮件 | ✅ | 注册流程已实现 |
| 验证码输入 | ✅ | 表单组件已实现 |
| 重发倒计时 | ✅ | 60秒倒计时 |
| 密码重置 | ❌ | 未实现 |

### 后端

| 能力 | 状态 | 说明 |
|---|---|---|
| SMTP 发送 | ✅ | 已配置 |
| 模板渲染 | ✅ | Jinja2 模板 |
| 异步队列 | ❌ | 未实现 |
| 邮件日志 | ⚠️ | 仅控制台日志 |

---

## 迁移计划

### 阶段一：完善邮件功能（Week 1）

| 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|
| 实现密码重置邮件 | P0 | - | ❌ |
| 实现异步邮件队列 | P1 | - | ❌ |
| 邮件日志写入数据库 | P1 | 日志方案 | ❌ |

### 回滚策略

| 场景 | 回滚方式 |
|---|---|
| 异步队列异常 | 切回同步发送 |
| 模板渲染异常 | 使用纯文本邮件 |

---

## 附录

### 单一职责

#### 前端

| 文件 | 职责 |
|---|---|
| `services/email.service.js` | 邮件 API 调用 |
| `hooks/useEmailVerification.js` | 邮件验证状态管理 |
| `components/EmailVerificationForm.jsx` | 验证码输入 UI |
| `components/ResendButton.jsx` | 重发按钮 UI |

#### 后端

| 文件 | 职责 |
|---|---|
| `email/config.py` | 邮件配置 |
| `email/service.py` | 邮件发送 |
| `email/templates.py` | 模板渲染 |
| `email/queue.py` | 异步队列 |
| `email/schemas.py` | 数据模型 |
| `email/router.py` | API 路由 |
| `templates/email/base.html` | 基础模板 |
| `templates/email/verification.html` | 验证邮件模板 |
| `templates/email/password_reset.html` | 密码重置模板 |
| `templates/email/approval_approved.html` | 审批通过模板 |
| `templates/email/approval_rejected.html` | 审批拒绝模板 |
| `templates/email/notification.html` | 系统通知模板 |

### 发送方式

| 方式 | 说明 | 使用场景 |
|---|---|---|
| 同步发送 | 立即发送，等待结果 | 验证邮件（需要即时反馈） |
| 异步队列 | 放入队列，后台发送 | 批量通知、非紧急邮件 |
