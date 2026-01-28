# Alembic Migration History

本文档记录所有数据库迁移的顺序和说明。

## 迁移顺序

| 序号 | Revision ID | 文件名 | 创建时间 | 说明 |
|------|-------------|--------|----------|------|
| 1 | `917bc600b01e` | `917bc600b01e_initial_schema.py` | 2026-01-10 04:42:43 | 初始数据库 schema |
| 2 | `add_category_field` | `add_category_field.py` | 2026-01-11 | 添加会员表的新字段 |
| 3 | `b4126fd52784` | `b4126fd52784_add_attachments_to_notices.py` | 2026-01-17 16:16:52 | 添加通知附件字段 |
| 4 | `9056bce9e2a4` | `9056bce9e2a4_unify_attachments_to_jsonb.py` | 2026-01-17 17:24:24 | 统一附件为 JSONB 类型 |
| 5 | `60a94ab47772` | `60a94ab47772_add_attachments_to_projects.py` | 2026-01-17 18:05:20 | 添加项目附件字段 |
| 6 | `20260117204708` | `20260117204708_add_phone_fields.py` | 2026-01-17 20:47:08 | 添加电话字段 |
| 7 | `24b6df71a64d` | `24b6df71a64d_add_view_count_to_projects.py` | 2026-01-18 10:35:03 | 添加项目浏览计数 |
| 8 | `897911e63f9f` | `897911e63f9f_remove_attachments_from_performance_.py` | 2026-01-18 14:23:27 | 从绩效记录中移除附件 |
| 9 | `20260119124431` | `20260119124431_add_business_field.py` | 2026-01-19 12:44:31 | 添加业务字段 |
| 10 | `20260119222343` | `20260119222343_add_main_industry_ksic_fields.py` | 2026-01-19 22:23:43 | 添加主要行业 KSIC 字段 |
| 11 | `5a2e21fac597` | `5a2e21fac597_add_applicant_fields_to_project_.py` | 2026-01-27 19:52:15 | 添加申请人姓名和电话字段 |

## 命名规范

从 2026-01-17 开始，新的迁移文件应使用以下命名格式：

```
YYYYMMDDHHMMSS_description.py
```

例如：`20260127195215_add_applicant_fields.py`

### 旧文件说明

以下文件使用了 Alembic 自动生成的随机 hash 作为 revision ID：
- `917bc600b01e` - 初始 schema
- `add_category_field` - 添加分类字段
- `b4126fd52784` - 添加通知附件
- `9056bce9e2a4` - 统一附件格式
- `60a94ab47772` - 添加项目附件
- `24b6df71a64d` - 添加浏览计数
- `897911e63f9f` - 移除绩效附件
- `5a2e21fac597` - 添加申请人字段

**注意：不要重命名这些文件！** Alembic 在数据库的 `alembic_version` 表中记录了这些 revision ID。重命名文件会导致迁移链断裂。

## 常用命令

```bash
# 查看当前版本
uv run alembic current

# 查看迁移历史
uv run alembic history

# 升级到最新版本
uv run alembic upgrade head

# 降级一个版本
uv run alembic downgrade -1

# 创建新迁移
uv run alembic revision -m "description"

# 自动生成迁移（基于模型变化）
uv run alembic revision --autogenerate -m "description"
```

## 故障排除

### 迁移已标记但未实际执行

如果 Alembic 认为迁移已应用但数据库中实际没有变更：

```bash
# 1. 回退到上一个版本
uv run alembic stamp <previous_revision_id>

# 2. 重新运行迁移
uv run alembic upgrade head
```

### Supabase Schema Cache 未刷新

执行迁移后，需要刷新 Supabase 的 PostgREST schema cache：

1. 登录 Supabase Dashboard
2. 进入 Settings → API
3. 点击 "Reload schema" 按钮

或通过 SQL：
```sql
NOTIFY pgrst, 'reload schema';
```
