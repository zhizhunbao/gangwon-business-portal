---
description: Bug fix workflow - from PPTX bug report to implementation and verification
---

# 🐛 Bug Fix 工作流 (Bug Fix Workflow)

从客户提交的 PPTX 修改事项报告出发，完成从解析、分析、计划、实施到验证的完整 Bug Fix 流程。

## 🎯 使用方式

```
/bug-fix <pptx_path>                    # 启动完整流程
/bug-fix <pptx_path> --from=analyze     # 跳过解析，从分析开始
/bug-fix <pptx_path> --from=implement   # 跳过解析/分析/计划，从实施开始
/bug-fix status                          # 查看当前进度
/bug-fix verify                          # 只运行验证阶段
```

## 📋 完整流程概览

```
┌───────────────────────────────────────────────────────────────┐
│ Phase 1: 解析 (Parse)                                          │
│   ↓ PPTX 解析 + Markdown 格式化 → 标准化截图版文档             │
├───────────────────────────────────────────────────────────────┤
│ Phase 2: 分析 (Analyze)                                        │
│   ↓ 基于工作流执行翻译步骤 → 需求翻译 + 代码定位              │
├───────────────────────────────────────────────────────────────┤
│ Phase 3: 计划 (Plan)                                           │
│   ↓ 生成实施计划 → 优先级排序 + Phase 分组                    │
├───────────────────────────────────────────────────────────────┤
│ Phase 4: 实施 (Implement)                                      │
│   ↓ dev-senior_frontend / dev-senior_backend → 按 Phase 实施  │
├───────────────────────────────────────────────────────────────┤
│ Phase 5: 验证 (Verify)                                         │
│   ↓ dev-senior_qa → 构建检查 + 浏览器验证                     │
├───────────────────────────────────────────────────────────────┤
│ Phase 6: 提交 (Commit)                                         │
│   ↓ dev-git → 提交归档                                        │
└───────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 解析 PPTX 报告 📥

**Skills**: `dev-pptx_to_md`, `dev-pptx_to_pdf`, `dev-pdf_processing`

### 目标

将客户提交的 PPTX bug 报告转换为带截图的 Markdown 文档，并在解析完成后立即整理为统一格式，以便后续翻译、分析和注释。

### 步骤

1. **PPTX → PDF 转换**

// turbo

```bash
python .agent/skills/dev-pptx_to_pdf/scripts/convert_single.py <input.pptx> <output.pdf> --method windows
```

2. **PDF → 截图版 Markdown**

// turbo

```bash
python .agent/skills/dev-pdf_processing/scripts/pdf_to_image_md.py <output.pdf> <output_截图版.md> --dpi 200
```

3. **提取 PPTX 内嵌图片**（补充截图不足的情况）

```python
# 提取 PPTX 中的内嵌截图到 _images/ 目录
from pptx import Presentation
from pptx.util import Inches
import os

prs = Presentation("<input.pptx>")
img_dir = "<stem>_images"
os.makedirs(img_dir, exist_ok=True)

for i, slide in enumerate(prs.slides, 1):
    for j, shape in enumerate(slide.shapes):
        if shape.shape_type == 13:  # Picture
            image = shape.image
            ext = image.content_type.split('/')[-1]
            img_path = os.path.join(img_dir, f"slide{i}_img{j}.{ext}")
            with open(img_path, 'wb') as f:
                f.write(image.blob)
```

4. **格式化截图版 Markdown**（解析完成后立即执行）
   - 统一文档标题、页面分隔、图片区块、文本区块、Notes 区块
   - 为每个页面补齐固定小节结构，便于后续逐条翻译和标注
   - 清理 OCR 杂讯，保留原文，不在此阶段改写需求含义
   - 若当前页已能识别出需求项，预先写入 `原文 / 翻译 / 实施 / 优先级` 占位字段

### 输出

- `docs/requirements/active/<stem>_截图版.md` — 带截图的 Markdown
- `docs/requirements/active/<stem>_截图版_pages/` — 页面截图目录
- `docs/requirements/active/<stem>_images/` — PPTX 内嵌图片

### 格式化检查

- [ ] 页面标题和顺序完整
- [ ] 每页都包含 `Page Image / Text Content / Notes`
- [ ] Notes 区块结构一致，便于后续翻译步骤填写
- [ ] OCR 原文已保留，未提前改写业务语义

### 输出格式

参考项目规范（`docs/requirements/archived/bug_fix_2026-02-01/창업톡_수정사항_260130_截图版.md`）：

```markdown
# Bug Fix Report Title

**Source:** `filename.pptx`
**Total Pages:** N
**Format:** Page Image + OCR Text

---

## Page 1

### 📷 Page Image

![Page 1](pages/page_001.png)

### 📝 Text Content

(从 PPTX 提取的原始文本)

### ✍️ Notes

> **需求 #1**: (需求描述)
> **原文**: (Korean 原文)
> **翻译**: (中文翻译)
> **实施**: ⬜ 未开始
> **优先级**: 高/中/低
```

---

## Phase 2: 分析需求 🔍

**Skills**: `dev-translation`, 代码搜索工具

### 目标

基于格式化后的截图版 Markdown，先执行翻译步骤，再结合截图上下文理解每个 bug 的具体含义，定位受影响的代码文件。

### 步骤

1. **基于工作流执行翻译步骤**
   - 读取 Phase 1 输出的格式化截图版 Markdown
   - 按页面、按需求项逐条翻译韩文描述（原文 → 中文）
   - 优先参考截图中的红框、箭头、手写标注理解需求（**截图中的标注比文本更重要**）
   - 翻译结果直接回填到对应页面的 `Notes` 占位字段中

2. **定位受影响代码**（每个 Bug 都必须做）
   - 使用 `grep_search` 和 `find_by_name` 搜索相关代码
   - 识别前端文件（`frontend/src/`）
   - 识别后端文件（`backend/src/`）
   - 检查翻译文件（`locales/ko.json`, `locales/zh.json`）
   - 检查枚举 / 常量文件

3. **撰写需求注释**
   - 更新截图版 Markdown 的 `### ✍️ Notes` 部分
   - 添加以下字段：
     - **需求 #N**: 简要描述
     - **原文**: 韩文原文
     - **翻译**: 中文翻译
     - **涉及文件**: 受影响的源代码文件路径
     - **实施**: ⬜ 未开始
     - **优先级**: 高/中/低

4. **比对历史 Bug 报告**
   - 检查 `docs/requirements/archived/` 下的历史报告
   - 判断是否有重复 / 回归问题

### 输出

- 更新后的 `<stem>_截图版.md`（含完整注释）

---

## Phase 3: 制定实施计划 📋

**Skill**: 无特定 skill，基于 Phase 2 分析结果生成

### 目标

将所有 Bug 按优先级分组，制定分阶段的实施计划。

### 步骤

1. **汇总所有 Issue**

创建 `<stem>_구현계획.md`（实施计划），包含：

```markdown
# Bug Fix 实施计划

**Source:** `<filename>.pptx` (N pages)
**Created:** YYYY-MM-DD
**Status:** 🔄 进行中

---

## 수정사항 요약 (修改事项总结)

总计 **N 个** 修改事项。

---

## Issue 1: (简要标题)

**位置:** (페이지 路径)
**现象:** (具体描述)
**优先级:** 高/中/低
**影响范围:**

- `frontend/src/...`
- `backend/src/...`

### 修改方向

- (具体修改方案)

---
```

2. **优先级排序**

| 优先级 | 标准                             |
| ------ | -------------------------------- |
| 🔴 高  | 功能缺失、数据错误、用户流程中断 |
| 🟡 中  | 显示问题、UX 不理想、非关键功能  |
| 🟢 低  | 文案修改、样式微调、非紧急优化   |

3. **Phase 分组**

按依赖关系和工作量分组：

| Phase            | 类别               | 预计耗时 |
| ---------------- | ------------------ | -------- |
| Quick Fixes      | 文案/样式/配置修改 | 0.5 天   |
| File/Upload      | 文件上传相关       | 2-3 天   |
| UX Improvement   | 加载/反馈/响应式   | 1.5-2 天 |
| Feature Addition | 新功能/状态机      | 3-4 天   |

### 输出

- `docs/requirements/active/<stem>_구현계획.md` — 实施计划

### 产出检查

- [ ] 所有 PPTX 页面的 Issue 都已列出
- [ ] 每个 Issue 有明确的修改方向
- [ ] 每个 Issue 有受影响文件列表
- [ ] Phase 分组合理，依赖关系清晰

---

## Phase 4: 实施修复 🔧

**Skills**: `dev-senior_frontend`, `dev-senior_backend`, `dev-code_comment`

### 目标

按实施计划逐个 Phase 修复所有 Bug。

### 步骤

1. **按 Phase 顺序实施**（Quick Fixes → File/Upload → UX → Feature）

2. **每个 Issue 的修复步骤**：

   a. **阅读需求**
   - 重新查看截图版 Markdown 中对应 Issue 的截图和注释
   - 确认修改方向

   b. **查看当前代码**
   - `view_file` 查看受影响文件
   - `view_code_item` 查看关键函数
   - 理解现有代码逻辑

   c. **编写修改**
   - 使用 `replace_file_content` 或 `multi_replace_file_content` 修改代码
   - 遵循 `dev-code_comment` skill 的双语注释规范
   - 前端修改检查翻译文件一致性（ko.json / zh.json / en.json）

   d. **即时验证**
   - 修改完一个文件后，检查语法正确性
   - 如有 TypeScript/ESLint，运行检查

3. **状态更新**
   - 每完成一个 Issue，更新截图版 Markdown 中的实施状态：
     - ⬜ 未开始 → 🔄 进行中 → ✅ 已完成

### 注意事项

- **前端修改**：React/JSX 组件 → 检查 import, state, props, 样式
- **后端修改**：Python API → 检查 router, service, model, schema
- **翻译修改**：同时更新 ko.json 和 zh.json
- **枚举/常量修改**：检查前后端一致性
- **数据库修改**：优先使用 JSON 字段扩展，避免 migration（参考 Issue 7 的 `data_json` 模式）

### 输出

- 修改后的代码文件
- 更新后的截图版 Markdown（状态标记）

---

## Phase 5: 验证 ✅

**Skills**: `dev-senior_qa`, `dev-code_reviewer`

### 目标

确保所有修复正确生效，无引入新问题。

### 步骤

1. **构建检查**

// turbo

```bash
# 前端构建检查
cd frontend && npm run build

# 后端检查（如有 linter）
cd backend && python -m py_compile src/main.py
```

2. **启动开发服务器**

```bash
# 启动后端
cd backend && python -m uvicorn src.main:app --reload --port 8000

# 启动前端
cd frontend && npm run dev
```

3. **浏览器验证**（逐个 Issue）
   - 使用 `browser_subagent` 打开对应页面
   - 对照截图版 Markdown 的原始截图进行对比
   - 截取修复后的截图保存到 `_验证截图/` 目录

4. **回归测试**
   - 检查修复是否影响其他功能
   - 检查移动端响应式（如适用）
   - 运行现有测试（如有）

// turbo

```bash
# 前端测试
cd frontend && npm test -- --passWithNoTests

# 后端测试
cd backend && python -m pytest tests/ -v
```

### 检查清单

- [ ] 前端构建无错误
- [ ] 后端无语法错误
- [ ] 每个 Issue 在浏览器中验证通过
- [ ] 无新 console 错误
- [ ] 移动端显示正常（如适用）

### 输出

- 验证截图（可选）
- 构建/测试日志

---

## Phase 6: 提交归档 📦

**Skill**: `dev-git`

### 目标

提交代码、归档文档、更新状态。

### 步骤

1. **更新文档状态**
   - 更新 `<stem>_구현계획.md` 顶部 Status 为 `✅ 구현 완료`
   - 更新截图版 Markdown 底部添加实施总结

   ```markdown
   ## 实施总结

   ### ✅ 已完成 (N/M)

   1. ✅ **Issue 标题** (Page X) - 简要说明
   2. ✅ **Issue 标题** (Page Y) - 简要说明
      ...

   ### 📋 修改文件列表

   - `frontend/src/...` - 修改说明
   - `backend/src/...` - 修改说明
   ```

2. **Git 提交**

// turbo

```bash
git add -A
git commit -m "fix: resolve bug report <report_name> - N issues fixed

Issues fixed:
- #1: (简要描述)
- #2: (简要描述)
...

Ref: docs/requirements/active/<stem>_구현계획.md"
git push
```

3. **归档**（修复完成后，在下一次 bug fix 前）
   - 将 `docs/requirements/active/` 下的已完成文档移动到 `docs/requirements/archived/bug_fix_<date>/`

```bash
# 归档已完成的 bug fix 文档
mkdir -p docs/requirements/archived/bug_fix_<date>
mv docs/requirements/active/<stem>* docs/requirements/archived/bug_fix_<date>/
```

---

## 📁 目录结构

```
docs/requirements/
├── active/                                 # 当前进行中的 bug fix
│   ├── Gangwon_BugFixReport_260224.pptx    # 原始 PPTX
│   ├── Gangwon_BugFixReport_260224_images/ # PPTX 内嵌图片
│   ├── Gangwon_BugFixReport_260224_截图版.md      # 截图版 Markdown (Phase 1)
│   ├── Gangwon_BugFixReport_260224_截图版_pages/  # 页面截图
│   └── Gangwon_BugFixReport_260224_구현계획.md    # 实施计划 (Phase 3)
│
└── archived/                               # 已完成的 Bug Fix
    ├── bug_fix_2026-02-01/
    │   ├── 창업톡_수정사항_260130_截图版.md
    │   └── ...
    └── bug_fix_2026-02-10/
        ├── 창업톡_수정사항_260210_구현계획.md
        └── ...
```

---

## 🔄 会话管理

由于 Bug Fix 通常需要多个会话完成，遵循以下规范：

### 状态追踪

在 `_구현계획.md` 顶部维护状态：

```markdown
**Status:** 🔄 进行中 (Phase 2: Quick Fixes 完成, Phase 3: 进行中)
```

### 跨会话恢复

每次新会话开始时：

1. 读取 `_구현계획.md` 确认当前进度
2. 读取 `_截图版.md` 确认各 Issue 状态（⬜/🔄/✅）
3. 从未完成的 Issue 继续

### 会话 Commit 规范

每个会话结束前提交一次：

```bash
git add -A
git commit -m "fix: <report_name> - Phase N completed (Issues X, Y, Z)"
git push
```

---

## 💡 参考历史

| 日期       | 报告                        | Issues 数 | 耗时    |
| ---------- | --------------------------- | --------- | ------- |
| 2026-01-30 | 창업톡\_수정사항\_260130    | 8         | ~3 天   |
| 2026-02-10 | 창업톡\_수정사항\_260210    | 15        | ~7-9 天 |
| 2026-02-24 | Gangwon_BugFixReport_260224 | 4         | TBD     |
