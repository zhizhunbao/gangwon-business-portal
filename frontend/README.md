# 江原创业门户 - Frontend

## 项目简介

江原特别自治道创业企业绩效管理门户的前端应用，使用 React + Vite 构建。

## 技术栈

- **框架**: React 18.3
- **构建工具**: Vite 6.0
- **路由**: React Router 6.28
- **状态管理**: Zustand 5.0
- **数据获取**: TanStack Query (React Query) 5.62
- **HTTP 客户端**: Axios 1.7
- **国际化**: React-i18next 15.1
- **图表**: ECharts 5.5 + echarts-for-react 3.0
- **日期处理**: date-fns 4.1
- **工具库**: clsx 2.1
- **样式**: Tailwind CSS 3.4
- **表单**: React Hook Form 7.54
- **Mock**: MSW 2.6

## 目录结构

```
frontend/
├── public/              # 静态资源
├── src/
│   ├── shared/         # 共享层
│   │   ├── components/ # 共享组件 (.jsx)
│   │   │   ├── Alert.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Loading.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Textarea.jsx
│   │   │   └── index.js
│   │   ├── hooks/      # 自定义 Hooks (.js)
│   │   │   ├── useAuth.js
│   │   │   ├── useDebounce.js
│   │   │   ├── useLocalStorage.js
│   │   │   ├── usePagination.js
│   │   │   ├── useToggle.js
│   │   │   └── index.js
│   │   ├── services/   # API 服务 (.js)
│   │   │   ├── api.service.js
│   │   │   └── auth.service.js
│   │   ├── stores/     # Zustand 状态管理 (.js)
│   │   │   ├── authStore.js
│   │   │   ├── uiStore.js
│   │   │   └── index.js
│   │   ├── utils/      # 工具函数 (.js)
│   │   │   ├── constants.js
│   │   │   ├── format.js
│   │   │   ├── helpers.js
│   │   │   ├── storage.js
│   │   │   ├── validation.js
│   │   │   └── index.js
│   │   ├── i18n/       # 国际化配置
│   │   │   ├── index.js
│   │   │   └── locales/
│   │   │       ├── ko.json
│   │   │       └── zh.json
│   │   └── styles/     # 全局样式 (.css)
│   │       └── index.css
│   ├── member/         # 企业会员端模块
│   │   ├── layouts/    # 布局组件
│   │   │   ├── MemberLayout.jsx
│   │   │   ├── MemberLayout.css
│   │   │   ├── Header.jsx
│   │   │   ├── Header.css
│   │   │   ├── Footer.jsx
│   │   │   ├── Footer.css
│   │   │   ├── PageContainer.jsx
│   │   │   ├── PageContainer.css
│   │   │   ├── locales/
│   │   │   └── index.js
│   │   ├── modules/     # 功能模块
│   │   │   ├── auth/   # 认证模块
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   ├── ForgotPassword.jsx
│   │   │   │   ├── ResetPassword.jsx
│   │   │   │   ├── Auth.css
│   │   │   │   ├── locales/
│   │   │   │   └── index.js
│   │   │   ├── home/   # 首页模块
│   │   │   │   ├── Home.jsx
│   │   │   │   ├── Home.css
│   │   │   │   ├── NoticesPreview.jsx
│   │   │   │   ├── NoticesList.jsx
│   │   │   │   ├── PressPreview.jsx
│   │   │   │   ├── PressList.jsx
│   │   │   │   ├── RollingBannerCard.jsx
│   │   │   │   └── locales/
│   │   │   ├── projects/ # 项目模块
│   │   │   │   ├── Projects.jsx
│   │   │   │   ├── Projects.css
│   │   │   │   ├── ProjectList.jsx
│   │   │   │   ├── ProjectDetail.jsx
│   │   │   │   ├── locales/
│   │   │   │   └── index.js
│   │   │   ├── performance/ # 绩效模块
│   │   │   │   ├── Performance.jsx
│   │   │   │   ├── Performance.css
│   │   │   │   ├── PerformanceCompanyInfo.jsx
│   │   │   │   ├── PerformanceListContent.jsx
│   │   │   │   ├── PerformanceFormContent.jsx
│   │   │   │   ├── locales/
│   │   │   │   └── index.js
│   │   │   ├── support/ # 支持模块
│   │   │   │   ├── Support.jsx
│   │   │   │   ├── Support.css
│   │   │   │   ├── ConsultationForm.jsx
│   │   │   │   ├── ConsultationHistory.jsx
│   │   │   │   ├── FAQList.jsx
│   │   │   │   ├── locales/
│   │   │   │   └── index.js
│   │   │   └── about/  # 关于模块
│   │   │       ├── About.jsx
│   │   │       ├── About.css
│   │   │       ├── locales/
│   │   │       └── index.js
│   │   └── routes.jsx  # 会员端路由
│   ├── admin/          # 管理员端模块
│   │   ├── layouts/    # 布局组件
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── AdminLayout.css
│   │   │   ├── Header.jsx
│   │   │   ├── Header.css
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Sidebar.css
│   │   │   ├── Footer.jsx
│   │   │   ├── Footer.css
│   │   │   ├── locales/
│   │   │   └── index.js
│   │   ├── modules/     # 功能模块
│   │   │   ├── auth/   # 认证模块
│   │   │   ├── dashboard/ # 仪表板模块
│   │   │   ├── members/ # 会员管理模块
│   │   │   ├── projects/ # 项目管理模块
│   │   │   ├── performance/ # 绩效管理模块
│   │   │   ├── content/ # 内容管理模块
│   │   │   ├── reports/ # 报告模块
│   │   │   └── settings/ # 设置模块
│   │   └── routes.jsx  # 管理员端路由
│   ├── App.jsx         # 根组件
│   ├── main.jsx        # 入口文件
│   └── router.jsx      # 主路由配置
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 文件扩展名规范

- **`.jsx`**: React 组件文件（包含 JSX 语法）
- **`.js`**: 非组件文件（工具函数、服务、配置等）
- **`.css`**: 样式文件

## 路径别名

项目配置了以下路径别名，方便导入：

- `@` → `src/`
- `@shared` → `src/shared/`
- `@member` → `src/member/`
- `@admin` → `src/admin/`
- `@mocks` → `src/mocks/` (预留)

使用示例：
```javascript
import { Button } from '@shared/components';
import { useAuth } from '@shared/hooks';
import Login from '@member/modules/auth/Login';
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:3000 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

### 清理缓存

```bash
npm run clean
```

## 环境变量

创建 `.env.local` 文件配置环境变量：

```env
# API 配置
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000

# Mock 配置
VITE_USE_MOCK=true

# 功能开关
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_SENTRY=false
```

## 代码规范

### 组件命名

- 组件文件使用 PascalCase: `Button.jsx`, `UserProfile.jsx`
- 组件导出使用命名导出或默认导出
- 布局组件放在 `layouts/` 目录
- 功能模块放在 `modules/` 目录

### 模块结构

每个功能模块应包含：
```
module-name/
├── ComponentName.jsx    # 主组件
├── index.js            # 导出文件
└── locales/            # 国际化文件
    ├── ko.json
    └── zh.json
```

### 目录组织

- 按功能模块组织代码
- 共享代码放在 `shared/` 目录
- 业务代码按角色分离：`member/` 和 `admin/`
- 每个功能模块包含：
  - 组件文件（`.jsx`）
  - 国际化文件（`locales/` 目录，包含 `ko.json` 和 `zh.json`）
  - 导出文件（`index.js`）

### 组件与 Service 分层规范

**组件 (Component)** 只负责：
- UI 渲染
- 用户交互事件绑定
- 调用 Service 方法
- 管理 UI 状态（loading、表单数据等）

**Service 层** 负责：
- API 调用
- 数据格式转换（前端格式 ↔ 后端格式）
- 业务逻辑封装（如批量上传、数据校验等）

示例：
```javascript
// ❌ 错误：业务逻辑写在组件里
const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files);
  const uploadedFiles = [];
  for (const file of files) {
    const response = await uploadService.uploadPublic(file);
    uploadedFiles.push({
      file_id: response.file_id || response.id,
      file_url: response.file_url || response.url,
      original_name: file.name,
      file_size: file.size
    });
  }
  setFormData(prev => ({ ...prev, attachments: uploadedFiles }));
};

// ✅ 正确：业务逻辑放在 Service 里
// upload.service.js
async uploadAttachments(files) {
  const uploadedFiles = [];
  for (const file of files) {
    const response = await this.uploadPublic(file);
    uploadedFiles.push({
      file_id: response.file_id || response.id,
      file_url: response.file_url || response.url,
      original_name: file.name,
      file_size: file.size
    });
  }
  return uploadedFiles;
}

// Component.jsx
const handleFileUpload = async (e) => {
  const files = Array.from(e.target.files);
  const uploadedFiles = await uploadService.uploadAttachments(files);
  setFormData(prev => ({ ...prev, attachments: uploadedFiles }));
};
```

### Service 文件规范

Service 文件位于 `src/shared/services/`：
- `api.service.js` - 基础 HTTP 请求封装
- `auth.service.js` - 认证相关
- `member.service.js` - 会员相关
- `admin.service.js` - 管理员相关
- `performance.service.js` - 绩效相关
- `upload.service.js` - 文件上传相关
- `project.service.js` - 项目相关
- `content.service.js` - 内容管理相关

每个 Service 应包含：
- API 调用方法
- 数据格式转换方法（如 `convertFormDataToBackendFormat`）
- 业务逻辑封装方法（如 `uploadAttachments`）

### 样式规范

- 使用 Tailwind CSS 工具类
- 复用样式抽取为组件
- 自定义样式使用独立的 `.css` 文件（如 `MemberLayout.css`）
- Tailwind 配置了自定义颜色主题：
  - `primary`: 蓝色系
  - `secondary`: 绿色系
  - `gray`: 灰色系
- 支持自定义阴影和间距

### UI 组件规范

#### 状态徽章 (Status Badge)

使用统一的徽章样式显示状态：

```jsx
<span className="inline-block px-1.5 py-0.5 rounded text-xs sm:text-sm font-medium bg-green-100 text-green-800">
  已批准
</span>
```

颜色规范：
- 草稿: `bg-gray-100 text-gray-800`
- 已提交: `bg-blue-100 text-blue-800`
- 需修改: `bg-yellow-100 text-yellow-800`
- 已批准: `bg-green-100 text-green-800`
- 已驳回: `bg-red-100 text-red-800`

#### 列表操作按钮

使用文字链接样式，按钮之间用 `|` 分隔：

```jsx
<div className="flex items-center space-x-2">
  <button className="text-primary-600 hover:text-primary-900 font-medium text-sm">
    编辑
  </button>
  <span className="text-gray-300">|</span>
  <button className="text-red-600 hover:text-red-900 font-medium text-sm">
    删除
  </button>
</div>
```

颜色规范：
- 查看/编辑: `text-primary-600 hover:text-primary-900`
- 警告操作: `text-yellow-600 hover:text-yellow-900`
- 危险操作: `text-red-600 hover:text-red-900`
- 成功操作: `text-green-600 hover:text-green-900`

#### 分页组件

分页组件放在列表底部，左侧显示统计信息，右侧显示分页控件：

```jsx
{totalPages > 1 && (
  <div className="sticky bottom-0 mt-auto py-3">
    <div className="flex justify-between items-center px-1 sm:px-0">
      <div className="text-xs text-gray-500 whitespace-nowrap">
        每页显示: {pageSize} · 共: {total}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  </div>
)}
```

#### 日期格式

统一使用 `YYYY-MM-DD` 格式：

```javascript
const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
```

#### 季度显示

使用中文格式：第一季度、第二季度、第三季度、第四季度

```javascript
const quarterLabels = {
  1: '第一季度',
  2: '第二季度',
  3: '第三季度',
  4: '第四季度'
};
```

#### 表格规范

- 不设置固定列宽，让表格自适应
- 避免使用 `overflow-x-auto` 产生横向滚动条
- 表头使用 `TableHeader`，内容使用 `TableCell`

## API 代理配置

开发环境下，API 请求会自动代理到后端服务器。

### 配置说明

```javascript
// vite.config.js
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
      changeOrigin: true,
      secure: false
    }
  }
}
```

### 环境变量

通过 `.env.local` 文件配置 `VITE_API_BASE_URL` 来指定后端服务器地址。

## Mock 数据

使用 MSW (Mock Service Worker) 提供 Mock 数据，便于前端独立开发。

通过 `VITE_USE_MOCK` 环境变量控制是否使用 Mock 数据。

Mock 数据目录位于 `src/mocks/`，包含：
- `browser.js`: 浏览器端 MSW 初始化
- `server.js`: Node.js 端 MSW 初始化
- `handlers/`: API 请求处理器
  - `auth.js`: 认证相关 API
  - `content.js`: 内容管理 API
  - `dashboard.js`: 仪表板 API
  - `members.js`: 会员管理 API
  - `performance.js`: 绩效管理 API
  - `projects.js`: 项目管理 API
- `data/`: Mock 数据文件（JSON 格式，按模块和语言组织）

## 国际化

支持韩语（ko）和中文（zh）双语：

### 使用方式

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t('key')}</div>;
}
```

### 国际化文件组织

- 全局翻译：`src/shared/i18n/locales/`
- 模块翻译：各模块下的 `locales/` 目录
  - 例如：`src/member/modules/auth/locales/ko.json`

### 语言切换

语言切换功能由 `react-i18next` 自动检测浏览器语言，或通过 `i18next.changeLanguage()` 手动切换。

## 构建优化

Vite 配置了代码分割策略，将依赖包拆分为多个 chunk：

- `vendor-react`: React 相关
- `vendor-query`: React Query 和 Axios
- `vendor-state`: Zustand
- `vendor-i18n`: i18next 相关
- `vendor-charts`: ECharts 相关

这有助于提高加载性能和缓存效率。

## 部署

### 构建

```bash
npm run build
```

生成的文件在 `dist/` 目录。

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name example.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 浏览器兼容性

支持现代浏览器：

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 功能模块

### 会员端 (Member)

- **认证**: 登录、注册、忘记密码、重置密码
- **首页**: 主横幅、公告事项预览、新闻稿预览
- **项目管理**: 项目列表、详情、申请
- **绩效管理**: 公司信息、绩效查询、绩效输入表单（销售额/就业、政府支持历史、知识产权）
- **支持**: 1:1 咨询表单、咨询历史、FAQ 列表
- **关于**: 系统介绍页面（从 API 获取 HTML 内容并渲染）

### 管理员端 (Admin)

- **认证**: 管理员登录
- **仪表板**: 横幅管理、弹窗管理、公司状态统计
- **会员管理**: 会员列表、会员详情
- **项目管理**: 项目列表管理
- **绩效管理**: 绩效列表管理
- **内容管理**: 内容管理功能
- **报告**: 报告功能
- **设置**: 系统设置

## 状态管理

使用 Zustand 进行状态管理：

- `authStore`: 认证状态（用户信息、登录状态）
- `uiStore`: UI 状态（侧边栏、主题等）

## 路由保护

- `ProtectedRoute`: 保护需要认证的路由
- `PublicRoute`: 公共路由（已登录用户自动重定向）
- 基于角色的访问控制（RBAC）

## 许可证

[MIT License](LICENSE)

