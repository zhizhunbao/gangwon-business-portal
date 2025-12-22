# Common Utilities

通用工具模块，提供跨模块复用的工具函数。

## 📦 模块结构

```
utils/
├── __init__.py          # 模块入口，导出所有公共函数
├── formatters.py        # 数据格式化工具
├── validators.py        # 数据验证工具
├── converters.py        # 数据转换工具
└── README.md           # 本文档
```

## 🎨 Formatters (格式化工具)

### 日期时间格式化

```python
from common.utils.formatters import (
    parse_datetime,
    parse_date,
    format_datetime_display,
    format_date_display,
    format_date_range_display,
    format_period_display,
)

# 解析日期时间
dt = parse_datetime("2024-01-15T10:30:00Z")  # -> datetime object
date = parse_date("2024-01-15")  # -> date object

# 格式化显示
formatted = format_datetime_display(dt)  # -> "2024.01.15 10:30"
formatted = format_date_display(date)  # -> "2024.01.15"
formatted = format_date_range_display(start_date, end_date)  # -> "2024.01.01 ~ 2024.12.31"
formatted = format_period_display(2024, 1)  # -> "2024년 1분기"
```

### 状态格式化

```python
from common.utils.formatters import (
    format_status_display,
    format_approval_status_display,
    format_member_status_display,
    format_performance_status_display,
    format_performance_type_display,
    format_board_type_display,
)

# 通用状态格式化
status = format_status_display("active", "project")  # -> "진행중"
status = format_status_display("active", "member")  # -> "활성"

# 特定状态格式化
status = format_approval_status_display("pending")  # -> "승인 대기"
status = format_member_status_display("active")  # -> "활성"
status = format_performance_status_display("submitted")  # -> "제출됨"
type_display = format_performance_type_display("sales")  # -> "매출실적"
board_type = format_board_type_display("notice")  # -> "공지사항"
```

### 数量格式化

```python
from common.utils.formatters import format_count_display, format_view_count_display

count = format_count_display(10)  # -> "10건"
count = format_count_display(5, "개")  # -> "5개"
views = format_view_count_display(100)  # -> "100회"
```

## ✅ Validators (验证工具)

```python
from common.utils.validators import (
    validate_business_number,
    validate_email_format,
    validate_phone_number,
    validate_uuid_format,
    validate_year_range,
    validate_quarter,
    validate_status_value,
    validate_file_size,
    validate_url_format,
)

# 业务号码验证
is_valid = validate_business_number("1234567890")  # -> True/False

# 邮箱验证
is_valid = validate_email_format("user@example.com")  # -> True/False

# 电话号码验证
is_valid = validate_phone_number("010-1234-5678")  # -> True/False

# UUID验证
is_valid = validate_uuid_format("550e8400-e29b-41d4-a716-446655440000")  # -> True/False

# 年份范围验证
is_valid = validate_year_range(2024, min_year=2000, max_year=2100)  # -> True/False

# 季度验证
is_valid = validate_quarter(1)  # -> True/False

# 状态值验证
is_valid = validate_status_value("active", ["active", "inactive"])  # -> True/False

# 文件大小验证
is_valid = validate_file_size(5242880, max_size_mb=10)  # -> True/False

# URL格式验证
is_valid = validate_url_format("https://example.com")  # -> True/False
```

## 🔄 Converters (转换工具)

```python
from common.utils.converters import (
    dict_to_model,
    model_to_dict,
    sanitize_dict,
    flatten_dict,
    normalize_string,
    clean_phone_number,
    clean_business_number,
    convert_to_serializable,
    merge_dicts,
    extract_fields,
    rename_keys,
)

# 字典与模型转换
model = dict_to_model(data_dict, MyModel)
data_dict = model_to_dict(model, exclude_none=True)

# 字典清理
clean_data = sanitize_dict(data, remove_keys=["password", "secret"])
clean_data = sanitize_dict(data, keep_keys=["id", "name", "email"])

# 字典扁平化
flat = flatten_dict({"user": {"name": "John", "age": 30}})
# -> {"user.name": "John", "user.age": 30}

# 字符串规范化
normalized = normalize_string("  Hello World  ")  # -> "hello world"

# 电话号码清理
clean = clean_phone_number("010-1234-5678")  # -> "01012345678"

# 业务号码清理
clean = clean_business_number("123-45-67890")  # -> "1234567890"

# JSON序列化转换
serializable = convert_to_serializable(obj)

# 字典合并
merged = merge_dicts(dict1, dict2, dict3)

# 字段提取
extracted = extract_fields(data, ["id", "name", "email"])

# 键重命名
renamed = rename_keys(data, {"old_key": "new_key"})
```

## 📝 在 Schemas 中使用

```python
from pydantic import BaseModel
from common.utils.formatters import (
    parse_datetime,
    format_datetime_display,
    format_status_display,
)

class MyListItem(BaseModel):
    id: UUID
    name: str
    status: str
    created_at: datetime
    
    # 格式化显示字段
    status_display: str
    created_at_display: str
    
    @classmethod
    def from_db_dict(cls, data: dict):
        return cls(
            id=data["id"],
            name=data["name"],
            status=data["status"],
            created_at=parse_datetime(data["created_at"]),
            
            # 使用 utils 格式化
            status_display=format_status_display(data["status"], "project"),
            created_at_display=format_datetime_display(data["created_at"]),
        )
```

## 🎯 设计原则

1. **单一职责** - 每个函数只做一件事
2. **严格验证** - 数据不符合要求就抛出异常，不隐藏问题
3. **类型安全** - 使用类型提示，便于IDE自动补全
4. **可复用** - 所有函数都是纯函数，无副作用
5. **文档完整** - 每个函数都有详细的文档字符串

## 🔧 扩展指南

### 添加新的格式化函数

1. 在 `formatters.py` 中添加函数
2. 在 `__init__.py` 中导出
3. 更新本 README 文档

### 添加新的验证函数

1. 在 `validators.py` 中添加函数
2. 在 `__init__.py` 中导出
3. 更新本 README 文档

### 添加新的转换函数

1. 在 `converters.py` 中添加函数
2. 在 `__init__.py` 中导出
3. 更新本 README 文档

## ⚠️ 注意事项

1. **不要在 utils 中引入业务逻辑** - utils 应该是纯工具函数
2. **保持函数简单** - 复杂的逻辑应该拆分成多个小函数
3. **避免循环依赖** - utils 不应该依赖其他业务模块
4. **统一错误处理** - 验证失败应该抛出明确的异常
5. **保持向后兼容** - 修改现有函数时要考虑兼容性