# 模块分层规范 (Module Layering Standard)

## 概述

本规范定义了 `backend/src/common/modules/` 下模块的标准分层结构，确保代码高内聚、低耦合、易于维护和扩展。

## 目录结构

```
module_name/
├── _01_contracts/                      # 契约层 - 接口和数据契约
│   ├── __init__.py
│   ├── i_{name}.py                     # 服务接口
│   ├── r_{name}.py                     # Repository 接口
│   ├── d_{name}.py                     # 数据契约
│   ├── e_{name}.py                     # 枚举契约
│   ├── t_{name}.py                     # 类型契约
│   ├── c_{name}.py                     # 常量契约
│   ├── exc_{name}.py                   # 异常契约
│   └── ...
│
├── _02_abstracts/                      # 抽象层 - 抽象基类
│   ├── __init__.py
│   ├── abstract_{name}.py              # 每个抽象类一个文件
│   └── ...
│
├── _03_impls/                          # 实现层 - 具体实现
│   ├── __init__.py
│   ├── impl_{name}.py                  # 具体实现类
│   ├── factory_{name}.py               # 工厂类
│   ├── strategy_{name}.py              # 策略类
│   └── ...
│
├── _04_services/                       # 服务层 - 对外统一入口
│   ├── __init__.py
│   └── service_{name}.py               # 服务入口类
│
├── _05_dtos/                           # DTO层 - 数据传输对象
│   ├── __init__.py
│   ├── dto_{name}.py                   # Pydantic 请求/响应模型
│   └── ...
│
├── _06_models/                         # 模型层 - 数据库模型
│   ├── __init__.py
│   ├── model_{name}.py                 # 数据库 ORM 模型
│   ├── repo_{name}.py                  # Repository 实现
│   └── ...
│
├── _07_router/                         # 路由层 - 路由端点
│   ├── __init__.py
│   ├── router_{name}.py                # 路由定义
│   └── deps_{name}.py                  # 依赖注入
│
├── _08_utils/                          # 辅助层 - 工具类
│   ├── __init__.py
│   ├── handler_{name}.py               # 处理器
│   ├── helper_{name}.py                # 辅助函数
│   ├── code_{name}.py                  # 错误码/状态码
│   └── ...
│
└── __init__.py                         # 统一导出
```

## 层级说明

### _01_contracts - 契约层
- **职责**: 定义跨层共享的契约（接口、数据结构、枚举、类型、常量）
- **依赖**: 无依赖，最底层

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `i_` | 服务接口 (ABC/Protocol) | `i_exception_recorder.py` | `I{Name}` |
| `r_` | Repository 接口 (数据访问抽象) | `r_exception.py` | `I{Name}Repository` |
| `d_` | 数据契约 (dataclass/Pydantic BaseModel) | `d_exception_context.py` | `D{Name}` |
| `e_` | 枚举契约 (Enum) | `e_exception_level.py` | `E{Name}` |
| `t_` | 类型契约 (TypeAlias/TypedDict/Generic) | `t_exception_handler.py` | `T{Name}` |
| `c_` | 常量契约 | `c_exception_defaults.py` | `C{Name}` |
| `exc_` | 异常契约 | `exc_validation.py` | `{Name}Error`, `{Name}Exception` |

**❌ 禁止包含:**
- 具体实现逻辑（业务代码）
- 数据库 ORM 模型
- 依赖外部服务的代码
- 任何 import 非标准库或 _01_contracts 内部的模块

**说明**:
- 接口 (`i_`): 定义服务行为，由 `_02_abstracts` 或 `_03_impls` 实现
- Repository 接口 (`r_`): 定义数据访问抽象，由 `_06_models` 实现，实现依赖倒置
- 数据契约 (`d_`): 定义跨层传递的数据结构，使用 dataclass 或 Pydantic BaseModel
- 枚举契约 (`e_`): 定义跨层共享的枚举值
- 类型契约 (`t_`): 定义复杂类型签名、回调函数类型等
- 常量契约 (`c_`): 定义跨层共享的常量、默认值
- 异常契约 (`exc_`): 定义模块可能抛出的异常类型

---

### _02_abstracts - 抽象层
- **职责**: 抽象基类 (ABC)，实现通用逻辑模板
- **依赖**: 仅依赖 _01_contracts

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `abstract_` | 抽象基类 (ABC) | `abstract_classifier.py` | `Abstract{Name}` |

**❌ 禁止包含:**
- 可直接实例化的具体类
- 数据模型定义
- 工具函数
- 依赖 _03_impls 及以上层的代码

**示例**: `abstract_classifier.py` → `AbstractExceptionClassifier`

---

### _03_impls - 实现层
- **职责**: 具体实现类，继承抽象类或实现接口
- **依赖**: 依赖 _01_contracts, _02_abstracts (通过 Repository 接口访问数据，不直接依赖 _06_models)

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `impl_` | 具体实现类 | `impl_classifier.py` | `{Name}` |
| `factory_` | 工厂类 | `factory_classifier.py` | `{Name}Factory` |
| `registry_` | 注册表类 | `registry_handler.py` | `{Name}Registry` |
| `adapter_` | 适配器类 | `adapter_legacy.py` | `{Name}Adapter` |
| `strategy_` | 策略类 | `strategy_retry.py` | `{Name}Strategy` |

**❌ 禁止包含:**
- 路由/API 端点
- 纯工具函数（应放 _08_utils）
- 数据模型定义（应放 _05_dtos 或 _06_models）
- 直接依赖 _06_models（应通过 _01_contracts 的 Repository 接口）
- 依赖 _04_services 及以上层的代码

**示例**: `impl_classifier.py` → `ExceptionClassifier`

---

### _04_services - 服务层
- **职责**: 对外统一入口，组合实现类，编排业务流程
- **依赖**: 依赖 _01_contracts, _03_impls, _05_data, _07_utils

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `service_` | 服务入口类 | `service_exception.py` | `{Module}Service` |

**❌ 禁止包含:**
- 路由/API 端点
- 底层实现细节
- 数据模型定义
- 工具函数

**示例**: `service_exception.py` → `ExceptionService`

---

### _05_dtos - DTO层
- **职责**: 数据传输对象，API 请求/响应模型
- **依赖**: 可依赖 _01_contracts

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `dto_` | Pydantic 请求/响应模型 | `dto_exception.py` | `{Name}Request`, `{Name}Response`, `{Name}DTO` |

**❌ 禁止包含:**
- 业务逻辑
- 服务类
- 工具函数
- 路由端点
- 数据库 ORM 模型
- 跨层共享的数据契约（应放 _01_contracts）

---

### _06_models - 模型层
- **职责**: 数据库 ORM 模型定义，实现 Repository 接口
- **依赖**: 依赖 _01_contracts (实现 Repository 接口)

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类命名格式 |
|------|------|----------|------------|
| `model_` | 数据库 ORM 模型 | `model_exception.py` | `{Name}Model` |
| `repo_` | Repository 实现 | `repo_exception.py` | `{Name}Repository` |

**❌ 禁止包含:**
- 业务逻辑
- 服务类
- 工具函数
- 路由端点
- DTO/Schema 定义

---

### _07_router - 路由层
- **职责**: FastAPI 路由端点，HTTP 请求处理
- **依赖**: 依赖 _04_services, _05_data

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类/函数命名格式 |
|------|------|----------|-----------------|
| `router` | 路由定义 | `router.py` | `router` (APIRouter 实例) |
| `deps_` | 依赖注入 | `deps_auth.py` | `get_{name}` |

**❌ 禁止包含:**
- 业务逻辑（应放 _04_services）
- 数据库操作
- 复杂数据处理

---

### _08_utils - 辅助层
- **职责**: 通用工具类、辅助函数
- **依赖**: 可依赖 _01_contracts, _05_data

**✅ 只能包含:**
| 前缀 | 用途 | 文件示例 | 类/函数命名格式 |
|------|------|----------|-----------------|
| `handler_` | 处理器 | `handler_exception.py` | `{Name}Handler` |
| `helper_` | 辅助函数 | `helper_format.py` | `{name}_helper` 或 `{Name}Helper` |
| `decorator_` | 装饰器 | `decorator_retry.py` | `{name}_decorator` (函数) |
| `validator_` | 验证器 | `validator_input.py` | `{Name}Validator` |
| `converter_` | 转换器 | `converter_datetime.py` | `{Name}Converter` |
| `parser_` | 解析器 | `parser_traceback.py` | `{Name}Parser` |
| `formatter_` | 格式化器 | `formatter_message.py` | `{Name}Formatter` |
| `code_` | 错误码/状态码 | `code_error.py` | `{Name}Code` |

**❌ 禁止包含:**
- 业务逻辑
- 服务类
- 数据模型
- 路由端点
- 工厂类、注册表（应放 _03_impls）
- 中间件（应放独立的 middleware 模块）

## 命名规范

### 目录命名
- 使用 `_{序号}_{层名}` 格式（下划线前缀避免 Python 导入问题）
- 序号两位数: `01`, `02`, `03`...
- 层名小写下划线: `contracts`, `abstracts`, `impls`

### 文件命名
- 使用 snake_case
- 契约层接口文件: `i_{name}.py`
- 契约层 Repository 接口: `r_{name}.py`
- 契约层数据文件: `d_{name}.py`
- 契约层枚举文件: `e_{name}.py`
- 契约层类型文件: `t_{name}.py`
- 契约层常量文件: `c_{name}.py`
- 契约层异常文件: `exc_{name}.py`
- 抽象类文件: `abstract_{name}.py`
- 实现类文件: `impl_{name}.py`
- 服务类文件: `service_{name}.py`
- DTO 文件: `dto_{name}.py`
- ORM 模型文件: `model_{name}.py`
- Repository 实现文件: `repo_{name}.py`
- 路由文件: `router_{name}.py`, `deps_{name}.py`
- 工具类文件: `handler_{name}.py`, `helper_{name}.py`, `validator_{name}.py` 等

### 类命名
- 使用 PascalCase
- 接口: `I{Name}` (如 `IExceptionClassifier`)
- 数据契约: `D{Name}` (如 `DExceptionContext`)
- 枚举契约: `E{Name}` (如 `EExceptionLevel`)
- 类型契约: `T{Name}` (如 `TExceptionHandler`)
- 常量契约: `C{Name}` (如 `CExceptionDefaults`)
- 抽象类: `Abstract{Name}` (如 `AbstractExceptionClassifier`)
- 实现类: `{Name}` (如 `ExceptionClassifier`)

## 依赖规则

```
                              ┌─────────────────────────────────────┐
                              │          _01_contracts              │
                              │  (接口 + Repository接口 + 数据契约)   │
                              └─────────────────────────────────────┘
                                             ↑
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────┴────────┐    ┌─────────┴─────────┐    ┌────────┴────────┐
           │  _02_abstracts  │    │    _05_dtos       │    │   _06_models    │
           │   (抽象基类)     │    │  (数据传输对象)    │    │ (ORM + Repo实现) │
           └────────┬────────┘    └─────────┬─────────┘    └────────┬────────┘
                    │                       │                        │
                    ↓                       │                        │
           ┌────────────────┐               │                        │
           │   _03_impls    │←──────────────┘                        │
           │  (业务实现)     │←───────────────────────────────────────┘
           └────────┬───────┘         (通过 Repository 接口注入)
                    │
                    ↓
           ┌────────────────┐
           │  _04_services  │←─── _08_utils
           │   (服务入口)    │
           └────────┬───────┘
                    │
                    ↓
           ┌────────────────┐
           │  _07_router    │←─── _05_dtos
           │   (路由端点)    │
           └────────────────┘
```

**依赖倒置原则 (DIP)**:
- `_03_impls` 不直接依赖 `_06_models`
- `_03_impls` 依赖 `_01_contracts` 中的 `I{Name}Repository` 接口
- `_06_models` 实现 `I{Name}Repository` 接口
- 运行时通过依赖注入将 Repository 实现注入到 `_03_impls`

**核心规则**:
- 上层只能依赖下层
- 同层之间不能相互依赖
- 禁止循环依赖
- 业务层通过接口访问数据层，不直接依赖 ORM

## __init__.py 导出规范

每层的 `__init__.py` 统一导出该层所有公开类：

```python
# _01_contracts/__init__.py
# 数据契约
from .d_exception_context import DExceptionContext
from .d_exception_record import DExceptionRecord
from .d_exception_stats import DExceptionStats

# 服务接口
from .i_exception import IException
from .i_exception_classifier import IExceptionClassifier
from .i_exception_recorder import IExceptionRecorder

__all__ = [
    # Data contracts
    "DExceptionContext",
    "DExceptionRecord",
    "DExceptionStats",
    # Interfaces
    "IException",
    "IExceptionClassifier",
    "IExceptionRecorder",
]
```

模块根目录 `__init__.py` 统一导出所有公开 API：

```python
# module_name/__init__.py
from ._01_contracts import IException, IExceptionClassifier
from ._02_abstracts import AbstractExceptionClassifier
from ._03_impls import ExceptionClassifier
from ._04_services import ExceptionService

__all__ = [
    # Interfaces
    "IException",
    "IExceptionClassifier",
    # Abstracts
    "AbstractExceptionClassifier",
    # Implementations
    "ExceptionClassifier",
    # Services
    "ExceptionService",
]
```

## 何时使用各层

每个模块必须包含全部 8 层：

| 层级 | 目录 | 必须 |
|------|------|------|
| 契约层 | _01_contracts | ✅ |
| 抽象层 | _02_abstracts | ✅ |
| 实现层 | _03_impls | ✅ |
| 服务层 | _04_services | ✅ |
| DTO层 | _05_dtos | ✅ |
| 模型层 | _06_models | ✅ |
| 路由层 | _07_router | ✅ |
| 辅助层 | _08_utils | ✅ |

## 示例：exception 模块

```
exception/
├── _01_contracts/
│   ├── __init__.py
│   ├── i_exception.py               # 异常服务接口
│   ├── i_exception_classifier.py    # 分类器接口
│   ├── i_exception_recorder.py      # 记录器接口
│   ├── r_exception.py               # Repository 接口 (IExceptionRepository)
│   ├── d_exception_context.py       # 上下文数据契约
│   ├── d_exception_record.py        # 记录数据契约
│   ├── e_exception_level.py         # 异常级别枚举
│   └── exc_exception.py             # 异常类定义
├── _02_abstracts/
│   ├── __init__.py
│   ├── abstract_classifier.py
│   └── abstract_recorder.py
├── _03_impls/
│   ├── __init__.py
│   ├── impl_classifier.py
│   └── impl_recorder.py
├── _04_services/
│   ├── __init__.py
│   └── service_exception.py
├── _05_dtos/
│   ├── __init__.py
│   └── dto_exception.py             # ExceptionRequest, ExceptionResponse
├── _06_models/
│   ├── __init__.py
│   ├── model_exception.py           # ExceptionModel (ORM)
│   └── repo_exception.py            # ExceptionRepository (实现 IExceptionRepository)
├── _07_router/
│   ├── __init__.py
│   ├── router_exception.py
│   └── deps_exception.py            # 依赖注入 (注入 Repository)
├── _08_utils/
│   ├── __init__.py
│   ├── handler_exception.py
│   ├── code_error.py
│   └── helper_format.py
└── __init__.py
```
