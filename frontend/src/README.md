# Frontend Source Code

## 目录结构

```
src/
├── admin/              # 管理员端模块
│   ├── layouts/        # 管理员布局组件
│   └── modules/        # 管理员功能模块
│       ├── auth/       # 认证模块
│       ├── dashboard/  # 仪表板
│       ├── members/    # 会员管理
│       ├── projects/   # 项目管理
│       ├── performance/# 绩效管理
│       ├── messages/   # 消息管理
│       ├── content/    # 内容管理
│       ├── reports/    # 报表
│       └── audit-logs/ # 审计日志
│
├── member/             # 会员端模块
│   ├── layouts/        # 会员布局组件
│   └── modules/        # 会员功能模块
│       ├── auth/       # 认证模块
│       ├── home/       # 首页
│       ├── projects/    # 项目申请
│       ├── performance/# 绩效申报
│       ├── support/    # 支持中心
│       └── about/      # 关于我们
│
├── shared/             # 共享资源
│   ├── components/     # 共享组件
│   ├── hooks/         # 自定义 Hooks
│   ├── services/      # API 服务
│   ├── stores/        # 状态管理
│   ├── utils/          # 工具函数
│   ├── i18n/          # 国际化
│   └── styles/        # 样式文件
│
├── mocks/              # Mock 数据（开发环境）
├── App.jsx             # 根组件
├── main.jsx            # 应用入口
└── router.jsx          # 路由配置
```

## 代码规范

### 日志与异常方案（现状）

- 架构概览：日志与异常的实现目前是分散的
  - 日志相关：`src/shared/utils/loggerHandler.js`（通用日志处理）、`src/shared/components/RouteLogger.jsx`（路由/页面链路日志）等
  - 异常相关：`src/shared/utils/errorHandler.js`（错误格式化/上报）、`src/shared/hooks/useErrorHandler.js`（hook 层捕获）、`App.jsx` 中存在应用级 ErrorBoundary
  - 服务层：`src/shared/services/*` 负责将 API 错误转换为结构化错误并决定上报或重抛

- 当前问题：实现分散、重复较多、缺乏统一采样/脱敏与上报策略

- 推荐短期策略：逐步抽取统一入口（例如 `src/aop/`），先在 `service`/`router`/全局 `error` 层接入集中化模块，再按需覆盖 `store`/关键 `components`/`hooks`

### JSX 组件编写规范

1. **只关注业务逻辑**
   - 不要在 JSX 文件中添加 `console.log`、`console.error` 等日志（调试期间短期使用可接受，但提交前应移除）
   - 组件可以使用 `try/catch` 或 `.catch()` 来捕获 API 调用失败以更新局部 UI 状态（例如在表单中显示红色错误提示）。但复杂的错误解析、重试策略或全局错误上报应仍然由服务层处理并抛出结构化错误（包含 `error_code`/`status`），组件仅负责展示。
   - 不要添加全局 fallback UI（应用级别的 ErrorBoundary 已在 `App.jsx` 中统一处理）

2. **错误处理**
   - 错误处理应在服务层（`shared/services/`）统一处理
   - 组件层只负责调用服务和更新状态。**组件不得直接调用异常上报接口（例如 `exceptionService.recordException`）或做持久化日志记录；异常上报与日志记录应由服务层或 AOP 中间件统一负责。**

3. **代码示例**

```jsx
// ✅ 正确：只关注业务逻辑
const handleSubmit = async () => {
  setSubmitting(true);
  const payload = { /* ... */ };
  await adminService.createProject(payload);
  setSubmitting(false);
  navigate('/admin/projects');
};

// ❌ 错误：包含日志和错误处理
const handleSubmit = async () => {
  try {
    setSubmitting(true);
    const payload = { /* ... */ };
    await adminService.createProject(payload);
    setSubmitting(false);
    navigate('/admin/projects');
  } catch (error) {
    console.error('Failed to save:', error);
    alert('保存失败');
  }
};
```

## 模块说明

### Admin 模块

管理员后台管理系统，包含以下功能：

- **Dashboard**: 数据统计和图表展示
- **Members**: 企业会员管理
- **Projects**: 项目管理（创建、编辑、查看申请）
- **Performance**: 绩效记录审核
- **Messages**: 消息发送和管理
- **Content**: 内容管理（公告、新闻、FAQ等）
- **Reports**: 数据报表导出
- **Audit Logs**: 操作审计日志

### Member 模块

企业会员端系统，包含以下功能：

- **Home**: 首页（公告、新闻展示）
- **Projects**: 项目申请
- **Performance**: 绩效申报
- **Support**: 支持中心（咨询、FAQ）
- **About**: 关于我们

### Shared 模块

共享资源，供 Admin 和 Member 模块共同使用：

- **Components**: 可复用 UI 组件
- **Services**: API 调用封装
- **Hooks**: 自定义 React Hooks
- **Utils**: 工具函数（格式化、验证等）
- **Stores**: 全局状态管理（Zustand）
- **i18n**: 国际化配置（支持中文、韩文）

## 技术栈

- **React 18**: UI 框架
- **React Router v6**: 路由管理
- **Vite**: 构建工具
- **Tailwind CSS**: 样式框架
- **Zustand**: 状态管理
- **React i18next**: 国际化
- **MSW**: Mock Service Worker（开发环境）

## 开发指南

### 添加新功能模块

1. 在 `admin/modules/` 或 `member/modules/` 下创建新目录
2. 创建组件文件（如 `MyModule.jsx`）
3. 创建 `index.js` 导出组件
4. 创建 `locales/` 目录添加翻译文件
5. 在 `router.jsx` 中添加路由配置

### 使用共享组件

```jsx
import { Button, Card, Table, Input, Modal, ModalFooter, Alert } from '@shared/components';
```

### 消息提示

使用自定义的 `Alert` 组件显示成功、错误、警告等信息：

```jsx
// ✅ 正确：使用自定义 Alert 组件
const [message, setMessage] = useState(null);
const [messageVariant, setMessageVariant] = useState('success');

// 显示消息
setMessageVariant('success');
setMessage('保存成功');
setTimeout(() => setMessage(null), 3000);

// 在 JSX 中
{message && (
  <Alert variant={messageVariant} className="mb-4">
    {message}
  </Alert>
)}

// ❌ 错误：使用浏览器原生 alert
alert('保存成功');
```

Alert 支持的 variant：
- `success`: 成功消息（绿色）
- `error`: 错误消息（红色）
- `warning`: 警告消息（黄色）
- `info`: 信息消息（蓝色）

### 确认对话框

**不要使用浏览器原生的 `window.confirm()`**，应使用自定义的 Modal 组件创建确认对话框：

```jsx
// ✅ 正确：使用自定义 Modal 确认对话框
const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

const handleDelete = (id) => {
  setDeleteConfirm({ open: true, id });
};

const confirmDelete = async () => {
  const { id } = deleteConfirm;
  await service.deleteItem(id);
  setDeleteConfirm({ open: false, id: null });
};

// 在 JSX 中
<Modal
  isOpen={deleteConfirm.open}
  onClose={() => setDeleteConfirm({ open: false, id: null })}
  title="确定要删除吗？"
  size="sm"
>
  <div className="py-4">
    <p className="text-gray-600">此操作不可撤销，确定要继续吗？</p>
  </div>
  <ModalFooter>
    <Button variant="outline" onClick={() => setDeleteConfirm({ open: false, id: null })}>
      取消
    </Button>
    <Button variant="primary" onClick={confirmDelete}>
      删除
    </Button>
  </ModalFooter>
</Modal>

// ❌ 错误：使用浏览器原生 confirm
if (!window.confirm('确定要删除吗？')) {
  return;
}
```

### 使用 API 服务

```jsx
import { adminService, apiService } from '@shared/services';

// 调用 API
const data = await adminService.getProject(id);
```

### 国际化

```jsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const title = t('admin.projects.title');
```

### 分页组件

使用 `Pagination` 组件实现数据分页：

```jsx
import { Pagination } from '@shared/components';

// 状态管理
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [total, setTotal] = useState(0);

// 在 JSX 中使用
{total > pageSize && (
  <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center text-sm text-gray-700">
      <span>
        {t('common.showing', { 
          start: ((currentPage - 1) * pageSize) + 1, 
          end: Math.min(currentPage * pageSize, total), 
          total: total 
        }) || `显示 ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, total)} 共 ${total} 条`}
      </span>
    </div>
    <Pagination
      current={currentPage}
      total={total}
      pageSize={pageSize}
      onChange={setCurrentPage}
      onShowSizeChange={(current, size) => {
        setCurrentPage(1);
        setPageSize(size);
      }}
      showSizeChanger
      showQuickJumper
    />
  </div>
)}
```

#### Pagination 组件属性

- `current` / `currentPage`: 当前页码（从 1 开始）
- `total`: 总记录数
- `pageSize`: 每页显示数量
- `onChange` / `onPageChange`: 页码改变时的回调函数
- `onShowSizeChange`: 每页数量改变时的回调函数（可选）
- `showSizeChanger`: 是否显示每页数量选择器（可选）
- `showQuickJumper`: 是否显示快速跳转（可选）

#### 分页布局规范

分页组件应放在内容区域的底部，使用统一的布局样式：

```jsx
// ✅ 正确：统一的分页布局
<div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
  {/* 表格或其他内容 */}
  <div className="overflow-x-auto -mx-4 px-4">
    <Table columns={columns} data={data} />
  </div>
  
  {/* 分页 */}
  {total > pageSize && (
    <div className="px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center text-sm text-gray-700">
        <span>显示信息</span>
      </div>
      <Pagination
        current={currentPage}
        total={total}
        pageSize={pageSize}
        onChange={setCurrentPage}
      />
    </div>
  )}
</div>
```

### 页面布局规范

#### 页面标题和操作栏

所有管理页面应使用统一的布局结构：

```jsx
// ✅ 正确：统一的页面布局
<div>
  <div className="mb-6">
    <h1 className="text-2xl font-semibold text-gray-900 mb-4">
      {t('admin.content.faq.title', 'FAQ管理')}
    </h1>
    
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
      {/* 搜索框 */}
      <div className="flex-1 min-w-[200px] max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="搜索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex items-center space-x-2 md:ml-4 w-full md:w-auto">
        <Button onClick={handleAdd}>
          {t('common.add', '添加')}
        </Button>
      </div>
    </div>
  </div>

  {/* 内容区域 */}
  <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
    {/* 表格或其他内容 */}
  </div>
</div>
```

#### Card 内容区域

Card 组件内部的内容应添加 padding：

```jsx
// ✅ 正确：Card 内部添加 padding
<Card>
  <div className="p-6">
    {/* 内容 */}
  </div>
</Card>

// ❌ 错误：内容贴着 Card 边缘
<Card>
  {/* 内容没有 padding */}
</Card>
```

### 按钮样式规范

#### Button 组件使用

统一使用 `variant` 属性控制按钮样式，**不要使用 `type="primary"`**：

```jsx
// ✅ 正确：使用 variant 属性
<Button onClick={handleSave}>保存</Button>                    // 默认 primary
<Button variant="outline" onClick={handleCancel}>取消</Button>  // 轮廓按钮
<Button variant="secondary" onClick={handleExport}>导出</Button> // 次要按钮

// ❌ 错误：使用 type 属性
<Button type="primary" onClick={handleSave}>保存</Button>
```

#### 按钮 variant 说明

- **默认（primary）**: 主要操作按钮（保存、提交、确认等）
  ```jsx
  <Button>保存</Button>
  <Button onClick={handleSubmit}>提交</Button>
  ```

- **outline**: 次要操作按钮（取消、重置等）
  ```jsx
  <Button variant="outline" onClick={handleCancel}>取消</Button>
  <Button variant="outline" onClick={handleReset}>重置</Button>
  ```

- **secondary**: 次要功能按钮（导出、筛选等）
  ```jsx
  <Button variant="secondary" onClick={handleExport}>导出</Button>
  ```

#### 表格操作按钮

表格中的操作按钮应使用文本按钮样式，而不是 Button 组件：

```jsx
// ✅ 正确：表格操作使用文本按钮
<div className="flex items-center space-x-2">
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleEdit(record);
    }}
    className="text-primary-600 hover:text-primary-900 font-medium text-sm"
  >
    编辑
  </button>
  <span className="text-gray-300">|</span>
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleDelete(record.id);
    }}
    className="text-red-600 hover:text-red-900 font-medium text-sm"
  >
    删除
  </button>
</div>

// ❌ 错误：表格中使用 Button 组件
<div className="flex gap-2">
  <Button type="link" size="small" onClick={handleEdit}>编辑</Button>
  <Button type="link" size="small" danger onClick={handleDelete}>删除</Button>
</div>
```

## 注意事项

1. **不要在生产代码中使用 console.log**
2. **不要使用浏览器原生的 `window.confirm()` 或 `window.alert()`**
   - 使用自定义的 `Modal` 组件创建确认对话框
   - 使用自定义的 `Alert` 组件显示消息提示
3. **错误处理统一在服务层处理**
4. **组件保持简洁，只关注 UI 和业务逻辑**
5. **使用 TypeScript 类型定义（如需要）**
6. **遵循现有的代码风格和目录结构**

