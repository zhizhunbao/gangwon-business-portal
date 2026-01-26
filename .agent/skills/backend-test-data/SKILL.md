---
name: backend-test-data
description: 后端测试数据生成工具，用于生成 Supabase 测试数据（会员、项目、实绩、FAQ等）。
---

# Backend Test Data Generation Skill

后端测试数据生成工具，用于快速生成 Supabase 数据库的测试数据。

## 脚本位置

本 skill 包含的脚本已迁移到：
- `.claude/skills/backend-test-data/scripts/generate_test_data.py` - 主生成脚本
- `.claude/skills/backend-test-data/scripts/create_developer_admin.py` - 创建开发者管理员
- `.claude/skills/backend-test-data/scripts/test_data_config.json` - 数据配置

> **注意**: 原始 `backend/scripts/generate_test_data/` 目录下的这些脚本可以安全删除。

## 功能特性

### 主要功能

1. **测试数据生成**
   - 管理员账号
   - 会员数据（企业信息、联系方式等）
   - 项目数据（10个预配置项目）
   - 实绩报告
   - FAQ 和咨询
   - 新闻和公告

2. **文件上传**
   - 自动上传横幅图片到 Supabase Storage
   - 自动上传项目图片
   - 自动上传新闻图片

3. **数据清理**
   - 清空现有数据（可选）
   - 清空 Storage 文件夹

## 使用方法

### 前置条件

1. **安装依赖**
   ```bash
   pip install supabase python-dotenv bcrypt
   ```

2. **配置环境变量**

   在 `backend/.env.local` 中设置：
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_KEY=your_service_role_key
   ```

3. **生成资源图片**（如果还没有）
   ```bash
   python .claude/skills/asset-generation/scripts/generate_banners.py
   python .claude/skills/asset-generation/scripts/generate_project_images.py
   python .claude/skills/asset-generation/scripts/generate_news_images.py
   ```

### 生成测试数据

```bash
# 从项目根目录运行
python .claude/skills/backend-test-data/scripts/generate_test_data.py

# 或从 backend 目录运行
cd backend
python ../.claude/skills/backend-test-data/scripts/generate_test_data.py
```

### 创建开发者管理员

```bash
python .claude/skills/backend-test-data/scripts/create_developer_admin.py
```

## 生成的数据

### 数量配置

默认生成数量（可在 `test_data_config.json` 中配置）：

| 类型 | 数量 | 说明 |
|------|------|------|
| 管理员 | 1 | admin@example.com / admin123 |
| 会员 | 50 | 随机企业数据 |
| 项目 | 10 | 预配置的江原道项目 |
| 实绩报告 | 100 | 随机分配给会员 |
| FAQ | 30 | 常见问题 |
| 咨询 | 80 | 用户咨询记录 |
| 新闻 | 40 | 新闻文章 |
| 公告 | 20 | 系统公告 |

### 会员数据特征

生成的会员包含：
- **企业信息**: 公司名称、营业执照号、地址、行业分类
- **联系方式**: 邮箱、电话、传真
- **企业规模**: 员工数、年销售额
- **合作意向**: 技术合作、资金支持等
- **状态**: 待审核、已激活、已拒绝

### 项目数据

10个预配置的江原道项目：
1. 数字化转型支援项目
2. 创业企业支援项目
3. 智能工厂构建支援
4. 出口企业支援项目
5. 青年创业支援项目
6. 女性企业支援项目
7. 生物医疗产业支援
8. 环保能源支援项目
9. 观光数字化支援
10. 农食品加工支援

每个项目包含：
- 项目名称（韩语/中文）
- 项目描述
- 预算范围
- 申请期限
- 资格要求
- 支援内容

## 配置文件

### test_data_config.json 结构

```json
{
  "generation_counts": {
    "members": 50,
    "projects": 10,
    "performances": 100,
    "faqs": 30,
    "inquiries": 80,
    "news": 40,
    "notices": 20
  },
  "korean_data": {
    "company_names": ["삼성전자", "현대자동차", ...],
    "project_titles": ["디지털 전환 지원사업", ...],
    "industries": ["제조업", "IT서비스업", ...]
  },
  "data_definitions": {
    "member_statuses": ["pending", "active", "rejected"],
    "project_statuses": ["draft", "published", "closed"]
  },
  "data_ranges": {
    "employee_count": {"min": 5, "max": 500},
    "annual_sales": {"min": 1000000, "max": 100000000000}
  }
}
```

## 工作流场景

### 场景 1: 初始化开发环境

**需求**: 首次设置项目，需要测试数据

```bash
# 1. 配置环境变量
echo "SUPABASE_URL=your_url" >> backend/.env.local
echo "SUPABASE_SERVICE_KEY=your_key" >> backend/.env.local

# 2. 生成资源图片
python .claude/skills/asset-generation/scripts/generate_banners.py
python .claude/skills/asset-generation/scripts/generate_project_images.py

# 3. 生成测试数据
python .claude/skills/backend-test-data/scripts/generate_test_data.py

# 4. 创建开发者管理员（可选）
python .claude/skills/backend-test-data/scripts/create_developer_admin.py
```

### 场景 2: 重置测试数据

**需求**: 清空现有数据并重新生成

```bash
# 脚本会自动询问是否清空现有数据
python .claude/skills/backend-test-data/scripts/generate_test_data.py

# 选择: y (清空并重新生成)
```

### 场景 3: 仅生成特定数据

**需求**: 只生成项目数据，不生成会员

编辑 `test_data_config.json`:
```json
{
  "generation_counts": {
    "members": 0,      // 不生成会员
    "projects": 10,    // 生成10个项目
    "performances": 0,
    "faqs": 30,
    "inquiries": 0
  }
}
```

### 场景 4: 自定义项目列表

**需求**: 修改生成的项目内容

编辑 `test_data_config.json` 中的 `korean_data.project_titles`:
```json
{
  "korean_data": {
    "project_titles": [
      "我的自定义项目1",
      "我的自定义项目2",
      ...
    ],
    "project_descriptions": [
      "项目1描述",
      "项目2描述",
      ...
    ]
  }
}
```

## 数据库表

脚本会向以下表插入数据：

- `members` - 会员信息
- `projects` - 项目信息
- `applications` - 项目申请
- `performances` - 实绩报告
- `faqs` - 常见问题
- `inquiries` - 咨询记录
- `news` - 新闻文章
- `notices` - 系统公告

## 安全注意事项

### ⚠️ 重要

1. **不要在生产环境运行**
   - 仅用于开发和测试环境
   - 会清空现有数据

2. **保护敏感信息**
   - 不要提交 `.env.local` 到 Git
   - 使用 SERVICE_KEY 而非 ANON_KEY

3. **数据隔离**
   - 使用独立的测试项目
   - 不要连接到生产数据库

### 环境变量安全

```bash
# ✅ GOOD: 使用 .env.local（已在 .gitignore 中）
backend/.env.local

# ❌ BAD: 不要使用 .env（可能被提交）
backend/.env
```

## 故障排除

### Q: "错误: 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY"

**A**: 检查环境变量配置
```bash
# 查看环境变量
cat backend/.env.local

# 确保包含
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
```

### Q: "上传失败: 403 Forbidden"

**A**: 检查 Storage 权限
1. 确保使用 SERVICE_KEY 而非 ANON_KEY
2. 在 Supabase 控制台检查 Storage Bucket 策略
3. 确保 `public-files` bucket 存在

### Q: "导入错误: No module named 'supabase'"

**A**: 安装依赖
```bash
pip install supabase python-dotenv bcrypt
```

### Q: 图片上传失败

**A**: 先生成图片
```bash
# 确保图片存在
ls frontend/public/uploads/banners/
ls frontend/public/uploads/projects/

# 如果不存在，先生成
python .claude/skills/asset-generation/scripts/generate_banners.py
python .claude/skills/asset-generation/scripts/generate_project_images.py
```

### Q: 数据重复

**A**: 脚本会自动处理
- 清空模式：先删除所有数据
- 追加模式：检查并跳过重复数据

## 高级用法

### 自定义生成逻辑

编辑 `generate_test_data.py` 中的生成器类：

```python
class Generator:
    def gen_members(self):
        """自定义会员生成逻辑"""
        for i in range(self.counts["members"]):
            # 自定义数据生成
            member = {
                "email": f"custom_{i}@example.com",
                # ...
            }
```

### 批量操作

```bash
# 循环生成多个测试环境
for env in dev staging qa; do
  SUPABASE_URL=$env_url \
  SUPABASE_SERVICE_KEY=$env_key \
  python .claude/skills/backend-test-data/scripts/generate_test_data.py
done
```

## 相关资源

- [Supabase Python 文档](https://supabase.com/docs/reference/python/introduction)
- [Supabase Storage 文档](https://supabase.com/docs/guides/storage)
- [Asset Generation Skill](../asset-generation/SKILL.md) - 生成图片资源

---

**记住**: 测试数据应该接近真实场景，但永远不要包含真实的敏感信息。
