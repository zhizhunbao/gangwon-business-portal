"""国际化修复工具 - 批量修复 i18n fallback 文本，将中文改为韩语"""
import re
import sys
import json
from pathlib import Path
from typing import Dict, List


def flatten_dict(d: dict, parent_key: str = '', sep: str = '.') -> Dict[str, str]:
    """将嵌套字典展平为点号分隔的键"""
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def read_translation_file(file_path: Path) -> Dict[str, str]:
    """读取翻译文件并返回键值对映射"""
    try:
        data = json.loads(file_path.read_text(encoding='utf-8'))
        return flatten_dict(data)
    except Exception as e:
        print(f"❌ 无法读取翻译文件 {file_path}: {e}")
        return {}


def find_t_calls_with_chinese(content: str) -> List[Dict]:
    """查找包含中文 fallback 的 t() 调用"""
    pattern = r"t\(['\"]([^'\"]+)['\"],\s*['\"]([^'\"]*[\u4e00-\u9fff]+[^'\"]*)['\"]"
    matches = []
    
    for match in re.finditer(pattern, content):
        key = match.group(1)
        chinese_text = match.group(2)
        matches.append({
            'key': key,
            'chinese': chinese_text,
            'start': match.start(),
            'end': match.end(),
            'full_match': match.group(0)
        })
    
    return matches


def replace_chinese_with_korean(file_path: Path, ko_translations: Dict[str, str], dry_run: bool = True) -> int:
    """替换文件中的中文 fallback 为韩语"""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ 无法读取文件 {file_path}: {e}")
        return 0
    
    matches = find_t_calls_with_chinese(content)
    if not matches:
        return 0
    
    replacements = []
    for match in matches:
        key = match['key']
        chinese = match['chinese']
        
        if key in ko_translations:
            korean = ko_translations[key]
            old_text = match['full_match']
            new_text = f"t('{key}', '{korean}')"
            replacements.append({
                'old': old_text,
                'new': new_text,
                'key': key,
                'chinese': chinese,
                'korean': korean
            })
    
    if not replacements:
        return 0
    
    print(f"\n📄 {file_path}")
    print("-" * 80)
    
    new_content = content
    for repl in replacements:
        print(f"  键: {repl['key']}")
        print(f"  旧: {repl['old']}")
        print(f"  新: {repl['new']}")
        print()
        new_content = new_content.replace(repl['old'], repl['new'])
    
    if not dry_run:
        try:
            file_path.write_text(new_content, encoding='utf-8')
            print(f"  ✅ 已更新")
        except Exception as e:
            print(f"  ❌ 更新失败: {e}")
            return 0
    else:
        print(f"  ℹ️  预览模式，未实际修改")
    
    return len(replacements)


def scan_and_fix(directory: Path, ko_file: Path, dry_run: bool = True):
    """扫描目录并修复所有文件（仅 JSX/TSX 组件文件）"""
    ko_translations = read_translation_file(ko_file)
    if not ko_translations:
        print("❌ 无法加载韩语翻译文件")
        return
    
    print(f"✅ 加载了 {len(ko_translations)} 个韩语翻译键")
    print(f"扫描目录: {directory}")
    print("=" * 80)
    
    total_files = 0
    total_replacements = 0
    extensions = ['.jsx', '.tsx']
    skip_patterns = ['node_modules', 'locales', '.venv', '_deprecated', 'dist', 'build']
    
    for ext in extensions:
        for file_path in directory.rglob(f'*{ext}'):
            if any(skip in str(file_path) for skip in skip_patterns):
                continue
            
            count = replace_chinese_with_korean(file_path, ko_translations, dry_run)
            if count > 0:
                total_files += 1
                total_replacements += count
    
    print("\n" + "=" * 80)
    print(f"📊 统计:")
    print(f"  修改文件数: {total_files}")
    print(f"  替换次数: {total_replacements}")
    
    if dry_run:
        print("\n⚠️  这是预览模式。使用 --apply 参数来实际应用更改。")


def main():
    """主函数"""
    if len(sys.argv) < 3:
        print("用法: python i18n_fix.py <前端目录> <ko.json路径> [--apply]")
        print("示例: python i18n_fix.py frontend/src frontend/src/shared/i18n/locales/ko.json --apply")
        sys.exit(1)
    
    directory = Path(sys.argv[1])
    ko_file = Path(sys.argv[2])
    dry_run = '--apply' not in sys.argv
    
    if dry_run:
        print("🔍 预览模式 - 不会实际修改文件")
    else:
        print("✏️  应用模式 - 将修改文件")
    
    scan_and_fix(directory, ko_file, dry_run)


if __name__ == '__main__':
    main()
