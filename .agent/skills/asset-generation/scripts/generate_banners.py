#!/usr/bin/env python3
"""
生成江原道企业门户系统的横幅图片
使用 PIL/Pillow 创建不同尺寸和类型的横幅纯色背景图片（无文字）
新闻横幅支持装饰性背景（渐变、网格、图标等元素）
"""

import sys
import random
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Error: pillow is not installed. Run: pip install pillow", file=sys.stderr)
    sys.exit(1)

# 横幅类型和尺寸配置
BANNER_CONFIGS = {
    'main_primary': {
        'size': (1920, 600),  # 主页主横幅 - 大尺寸
        'color': (30, 64, 175),  # 蓝色 - 对应 #1e40af
    },
    'main_secondary': {
        'size': (800, 300),  # 主页次横幅 - 小尺寸
        'color': (59, 130, 246),  # 浅蓝色 - 对应 #3b82f6
    },
    'about': {
        'size': (1920, 400),  # 系统介绍页横幅
        'color': (5, 150, 105),  # 绿色 - 对应 #059669
    },
    'projects': {
        'size': (1920, 400),  # 项目页横幅
        'color': (220, 38, 38),  # 红色 - 对应 #dc2626
    },
    'performance': {
        'size': (1920, 400),  # 业绩管理页横幅
        'color': (124, 58, 237),  # 紫色 - 对应 #7c3aed
    },
    'support': {
        'size': (1920, 400),  # 一站式支持页横幅
        'color': (234, 88, 12),  # 橙色 - 对应 #ea580c
    },
    'profile': {
        'size': (1920, 400),  # 企业资料页横幅
        'color': (8, 145, 178),  # 青色 - 对应 #0891b2
    },
    'notices': {
        'size': (1920, 400),  # 公告页横幅
        'color': (190, 24, 93),  # 粉色 - 对应 #be185d
    },
    'news': {
        'size': (1920, 400),  # 新闻页横幅
        'color': (180, 83, 9),  # 棕色 - 对应 #b45309
        'decorated': True,  # 使用装饰性背景（渐变、网格、图标等）
    },
    'scroll': {
        'size': (1920, 150),  # 滚动横幅 - 窄横幅
        'color': (71, 85, 105),  # 灰色 - 对应 #475569
    }
}


def create_banner(config, output_path):
    """创建单个横幅图片（纯色背景，无文字）"""
    size = config['size']
    width, height = size
    color = config['color']
    
    # 创建纯色背景
    img = Image.new('RGB', size, color)
    
    # 保存图片
    img.save(output_path, 'PNG', quality=95)
    print(f"✓ 已生成: {output_path} ({width}x{height}) - 颜色: {color}")


def create_decorated_news_banner(config, output_path):
    """创建装饰性新闻横幅背景图（带渐变、网格、图标等元素）"""
    size = config['size']
    width, height = size
    
    # 创建基础图像（深蓝色背景）
    img = Image.new('RGB', (width, height), color='#1e3a5f')
    draw = ImageDraw.Draw(img)
    
    # 创建渐变背景效果（从左到右）
    for x in range(width):
        # 从深蓝到稍浅的蓝色渐变
        r = int(30 + (x / width) * 10)  # 30 -> 40
        g = int(58 + (x / width) * 15)  # 58 -> 73
        b = int(95 + (x / width) * 20)  # 95 -> 115
        for y in range(height):
            img.putpixel((x, y), (r, g, b))
    
    # 添加装饰性网格线条（新闻主题元素）
    grid_color = (255, 255, 255, 30)  # 半透明白色
    
    # 水平线条
    for y in range(0, height, 40):
        draw.line([(0, y), (width, y)], fill=grid_color[:3], width=1)
    
    # 垂直线条
    for x in range(0, width, 80):
        draw.line([(x, 0), (x, height)], fill=grid_color[:3], width=1)
    
    # 添加新闻图标风格的圆形装饰
    circle_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    circle_draw = ImageDraw.Draw(circle_overlay)
    
    # 左侧大圆圈（代表新闻/信息）
    center_x = width // 4
    center_y = height // 2
    radius = min(120, height // 4)  # 根据高度自适应
    
    # 外圈（半透明）
    circle_draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=(255, 255, 255, 10),
        outline=(255, 255, 255, 30),
        width=3
    )
    
    # 内圈（更实）
    inner_radius = int(radius * 0.67)  # 约为外圈的2/3
    circle_draw.ellipse(
        [center_x - inner_radius, center_y - inner_radius, 
         center_x + inner_radius, center_y + inner_radius],
        fill=(255, 255, 255, 15),
        outline=(255, 255, 255, 50),
        width=2
    )
    
    # 添加类似纸张/文档的装饰元素（右上角）
    paper_color = (255, 255, 255, 20)
    paper_points = [
        (width - 200, 50),
        (width - 100, 80),
        (width - 120, min(180, height - 50)),
        (width - 220, min(150, height - 80)),
    ]
    circle_draw.polygon(paper_points, fill=paper_color, outline=(255, 255, 255, 40))
    
    # 添加小圆圈装饰（代表信息点）
    for i in range(5):
        x = width - 300 - i * 50
        y = 100 + i * 60
        if y < height - 20:  # 确保在范围内
            circle_draw.ellipse(
                [x - 15, y - 15, x + 15, y + 15],
                fill=(255, 255, 255, 25),
                outline=(255, 255, 255, 50),
                width=1
            )
    
    # 合并装饰层
    img = Image.alpha_composite(img.convert('RGBA'), circle_overlay).convert('RGB')
    
    # 添加微妙的噪点纹理（可选，增加质感）
    noise_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    noise_draw = ImageDraw.Draw(noise_overlay)
    
    for _ in range(2000):  # 添加少量噪点
        x = random.randint(0, width - 1)
        y = random.randint(0, height - 1)
        brightness = random.randint(0, 30)
        noise_draw.point((x, y), fill=(255, 255, 255, brightness))
    
    # 应用轻微模糊以减少噪点突兀感
    noise_overlay = noise_overlay.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img.convert('RGBA'), noise_overlay).convert('RGB')
    
    # 保存图片
    img.save(output_path, 'PNG', quality=95, optimize=True)
    print(f"✓ 已生成（装饰性）: {output_path} ({width}x{height}) - 深蓝色渐变背景")


def main():
    """主函数"""
    # 确定输出目录
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    banners_dir = project_root / 'frontend' / 'public' / 'uploads' / 'banners'
    
    # 创建目录
    banners_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"开始生成横幅图片（纯色背景，无文字）...")
    print(f"输出目录: {banners_dir}\n")
    
    # 生成所有类型的横幅
    for banner_type, config in BANNER_CONFIGS.items():
        output_path = banners_dir / f"{banner_type}.png"
        # 如果是新闻横幅且配置了装饰性背景，使用装饰性生成函数
        if config.get('decorated', False) and banner_type == 'news':
            create_decorated_news_banner(config, output_path)
        else:
            create_banner(config, output_path)
    
    print(f"\n✓ 所有横幅图片已生成完成！")
    print(f"共生成 {len(BANNER_CONFIGS)} 个横幅图片")


if __name__ == '__main__':
    main()

