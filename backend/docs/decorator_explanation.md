# Python 装饰器工作原理 - `@auto_log` 示例

## 装饰器语法糖

当你写：

```python
@auto_log("create_member", log_resource_id=True)
async def create_member(...):
    ...
```

Python 会自动将其转换为：

```python
async def create_member(...):
    ...

create_member = auto_log("create_member", log_resource_id=True)(create_member)
```

## `auto_log` 函数的结构

`auto_log` 是一个**装饰器工厂函数**（decorator factory），它的结构是：

```python
def auto_log(operation_name: str, ...):  # 外层函数：接受装饰器参数
    def decorator(func: Callable) -> Callable:  # 中间函数：接受被装饰的函数
        @wraps(func)
        async def wrapper(*args, **kwargs):  # 内层函数：包装原函数
            # 在这里添加日志记录逻辑
            try:
                result = await func(*args, **kwargs)  # 执行原函数
                # 记录成功日志
                logging_service.create_log(...)
                return result
            except Exception as e:
                # 记录错误日志
                logging_service.create_log(...)
                raise
        return wrapper
    return decorator  # 返回装饰器函数
```

## 执行流程

### 步骤 1: 调用 `auto_log()` 函数

```python
@auto_log("create_member", log_resource_id=True)
```

这行代码会：
1. 调用 `auto_log("create_member", log_resource_id=True)`
2. 返回一个 `decorator` 函数（闭包，保存了参数）

### 步骤 2: 应用装饰器

Python 自动将返回的 `decorator` 函数应用到下面的函数：

```python
async def create_member(...):
    ...
```

等价于：

```python
create_member = decorator(create_member)
```

### 步骤 3: 执行包装后的函数

当调用 `create_member(...)` 时：
1. 实际执行的是 `wrapper` 函数
2. `wrapper` 函数会：
   - 执行原函数 `func(*args, **kwargs)`
   - 记录日志
   - 返回结果或处理异常

## 完整示例

```python
# 1. 定义装饰器工厂
def auto_log(operation_name: str):
    def decorator(func):  # 装饰器函数
        @wraps(func)
        async def wrapper(*args, **kwargs):  # 包装函数
            print(f"开始执行: {operation_name}")
            try:
                result = await func(*args, **kwargs)
                print(f"成功: {operation_name}")
                return result
            except Exception as e:
                print(f"失败: {operation_name}, 错误: {e}")
                raise
        return wrapper
    return decorator

# 2. 使用装饰器
@auto_log("create_member")
async def create_member(data):
    return {"id": 1, "name": "John"}

# 3. 调用函数
result = await create_member({"name": "John"})
# 输出:
# 开始执行: create_member
# 成功: create_member
```

## 为什么这样设计？

### 1. **参数化装饰器**

如果装饰器需要参数，必须使用这种三层结构：

```python
# ❌ 错误：无法传递参数
@simple_decorator
def func():
    pass

# ✅ 正确：可以传递参数
@auto_log("create_member", log_resource_id=True)
def func():
    pass
```

### 2. **闭包保存参数**

中间层 `decorator` 函数是一个闭包，可以访问外层函数的参数：

```python
def auto_log(operation_name: str):  # 外层参数
    def decorator(func):
        # 这里可以访问 operation_name
        async def wrapper(*args, **kwargs):
            # 这里也可以访问 operation_name
            print(f"操作: {operation_name}")
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

### 3. **函数包装**

内层 `wrapper` 函数包装原函数，添加额外功能：

```python
async def wrapper(*args, **kwargs):
    # 执行前：记录开始日志
    # 执行原函数
    result = await func(*args, **kwargs)
    # 执行后：记录成功日志
    return result
```

## 与其他装饰器的对比

### 简单装饰器（无参数）

```python
def simple_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print("执行前")
        result = func(*args, **kwargs)
        print("执行后")
        return result
    return wrapper

@simple_decorator
def my_func():
    pass
```

### 参数化装饰器（有参数）

```python
def auto_log(operation_name: str):  # 需要参数
    def decorator(func):  # 接受函数
        @wraps(func)
        def wrapper(*args, **kwargs):  # 包装函数
            print(f"操作: {operation_name}")
            return func(*args, **kwargs)
        return wrapper
    return decorator

@auto_log("create_member")  # 传递参数
def my_func():
    pass
```

## 总结

`@auto_log("create_member")` 能工作的原因：

1. **`auto_log` 是装饰器工厂**：接受参数，返回装饰器函数
2. **Python 的 `@` 语法糖**：自动将装饰器应用到函数上
3. **三层函数结构**：
   - 外层：接受装饰器参数
   - 中层：接受被装饰的函数
   - 内层：包装原函数，添加功能
4. **闭包机制**：内层函数可以访问外层函数的参数

这就是为什么你可以用 `@auto_log(...)` 这种简洁的语法来自动记录日志！

