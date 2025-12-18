# 部署步骤指南

本文档提供详细的部署步骤，帮助您将 Gangwon Business Portal 部署到 Render。

## 前置准备

### 1. 账户准备

- [ ] 创建 Render 账户：https://render.com
- [ ] 创建 GitHub 账户（如果还没有）
- [ ] 确保代码已推送到 GitHub 仓库

### 2. 环境准备

- [ ] Supabase 项目已创建
- [ ] 数据库连接字符串已获取
- [ ] Supabase API Keys 已获取
- [ ] JWT Secret Key 已生成（使用：`openssl rand -hex 32`）

---

## 方法一：使用 render.yaml 快速部署（推荐）

### 步骤 1: 连接 GitHub 仓库

1. 登录 Render Dashboard
2. 点击 "New +" → "Blueprint"
3. 选择 "Connect GitHub"
4. 授权 Render 访问您的 GitHub 仓库
5. 选择仓库：`gangwon-business-portal`
6. 点击 "Apply"

### 步骤 2: 配置环境变量

Render 会自动读取 `render.yaml` 并创建服务，但需要手动配置敏感环境变量：

#### 后端服务环境变量

在 `gangwon-portal-backend` 服务的 Environment 标签页添加：

```env
# 数据库配置（必需）
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# JWT 配置（必需）
SECRET_KEY=your-generated-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 应用配置
APP_NAME=Gangwon Business Portal
APP_VERSION=1.0.0

# 日志配置
LOG_LEVEL=INFO
LOG_FILE_BACKUP_COUNT=30
LOG_DB_ENABLED=true
LOG_DB_MIN_LEVEL=WARNING

# 邮件配置（可选，用于发送邮件通知）
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@gangwon-portal.kr

# Nice D&B API（可选，用于企业信息验证）
NICE_DNB_API_KEY=your-key
NICE_DNB_API_SECRET_KEY=your-secret
NICE_DNB_API_URL=https://gate.nicednb.com
```

#### 前端服务环境变量

在 `gangwon-portal-frontend` 服务的 Environment 标签页添加：

```env
VITE_API_BASE_URL=https://gangwon-backend.onrender.com
```

**注意**：需要先部署后端，获取后端 URL 后再配置前端。

### 步骤 3: 等待部署完成

1. Render 会自动开始构建和部署
2. 查看构建日志，确保没有错误
3. 等待部署完成（通常需要 5-10 分钟）

### 步骤 4: 验证部署

1. **检查后端健康状态**
   - 访问：`https://gangwon-portal-backend.onrender.com/healthz`
   - 应该返回：`{"status": "healthy", "version": "1.0.0"}`

2. **检查前端**
   - 访问：`https://gangwon-portal-frontend.onrender.com`
   - 应该能看到前端页面

3. **检查 API 文档**
   - 访问：`https://gangwon-portal-backend.onrender.com/docs`
   - 应该能看到 Swagger UI

---

## 方法二：手动部署

### 步骤 1: 部署后端

1. 登录 Render Dashboard
2. 点击 "New +" → "Web Service"
3. 连接 GitHub 仓库
4. 配置服务：
   - **Name**: `gangwon-portal-backend`
   - **Region**: 选择离用户最近的区域（如 Singapore）
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && alembic upgrade head`
   - **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free（或 Starter $7/月，推荐生产环境使用）

5. 在 Environment 标签页添加环境变量（见上面的环境变量列表）

6. 点击 "Create Web Service"

### 步骤 2: 部署前端

1. 点击 "New +" → "Static Site"
2. 连接 GitHub 仓库
3. 配置服务：
   - **Name**: `gangwon-portal-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     ```
     VITE_API_BASE_URL=https://gangwon-backend.onrender.com
     ```
     （注意：将 `gangwon-portal-backend.onrender.com` 替换为您的实际后端 URL）

4. 点击 "Create Static Site"

---

## 数据库迁移

### 自动迁移（推荐）

如果使用 `render.yaml` 或 Build Command 中包含 `alembic upgrade head`，迁移会在每次部署时自动运行。

### 手动迁移

如果需要手动运行迁移：

1. 在 Render Dashboard 中打开后端服务
2. 点击 "Shell" 标签页
3. 运行：
   ```bash
   alembic upgrade head
   ```

---

## 配置 GitHub Actions（可选）

### 步骤 1: 配置 GitHub Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

- `DATABASE_URL` - 生产数据库连接（用于测试）
- `SUPABASE_URL` - Supabase 项目 URL
- `SUPABASE_KEY` - Supabase Anon Key
- `SUPABASE_SERVICE_KEY` - Supabase Service Key
- `SECRET_KEY` - JWT 密钥
- `VITE_API_BASE_URL` - 前端 API 地址

### 步骤 2: 验证工作流

1. 推送到 `main` 分支
2. 在 GitHub Actions 标签页查看工作流运行状态
3. 确保所有测试通过

---

## 部署后检查清单

### 后端检查

- [ ] 健康检查端点正常：`/healthz`
- [ ] API 文档可访问：`/docs`
- [ ] 数据库连接正常
- [ ] 日志写入正常（检查 Render 日志或数据库）
- [ ] 环境变量配置正确

### 前端检查

- [ ] 前端页面可访问
- [ ] API 调用正常（检查浏览器控制台）
- [ ] 静态资源加载正常
- [ ] 路由正常工作

### 功能检查

- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] API 认证正常
- [ ] 文件上传功能正常（如果已实现）

---

## 常见问题

### 1. 构建失败

**问题**：构建过程中出现错误

**解决方案**：
- 检查构建日志，查看具体错误信息
- 确保所有依赖都已正确安装
- 检查环境变量是否配置正确
- 确保数据库连接字符串格式正确

### 2. 数据库连接失败

**问题**：应用无法连接到数据库

**解决方案**：
- 检查 `DATABASE_URL` 环境变量
- 确保 Supabase 防火墙允许 Render IP 访问
- 检查数据库连接字符串格式（应使用 `postgresql+asyncpg://`）

### 3. 前端 API 调用失败

**问题**：前端无法调用后端 API

**解决方案**：
- 检查 `VITE_API_BASE_URL` 环境变量
- 确保后端 URL 正确
- 检查 CORS 配置
- 查看浏览器控制台的错误信息

### 4. 端口配置错误

**问题**：应用无法启动

**解决方案**：
- 确保使用 `$PORT` 环境变量（Render 自动提供）
- 检查启动命令：`uvicorn src.main:app --host 0.0.0.0 --port $PORT`

### 5. 迁移失败

**问题**：数据库迁移执行失败

**解决方案**：
- 检查数据库连接
- 查看迁移日志
- 确保迁移文件语法正确
- 可以尝试手动运行迁移

---

## 更新部署

### 自动更新

当您推送代码到 `main` 分支时，Render 会自动触发部署。

### 手动更新

1. 在 Render Dashboard 中打开服务
2. 点击 "Manual Deploy" → "Deploy latest commit"
3. 等待部署完成

---

## 监控和维护

### 查看日志

1. 在 Render Dashboard 中打开服务
2. 点击 "Logs" 标签页
3. 查看实时日志

### 性能监控

- 使用 Render Dashboard 查看服务状态
- 检查响应时间
- 监控错误率

### 备份

- Supabase 自动备份数据库
- 定期导出重要数据
- 保存环境变量配置

---

## 下一步

部署完成后，建议：

1. 配置自定义域名（Render 支持）
2. 设置 SSL 证书（Render 自动提供）
3. 配置监控和告警
4. 设置定期备份策略
5. 优化性能（如使用 CDN）

---

**需要帮助？**

- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细文档
- 检查 Render 文档：https://render.com/docs
- 查看项目 README 文件

