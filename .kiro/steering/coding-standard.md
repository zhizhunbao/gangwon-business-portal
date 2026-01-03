# 编码规范 (Coding Standard)

## 概述

本规范定义了项目编码的核心原则和禁止事项。

---

## 一、禁止事项

### 1. 禁止向后兼容代码

```python
# ❌ 禁止：创建别名保持向后兼容
AppException = AbstractCustomException  # 不要这样做

# ❌ 禁止：保留旧的函数名
create_unified_client = create_unified_supabase_client  # 不要这样做

# ✅ 正确：直接使用新名称，修改所有调用方
from .exception import ICustomException
```

### 2. 禁止 Fallback 逻辑

```python
# ❌ 禁止：使用 fallback 默认值
def get_config(key: str) -> str:
    return config.get(key) or DEFAULT_VALUE  # 不要这样做

# ❌ 禁止：try-except 作为 fallback
try:
    result = new_api()
except:
    result = old_api()  # 不要这样做

# ✅ 正确：明确要求必需的值
def get_config(key: str) -> str:
    if key not in config:
        raise ConfigError(f"Missing required config: {key}")
    return config[key]
```

### 3. 禁止 Optional 参数默认值

```python
# ❌ 禁止：Optional 参数带默认 None
def create_user(
    name: str,
    email: Optional[str] = None,  # 不要这样做
    role: Optional[str] = None,   # 不要这样做
):
    ...

# ❌ 禁止：使用 or 提供默认值
self.config = config or DatabaseConfig()  # 不要这样做

# ✅ 正确：明确要求所有必需参数
def create_user(
    name: str,
    email: str,
    role: str,
):
    ...

# ✅ 正确：使用显式的必需参数
def __init__(self, config: DatabaseConfig):
    self.config = config
```

---

## 二、类型注解规范

### 必须使用明确类型

```python
# ❌ 禁止
def process(data):  # 缺少类型注解
    ...

def get_user(id) -> dict:  # 返回类型太宽泛
    ...

# ✅ 正确
def process(data: UserData) -> ProcessResult:
    ...

def get_user(id: int) -> User:
    ...
```

### 禁止 Any 类型

```python
# ❌ 禁止
def handle(data: Any) -> Any:
    ...

# ✅ 正确：使用具体类型或泛型
from typing import TypeVar

T = TypeVar('T')

def handle(data: T) -> T:
    ...
```

---

## 三、异常处理规范

### 使用接口类型

```python
# ❌ 禁止：使用具体实现类
from .exception import AbstractCustomException
except AbstractCustomException as exc:
    ...

# ✅ 正确：使用接口类型
from .exception import ICustomException
except ICustomException as exc:
    ...
```

### 禁止裸 except

```python
# ❌ 禁止
try:
    ...
except:
    pass

try:
    ...
except Exception:
    pass

# ✅ 正确：捕获具体异常
try:
    ...
except ValidationError as exc:
    handle_validation_error(exc)
except DatabaseError as exc:
    handle_database_error(exc)
```

---

## 四、导入规范

### 从模块根导入接口

```python
# ❌ 禁止：从内部路径导入
from .exception._01_contracts.i_exception import ICustomException

# ✅ 正确：从模块根导入
from .exception import ICustomException
```

### 导入顺序

```python
# 1. 标准库
import os
import sys
from typing import Dict, List

# 2. 第三方库
from fastapi import APIRouter
from pydantic import BaseModel

# 3. 本地模块
from .service import UserService
from ..common.modules.exception import ICustomException
```

---

## 五、命名规范

### 接口命名

| 类型 | 前缀 | 示例 |
|------|------|------|
| 接口 | `I` | `IUserService`, `ICustomException` |
| 数据契约 | `D` | `DUserContext`, `DExceptionRecord` |
| 枚举 | `E` | `EUserRole`, `EExceptionType` |
| 常量类 | `C` | `CFieldFormat`, `CMessageTemplate` |
| 抽象类 | `Abstract` | `AbstractClassifier` |

### 禁止别名

```python
# ❌ 禁止：创建类型别名
UserDict = Dict[str, Any]
AppException = AbstractCustomException

# ✅ 正确：直接使用原始类型
def get_user() -> Dict[str, str]:
    ...
```

---

## 六、检查清单

### 代码审查检查点

- [ ] 是否有向后兼容的别名？
- [ ] 是否有 fallback 逻辑？
- [ ] 是否有 `Optional` 参数带默认 `None`？
- [ ] 是否有 `Any` 类型？
- [ ] 是否有裸 `except`？
- [ ] 是否从模块根导入？
- [ ] 类型注解是否完整？
