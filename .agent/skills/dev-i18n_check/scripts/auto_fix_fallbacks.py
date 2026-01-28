"""
增强版 i18n 自动修复工具
- 自动查找并合并所有 locales 目录的翻译
- 批量修复中文 fallback 为韩语
- 生成详细的修复报告和需要手动处理的列表
"""
import re
import sys
import json
from pathlib import Path
from typing import Dict, List, Tuple, Set
from collections import defaultdict


# ============================================================================
# 翻译文件加载
# ============================================================================

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


def load_all_translations(base_dir: Path) -> Dict[str, str]:
    """加载所有 locales 目录的 ko.json 并合并"""
    all_translations = {}
    skip_patterns = ['node_modules', '.venv', '_deprecated', 'dist', 'build']

    for locales_dir in base_dir.rglob('locales'):
        if any(skip in str(locales_dir) for skip in skip_patterns):
            continue

        ko_file = locales_dir / 'ko.json'
        if ko_file.exists():
            try:
                data = json.loads(ko_file.read_text(encoding='utf-8'))
                translations = flatten_dict(data)
                all_translations.update(translations)
                print(f"  ✅ 加载: {ko_file.relative_to(base_dir)} ({len(translations)} 个键)")
            except Exception as e:
                print(f"  ❌ 加载失败: {ko_file} - {e}")

    return all_translations


def is_korean(text: str) -> bool:
    """检查文本是否主要是韩语"""
    korean_chars = len(re.findall(r'[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]', text))
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    return korean_chars > chinese_chars


# ============================================================================
# 文件扫描和修复
# ============================================================================

def find_chinese_fallbacks(file_path: Path) -> List[Dict]:
    """查找文件中所有使用中文 fallback 的 t() 调用"""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return []

    # 匹配 t('key', '中文') 或 t("key", "中文") 模式
    pattern = r"t\((['\"])([^'\"]+)\1\s*,\s*(['\"])([^'\"]*[\u4e00-\u9fff]+[^'\"]*)\3\)"
    issues = []

    for match in re.finditer(pattern, content):
        key = match.group(2)
        fallback = match.group(4)

        line_num = content[:match.start()].count('\n') + 1

        issues.append({
            'key': key,
            'fallback': fallback,
            'line': line_num,
            'match_start': match.start(),
            'match_end': match.end(),
            'full_match': match.group(0)
        })

    return issues


def fix_file(file_path: Path, ko_translations: Dict[str, str], dry_run: bool = True) -> Tuple[int, int, List[Dict]]:
    """
    修复文件中的中文 fallback

    返回: (成功修复数量, 无法修复数量, 需要手动处理的列表)
    """
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ 无法读取文件 {file_path}: {e}")
        return 0, 0, []

    issues = find_chinese_fallbacks(file_path)
    if not issues:
        return 0, 0, []

    fixed_count = 0
    unfixable_count = 0
    unfixable_list = []
    new_content = content

    # 按位置倒序处理，避免位置偏移
    for issue in sorted(issues, key=lambda x: x['match_start'], reverse=True):
        key = issue['key']
        chinese = issue['fallback']

        # 查找韩语翻译
        if key in ko_translations:
            korean = ko_translations[key]

            # 确保韩语翻译不是中文
            if is_korean(korean) and korean != chinese:
                # 构造新的 t() 调用
                old_text = issue['full_match']
                new_text = f"t('{key}', '{korean}')"

                # 替换
                new_content = new_content[:issue['match_start']] + new_text + new_content[issue['match_end']:]
                fixed_count += 1
            else:
                # ko.json 中的翻译也是中文，无法修复
                unfixable_count += 1
                unfixable_list.append({
                    'file': str(file_path),
                    'line': issue['line'],
                    'key': key,
                    'chinese': chinese,
                    'korean_value': korean,
                    'reason': 'ko.json 中的值也是中文或相同'
                })
        else:
            # 键不存在于 ko.json
            unfixable_count += 1
            unfixable_list.append({
                'file': str(file_path),
                'line': issue['line'],
                'key': key,
                'chinese': chinese,
                'korean_value': None,
                'reason': '键在 ko.json 中不存在'
            })

    # 写入修改
    if fixed_count > 0:
        if not dry_run:
            try:
                file_path.write_text(new_content, encoding='utf-8')
            except Exception as e:
                print(f"❌ 写入文件失败 {file_path}: {e}")
                return 0, unfixable_count, unfixable_list

    return fixed_count, unfixable_count, unfixable_list


# ============================================================================
# 批量处理
# ============================================================================

def process_directory(directory: Path, ko_translations: Dict[str, str], dry_run: bool = True):
    """批量处理目录中的所有组件文件"""
    total_fixed = 0
    total_unfixable = 0
    all_unfixable = []
    fixed_files = []

    extensions = ['.jsx', '.tsx']
    skip_patterns = ['node_modules', 'locales', '.venv', '_deprecated', 'dist', 'build']

    print("\n" + "=" * 80)
    print("开始处理文件...")
    print("=" * 80 + "\n")

    for ext in extensions:
        for file_path in directory.rglob(f'*{ext}'):
            if any(skip in str(file_path) for skip in skip_patterns):
                continue

            fixed, unfixable, unfixable_list = fix_file(file_path, ko_translations, dry_run)

            if fixed > 0 or unfixable > 0:
                rel_path = file_path.relative_to(directory.parent.parent)
                print(f"📄 {rel_path}")
                if fixed > 0:
                    print(f"  ✅ 修复: {fixed} 处")
                    fixed_files.append((str(rel_path), fixed))
                if unfixable > 0:
                    print(f"  ⚠️  无法修复: {unfixable} 处")

                total_fixed += fixed
                total_unfixable += unfixable
                all_unfixable.extend(unfixable_list)

    return total_fixed, total_unfixable, all_unfixable, fixed_files


# ============================================================================
# 报告生成
# ============================================================================

def generate_unfixable_report(unfixable_list: List[Dict], output_file: Path):
    """生成需要手动处理的问题报告"""
    if not unfixable_list:
        return

    # 按原因分组
    by_reason = defaultdict(list)
    for item in unfixable_list:
        by_reason[item['reason']].append(item)

    report = []
    report.append("# 需要手动处理的 i18n 问题\n")
    report.append(f"生成时间: {Path(__file__).parent.parent}\n")
    report.append(f"\n## 概览\n")
    report.append(f"- 无法自动修复的问题总数: **{len(unfixable_list)}**\n")

    for reason, items in by_reason.items():
        report.append(f"\n### {reason} ({len(items)} 处)\n")

        # 按文件分组
        by_file = defaultdict(list)
        for item in items:
            by_file[item['file']].append(item)

        for file_path, file_items in sorted(by_file.items()):
            report.append(f"\n#### 📄 `{file_path}`\n")
            for item in file_items:
                report.append(f"\n**行 {item['line']}**\n")
                report.append(f"- 键: `{item['key']}`\n")
                report.append(f"- 中文 fallback: `{item['chinese']}`\n")
                if item['korean_value']:
                    report.append(f"- ko.json 当前值: `{item['korean_value']}`\n")
                report.append(f"\n")

    report.append(f"\n## 修复建议\n")
    report.append(f"\n### 1. 键不存在的情况\n")
    report.append(f"需要在对应的 locales/ko.json 和 locales/zh.json 中添加翻译:\n")
    report.append(f"```json\n")
    report.append(f'{{\n')
    report.append(f'  "keyName": "한국어 번역"\n')
    report.append(f'}}\n')
    report.append(f"```\n")

    report.append(f"\n### 2. ko.json 中的值也是中文\n")
    report.append(f"需要修改 ko.json 中的值为正确的韩语翻译\n")

    output_file.write_text(''.join(report), encoding='utf-8')
    print(f"\n📝 详细报告已生成: {output_file}")


# ============================================================================
# 主函数
# ============================================================================

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python auto_fix_fallbacks.py <前端目录> [--apply]")
        print("示例: python auto_fix_fallbacks.py frontend/src")
        print("      python auto_fix_fallbacks.py frontend/src --apply")
        sys.exit(1)

    directory = Path(sys.argv[1])
    dry_run = '--apply' not in sys.argv

    if dry_run:
        print("🔍 预览模式 - 不会实际修改文件")
    else:
        print("✏️  应用模式 - 将修改文件")

    print("\n" + "=" * 80)
    print("步骤 1: 加载所有翻译文件")
    print("=" * 80)

    base_dir = directory.parent
    ko_translations = load_all_translations(base_dir)

    if not ko_translations:
        print("\n❌ 未找到任何翻译文件")
        sys.exit(1)

    print(f"\n✅ 共加载 {len(ko_translations)} 个韩语翻译键")

    # 处理所有文件
    total_fixed, total_unfixable, unfixable_list, fixed_files = process_directory(
        directory, ko_translations, dry_run
    )

    # 生成报告
    print("\n" + "=" * 80)
    print("修复统计")
    print("=" * 80)
    print(f"✅ 成功修复: {total_fixed} 处")
    print(f"⚠️  无法自动修复: {total_unfixable} 处")
    print(f"📁 修改的文件数: {len(fixed_files)}")

    if unfixable_list:
        report_file = Path(__file__).parent.parent / 'MANUAL_FIX_NEEDED.md'
        generate_unfixable_report(unfixable_list, report_file)

    if dry_run:
        print("\n⚠️  这是预览模式。使用 --apply 参数来实际应用更改。")
        if total_fixed > 0:
            print(f"   命令: python auto_fix_fallbacks.py {directory} --apply")
    else:
        print("\n✅ 修复完成！")
        if total_unfixable > 0:
            print(f"⚠️  还有 {total_unfixable} 处问题需要手动处理，请查看 MANUAL_FIX_NEEDED.md")


if __name__ == '__main__':
    main()
