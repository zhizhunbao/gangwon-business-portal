#!/usr/bin/env python3
"""
自动修复 t() 函数调用后的双括号问题
将 t('key', 'fallback')) 修复为 t('key', 'fallback')
"""

import os
import re
from typing import List, Tuple

def find_and_fix_double_parenthesis(directory: str, dry_run: bool = True) -> Tuple[int, List[str]]:
    """查找并修复所有双括号问题"""
    
    # 匹配 t('key', 'fallback')) 或 t("key", "fallback"))
    # 使用更精确的正则表达式，避免误匹配
    pattern = re.compile(r"t\((['\"])([^'\"]+)\1\s*,\s*(['\"])([^'\"]+)\3\)\)")
    
    fixed_count = 0
    fixed_files = []
    
    for root, dirs, files in os.walk(directory):
        # 跳过不需要的目录
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'dist', 'build', '.git']]
        
        for file in files:
            if not file.endswith(('.jsx', '.js', '.tsx', '.ts')):
                continue
                
            file_path = os.path.join(root, file)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 检查是否有匹配
                if not pattern.search(content):
                    continue
                
                # 计算修复次数
                matches = pattern.findall(content)
                file_fix_count = len(matches)
                
                if file_fix_count == 0:
                    continue
                
                # 执行替换：移除多余的闭合括号
                # 将 t('key', 'fallback')) 替换为 t('key', 'fallback')
                new_content = pattern.sub(r"t(\1\2\1, \3\4\3)", content)
                
                if not dry_run:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                
                fixed_count += file_fix_count
                fixed_files.append((file_path, file_fix_count))
                
            except Exception as e:
                print(f"❌ 处理文件失败 {file_path}: {e}")
    
    return fixed_count, fixed_files

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("用法: python fix_double_parenthesis.py <前端目录> [--apply]")
        print("示例: python fix_double_parenthesis.py frontend/src")
        print("      python fix_double_parenthesis.py frontend/src --apply")
        sys.exit(1)
    
    frontend_dir = sys.argv[1]
    apply_fix = '--apply' in sys.argv
    
    if not os.path.exists(frontend_dir):
        print(f"❌ 目录不存在: {frontend_dir}")
        sys.exit(1)
    
    print(f"🔍 扫描目录: {frontend_dir}\n")
    print("=" * 80)
    print("检查双括号问题 t('key', 'fallback'))")
    print("=" * 80)
    
    # 执行检查和修复
    fixed_count, fixed_files = find_and_fix_double_parenthesis(frontend_dir, dry_run=not apply_fix)
    
    if fixed_count == 0:
        print("\n✅ 没有发现双括号问题")
        return
    
    print(f"\n{'✅ 已修复' if apply_fix else '❌ 发现'} {fixed_count} 处双括号问题:\n")
    
    # 显示修复的文件
    for file_path, count in sorted(fixed_files):
        rel_path = os.path.relpath(file_path, frontend_dir)
        print(f"  📄 {rel_path} - {count} 处")
    
    if not apply_fix:
        print(f"\n💡 提示: 使用 --apply 参数来应用修复")
        print(f"   命令: python fix_double_parenthesis.py {frontend_dir} --apply")
    else:
        print(f"\n✅ 修复完成！共修复 {len(fixed_files)} 个文件")

if __name__ == '__main__':
    main()
