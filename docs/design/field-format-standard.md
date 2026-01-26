# 字段格式规范 (Field Format Standard)

## 概述

本规范定义了数据库字段和 API 字段的格式标准，确保数据一致性。

---

## 一、主键与关联字段

### 主键

```sql
-- 格式：id
-- 类型：BIGINT AUTO_INCREMENT 或 雪花算法
id BIGINT AUTO_INCREMENT PRIMARY KEY

-- 示例
1234567890123456789
```

### 关联字段（逻辑外键）

```sql
-- 格式：{关联表名单数}_id
-- 类型：BIGINT

user_id BIGINT           -- 关联 users 表
order_id BIGINT          -- 关联 orders 表
department_id BIGINT     -- 关联 departments 表
parent_id BIGINT         -- 自关联（树形结构）
```

---

## 二、时间字段

### 命名规范

```sql
-- 格式：{动作}_at
-- 类型：TIMESTAMP 或 DATETIME

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- 创建时间
updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP    -- 更新时间
deleted_at TIMESTAMP NULL                           -- 删除时间（软删除）
published_at TIMESTAMP NULL                         -- 发布时间
expired_at TIMESTAMP NULL                           -- 过期时间
started_at TIMESTAMP NULL                           -- 开始时间
ended_at TIMESTAMP NULL                             -- 结束时间
logged_in_at TIMESTAMP NULL                         -- 登录时间
verified_at TIMESTAMP NULL                          -- 验证时间
```

### 存储格式

```sql
-- 数据库存储：UTC 时间
-- API 返回：ISO 8601 格式

-- 示例
"2024-01-15T08:30:00Z"           -- UTC
"2024-01-15T16:30:00+08:00"      -- 带时区
```

### 日期字段（无时间）

```sql
-- 格式：{名称}_date 或 {名称}_on
-- 类型：DATE

birth_date DATE                  -- 出生日期
due_date DATE                    -- 截止日期
effective_date DATE              -- 生效日期
```

---

## 三、布尔字段

### 命名规范

```sql
-- 格式：is_{状态} / has_{属性} / can_{能力}
-- 类型：TINYINT(1)，值为 0 或 1

is_active TINYINT(1) DEFAULT 1       -- 是否激活
is_deleted TINYINT(1) DEFAULT 0      -- 是否删除
is_verified TINYINT(1) DEFAULT 0     -- 是否验证
is_published TINYINT(1) DEFAULT 0    -- 是否发布
is_default TINYINT(1) DEFAULT 0      -- 是否默认
is_locked TINYINT(1) DEFAULT 0       -- 是否锁定

has_password TINYINT(1) DEFAULT 0    -- 是否有密码
has_avatar TINYINT(1) DEFAULT 0      -- 是否有头像

can_edit TINYINT(1) DEFAULT 1        -- 是否可编辑
can_delete TINYINT(1) DEFAULT 1      -- 是否可删除
```

---

## 四、状态与类型字段

### 状态字段

```sql
-- 格式：status 或 {名称}_status
-- 类型：TINYINT 或 VARCHAR(20)

status TINYINT DEFAULT 0             -- 通用状态
order_status TINYINT DEFAULT 0       -- 订单状态
payment_status TINYINT DEFAULT 0     -- 支付状态

-- 状态值定义（应用层枚举）
-- 0: pending    待处理
-- 1: processing 处理中
-- 2: completed  已完成
-- 3: cancelled  已取消
-- 4: failed     失败
```

### 类型字段

```sql
-- 格式：type 或 {名称}_type
-- 类型：TINYINT 或 VARCHAR(20)

type TINYINT                         -- 通用类型
user_type TINYINT                    -- 用户类型
notification_type VARCHAR(20)        -- 通知类型

-- 类型值定义（应用层枚举）
-- 1: admin      管理员
-- 2: user       普通用户
-- 3: guest      访客
```

---

## 五、数值字段

### 金额字段

```sql
-- 格式：{名称}_amount 或 price / cost / fee
-- 类型：DECIMAL(19,4)
-- 单位：最小货币单位（分）或标准单位（元）

price DECIMAL(19,4)                  -- 价格
total_amount DECIMAL(19,4)           -- 总金额
discount_amount DECIMAL(19,4)        -- 折扣金额
shipping_fee DECIMAL(19,4)           -- 运费
tax_amount DECIMAL(19,4)             -- 税额

-- 存储建议：以分为单位存储整数，避免浮点精度问题
-- price_cents INT                   -- 价格（分）
```

### 数量字段

```sql
-- 格式：{名称}_count 或 quantity / num
-- 类型：INT 或 BIGINT

quantity INT DEFAULT 0               -- 数量
stock_count INT DEFAULT 0            -- 库存数量
view_count BIGINT DEFAULT 0          -- 浏览次数
like_count INT DEFAULT 0             -- 点赞数
comment_count INT DEFAULT 0          -- 评论数
```

### 百分比字段

```sql
-- 格式：{名称}_rate 或 {名称}_percent
-- 类型：DECIMAL(5,2)
-- 范围：0.00 - 100.00

discount_rate DECIMAL(5,2)           -- 折扣率
tax_rate DECIMAL(5,2)                -- 税率
progress_percent DECIMAL(5,2)        -- 进度百分比
```

### 排序字段

```sql
-- 格式：sort_order 或 {名称}_order
-- 类型：INT
-- 规则：数值越小越靠前

sort_order INT DEFAULT 0             -- 排序顺序
display_order INT DEFAULT 0          -- 显示顺序
```

---

## 六、文本字段

### 名称字段

```sql
-- 格式：name 或 {类型}_name
-- 类型：VARCHAR(n)

name VARCHAR(100)                    -- 名称
display_name VARCHAR(100)            -- 显示名称
first_name VARCHAR(50)               -- 名
last_name VARCHAR(50)                -- 姓
nick_name VARCHAR(50)                -- 昵称
```

### 标题与描述

```sql
-- 标题
title VARCHAR(200)                   -- 标题

-- 描述
description TEXT                     -- 描述
summary VARCHAR(500)                 -- 摘要
content TEXT                         -- 内容
remark VARCHAR(500)                  -- 备注
```

### 编码字段

```sql
-- 格式：{名称}_code 或 {名称}_no
-- 类型：VARCHAR(n)

code VARCHAR(50)                     -- 编码
order_no VARCHAR(32)                 -- 订单号
serial_no VARCHAR(50)                -- 序列号
tracking_no VARCHAR(50)              -- 物流单号
```

---

## 七、联系方式字段

### 电话

```sql
-- 格式：phone / mobile / tel
-- 类型：VARCHAR(20)
-- 存储：纯数字，不含分隔符

phone VARCHAR(20)                    -- 电话
mobile VARCHAR(20)                   -- 手机
tel VARCHAR(20)                      -- 座机

-- 示例
"13812345678"                        -- 手机
"02112345678"                        -- 座机
"+8613812345678"                     -- 国际格式
```

### 邮箱

```sql
-- 格式：email
-- 类型：VARCHAR(100)
-- 验证：RFC 5322 标准

email VARCHAR(100)

-- 示例
"user@example.com"
```

### 地址

```sql
-- 拆分存储
country VARCHAR(50)                  -- 国家
province VARCHAR(50)                 -- 省份
city VARCHAR(50)                     -- 城市
district VARCHAR(50)                 -- 区县
address VARCHAR(200)                 -- 详细地址
postal_code VARCHAR(20)              -- 邮编

-- 或完整地址
full_address VARCHAR(500)            -- 完整地址
```

---

## 八、URL 与路径字段

### URL

```sql
-- 格式：{名称}_url
-- 类型：VARCHAR(500) 或 TEXT

url VARCHAR(500)                     -- 链接
avatar_url VARCHAR(500)              -- 头像链接
cover_url VARCHAR(500)               -- 封面链接
website_url VARCHAR(500)             -- 网站链接
callback_url VARCHAR(500)            -- 回调链接
```

### 文件路径

```sql
-- 格式：{名称}_path
-- 类型：VARCHAR(500)

file_path VARCHAR(500)               -- 文件路径
image_path VARCHAR(500)              -- 图片路径
```

---

## 九、JSON 字段

```sql
-- 格式：{名称} 或 {名称}_json / {名称}_data
-- 类型：JSON

settings JSON                        -- 设置
metadata JSON                        -- 元数据
extra_data JSON                      -- 扩展数据
attributes JSON                      -- 属性

-- 示例
{
    "theme": "dark",
    "language": "zh-CN",
    "notifications": {
        "email": true,
        "sms": false
    }
}
```

---

## 十、审计字段

### 标准审计字段（每张表必须）

```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
created_by BIGINT                    -- 创建人 ID
updated_by BIGINT                    -- 更新人 ID
```

### 软删除字段

```sql
is_deleted TINYINT(1) DEFAULT 0
deleted_at TIMESTAMP NULL
deleted_by BIGINT NULL               -- 删除人 ID
```

### 版本控制

```sql
version INT DEFAULT 1                -- 乐观锁版本号
```

---

## 十一、字段长度参考

| 字段类型 | 推荐长度 | 说明 |
|---------|---------|------|
| 用户名 | VARCHAR(50) | |
| 昵称 | VARCHAR(50) | |
| 邮箱 | VARCHAR(100) | |
| 手机号 | VARCHAR(20) | 含国际区号 |
| 密码哈希 | VARCHAR(255) | bcrypt 等 |
| 标题 | VARCHAR(200) | |
| 摘要 | VARCHAR(500) | |
| URL | VARCHAR(500) | |
| 编码 | VARCHAR(50) | |
| IP 地址 | VARCHAR(45) | IPv6 最长 |
| UUID | CHAR(36) | |
| 国家/省市 | VARCHAR(50) | |
| 详细地址 | VARCHAR(200) | |

---

## 十二、命名检查清单

- [ ] 主键是否为 `id`？
- [ ] 关联字段是否为 `{表名}_id`？
- [ ] 时间字段是否以 `_at` 结尾？
- [ ] 日期字段是否以 `_date` 结尾？
- [ ] 布尔字段是否以 `is_/has_/can_` 开头？
- [ ] 金额字段是否使用 DECIMAL？
- [ ] 状态字段是否为 `status` 或 `{名称}_status`？
- [ ] URL 字段是否以 `_url` 结尾？
- [ ] 是否有审计字段（created_at, updated_at）？
