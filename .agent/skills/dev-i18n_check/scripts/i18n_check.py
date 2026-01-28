"""国际化检查工具 - 检查硬编码文本、翻译同步并生成报告"""
import re
import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple


# ============================================================================
# 硬编码文本检查
# ============================================================================

def is_in_translation_call(content: str, pos: int) -> bool:
    """检查位置是否在 t() 调用的第二个参数（fallback）中"""
    # 向前查找最近的 t(
    before = content[:pos]
    t_call_start = before.rfind("t(")

    if t_call_start == -1:
        return False

    # 从 t( 开始到当前位置的内容
    snippet = content[t_call_start:pos]

    # 计算逗号数量，如果有逗号说明可能在第二个参数中
    comma_count = snippet.count(',')

    # 如果有至少一个逗号，说明在第二个参数（fallback）中
    return comma_count >= 1


def is_in_comment(content: str, pos: int) -> bool:
    """检查位置是否在注释中"""
    line_start = content.rfind('\n', 0, pos) + 1
    line = content[line_start:content.find('\n', pos)]
    
    if '//' in line and line.index('//') < (pos - line_start):
        return True
    
    block_start = content.rfind('/*', 0, pos)
    block_end = content.rfind('*/', 0, pos)
    return block_start > block_end


def find_hardcoded_text(file_path: Path) -> List[Dict]:
    """查找硬编码的中文/韩语文本"""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return []
    
    chinese_pattern = r'[\u4e00-\u9fff]+'
    korean_pattern = r'[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]+'
    
    issues = []
    
    for pattern, lang_type in [(chinese_pattern, 'chinese'), (korean_pattern, 'korean')]:
        for match in re.finditer(pattern, content):
            if is_in_translation_call(content, match.start()) or \
               is_in_comment(content, match.start()):
                continue
            
            line_num = content[:match.start()].count('\n') + 1
            line_start = content.rfind('\n', 0, match.start()) + 1
            line_end = content.find('\n', match.start())
            if line_end == -1:
                line_end = len(content)
            line_content = content[line_start:line_end].strip()
            
            issues.append({
                'type': lang_type,
                'text': match.group(),
                'line': line_num,
                'context': line_content[:200]
            })
    
    return issues


def find_chinese_fallbacks(file_path: Path) -> List[Dict]:
    """查找 t() 调用中使用中文作为 fallback 的情况"""
    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception:
        return []

    # 匹配 t('key', '中文') 或 t("key", "中文") 模式
    pattern = r"t\(['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]*[\u4e00-\u9fff]+[^'\"]*)['\"]"
    issues = []

    for match in re.finditer(pattern, content):
        key = match.group(1)
        fallback = match.group(2)

        line_num = content[:match.start()].count('\n') + 1
        line_start = content.rfind('\n', 0, match.start()) + 1
        line_end = content.find('\n', match.start())
        if line_end == -1:
            line_end = len(content)
        line_content = content[line_start:line_end].strip()

        issues.append({
            'key': key,
            'fallback': fallback,
            'line': line_num,
            'context': line_content[:200]
        })

    return issues


def scan_hardcoded(directory: Path) -> Dict[str, List[Dict]]:
    """扫描目录中的硬编码文本（仅 JSX/TSX 组件文件）"""
    all_issues = {}
    extensions = ['.jsx', '.tsx']
    skip_patterns = ['node_modules', 'locales', '.venv', '_deprecated', 'dist', 'build']

    for ext in extensions:
        for file_path in directory.rglob(f'*{ext}'):
            if any(skip in str(file_path) for skip in skip_patterns):
                continue

            issues = find_hardcoded_text(file_path)
            if issues:
                rel_path = file_path.relative_to(directory.parent.parent)
                all_issues[str(rel_path)] = issues

    return all_issues


def scan_chinese_fallbacks(directory: Path) -> Dict[str, List[Dict]]:
    """扫描目录中使用中文 fallback 的 t() 调用（仅 JSX/TSX 组件文件）"""
    all_issues = {}
    extensions = ['.jsx', '.tsx']
    skip_patterns = ['node_modules', 'locales', '.venv', '_deprecated', 'dist', 'build']

    for ext in extensions:
        for file_path in directory.rglob(f'*{ext}'):
            if any(skip in str(file_path) for skip in skip_patterns):
                continue

            issues = find_chinese_fallbacks(file_path)
            if issues:
                rel_path = file_path.relative_to(directory.parent.parent)
                all_issues[str(rel_path)] = issues

    return all_issues


# ============================================================================
# 翻译同步检查
# ============================================================================

def get_all_keys(data: dict, prefix: str = '') -> Set[str]:
    """递归获取所有翻译键"""
    keys = set()
    for key, value in data.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            keys.update(get_all_keys(value, full_key))
        else:
            keys.add(full_key)
    return keys


def check_translation_sync(ko_file: Path, zh_file: Path) -> Dict:
    """检查韩语和中文翻译文件的同步性"""
    try:
        ko_data = json.loads(ko_file.read_text(encoding='utf-8'))
        zh_data = json.loads(zh_file.read_text(encoding='utf-8'))
    except Exception:
        return None
    
    ko_keys = get_all_keys(ko_data)
    zh_keys = get_all_keys(zh_data)
    
    return {
        'missing_in_zh': sorted(list(ko_keys - zh_keys)),
        'missing_in_ko': sorted(list(zh_keys - ko_keys)),
        'total_ko': len(ko_keys),
        'total_zh': len(zh_keys)
    }


def scan_translations(base_dir: Path) -> Dict[str, Dict]:
    """扫描所有 locales 目录"""
    results = {}
    skip_patterns = ['node_modules', '.venv', '_deprecated']
    
    for locales_dir in base_dir.rglob('locales'):
        if any(skip in str(locales_dir) for skip in skip_patterns):
            continue
        
        ko_file = locales_dir / 'ko.json'
        zh_file = locales_dir / 'zh.json'
        
        if ko_file.exists() and zh_file.exists():
            result = check_translation_sync(ko_file, zh_file)
            if result:
                results[str(locales_dir)] = result
    
    return results


# ============================================================================
# 报告生成
# ============================================================================

def categorize_issues(all_issues: Dict[str, List[Dict]]) -> Dict[str, List[Tuple]]:
    """将问题分类"""
    categories = {
        'enums': [],
        'constants': [],
        'helpers': [],
        'other': []
    }
    
    for file_path, issues in all_issues.items():
        file_str = str(file_path).lower()
        
        if 'enum' in file_str:
            categories['enums'].append((file_path, issues))
        elif 'constant' in file_str:
            categories['constants'].append((file_path, issues))
        elif 'helper' in file_str:
            categories['helpers'].append((file_path, issues))
        else:
            categories['other'].append((file_path, issues))
    
    return categories


def generate_report(hardcoded_issues: Dict[str, List[Dict]],
                   fallback_issues: Dict[str, List[Dict]],
                   output_file: Path) -> Tuple[int, int, int]:
    """生成 Markdown 格式的报告"""
    total_hardcoded_files = len(hardcoded_issues)
    total_hardcoded_count = sum(len(issues) for issues in hardcoded_issues.values())
    total_fallback_files = len(fallback_issues)
    total_fallback_count = sum(len(issues) for issues in fallback_issues.values())

    report = []
    report.append("# 国际化问题分析报告\n")
    report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    report.append(f"\n## 概览\n")
    report.append(f"- 硬编码文本: **{total_hardcoded_files}** 个文件，**{total_hardcoded_count}** 处问题\n")
    report.append(f"- 中文 Fallback: **{total_fallback_files}** 个文件，**{total_fallback_count}** 处问题\n")
    report.append(f"\n---\n")

    # 报告中文 fallback 问题（优先级更高）
    if fallback_issues:
        report.append(f"\n## ❌ 中文 Fallback 问题 (P1 - 高)\n")
        report.append(f"\n**说明**: 项目主要语言是韩语，fallback 应使用韩语而非中文。\n")
        report.append(f"\n发现 {total_fallback_files} 个文件存在问题，共 {total_fallback_count} 处\n")

        for file_path, issues in sorted(fallback_issues.items()):
            report.append(f"\n### 📄 `{file_path}`\n")
            report.append(f"\n共 {len(issues)} 处中文 fallback\n")

            for issue in issues[:20]:
                report.append(f"\n**行 {issue['line']}**\n")
                report.append(f"- 键: `{issue['key']}`\n")
                report.append(f"- 中文 fallback: `{issue['fallback']}`\n")
                report.append(f"- 上下文: `{issue['context']}`\n")

            if len(issues) > 20:
                report.append(f"\n... 还有 {len(issues) - 20} 处问题\n")

    # 报告硬编码问题
    if hardcoded_issues:
        categories = categorize_issues(hardcoded_issues)

        priority_order = [
            ('other', '组件硬编码', 'P1 - 高'),
            ('enums', '枚举值硬编码', 'P2 - 中'),
            ('constants', '常量硬编码', 'P2 - 中'),
            ('helpers', '工具函数硬编码', 'P3 - 低')
        ]

        for cat_key, cat_name, priority in priority_order:
            items = categories[cat_key]
            if not items:
                continue

            report.append(f"\n## ❌ {cat_name} ({priority})\n")
            report.append(f"\n发现 {len(items)} 个文件存在问题\n")

            for file_path, issues in items:
                report.append(f"\n### 📄 `{file_path}`\n")
                report.append(f"\n共 {len(issues)} 处硬编码\n")

                for issue in issues[:10]:
                    report.append(f"\n**行 {issue['line']}** - {issue['type'].upper()}\n")
                    report.append(f"- 文本: `{issue['text']}`\n")
                    report.append(f"- 上下文: `{issue['context']}`\n")

                if len(issues) > 10:
                    report.append(f"\n... 还有 {len(issues) - 10} 处问题\n")

    report.append(f"\n---\n")
    report.append(f"\n## 修复建议\n")
    report.append(f"\n### 优先级说明\n")
    report.append(f"\n- **P1 - 高**: 中文 fallback 和组件硬编码，影响用户体验，应尽快修复\n")
    report.append(f"- **P2 - 中**: 枚举和常量硬编码，可以逐步优化\n")
    report.append(f"- **P3 - 低**: 工具函数中的硬编码，可以保持现状或后续优化\n")

    report.append(f"\n### 修复步骤\n")

    if fallback_issues:
        report.append(f"\n#### 1. 修复中文 Fallback（自动化）\n")
        report.append(f"\n```bash\n")
        report.append(f"# 预览要修复的内容\n")
        report.append(f"uv run python .agent/skills/dev-i18n_check/scripts/i18n_fix.py frontend/src frontend/src/shared/i18n/locales/ko.json\n")
        report.append(f"\n# 应用修复\n")
        report.append(f"uv run python .agent/skills/dev-i18n_check/scripts/i18n_fix.py frontend/src frontend/src/shared/i18n/locales/ko.json --apply\n")
        report.append(f"```\n")

    if hardcoded_issues:
        report.append(f"\n#### 2. 修复硬编码文本（手动）\n")
        report.append(f"\n1. 在 `ko.json` 和 `zh.json` 中添加对应的翻译键\n")
        report.append(f"2. 使用 `t('key', '한국어 fallback')` 替换硬编码文本\n")
        report.append(f"3. 测试韩语和中文两种语言的显示\n")
        report.append(f"4. 运行检查工具验证修复结果\n")

    report.append(f"\n### 重新检查\n")
    report.append(f"\n```bash\n")
    report.append(f"# 修复后重新检查\n")
    report.append(f"uv run python .agent/skills/dev-i18n_check/scripts/i18n_check.py frontend/src\n")
    report.append(f"```\n")

    output_file.write_text(''.join(report), encoding='utf-8')
    return total_hardcoded_count, total_fallback_count, total_hardcoded_files + total_fallback_files


# ============================================================================
# 主函数
# ============================================================================

def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法: python i18n_check.py <前端目录>")
        print("示例: python i18n_check.py frontend/src")
        sys.exit(1)

    directory = Path(sys.argv[1])
    output_file = Path(__file__).parent.parent / 'I18N_ISSUES.md'

    print(f"扫描目录: {directory}")
    print("=" * 80)

    # 检查中文 fallback
    print("\n🔍 检查中文 fallback...")
    fallback_issues = scan_chinese_fallbacks(directory)

    if fallback_issues:
        total_count = sum(len(v) for v in fallback_issues.values())
        print(f"❌ 发现 {len(fallback_issues)} 个文件，共 {total_count} 处中文 fallback")
    else:
        print("✅ 未发现中文 fallback")

    # 检查硬编码文本
    print("\n🔍 检查硬编码文本...")
    hardcoded_issues = scan_hardcoded(directory)

    if hardcoded_issues:
        total_issues = sum(len(v) for v in hardcoded_issues.values())
        print(f"❌ 发现 {len(hardcoded_issues)} 个文件，共 {total_issues} 处硬编码")
    else:
        print("✅ 未发现硬编码文本")

    # 检查翻译同步
    print("\n🔍 检查翻译同步...")
    base_dir = directory.parent
    translation_results = scan_translations(base_dir)

    if translation_results:
        has_sync_issues = False
        for locales_dir, result in translation_results.items():
            if result['missing_in_zh'] or result['missing_in_ko']:
                has_sync_issues = True
                print(f"\n📁 {locales_dir}")
                if result['missing_in_zh']:
                    print(f"  ❌ 中文缺失 {len(result['missing_in_zh'])} 个键")
                if result['missing_in_ko']:
                    print(f"  ❌ 韩语缺失 {len(result['missing_in_ko'])} 个键")

        if not has_sync_issues:
            print("✅ 所有翻译文件已同步")
    else:
        print("❌ 未找到翻译文件")

    # 生成报告
    if hardcoded_issues or fallback_issues:
        print(f"\n📝 生成报告...")
        hardcoded_count, fallback_count, total_files = generate_report(
            hardcoded_issues, fallback_issues, output_file
        )
        print(f"✅ 报告已生成: {output_file}")
        print(f"\n📊 统计:")
        print(f"  - 问题文件数: {total_files}")
        print(f"  - 硬编码总数: {hardcoded_count}")
        print(f"  - 中文 fallback 总数: {fallback_count}")
    else:
        print(f"\n✅ 未发现任何问题")

    print("\n" + "=" * 80)


if __name__ == '__main__':
    main()
