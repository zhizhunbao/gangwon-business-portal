#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成新闻图片脚本

为每个新闻生成两张纯色背景图片：
- thumbnail.jpg: 缩略图 (400x300)
- main.jpg: 主图 (1200x675)

使用测试数据配置中的韩语标题
"""

import json
from pathlib import Path
from PIL import Image

# 新闻主题颜色配置（8条新闻，纯色背景）
NEWS_COLORS = {
    0: (30, 64, 175),      # 蓝色 - 数字化转型
    1: (5, 150, 105),      # 绿色 - 生物产业
    2: (124, 58, 237),     # 紫色 - IT海外进出
    3: (220, 38, 38),      # 红色 - 支援实绩
    4: (234, 88, 12),      # 橙色 - 投资诱致
    5: (22, 163, 74),      # 深绿 - 环保能源
    6: (8, 145, 178),      # 青色 - 医疗器械
    7: (190, 24, 93),      # 粉色 - 观光数字化
}


def create_solid_image(size, color):
    """创建纯色图片"""
    return Image.new('RGB', size, color)


def main():
    """主函数"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # 从测试数据配置读取韩语新闻标题
    config_path = project_root / 'backend' / 'scripts' / 'generate_test_data' / 'test_data_config.json'
    
    if not config_path.exists():
        print(f"错误: 找不到配置文件: {config_path}")
        return
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    press_titles = config.get('korean_data', {}).get('press_release_titles', [])
    if not press_titles:
        print("错误: 配置文件中没有找到 press_release_titles")
        return
    
    # 输出目录
    output_dir = project_root / 'frontend' / 'public' / 'uploads'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"输出目录: {output_dir}")
    print(f"找到 {len(press_titles)} 条新闻标题")
    print()
    
    for i, title in enumerate(press_titles):
        if i not in NEWS_COLORS:
            print(f"警告: 新闻 {i} 没有颜色配置，跳过")
            continue
        
        color = NEWS_COLORS[i]
        
        # 创建新闻目录
        news_dir = output_dir / 'news' / str(i)
        news_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"正在生成新闻 {i} 的图片...")
        print(f"  标题: {title}")
        print(f"  颜色: {color}")
        
        # 生成缩略图 (400x300)
        thumbnail = create_solid_image((400, 300), color)
        thumbnail_path = news_dir / 'thumbnail.jpg'
        thumbnail.save(thumbnail_path, 'JPEG', quality=85)
        print(f"  ✓ 缩略图已生成: {thumbnail_path}")
        
        # 生成主图 (1200x675)
        main_image = create_solid_image((1200, 675), color)
        main_path = news_dir / 'main.jpg'
        main_image.save(main_path, 'JPEG', quality=90)
        print(f"  ✓ 主图已生成: {main_path}")
        
        print()
    
    print("所有图片生成完成！")


if __name__ == '__main__':
    main()
