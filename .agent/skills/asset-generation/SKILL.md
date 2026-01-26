---
name: asset-generation
description: 项目资源生成工作流（横幅、项目图片、新闻图片），支持纯色和装饰性背景。
---

# Asset Generation Skill

江原企业门户项目的资源生成工作流，用于生成各种横幅图片、项目图片和新闻图片。

## 脚本位置

本 skill 包含的脚本已迁移到：
- `.claude/skills/asset-generation/scripts/generate_banners.py`
- `.claude/skills/asset-generation/scripts/generate_project_images.py`
- `.claude/skills/asset-generation/scripts/generate_news_images.py`

> **注意**: 原始 `scripts/` 目录下的这些脚本可以安全删除。

## 可用工具

### 1. 横幅图片生成器

**脚本**: `.claude/skills/asset-generation/scripts/generate_banners.py`

**功能**:
- 生成不同类型页面的横幅背景
- 支持纯色和装饰性背景
- 自动配置项目主题颜色
- 支持多种尺寸

**横幅类型配置**:

| 类型 | 尺寸 | 颜色 | 用途 |
|------|------|------|------|
| `main_primary` | 1920x600 | 蓝色 #1e40af | 主页主横幅 |
| `main_secondary` | 800x300 | 浅蓝 #3b82f6 | 主页次横幅 |
| `about` | 1920x400 | 绿色 #059669 | 系统介绍页 |
| `projects` | 1920x400 | 红色 #dc2626 | 项目页 |
| `performance` | 1920x400 | 紫色 #7c3aed | 业绩管理页 |
| `support` | 1920x400 | 橙色 #ea580c | 一站式支持页 |
| `profile` | 1920x400 | 青色 #0891b2 | 企业资料页 |
| `notices` | 1920x400 | 粉色 #be185d | 公告页 |
| `news` | 1920x400 | 棕色 #b45309 | 新闻页（装饰性） |
| `scroll` | 1920x150 | 灰色 #475569 | 滚动横幅 |

**使用方法**:
```bash
# 从项目根目录运行
python .claude/skills/asset-generation/scripts/generate_banners.py

# 输出目录: frontend/public/uploads/banners/
```

**输出文件**:
```
frontend/public/uploads/banners/
├── main_primary.png      # 1920x600
├── main_secondary.png    # 800x300
├── about.png            # 1920x400
├── projects.png         # 1920x400
├── performance.png      # 1920x400
├── support.png          # 1920x400
├── profile.png          # 1920x400
├── notices.png          # 1920x400
├── news.png             # 1920x400 (装饰性)
└── scroll.png           # 1920x150
```

**装饰性背景**（新闻横幅）:
- 渐变背景（深蓝 → 浅蓝）
- 网格线条装饰
- 圆形图标元素
- 纸张/文档装饰元素
- 微妙噪点纹理

### 2. 项目图片生成器

**脚本**: `scripts/generate_project_images.py`

**功能**:
- 为每个项目生成统一尺寸的背景图
- 使用项目主题色
- 自动读取项目配置

**项目颜色配置**:

| 项目ID | 颜色 | RGB | 主题 |
|--------|------|-----|------|
| 0 | 蓝色 | (30, 64, 175) | 数字化转型 |
| 1 | 绿色 | (5, 150, 105) | 创业支援 |
| 2 | 紫色 | (124, 58, 237) | 智能工厂 |
| 3 | 红色 | (220, 38, 38) | 出口支援 |
| 4 | 橙色 | (234, 88, 12) | 青年创业 |
| 5 | 深绿 | (22, 163, 74) | 女性企业 |
| 6 | 青色 | (8, 145, 178) | 生物医疗 |
| 7 | 粉色 | (190, 24, 93) | 环保能源 |
| 8 | 灰色 | (71, 85, 105) | 观光数字化 |
| 9 | 棕色 | (180, 83, 9) | 农食品加工 |

**使用方法**:
```bash
# 生成所有项目图片
python .claude/skills/asset-generation/scripts/generate_project_images.py

# 输出目录: frontend/public/uploads/projects/
```

**输出文件**:
```
frontend/public/uploads/projects/
├── project_0.jpg    # 800x400 蓝色
├── project_1.jpg    # 800x400 绿色
├── project_2.jpg    # 800x400 紫色
├── project_3.jpg    # 800x400 红色
├── project_4.jpg    # 800x400 橙色
├── project_5.jpg    # 800x400 深绿
├── project_6.jpg    # 800x400 青色
├── project_7.jpg    # 800x400 粉色
├── project_8.jpg    # 800x400 灰色
└── project_9.jpg    # 800x400 棕色
```

**配置依赖**:
- 读取 `backend/scripts/generate_test_data/test_data_config.json`
- 使用 `korean_data.project_titles` 获取项目列表

### 3. 新闻图片生成器

**脚本**: `scripts/generate_news_images.py`

**功能**:
- 生成新闻缩略图
- 使用多样化颜色
- 统一尺寸规范

**使用方法**:
```bash
# 生成新闻图片
python .claude/skills/asset-generation/scripts/generate_news_images.py

# 输出目录: frontend/public/uploads/news/
```

## 工作流场景

### 场景 1: 初始化项目资源

**需求**: 首次部署项目时生成所有必需的图片资源

```bash
# 1. 生成横幅
python .claude/skills/asset-generation/scripts/generate_banners.py

# 2. 生成项目图片
python .claude/skills/asset-generation/scripts/generate_project_images.py

# 3. 生成新闻图片
python .claude/skills/asset-generation/scripts/generate_news_images.py
```

**Claude Code 使用**:
```
User: 初始化项目图片资源

Claude: 正在生成所有项目资源...

1. 生成横幅图片...
   ✓ main_primary.png (1920x600)
   ✓ projects.png (1920x400)
   ✓ news.png (1920x400, 装饰性)
   ✓ ... 共 10 个横幅

2. 生成项目图片...
   ✓ project_0.jpg (数字化转型 - 蓝色)
   ✓ project_1.jpg (创业支援 - 绿色)
   ✓ ... 共 10 个项目图片

3. 生成新闻图片...
   ✓ 完成

所有资源已生成！
```

### 场景 2: 更新横幅颜色

**需求**: 修改某个页面的横幅颜色

**步骤**:
1. 编辑 `scripts/generate_banners.py`
2. 修改 `BANNER_CONFIGS` 中对应的颜色
3. 重新运行脚本

**示例**:
```python
# 修改项目页横幅颜色为深蓝色
BANNER_CONFIGS = {
    'projects': {
        'size': (1920, 400),
        'color': (30, 64, 175),  # 改为深蓝色
    },
    # ...
}
```

```bash
# 重新生成
python .claude/skills/asset-generation/scripts/generate_banners.py
```

### 场景 3: 添加新项目

**需求**: 添加第 11 个项目，需要生成对应的项目图片

**步骤**:
1. 在 `scripts/generate_project_images.py` 中添加颜色配置
2. 更新 `backend/scripts/generate_test_data/test_data_config.json`
3. 运行脚本

**示例**:
```python
# 添加第 11 个项目颜色
PROJECT_COLORS = {
    # ... 现有配置
    10: (100, 200, 50),  # 新项目颜色
}
```

```bash
python .claude/skills/asset-generation/scripts/generate_project_images.py
```

### 场景 4: 自定义装饰性横幅

**需求**: 为其他页面也添加装饰性背景

**步骤**:
1. 修改 `scripts/generate_banners.py`
2. 为目标横幅添加 `'decorated': True` 配置
3. 重新生成

**示例**:
```python
BANNER_CONFIGS = {
    'projects': {
        'size': (1920, 400),
        'color': (220, 38, 38),
        'decorated': True,  # 启用装饰性背景
    },
}
```

## Claude Code 集成建议

### 自动识别资源生成需求

当用户提到图片生成时，Claude Code 应该：

1. **识别生成类型**
   ```
   User: 生成横幅图片
   Claude: [识别需要使用 generate_banners.py]
   ```

2. **检查依赖**
   ```
   Claude: 检查依赖...
   Python 3.x ✓
   Pillow ✓
   ```

3. **执行生成**
   ```bash
   python .claude/skills/asset-generation/scripts/generate_banners.py
   ```

4. **验证输出**
   ```
   Claude: 横幅生成完成！
   - 输出目录: frontend/public/uploads/banners/
   - 生成文件: 10 个 PNG 文件
   - 总大小: 2.3 MB
   ```

### 批量资源初始化

创建一键初始化脚本：

```bash
#!/bin/bash
# init_assets.sh - 初始化所有项目资源

echo "🎨 初始化项目资源..."

echo "1. 生成横幅图片..."
python .claude/skills/asset-generation/scripts/generate_banners.py

echo "2. 生成项目图片..."
python .claude/skills/asset-generation/scripts/generate_project_images.py

echo "3. 生成新闻图片..."
python .claude/skills/asset-generation/scripts/generate_news_images.py

echo "✅ 所有资源生成完成！"
```

使用：
```bash
chmod +x init_assets.sh
./init_assets.sh
```

## 最佳实践

### 1. 颜色一致性

**项目主题色管理**:
- 所有颜色配置集中在脚本顶部
- 使用 RGB 值而非十六进制（Pillow 要求）
- 注释标注对应的十六进制值

**示例**:
```python
BANNER_CONFIGS = {
    'projects': {
        'color': (220, 38, 38),  # 红色 - 对应 #dc2626
    }
}
```

### 2. 图片优化

**尺寸规范**:
- 横幅: 1920px 宽度（标准桌面）
- 项目图片: 800x400（卡片尺寸）
- 新闻图片: 根据需要配置

**质量设置**:
- PNG: `quality=95` （横幅，需要高质量）
- JPEG: `quality=85` （项目图片，平衡质量和大小）

### 3. 文件组织

**输出目录结构**:
```
frontend/public/uploads/
├── banners/          # 横幅图片
│   ├── main_primary.png
│   └── ...
├── projects/         # 项目图片
│   ├── project_0.jpg
│   └── ...
└── news/            # 新闻图片
    ├── news_0.jpg
    └── ...
```

### 4. 版本控制

**应该提交**:
- 生成脚本（`scripts/*.py`）
- 配置文件

**不应该提交**（可选）:
- 生成的图片文件（太大）
- 使用 `.gitignore`:
  ```gitignore
  frontend/public/uploads/banners/*.png
  frontend/public/uploads/projects/*.jpg
  frontend/public/uploads/news/*.jpg
  ```

**但建议**:
- 首次生成后提交一次（方便其他开发者）
- 之后的更改可以选择性提交

## 依赖安装

### Python 依赖

```bash
# 安装 Pillow（图片处理库）
pip install pillow

# 验证安装
python -c "from PIL import Image; print('Pillow installed successfully')"
```

### 系统要求

- Python 3.6+
- 足够的磁盘空间（约 10-20 MB）

## 常见问题

### Q: 如何修改横幅尺寸？

**A**: 编辑 `scripts/generate_banners.py`
```python
BANNER_CONFIGS = {
    'main_primary': {
        'size': (2560, 800),  # 修改为更大尺寸
        'color': (30, 64, 175),
    }
}
```

### Q: 如何添加新的横幅类型？

**A**: 在配置中添加新类型
```python
BANNER_CONFIGS = {
    # ... 现有配置
    'contact': {  # 新增联系页横幅
        'size': (1920, 400),
        'color': (100, 100, 100),
    }
}
```

### Q: 装饰性背景太复杂，如何简化？

**A**: 修改 `create_decorated_news_banner()` 函数
- 减少网格线条密度
- 移除某些装饰元素
- 调整透明度值

### Q: 生成的图片太大？

**A**: 降低质量或使用 JPEG
```python
# 降低 PNG 质量
img.save(output_path, 'PNG', quality=75)

# 或改用 JPEG
img.save(output_path, 'JPEG', quality=80)
```

### Q: 如何批量修改所有项目图片颜色？

**A**: 编辑 `PROJECT_COLORS` 字典
```python
# 使用循环生成渐变色
import colorsys

PROJECT_COLORS = {}
for i in range(10):
    hue = i / 10  # 0.0 到 1.0
    rgb = colorsys.hsv_to_rgb(hue, 0.8, 0.8)
    PROJECT_COLORS[i] = tuple(int(c * 255) for c in rgb)
```

## 高级技巧

### 1. 渐变背景

创建渐变横幅：
```python
def create_gradient_banner(size, color1, color2):
    width, height = size
    img = Image.new('RGB', size)

    for x in range(width):
        # 计算渐变
        ratio = x / width
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)

        for y in range(height):
            img.putpixel((x, y), (r, g, b))

    return img
```

### 2. 添加文字

如果需要在横幅上添加文字：
```python
from PIL import ImageDraw, ImageFont

def add_text_to_banner(img, text):
    draw = ImageDraw.Draw(img)
    # 使用默认字体或加载自定义字体
    # font = ImageFont.truetype("path/to/font.ttf", 72)

    # 计算文字位置（居中）
    bbox = draw.textbbox((0, 0), text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = (img.width - text_width) // 2
    y = (img.height - text_height) // 2

    draw.text((x, y), text, fill=(255, 255, 255))
    return img
```

### 3. 图片压缩

批量压缩生成的图片：
```bash
# 使用 ImageMagick
mogrify -quality 85 -resize 90% frontend/public/uploads/banners/*.png
```

---

**记住**: 统一的视觉资源能提升用户体验。使用这些工具可以快速生成一致的品牌风格图片。
