# 🚀 快速部署检查清单

## 部署前准备

### 账户和访问
- [ ] Render 账户已创建（https://render.com）
- [ ] GitHub 仓库已准备好
- [ ] 代码已推送到 GitHub

### 环境配置
- [ ] Supabase 项目已创建
- [ ] 数据库连接字符串已获取：`postgresql+asyncpg://...`
- [ ] Supabase URL 已获取：`https://xxx.supabase.co`
- [ ] Supabase Anon Key 已获取
- [ ] Supabase Service Key 已获取
- [ ] JWT Secret Key 已生成（运行：`openssl rand -hex 32`）

---

## 部署步骤

### 1. 使用 Blueprint 部署（推荐）

- [ ] 登录 Render Dashboard
- [ ] 点击 "New +" → "Blueprint"
- [ ] 连接 GitHub 仓库
- [ ] 选择仓库：`gangwon-business-portal`
- [ ] 点击 "Apply"

### 2. 配置后端环境变量

在 `gangwon-backend` 服务中添加：

- [ ] `DATABASE_URL` = `postgresql+asyncpg://...`
- [ ] `SUPABASE_URL` = `https://xxx.supabase.co`
- [ ] `SUPABASE_KEY` = `eyJhbGc...`
- [ ] `SUPABASE_SERVICE_KEY` = `eyJhbGc...`
- [ ] `SECRET_KEY` = `your-secret-key`
- [ ] `LOG_DB_ENABLED` = `true`（已自动配置）
- [ ] `DEBUG` = `false`（已自动配置）

### 3. 等待后端部署完成

- [ ] 查看构建日志，确保无错误
- [ ] 记录后端 URL：`https://gangwon-backend.onrender.com`

### 4. 配置前端环境变量

在 `gangwon-portal-frontend` 服务中添加：

- [ ] `VITE_API_BASE_URL` = `https://gangwon-backend.onrender.com`（使用实际后端 URL）

### 5. 等待前端部署完成

- [ ] 查看构建日志，确保无错误
- [ ] 记录前端 URL：`https://gangwon-portal-frontend.onrender.com`

---

## 部署后验证

### 后端验证

- [ ] 健康检查：访问 `https://gangwon-backend.onrender.com/healthz`
  - 应返回：`{"status": "healthy", "version": "1.0.0"}`
- [ ] API 文档：访问 `https://gangwon-backend.onrender.com/docs`
  - 应显示 Swagger UI
- [ ] 检查日志：在 Render Dashboard 查看日志，确保无错误

### 前端验证

- [ ] 访问前端 URL：`https://gangwon-portal-frontend.onrender.com`
- [ ] 检查页面是否正常加载
- [ ] 打开浏览器开发者工具，检查控制台无错误
- [ ] 测试 API 调用是否正常

### 功能验证

- [ ] 用户注册功能
- [ ] 用户登录功能
- [ ] API 认证功能
- [ ] 数据库连接正常

---

## 环境变量完整列表

### 后端必需环境变量

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
SECRET_KEY=your-generated-secret-key
```

### 后端可选环境变量

```env
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
APP_NAME=Gangwon Business Portal
APP_VERSION=1.0.0
LOG_LEVEL=INFO
LOG_FILE_BACKUP_COUNT=30
LOG_DB_ENABLED=true
LOG_DB_MIN_LEVEL=WARNING
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@gangwon-portal.kr
NICE_DNB_API_KEY=your-key
NICE_DNB_API_SECRET_KEY=your-secret
NICE_DNB_API_URL=https://gate.nicednb.com
```

### 前端环境变量

```env
VITE_API_BASE_URL=https://gangwon-backend.onrender.com
```

---

## 常见问题快速解决

### ❌ 构建失败
- 检查构建日志
- 确保依赖安装成功
- 检查环境变量配置

### ❌ 数据库连接失败
- 检查 `DATABASE_URL` 格式
- 确保 Supabase 防火墙允许访问
- 验证数据库连接字符串

### ❌ 前端 API 调用失败
- 检查 `VITE_API_BASE_URL` 是否正确
- 确保后端 URL 正确
- 检查 CORS 配置

### ❌ 应用无法启动
- 检查启动命令
- 确保使用 `$PORT` 环境变量
- 查看错误日志

---

## 下一步

部署成功后：

1. [ ] 配置自定义域名（可选）
2. [ ] 设置监控和告警
3. [ ] 配置定期备份
4. [ ] 优化性能

---

**需要帮助？**

- 📖 详细文档：[DEPLOYMENT_STEPS.md](./docs/DEPLOYMENT_STEPS.md)
- 📖 完整部署文档：[DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- 🔗 Render 文档：https://render.com/docs

