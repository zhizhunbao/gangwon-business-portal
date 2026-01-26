# 测试数据生成规范

## 目录结构

```
backend/scripts/generate_test_data/
├── generate_test_data.py    # 主生成脚本
├── test_data_config.json    # 数据配置文件
└── TEST_DATA_GUIDELINES.md  # 本规范文档
```

## 快速使用

```bash
# 后端
cd backend
python -m scripts.generate_test_data.generate_test_data

# 前端（如有独立脚本）
cd frontend
npm run generate:test-data
```

## 核心原则

1. **清空后生成** - 运行前清空所有业务数据（保留日志表）
2. **最小账户** - 1 个管理员 + 2 个会员测试账户
3. **韩语数据** - 所有文本内容使用逼真的韩语
4. **全模块覆盖** - 确保所有业务模块都有测试数据
5. **不生成日志** - 日志数据由系统运行时自动产生
6. **前后端分离** - 前端和后端各自独立生成测试数据

## 数据模块覆盖

| 模块 | 表名 | 是否生成 | 说明 |
|------|------|---------|------|
| 用户 | admins | ✅ | 1 个管理员账户 |
| 用户 | members | ✅ | 2 个会员账户 |
| 成果 | performance_records | ✅ | 成果记录 |
| 项目 | projects | ✅ | 支援项目 |
| 项目 | project_applications | ✅ | 项目申请 |
| 内容 | notices | ✅ | 公告 |
| 内容 | press_releases | ✅ | 新闻 |
| 内容 | banners | ✅ | 横幅 |
| 内容 | faqs | ✅ | 常见问题 |
| 内容 | system_info | ✅ | 系统信息 |
| 内容 | legal_content | ✅ | 法律条款（服务条款、隐私政策） |
| 消息 | messages | ✅ | 站内消息 |
| 文件 | attachments | ✅ | 附件 |
| 缓存 | nice_dnb_company_info | ❌ | API 调用时自动缓存 |
| 日志 | app_logs | ❌ | 系统自动生成 |
| 日志 | error_logs | ❌ | 系统自动生成 |
| 日志 | audit_logs | ❌ | 系统自动生成 |
| 日志 | system_logs | ❌ | 系统自动生成 |
| 日志 | performance_logs | ❌ | 系统自动生成 |

## 固定测试账户

### 管理员账户

| 字段 | 值 | 说明 |
|------|-----|------|
| id | UUID 自动生成 | 主键 |
| username | admin | 登录用户名 |
| email | admin@k-talk.kr | 邮箱 |
| password_hash | bcrypt(password123) | 密码哈希 |
| full_name | 시스템 관리자 | 姓名 |
| is_active | "true" | 激活状态（字符串） |
| created_at | 自动生成 | 创建时间 |
| updated_at | 自动生成 | 更新时间 |

### 会员账户 1（主测试账户）

| 字段 | 值 |
|------|-----|
| business_number | 1108801231 |
| email | test1@gangwon-tech.kr |
| password | password123 |
| company_name | 강원테크솔루션주식회사 |
| status | active |
| approval_status | approved |

### 会员账户 2（辅助测试账户）

| 字段 | 值 |
|------|-----|
| business_number | 7788602046 |
| email | test2@chuncheon-bio.kr |
| password | password123 |
| company_name | 춘천바이오주식회사 |
| status | active |
| approval_status | approved |

## 数据生成数量

```json
{
  "generation_counts": {
    "admins": 1,
    "members": 2,
    "performance_records": 20,
    "projects": 10,
    "project_applications": 15,
    "notices": 10,
    "press_releases": 8,
    "banners": 7,
    "faqs": 15,
    "messages": 20,
    "attachments": 10,
    "system_infos": 1,
    "legal_content": 2
  }
}
```

## 数据清空顺序

运行前按以下顺序清空数据（考虑外键约束），只清空数据不删表：

```python
# 1. 先清空有外键依赖的表
clear_table("attachments")
clear_table("project_applications")
clear_table("performance_records")
clear_table("messages")

# 2. 清空主表
clear_table("projects")
clear_table("members")
clear_table("admins")

# 3. 清空内容表
clear_table("notices")
clear_table("press_releases")
clear_table("banners")
clear_table("faqs")
clear_table("system_info")
clear_table("legal_content")

# 4. 清空缓存表（可选）
clear_table("nice_dnb_company_info")

# 注意：日志表不清空
```

## 韩语数据规范

### 企业名称格式

```
{지역}{업종}{회사형태}
예: 강원테크솔루션주식회사, 춘천바이오주식회사
```

### 地址格式

```
강원특별자치도 {시/군} {도로명} {번지}
예: 강원특별자치도 춘천시 중앙로 123
```

### 人名格式

使用真实韩国姓名：
```
김민수, 이준호, 박성민, 최동현, 정우진 ...
```

### 内容文本

- 公告标题：`{년도} {분기} {내용} 안내`
- 新闻标题：`강원도 {주제} {동사} - {부제}`
- FAQ：真实的业务相关问答

## 状态分布

### 成果状态

```
approved: 50%
submitted: 25%
draft: 15%
revision_requested: 7%
rejected: 3%
```

### 项目状态

```
active: 60%
inactive: 30%
archived: 10%
```

### 申请状态

```
approved: 40%
under_review: 30%
submitted: 20%
rejected: 10%
```

## 配置文件结构

```json
{
  "accounts": {
    "admin": {...},
    "member_1": {...},
    "member_2": {...}
  },
  "data_definitions": {...},
  "data_ranges": {...},
  "generation_counts": {...},
  "korean_data": {...}
}
```

## 图片生成与 Storage

### Supabase Storage Bucket

| Bucket | 用途 | 访问权限 |
|--------|------|---------|
| public-files | 公开文件（Banner、新闻图片等） | 公开 |
| private-files | 私有文件（附件、文档等） | 需签名 URL |

### 文件路径规范

```
{bucket}/{project_prefix}/{category}/{filename}

项目前缀: gangwon-portal
```

#### 公开文件路径（public-files）

| 类型 | 路径格式 | 示例 |
|------|---------|------|
| Banner | `gangwon-portal/banners/{type}.png` | `gangwon-portal/banners/main_primary.png` |
| 新闻主图 | `gangwon-portal/news/news_{id}_main.jpg` | `gangwon-portal/news/news_1_main.jpg` |
| 项目图片 | `gangwon-portal/projects/project_{id}.jpg` | `gangwon-portal/projects/project_1.jpg` |

#### 私有文件路径（private-files）

| 类型 | 路径格式 | 示例 |
|------|---------|------|
| 成果附件 | `gangwon-portal/attachments/{uuid}.pdf` | `gangwon-portal/attachments/abc123.pdf` |
| 消息附件 | `gangwon-portal/attachments/{uuid}.pdf` | `gangwon-portal/attachments/def456.pdf` |

### 图片生成规格

| 类型 | 尺寸 | 格式 | 说明 |
|------|------|------|------|
| Banner (MAIN) | 1920x600 | PNG | 主页大横幅 |
| Banner (其他) | 1920x400 | PNG | 页面横幅 |
| 新闻主图 | 1200x675 | JPEG | 详情页展示 |
| 项目图片 | 800x400 | JPEG | 项目卡片 |

## 法律条款（Legal Content）数据

### Legal Content 数据结构

```python
{
    "id": UUID,
    "content_type": "terms_of_service" | "privacy_policy",
    "content_html": "<h1>서비스 이용약관</h1>...",
    "updated_by": UUID | None,
    "updated_at": datetime,
    "created_at": datetime
}
```

### 测试法律条款数据

```python
legal_contents = [
    {
        "content_type": "terms_of_service",
        "content_html": """<h1>서비스 이용약관</h1>
<h2>제1조 (목적)</h2>
<p>이 약관은 강원 기업 포털(이하 "서비스")의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
<h2>제2조 (정의)</h2>
<p>1. "회원"이란 서비스에 가입하여 이용계약을 체결한 자를 말합니다.</p>
<p>2. "기업회원"이란 사업자등록번호를 보유한 법인 또는 개인사업자를 말합니다.</p>
..."""
    },
    {
        "content_type": "privacy_policy",
        "content_html": """<h1>개인정보처리방침</h1>
<h2>제1조 (개인정보의 수집 및 이용목적)</h2>
<p>강원 기업 포털은 다음의 목적을 위하여 개인정보를 처리합니다.</p>
<p>1. 회원 가입 및 관리</p>
<p>2. 서비스 제공 및 운영</p>
..."""
    }
]
```

## 消息/聊天数据（Message）

### Message 数据结构

```python
{
    "id": UUID,
    "message_type": "direct" | "thread" | "broadcast",
    "thread_id": UUID | None,
    "parent_id": UUID | None,
    "sender_id": UUID | None,
    "sender_type": "admin" | "member" | "system",
    "recipient_id": UUID | None,
    "subject": str,
    "content": str,
    "category": "general" | "notice" | "inquiry" | "performance",
    "status": "sent" | "delivered" | "read",
    "priority": "low" | "normal" | "high" | "urgent",
    "is_read": bool,
    "is_important": bool,
    "is_broadcast": bool,
    "broadcast_count": int | None,
    "read_at": datetime | None,
    "sent_at": datetime | None,
    "created_at": datetime
}
```

### 消息类型说明

| message_type | 说明 | 场景 |
|--------------|------|------|
| direct | 直接消息 | 管理员发给会员的通知 |
| thread | 会话消息 | 会员与管理员的对话 |
| broadcast | 广播消息 | 系统公告、批量通知 |

### 消息状态分布

```
is_read: true 60%, false 40%
is_important: true 15%, false 85%
priority: normal 70%, high 20%, low 8%, urgent 2%
```

## 注意事项

1. **事务原子性** - 所有操作在单个事务中执行，失败时回滚
2. **密码统一** - 所有测试账户密码为 `password123`
3. **真实事业者番号** - 使用 NICE D&B 可验证的真实号码
4. **图片生成** - Banner 和新闻图片自动生成并上传到 Storage
5. **外键完整性** - 确保关联数据的外键引用正确
6. **禁止生产环境** - 此脚本仅用于开发和测试环境
7. **日志独立** - 日志数据由系统运行时自动产生，不在此生成
8. **前后端分离** - 前端和后端各自维护独立的测试数据生成逻辑
