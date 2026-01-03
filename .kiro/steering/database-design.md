# 数据库设计规范 (Database Design Standards)

## 概述

本规范定义了数据库设计的范式、命名规范和最佳实践。

---

## 一、数据库范式 (Normal Forms)

### 第一范式 (1NF) - 原子性

**定义**: 每个字段都是不可分割的原子值。

**✅ 正确做法:**
```sql
-- 每个字段存储单一值
CREATE TABLE users (
    id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20)
);

-- 多值用关联表
CREATE TABLE user_phones (
    user_id INT,
    phone VARCHAR(20),
    phone_type VARCHAR(10),  -- 'mobile', 'home', 'work'
    PRIMARY KEY (user_id, phone)
);
```

**❌ 错误做法:**
```sql
-- 字段包含多个值
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(100),           -- 应拆分为 first_name, last_name
    phones VARCHAR(200)          -- 存储 "138xxx,139xxx" 违反 1NF
);
```

---

### 第二范式 (2NF) - 完全依赖

**定义**: 满足 1NF，且非主键字段完全依赖于主键（消除部分依赖）。

**✅ 正确做法:**
```sql
-- 订单表
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE
);

-- 订单明细表（复合主键）
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10,2),    -- 依赖于 order_id + product_id
    PRIMARY KEY (order_id, product_id)
);

-- 产品表（独立）
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),   -- 只依赖于 product_id
    category VARCHAR(50)
);
```

**❌ 错误做法:**
```sql
-- product_name 只依赖于 product_id，不依赖于 order_id
CREATE TABLE order_items (
    order_id INT,
    product_id INT,
    quantity INT,
    product_name VARCHAR(100),   -- 部分依赖，违反 2NF
    PRIMARY KEY (order_id, product_id)
);
```

---

### 第三范式 (3NF) - 消除传递依赖

**定义**: 满足 2NF，且非主键字段不依赖于其他非主键字段。

**✅ 正确做法:**
```sql
-- 员工表
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    name VARCHAR(100),
    department_id INT
);

-- 部门表（独立）
CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(100),
    manager_id INT
);
```

**❌ 错误做法:**
```sql
-- department_name 依赖于 department_id，而非 employee_id
CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    name VARCHAR(100),
    department_id INT,
    department_name VARCHAR(100)  -- 传递依赖，违反 3NF
);
```

---

### BCNF (Boyce-Codd 范式)

**定义**: 满足 3NF，且每个决定因素都是候选键。

**适用场景**: 存在多个候选键且相互重叠时

```sql
-- 问题：一个学生只能选一个导师，一个导师只教一门课
-- student_id, subject -> tutor (学生+科目决定导师)
-- tutor -> subject (导师决定科目，但 tutor 不是候选键)

-- BCNF 解决方案：拆分表
CREATE TABLE tutor_subjects (
    tutor_id INT PRIMARY KEY,
    subject VARCHAR(50)
);

CREATE TABLE student_tutors (
    student_id INT,
    tutor_id INT,
    PRIMARY KEY (student_id, tutor_id)
);
```

---

### 范式选择指南

| 范式 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| 1NF | 基本数据完整性 | - | 所有场景必须满足 |
| 2NF | 减少数据冗余 | 需要更多 JOIN | 有复合主键时 |
| 3NF | 消除更新异常 | 查询复杂度增加 | OLTP 系统 |
| BCNF | 最严格的规范化 | 可能过度拆分 | 数据完整性要求高 |
| 反范式 | 查询性能好 | 数据冗余 | OLAP/报表系统 |

---

## 二、命名规范

### 表命名

```sql
-- ✅ 正确
users                    -- 小写复数
order_items              -- 下划线分隔
user_login_logs          -- 清晰描述

-- ❌ 错误
User                     -- 不要大写
OrderItem                -- 不要驼峰
tbl_users                -- 不要前缀
user                     -- 不要单数
```

### 字段命名

```sql
-- ✅ 正确
id                       -- 主键
user_id                  -- 外键：表名_id
created_at               -- 时间戳：动词_at
is_active                -- 布尔：is_/has_/can_
email                    -- 简洁明了

-- ❌ 错误
ID                       -- 不要大写
userId                   -- 不要驼峰
fk_user                  -- 不要前缀
create_time              -- 统一用 _at
active                   -- 布尔字段加 is_
```

### 索引命名

```sql
-- 格式：idx_{表名}_{字段名}
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id_status ON orders(user_id, status);

-- 唯一索引：uk_{表名}_{字段名}
CREATE UNIQUE INDEX uk_users_email ON users(email);

-- 主键：pk_{表名}
ALTER TABLE users ADD CONSTRAINT pk_users PRIMARY KEY (id);
```

### ⚠️ 禁止使用外键约束

**原因：**
- 性能：外键检查增加写入开销
- 扩展性：分库分表时无法使用外键
- 灵活性：数据迁移、修复更方便
- 运维：避免级联删除导致的意外数据丢失

**替代方案：**
- 应用层保证数据完整性
- Repository 层检查关联数据
- 使用软删除代替硬删除
- 定期运行数据一致性检查脚本

---

## 三、表设计规范

### 必备字段

```sql
CREATE TABLE example (
    -- 主键
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- 业务字段
    ...
    
    -- 审计字段（必须）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- 软删除（推荐）
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at TIMESTAMP NULL
);
```

### 主键设计

```sql
-- ✅ 推荐：自增 BIGINT
id BIGINT AUTO_INCREMENT PRIMARY KEY

-- ✅ 分布式：雪花算法 ID
id BIGINT PRIMARY KEY  -- 应用层生成

-- ✅ 需要全局唯一：UUID
id CHAR(36) PRIMARY KEY  -- 或 BINARY(16)

-- ❌ 避免：业务字段作主键
email VARCHAR(100) PRIMARY KEY  -- 可能变化
```

### 字段类型选择

| 数据类型 | 推荐类型 | 说明 |
|---------|---------|------|
| 主键/外键 | BIGINT | 8 字节，足够大 |
| 金额 | DECIMAL(19,4) | 精确计算，避免浮点 |
| 状态/类型 | TINYINT | 配合枚举使用 |
| 布尔 | TINYINT(1) | 0/1 |
| 短文本 | VARCHAR(n) | 指定合理长度 |
| 长文本 | TEXT | 不指定长度 |
| 日期 | DATE | 只存日期 |
| 时间戳 | TIMESTAMP | 自动时区转换 |
| JSON | JSON | MySQL 5.7+ |

---

## 四、索引设计

### 索引原则

```sql
-- 1. 主键自动创建聚簇索引
-- 2. 外键必须创建索引
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 3. 高频查询字段创建索引
CREATE INDEX idx_users_email ON users(email);

-- 4. 复合索引遵循最左前缀
CREATE INDEX idx_orders_user_status_date ON orders(user_id, status, created_at);
-- 可用于: WHERE user_id = ?
-- 可用于: WHERE user_id = ? AND status = ?
-- 不可用于: WHERE status = ?  (跳过了 user_id)

-- 5. 覆盖索引减少回表
CREATE INDEX idx_users_email_name ON users(email, name);
-- SELECT name FROM users WHERE email = ?  -- 不需要回表
```

### 索引禁忌

```sql
-- ❌ 不要在低基数字段建索引
CREATE INDEX idx_users_gender ON users(gender);  -- 只有 M/F

-- ❌ 不要在频繁更新的字段建索引
CREATE INDEX idx_users_login_count ON users(login_count);

-- ❌ 不要创建过多索引（一般不超过 5 个）

-- ❌ 不要在 WHERE 中对索引字段使用函数
SELECT * FROM users WHERE YEAR(created_at) = 2024;  -- 索引失效
-- ✅ 改为
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
```

---

## 五、关系设计

### 一对一 (1:1)

```sql
-- 方案1：合并到一张表（推荐）
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100),
    -- 用户详情字段
    bio TEXT,
    avatar_url VARCHAR(255)
);

-- 方案2：拆分表（字段多或访问频率不同时）
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY,  -- 同时是主键，逻辑上关联 users.id
    bio TEXT,
    avatar_url VARCHAR(255)
    -- 不使用 FOREIGN KEY 约束，应用层保证完整性
);
```

### 一对多 (1:N)

```sql
-- 在"多"的一方添加关联字段
CREATE TABLE departments (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE employees (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100),
    department_id BIGINT  -- 逻辑外键，不加约束
    -- 不使用 FOREIGN KEY 约束，应用层保证完整性
);

-- 必须创建索引
CREATE INDEX idx_employees_department_id ON employees(department_id);
```

### 多对多 (M:N)

```sql
-- 使用中间表
CREATE TABLE students (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE courses (
    id BIGINT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE student_courses (
    student_id BIGINT,           -- 逻辑外键
    course_id BIGINT,            -- 逻辑外键
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade DECIMAL(3,1),
    PRIMARY KEY (student_id, course_id)
    -- 不使用 FOREIGN KEY 约束，应用层保证完整性
);

-- 必须创建索引
CREATE INDEX idx_student_courses_course_id ON student_courses(course_id);
```

---

## 六、反范式设计

### 何时使用反范式

| 场景 | 反范式策略 | 原因 |
|------|-----------|------|
| 高频读取 | 冗余字段 | 减少 JOIN |
| 统计查询 | 汇总表 | 避免实时计算 |
| 历史快照 | 复制字段 | 保留历史状态 |

### 冗余字段示例

```sql
-- 订单表冗余用户名（避免每次 JOIN users 表）
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    user_name VARCHAR(100),      -- 冗余字段
    total_amount DECIMAL(19,4),
    created_at TIMESTAMP
);

-- 注意：需要同步更新机制
-- 1. 应用层同步
-- 2. 触发器同步
-- 3. 定时任务同步
```

### 汇总表示例

```sql
-- 每日销售汇总（避免实时 SUM）
CREATE TABLE daily_sales_summary (
    date DATE PRIMARY KEY,
    total_orders INT,
    total_amount DECIMAL(19,4),
    updated_at TIMESTAMP
);

-- 定时任务更新
INSERT INTO daily_sales_summary (date, total_orders, total_amount)
SELECT DATE(created_at), COUNT(*), SUM(total_amount)
FROM orders
WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
ON DUPLICATE KEY UPDATE
    total_orders = VALUES(total_orders),
    total_amount = VALUES(total_amount),
    updated_at = NOW();
```

---

## 七、设计检查清单

### 表设计

- [ ] 是否有主键？
- [ ] 是否有 created_at, updated_at？
- [ ] 是否需要软删除？
- [ ] 字段类型是否合适？
- [ ] 字段长度是否合理？
- [ ] 是否有默认值？
- [ ] 是否有 NOT NULL 约束？

### 索引设计

- [ ] 关联字段是否有索引？
- [ ] 高频查询字段是否有索引？
- [ ] 复合索引顺序是否正确？
- [ ] 索引数量是否合理（≤5）？

### 范式检查

- [ ] 是否满足 1NF（无重复组）？
- [ ] 是否满足 2NF（无部分依赖）？
- [ ] 是否满足 3NF（无传递依赖）？
- [ ] 反范式是否有充分理由？

### 命名检查

- [ ] 表名是否小写复数？
- [ ] 字段名是否小写下划线？
- [ ] 索引名是否规范？
- [ ] 关联字段命名是否为 {表名}_id？

### 数据完整性

- [ ] 应用层是否检查关联数据存在？
- [ ] 是否使用软删除？
- [ ] 是否有数据一致性检查机制？
