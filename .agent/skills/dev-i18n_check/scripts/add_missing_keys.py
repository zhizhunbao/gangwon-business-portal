"""
批量添加缺失的翻译键
从 MANUAL_FIX_NEEDED.md 中提取缺失的键并添加到对应的 locales 文件
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple
from collections import defaultdict


# ============================================================================
# 翻译映射 - 中文到韩语的自动翻译
# ============================================================================

TRANSLATION_MAP = {
    # Admin menu
    "统计报告": "통계 보고서",

    # FAQ
    "此操作不可撤销，确定要继续吗？": "이 작업은 취소할 수 없습니다. 계속하시겠습니까?",
    "当前搜索条件下没有匹配的FAQ": "현재 검색 조건에 일치하는 FAQ가 없습니다",
    "暂无FAQ数据": "FAQ 데이터가 없습니다",

    # Notices
    "加载公告详情失败": "공지사항 상세 정보를 불러오지 못했습니다",
    "内容预览": "콘텐츠 미리보기",
    "预览": "미리보기",
    "未找到该公告": "해당 공지사항을 찾을 수 없습니다",

    # Members
    "，两者不一致。": ", 둘이 일치하지 않습니다.",
    "，但 Nice D&B API 返回的营业执照号为": ", 하지만 Nice D&B API가 반환한 사업자등록번호는",
    "查询使用的营业执照号为": "조회에 사용된 사업자등록번호는",
    "提示：": "알림:",
    "营业执照号码不可用": "사업자등록번호를 사용할 수 없습니다",
    "邮箱": "이메일",
    "已重置为待审核": "검토 대기로 재설정되었습니다",

    # Performance
    "暂无数据": "데이터가 없습니다",
    "年销售额 (元)": "연간 매출액 (원)",

    # Projects
    "暂无封面图片": "표지 이미지가 없습니다",
    "状态更新失败": "상태 업데이트 실패",
    "暂无图片": "이미지가 없습니다",
    "创建": "생성",
    "附件上传失败，请重试": "첨부파일 업로드 실패, 다시 시도해주세요",
    "导出失败": "내보내기 실패",

    # About
    "暂无内容": "콘텐츠가 없습니다",

    # Common
    "未设置": "설정되지 않음",
    "已驳回": "반려됨",
    "审核中": "검토 중",
    "已批准": "승인됨",
    "确定要删除这条记录吗？": "이 기록을 삭제하시겠습니까?",
    "删除确认": "삭제 확인",
    "筛选": "필터",
    "字符": "자",
    "请先登录": "먼저 로그인해주세요",
    "文件上传失败，请重试": "파일 업로드 실패, 다시 시도해주세요",
    "没有找到匹配的结果": "일치하는 결과를 찾을 수 없습니다",
    "选择文件": "파일 선택",
    "未找到该项目": "해당 프로젝트를 찾을 수 없습니다",

    # Chart
    "批准率 (%)": "승인율 (%)",
    "申请数": "신청 수",
    "待处理": "대기 중",
    "已拒绝": "거부됨",
    "批准率": "승인율",

    # Language
    "中文": "중국어",
    "내용": "내용",
}


# ============================================================================
# 解析 MANUAL_FIX_NEEDED.md
# ============================================================================

def parse_manual_fix_needed(file_path: Path) -> Tuple[List[Dict], List[Dict]]:
    """
    解析 MANUAL_FIX_NEEDED.md 文件

    返回: (缺失的键列表, ko.json中是中文的键列表)
    """
    content = file_path.read_text(encoding='utf-8')

    missing_keys = []
    chinese_ko_keys = []

    # 分割文件为各个部分
    parts = re.split(r'^(###? .+)$', content, flags=re.MULTILINE)

    current_section = None
    for i, part in enumerate(parts):
        # 检查是否是标题
        if part.startswith('###') or part.startswith('##'):
            current_section = part
        elif current_section:
            # 这是某个 section 的内容
            if '键在 ko.json 中不存在' in current_section:
                # 匹配缺失的键
                key_pattern = r'- 键: `([^`]+)`\s*\n\s*- 中文 fallback: `([^`]+)`'
                for match in re.finditer(key_pattern, part):
                    missing_keys.append({
                        'key': match.group(1),
                        'chinese': match.group(2)
                    })

            elif 'ko.json 中的值也是中文或相同' in current_section:
                # 匹配 ko.json 中是中文的键
                ko_pattern = r'- 键: `([^`]+)`\s*\n\s*- 中文 fallback: `([^`]+)`\s*\n\s*- ko.json 当前值: `([^`]+)`'
                for match in re.finditer(ko_pattern, part):
                    chinese_ko_keys.append({
                        'key': match.group(1),
                        'chinese': match.group(2),
                        'korean_wrong': match.group(3)
                    })

    return missing_keys, chinese_ko_keys


# ============================================================================
# 工具函数
# ============================================================================

def is_korean_string(text: str) -> bool:
    """检查文本是否主要是韩语"""
    import re
    korean_chars = len(re.findall(r'[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]', text))
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    return korean_chars > chinese_chars


# ============================================================================
# 确定目标 locales 目录
# ============================================================================

def get_target_locales_dir(key: str, base_dir: Path) -> Path:
    """
    根据键的前缀确定应该添加到哪个 locales 目录
    """
    # 键前缀到模块的映射
    prefix_to_module = {
        'admin.menu': 'frontend/src/admin/layouts',
        'admin.content': 'frontend/src/admin/modules/content',
        'admin.members': 'frontend/src/admin/modules/members',
        'admin.projects': 'frontend/src/admin/modules/projects',
        'admin.applications': 'frontend/src/admin/modules/projects',
        'performance.': 'frontend/src/member/modules/performance',
        'about.': 'frontend/src/member/modules/about',
        'projects.': 'frontend/src/member/modules/projects',
        'common.': 'frontend/src/shared/i18n',
        'member.': 'frontend/src/shared/i18n',
        'fileAttachments.': 'frontend/src/shared/i18n',
    }

    # 查找匹配的前缀
    for prefix, module_path in prefix_to_module.items():
        if key.startswith(prefix):
            locales_dir = base_dir / module_path / 'locales'

            # 如果该目录不存在，使用 shared
            if not locales_dir.exists():
                return base_dir / 'frontend/src/shared/i18n/locales'

            return locales_dir

    # 默认使用 shared
    return base_dir / 'frontend/src/shared/i18n/locales'


# ============================================================================
# 添加翻译键到 JSON 文件
# ============================================================================

def set_nested_key(data: dict, key_path: str, value: str) -> dict:
    """
    在嵌套字典中设置键值
    例如: set_nested_key(data, 'admin.menu.statistics', '통계')
    将创建 data['admin']['menu']['statistics'] = '통계'
    """
    keys = key_path.split('.')
    current = data

    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]

    current[keys[-1]] = value
    return data


def add_keys_to_locale_file(locale_file: Path, keys_to_add: Dict[str, str], dry_run: bool = True):
    """
    添加键到 locale 文件

    参数:
        locale_file: ko.json 或 zh.json 文件路径
        keys_to_add: {key_path: value} 字典
        dry_run: 是否为预览模式
    """
    # 读取现有文件
    if locale_file.exists():
        data = json.loads(locale_file.read_text(encoding='utf-8'))
    else:
        data = {}

    # 添加新键
    for key_path, value in keys_to_add.items():
        set_nested_key(data, key_path, value)

    if not dry_run:
        # 写入文件（保持格式化）
        locale_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8'
        )


# ============================================================================
# 主处理逻辑
# ============================================================================

def process_missing_keys(base_dir: Path, dry_run: bool = True):
    """
    处理所有缺失的翻译键
    """
    manual_fix_file = base_dir / '.agent/skills/dev-i18n_check/MANUAL_FIX_NEEDED.md'

    if not manual_fix_file.exists():
        print("❌ 未找到 MANUAL_FIX_NEEDED.md 文件")
        return

    # 解析文件
    print("📖 解析 MANUAL_FIX_NEEDED.md...")
    missing_keys, chinese_ko_keys = parse_manual_fix_needed(manual_fix_file)

    print(f"  - 找到 {len(missing_keys)} 个缺失的键")
    print(f"  - 找到 {len(chinese_ko_keys)} 个 ko.json 中是中文的键")

    # 按 locales 目录分组
    by_locales_dir = defaultdict(lambda: {'ko': {}, 'zh': {}})

    for item in missing_keys:
        key = item['key']
        chinese = item['chinese']

        # 确定目标目录
        locales_dir = get_target_locales_dir(key, base_dir)

        # 翻译为韩语
        korean = TRANSLATION_MAP.get(chinese, chinese)  # 如果没有翻译，使用中文原文

        by_locales_dir[locales_dir]['ko'][key] = korean
        by_locales_dir[locales_dir]['zh'][key] = chinese

    # 添加 ko.json 中是中文的键
    for item in chinese_ko_keys:
        key = item['key']
        chinese = item['chinese']
        korean_wrong = item['korean_wrong']

        locales_dir = get_target_locales_dir(key, base_dir)

        # 检查 ko.json 中的值是否是韩语
        # 如果已经是韩语，就不需要修改 ko.json（auto_fix_fallbacks.py 会自动处理）
        # 如果是中文，需要翻译为正确的韩语
        if not is_korean_string(korean_wrong):
            # ko.json 中的值也是中文，需要修正
            korean = TRANSLATION_MAP.get(chinese, korean_wrong)
            by_locales_dir[locales_dir]['ko'][key] = korean

        by_locales_dir[locales_dir]['zh'][key] = chinese

    # 显示将要修改的内容
    print("\n" + "=" * 80)
    if dry_run:
        print("预览模式 - 将要添加的翻译键:")
    else:
        print("应用模式 - 添加翻译键:")
    print("=" * 80 + "\n")

    total_added = 0

    for locales_dir, translations in sorted(by_locales_dir.items()):
        rel_path = locales_dir.relative_to(base_dir)
        print(f"\n📁 {rel_path}")

        ko_file = locales_dir / 'ko.json'
        zh_file = locales_dir / 'zh.json'

        if translations['ko']:
            print(f"  ✅ ko.json: {len(translations['ko'])} 个键")
            if dry_run:
                for key, value in sorted(translations['ko'].items())[:5]:  # 只显示前5个
                    print(f"     - {key}: {value}")
                if len(translations['ko']) > 5:
                    print(f"     ... 还有 {len(translations['ko']) - 5} 个键")

            add_keys_to_locale_file(ko_file, translations['ko'], dry_run)
            total_added += len(translations['ko'])

        if translations['zh']:
            print(f"  ✅ zh.json: {len(translations['zh'])} 个键")
            if dry_run:
                for key, value in sorted(translations['zh'].items())[:5]:
                    print(f"     - {key}: {value}")
                if len(translations['zh']) > 5:
                    print(f"     ... 还有 {len(translations['zh']) - 5} 个键")

            add_keys_to_locale_file(zh_file, translations['zh'], dry_run)

    print("\n" + "=" * 80)
    print("统计信息")
    print("=" * 80)
    print(f"✅ 总计添加: {total_added} 个键")
    print(f"📁 修改的 locales 目录数: {len(by_locales_dir)}")

    if dry_run:
        print("\n⚠️  这是预览模式。使用 --apply 参数来实际应用更改。")
        print(f"   命令: python add_missing_keys.py --apply")
    else:
        print("\n✅ 翻译键已成功添加！")
        print("\n📝 下一步:")
        print("   1. 检查添加的韩语翻译是否正确")
        print("   2. 运行: uv run python auto_fix_fallbacks.py frontend/src --apply")
        print("   3. 重新检查: uv run python i18n_check.py frontend/src")


# ============================================================================
# 主函数
# ============================================================================

def main():
    import sys
    import os

    dry_run = '--apply' not in sys.argv

    # 从当前工作目录确定项目根目录
    base_dir = Path(os.getcwd())

    # 验证是否在正确的目录
    if not (base_dir / '.agent/skills/dev-i18n_check/MANUAL_FIX_NEEDED.md').exists():
        print(f"❌ 错误: 请从项目根目录运行此脚本")
        print(f"   当前目录: {base_dir}")
        print(f"   期望目录包含: .agent/skills/dev-i18n_check/MANUAL_FIX_NEEDED.md")
        sys.exit(1)

    if dry_run:
        print("🔍 预览模式 - 不会实际修改文件\n")
    else:
        print("✏️  应用模式 - 将修改文件\n")

    process_missing_keys(base_dir, dry_run)


if __name__ == '__main__':
    main()
