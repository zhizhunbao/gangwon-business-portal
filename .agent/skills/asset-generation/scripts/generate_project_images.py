#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成项目图片脚本

为每个项目生成纯色背景图片 (800x400)
"""

import json
from pathlib import Path
from PIL import Image

# 项目主题颜色配置（10个项目）
PROJECT_COLORS = {
    0: (30, 64, 175),      # 蓝色 - 数字化转型
    1: (5, 150, 105),      # 绿色 - 创业支援
    2: (124, 58, 237),     # 紫色 - 智能工厂
    3: (220, 38, 38),      # 红色 - 出口支援
    4: (234, 88, 12),      # 橙色 - 青年创业
    5: (22, 163, 74),      # 深绿 - 女性企业
    6: (8, 145, 178),      # 青色 - 生物医疗
    7: (190, 24, 93),      # 粉色 - 环保能源
    8: (71, 85, 105),      # 灰色 - 观光数字化
    9: (180, 83, 9),       # 棕色 - 农食品加工
}


def create_solid_image(size, color):
    """创建纯色图片"""
    return Image.new('RGB', size, color)


def main():
    """主函数"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # 从测试数据配置读取项目标题
    config_path = project_root / 'backend' / 'scripts' / 'generate_test_data' / 'test_data_config.json'
    
    if not config_path.exists():
        print(f"错误: 找不到配置文件: {config_path}")
        return
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    project_titles = config.get('korean_data', {}).get('project_titles', [])
    if not project_titles:
        print("错误: 配置文件中没有找到 project_titles")
        return
    
    # 输出目录
    output_dir = project_root / 'frontend' / 'public' / 'uploads' / 'projects'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"输出目录: {output_dir}")
    print(f"找到 {len(project_titles)} 个项目标题")
    print()
    
    for i, title in enumerate(project_titles):
        if i not in PROJECT_COLORS:
            print(f"警告: 项目 {i} 没有颜色配置，跳过")
            continue
        
        color = PROJECT_COLORS[i]
        
        print(f"正在生成项目 {i} 的图片...")
        print(f"  标题: {title}")
        print(f"  颜色: {color}")
        
        # 生成项目图片 (800x400)
        image = create_solid_image((800, 400), color)
        image_path = output_dir / f'project_{i}.jpg'
        image.save(image_path, 'JPEG', quality=85)
        print(f"  ✓ 图片已生成: {image_path}")
        
        print()
    
    print("所有项目图片生成完成！")


if __name__ == '__main__':
    main()
