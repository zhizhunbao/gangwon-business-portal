# 可插拔模块设计指南

本文档描述如何将 system-logs 和 health 模块迁移到其他项目。

## 模块结构

```
# 前端模块
system-logs/
├── adapter.js          # ⭐ 适配器 - 迁移时只需修改此文件
├── index.js            # 模块入口
├── SystemLogsDashboard.jsx
├── LogViewer.jsx
├── ExceptionViewer.jsx
├── PerformanceViewer.jsx
├── AuditLogViewer.jsx
└── locales/
    ├── zh.json
    └── ko.json

# 后端模块
health/
├── adapter.py          # ⭐ 适配器 - 迁移时只需修改此文件
├── __init__.py         # 模块入口
├── config.py           # 配置类
├── service.py          # 业务逻辑
└── router.py           # API 路由
```

## 迁移步骤

### 前端模块迁移

**1. 复制模块**
```bash
cp -r frontend/src/admin/modules/system-logs /new-project/src/modules/
```

**2. 修改 adapter.js**
```javascript
// 修改前 (原项目)
export { Loading, Button, Select, Card, Badge } from '@shared/components';
export { logsService, adminService } from '@shared/services';
export { formatDateTime } from '@shared/utils/format';

// 修改后 (新项目)
export { Loading, Button, Select, Card, Badge } from '@/components/ui';
export { logsService, adminService } from '@/services';
export { formatDateTime } from '@/utils/format';
```

**3. 注册 i18n**
```javascript
// 在 i18n/index.js 中添加
import systemLogsZh from '@/modules/system-logs/locales/zh.json';
import systemLogsKo from '@/modules/system-logs/locales/ko.json';

// 合并到 resources
resources: {
  zh: { translation: { ...otherZh, ...systemLogsZh } },
  ko: { translation: { ...otherKo, ...systemLogsKo } },
}
```

**4. 添加路由**
```javascript
import { SystemLogsDashboard } from '@/modules/system-logs';

<Route path="/admin/system-logs" element={<SystemLogsDashboard />} />
```

### 后端模块迁移

**1. 复制模块**
```bash
cp -r backend/src/common/modules/health /new-project/src/modules/
```

**2. 修改 adapter.py**
```python
# 修改前 (原项目)
from ..db.session import AsyncSessionLocal
from ..config import settings
from ..interceptor.auth import get_current_admin_user

# 修改后 (新项目)
from app.db import AsyncSessionLocal
from app.config import settings
from app.auth import get_current_admin_user
```

**3. 注册路由**
```python
# main.py
from modules.health import router as health_router

app.include_router(health_router)
```

## 依赖接口说明

### 前端依赖

| 依赖 | 类型 | 说明 |
|------|------|------|
| `Loading` | 组件 | 加载状态组件 |
| `Button` | 组件 | 按钮组件，支持 variant, size, onClick |
| `Select` | 组件 | 下拉选择，支持 value, onChange, options |
| `Card` | 组件 | 卡片容器 |
| `Badge` | 组件 | 标签组件 |
| `logsService` | 服务 | 日志 API 服务 |
| `adminService` | 服务 | 管理 API 服务（审计日志） |
| `formatDateTime` | 函数 | 日期格式化 |
| `useTranslation` | Hook | i18n 翻译 |

### 后端依赖

| 依赖 | 类型 | 说明 |
|------|------|------|
| `AsyncSessionLocal` | 类 | SQLAlchemy 异步 session |
| `settings.APP_VERSION` | 配置 | 应用版本号 |
| `get_current_admin_user` | 函数 | 认证依赖 |

## 自定义配置

### 后端配置

```python
from modules.health import HealthService, HealthModuleConfig, ServiceConfig

# 自定义外部服务监控
config = HealthModuleConfig(
    external_services={
        "api": ServiceConfig(
            name="my-api",
            url="https://api.example.com",
            type="api",
            health_endpoint="/health"
        ),
        "web": ServiceConfig(
            name="my-web",
            url="https://www.example.com",
            type="static"
        ),
    },
    cache_ttl=60,  # 缓存 60 秒
    enable_database_metrics=True,
)

HealthService.configure(config=config)
```

### 环境变量配置

```bash
# 外部服务 URL
HEALTH_BACKEND_URL=https://api.example.com
HEALTH_FRONTEND_URL=https://www.example.com

# 功能开关
HEALTH_ENABLE_RENDER=true
HEALTH_ENABLE_DB_METRICS=true
HEALTH_ENABLE_EXTERNAL=true

# 缓存配置
HEALTH_CACHE_TTL=30
HEALTH_TIMEOUT=10.0
```
