#!/usr/bin/env python3
"""
生成江原道企业门户系统的横幅图片
使用 PIL/Pillow 创建不同尺寸和类型的横幅纯色背景图片（无文字）
"""

from PIL import Image
from pathlib import Path

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
        create_banner(config, output_path)
    
    print(f"\n✓ 所有横幅图片已生成完成！")
    print(f"共生成 {len(BANNER_CONFIGS)} 个横幅图片")


if __name__ == '__main__':
    main()

