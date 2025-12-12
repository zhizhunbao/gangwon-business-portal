# E2E 测试修复计划

## 当前状态

**测试结果摘要：**
- 总测试数: 54
- 通过: 51
- 失败: 3
- 成功率: 94.44%

**已修复的问题：**
- ✅ 批准绩效记录（500错误）- 已修复：将 `reviewer_id` 设置为 `None`，因为管理员不在 `members` 表中
- ✅ 语法错误（参数顺序）- 已修复：调整了文件上传端点的参数顺序

---

## 待修复的 3 个失败测试

### 1. 导出绩效数据（422 验证错误）

**问题描述：**
- 测试：`test_export_performance_data`
- 错误：422 Unprocessable Entity
- 端点：`GET /api/admin/performance/export`
- 测试参数：
  ```python
  params={
      "page": 1,
      "page_size": 20,
      "format": "excel",
  }
  ```

**原因分析：**
1. 参数名冲突：`format` 是 Python 保留关键字，虽然使用了 `alias="format"`，但可能仍有问题
2. 参数验证：FastAPI 可能无法正确解析带 `alias` 的查询参数
3. 参数类型：某些参数可能缺少类型验证或默认值

**修复方案：**

#### 方案 A：使用不同的参数名（推荐）
```python
# 修改 router.py
export_format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
# 移除 alias，直接使用 export_format
```

同时修改测试脚本：
```python
params={
    "page": 1,
    "page_size": 20,
    "export_format": "excel",  # 改为 export_format
}
```

#### 方案 B：保持 API 兼容性，使用 alias
```python
# 保持 router.py 中的 alias="format"
export_format: str = Query("excel", alias="format", regex="^(excel|csv)$", ...)
```

但需要确保 FastAPI 版本支持，并检查是否有其他验证问题。

**实施步骤：**
1. 检查 FastAPI 版本和 `alias` 支持情况
2. 如果 `alias` 有问题，采用方案 A
3. 更新测试脚本中的参数名
4. 验证修复效果

---

### 2. 上传公共文件（400 错误）

**问题描述：**
- 测试：`test_upload_public_file`
- 错误：400 Bad Request
- 端点：`POST /api/upload/public`
- 测试代码：
  ```python
  files={"file": ("test.txt", test_file, "text/plain")}
  ```

**原因分析：**
1. 文件格式问题：`httpx` 的文件上传格式可能与 FastAPI 期望的格式不匹配
2. 文件对象问题：`io.BytesIO` 对象可能需要特殊处理
3. 依赖注入问题：`current_user` 和 `db` 参数可能未正确注入
4. 文件验证失败：文件大小、类型等验证可能失败

**修复方案：**

#### 方案 A：修复测试脚本中的文件上传格式
```python
# 修改 e2e_test_all_modules.py
def test_upload_public_file(self) -> bool:
    """测试上传公共文件"""
    self.tester.log("测试: 上传公共文件")
    if not self.tester.member_token:
        return False
    
    import io
    test_content = b"test file content"
    test_file = io.BytesIO(test_content)
    test_file.seek(0)
    
    # 使用 httpx 的正确格式
    files = {
        "file": ("test.txt", test_file, "text/plain")
    }
    
    result = self.tester.make_request(
        "POST",
        "/api/upload/public",
        token=self.tester.member_token,
        files=files,
    )
    # ...
```

#### 方案 B：检查服务器端文件验证逻辑
检查 `upload_public_file` 服务方法中的验证：
- 文件大小限制
- 文件类型验证
- 文件内容读取

**可能的问题点：**
1. `_validate_file` 方法可能抛出异常
2. Supabase Storage 上传可能失败
3. 文件指针位置问题

**实施步骤：**
1. 添加详细的错误日志，查看具体错误信息
2. 检查 `make_request` 方法中的文件上传处理
3. 验证 `httpx` 的文件上传格式是否正确
4. 检查服务器端文件验证逻辑
5. 如果问题在服务器端，修复验证逻辑

---

### 3. 下载文件（依赖上传失败）

**问题描述：**
- 测试：`test_download_file`
- 错误：因为 `upload_public_file` 失败，没有 `file_id`
- 端点：`GET /api/upload/files/{file_id}`

**原因分析：**
- 这是一个依赖性问题，只要修复了文件上传，下载测试应该就能通过

**修复方案：**
- 修复文件上传测试后，下载测试应该自动通过
- 如果上传修复后仍有问题，需要检查下载端点的实现

---

## 详细修复步骤

### 步骤 1：修复导出绩效数据（422错误）

1. **检查当前实现**
   ```bash
   # 查看 router.py 中的参数定义
   grep -A 5 "export_performance_data" backend/src/modules/performance/router.py
   ```

2. **测试参数传递**
   - 使用 curl 或 Postman 测试端点
   - 检查 FastAPI 自动生成的文档（`/docs`）

3. **修复方案选择**
   - 如果 `alias` 有问题，使用方案 A（直接改参数名）
   - 如果 `alias` 正常，检查其他验证问题

4. **更新代码**
   - 修改 `router.py` 中的参数定义
   - 更新测试脚本中的参数名
   - 运行测试验证

### 步骤 2：修复文件上传（400错误）

1. **添加详细日志**
   ```python
   # 在 make_request 方法中添加
   if not result["success"]:
       self.log(f"错误详情: {result.get('response', {})}", "ERROR")
   ```

2. **检查文件上传格式**
   - 查看 httpx 文档中的文件上传示例
   - 对比 FastAPI 期望的格式

3. **测试不同的文件上传方式**
   ```python
   # 方式 1：使用元组
   files={"file": ("test.txt", test_file, "text/plain")}
   
   # 方式 2：使用 UploadFile 对象（如果可能）
   # 方式 3：使用字典格式
   ```

4. **检查服务器端验证**
   - 查看 `_validate_file` 方法的实现
   - 检查文件大小限制
   - 检查文件类型验证

5. **修复并测试**
   - 根据错误信息修复问题
   - 运行测试验证

### 步骤 3：验证下载功能

1. **确保上传功能正常**
2. **测试下载端点**
3. **如果仍有问题，检查下载端点的实现**

---

## 测试验证

修复后，运行完整测试套件：

```bash
python scripts/e2e_test_all_modules.py
```

**预期结果：**
- 总测试数: 54
- 通过: 54
- 失败: 0
- 成功率: 100%

---

## 优先级

1. **高优先级**：导出绩效数据（422错误）
   - 影响：管理员无法导出绩效数据
   - 修复难度：低-中
   - 预计时间：30分钟

2. **高优先级**：上传公共文件（400错误）
   - 影响：用户无法上传文件
   - 修复难度：中
   - 预计时间：1小时

3. **中优先级**：下载文件
   - 影响：依赖上传功能
   - 修复难度：低（依赖上传修复）
   - 预计时间：10分钟（验证）

---

## 风险评估

- **低风险**：修复这些测试不会影响现有功能
- **兼容性**：如果修改 API 参数名，需要确保前端也更新（如果有前端调用）
- **回滚**：所有修改都可以轻松回滚

---

## 后续优化建议

1. **改进错误处理**
   - 在测试脚本中添加更详细的错误信息输出
   - 在服务器端添加更明确的错误消息

2. **添加集成测试**
   - 为文件上传/下载添加专门的集成测试
   - 为导出功能添加专门的集成测试

3. **文档更新**
   - 更新 API 文档，说明正确的参数格式
   - 添加文件上传的示例代码

---

## 相关文件

- `backend/src/modules/performance/router.py` - 导出绩效数据端点
- `backend/src/modules/upload/router.py` - 文件上传端点
- `backend/src/modules/upload/service.py` - 文件上传服务逻辑
- `backend/scripts/e2e_test_all_modules.py` - E2E 测试脚本

---

## 更新日志

- 2025-12-09: 创建修复计划文档
- 2025-12-09: 已修复批准绩效记录问题（从4个失败降至3个）

