# JSX 开发原则

## 核心原则

| 原则 | 说明 | 示例 |
|---|---|---|
| 一个组件一个功能 | 组件只做一件事 | `LoginForm` 只处理登录表单 |
| 逻辑与 UI 分离 | 业务逻辑放 Hook，UI 放组件 | `useLogin` + `LoginForm` |
| 状态最小化 | 只存必要状态 | 派生数据用 `useMemo` |
| Props 单向流动 | 数据向下，事件向上 | `onChange` 回调 |

## 组件分层

| 层 | 职责 | 示例 |
|---|---|---|
| Page | 页面容器、路由入口 | `LoginPage.jsx` |
| Container | 业务逻辑、数据获取 | `LoginContainer.jsx` |
| Component | UI 展示、用户交互 | `LoginForm.jsx` |
| UI | 纯展示、无状态 | `Button.jsx`、`Input.jsx` |

---

## 目录结构

```
src/
├── admin/                    # 管理端
│   ├── layouts/              # 布局组件
│   └── modules/              # 功能模块
│
├── member/                   # 会员端
│   ├── layouts/              # 布局组件
│   └── modules/              # 功能模块
│
├── shared/                   # 共享模块
│   ├── components/           # 通用组件
│   ├── hooks/                # 通用 Hook
│   ├── services/             # API 服务
│   ├── stores/               # 状态管理
│   ├── utils/                # 工具函数
│   ├── styles/               # 全局样式
│   └── i18n/                 # 国际化
│
├── App.jsx                   # 应用入口
├── main.jsx                  # 渲染入口
└── router.jsx                # 路由配置
```

---

## 挂载方式

### 状态管理

| 场景 | 方式 | 说明 |
|---|---|---|
| 局部状态 | `useState` | 组件内部状态 |
| 共享状态 | Zustand Store | 跨组件状态 |
| 服务端状态 | React Query | API 数据 |
| 深层传递 | Context | 避免 Props 穿透 |

### 与 AOP 方案配合

| 层 | 组件职责 | AOP 职责 |
|---|---|---|
| 日志 | 无 | service 层自动记录 |
| 异常捕获 | 无 | service 层自动捕获 |
| 异常上报 | 无 | service 层自动上报 |
| 用户提示 | 调用 `useFeedback` | 无 |
| 错误码映射 | 调用 `getErrorMessage` | 无 |

---

## 示例

### 组件分层
```
pages/
├── LoginPage.jsx          # 页面入口
│   └── LoginContainer     # 业务逻辑
│       └── LoginForm      # 表单 UI
│           ├── Input      # 输入框
│           └── Button     # 按钮
```

### 状态管理
```javascript
// 局部状态
const [isOpen, setIsOpen] = useState(false);

// 共享状态
const { user } = useAuthStore();

// 服务端状态
const { data, isLoading } = useQuery(['user'], fetchUser);
```

### 异常处理（单一职责）
```javascript
// ✅ 正确：组件只处理 UI
function LoginForm() {
  const { toast, modal } = useFeedback();
  
  const handleSubmit = async (data) => {
    try {
      await authService.login(data);  // 日志由 service 层 AOP 处理
      toast.success('登录成功');
    } catch (err) {
      // 异常已被 service 层记录，组件只处理 UI
      const message = getErrorMessage(err.code);
      const feedbackType = getFeedbackType(err.code);
      
      if (feedbackType === 'modal') {
        modal.warning({ content: message });
      } else {
        setError(message);
      }
    }
  };
}

// ❌ 错误：组件内记录日志
catch (err) {
  console.error(err);  // 不要这样
  loggerService.error(err);  // 不要这样
}
```

### 副作用处理
```javascript
// ✅ 正确：单一职责
useEffect(() => {
  loadUser();
}, [userId]);

useEffect(() => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);  // 清理
}, []);

// ❌ 错误：多个职责混合
useEffect(() => {
  loadUser();
  loadPosts();
  setupWebSocket();
}, []);
```

### 性能优化
```javascript
// 缓存计算
const filteredList = useMemo(() => 
  list.filter(item => item.active), 
  [list]
);

// 缓存回调
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// 懒加载
const Dashboard = lazy(() => import('./Dashboard'));
```

---

## 现状

### 组件声明方式

| 方式 | 状态 | 说明 |
|---|---|---|
| `function` 声明 | ⚠️ 部分 | 少数文件使用 |
| 箭头函数组件 | ✅ 主流 | 大部分组件使用 |

### 性能优化使用

| Hook | 状态 | 说明 |
|---|---|---|
| `useMemo` | ✅ | 广泛使用 |
| `useCallback` | ✅ | 广泛使用 |
| `React.memo` | ❌ | 未使用 |

### 日志使用

| 问题 | 状态 | 说明 |
|---|---|---|
| `console.log` 调试代码 | ⚠️ | 残留在组件中 |
| `console.error` 异常处理 | ⚠️ | 组件内直接调用 |
| 应使用 AOP 日志 | ❌ | 未遵循 |

### 异常处理

| 问题 | 状态 | 说明 |
|---|---|---|
| 组件内 try-catch | ✅ | 异步操作有 try-catch |
| 使用 AOP Hook | ❌ | 未使用 |
| 错误码映射 | ⚠️ | 硬编码 |
| 统一反馈服务 | ❌ | 使用 alert() 或 setError() |

---

## 迁移计划

### 阶段一：清理调试代码（Week 1）

| 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|
| 删除 `console.log` 调试代码 | P0 | - | ❌ |
| 删除 `console.error` 直接调用 | P0 | 日志方案 | ❌ |
| 替换 `alert()` 为 `useFeedback` | P1 | 验证方案 | ❌ |

### 阶段二：统一异常处理（Week 2）

| 任务 | 优先级 | 依赖 | 状态 |
|---|---|---|---|
| 迁移 `LoginModal.jsx` 错误处理 | P0 | 验证方案 | ❌ |
| 迁移其他组件错误处理 | P1 | 验证方案 | ❌ |
| 添加 `React.memo` 到纯展示组件 | P2 | - | ❌ |

### 回滚策略

| 场景 | 回滚方式 |
|---|---|
| useFeedback 异常 | 切回 alert() |
| 错误码映射异常 | 显示原始错误消息 |

---

## 附录

### 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 组件 | PascalCase | `LoginForm.jsx` |
| Hook | use 前缀 | `useAuth.js` |
| 工具函数 | camelCase | `formatDate.js` |
| 常量 | UPPER_SNAKE | `API_BASE_URL` |
| 事件处理 | handle 前缀 | `handleSubmit` |
| 布尔值 | is/has/can 前缀 | `isLoading`、`hasError` |

### 代码风格

| 规范 | 说明 |
|---|---|
| 组件函数声明 | 使用 `function` 而非箭头函数 |
| Props 解构 | 在参数位置解构 |
| 条件渲染 | 简单用 `&&`，复杂用三元或提前 return |
| 列表渲染 | 必须有唯一 `key` |

```javascript
// ✅ 组件声明
function LoginForm({ onSubmit, isLoading }) {
  // ...
}

// ✅ 条件渲染
{isLoading && <Spinner />}
{error ? <Error message={error} /> : <Content />}

// ✅ 提前 return
if (isLoading) return <Spinner />;
if (error) return <Error />;
return <Content />;
```
