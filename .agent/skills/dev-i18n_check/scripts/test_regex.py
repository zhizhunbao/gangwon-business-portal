import re
from pathlib import Path

content = Path('../MANUAL_FIX_NEEDED.md').read_text(encoding='utf-8')

# 测试 section 查找
missing_section = re.search(r'### 键在 ko.json 中不存在.*?(?=###|##|$)', content, re.DOTALL)
if missing_section:
    print('找到缺失键部分，长度:', len(missing_section.group(0)))
    print('部分内容预览:', missing_section.group(0)[:200])

    # 测试模式匹配
    key_pattern = r'- 键: `([^`]+)`\s*\n\s*- 中文 fallback: `([^`]+)`'
    matches = list(re.finditer(key_pattern, missing_section.group(0)))
    print('\n匹配到的键数量:', len(matches))
    if matches:
        for i, match in enumerate(matches[:3]):
            print(f'  {i+1}. {match.group(1)} = {match.group(2)}')
else:
    print('未找到缺失键部分')

# 测试 ko.json 中是中文的部分
chinese_section = re.search(r'### ko.json 中的值也是中文或相同.*?(?=##|$)', content, re.DOTALL)
if chinese_section:
    print('\n找到 ko.json 中是中文的部分，长度:', len(chinese_section.group(0)))
    ko_pattern = r'- 键: `([^`]+)`\s*\n\s*- 中文 fallback: `([^`]+)`\s*\n\s*- ko.json 当前值: `([^`]+)`'
    matches = list(re.finditer(ko_pattern, chinese_section.group(0)))
    print('匹配到的键数量:', len(matches))
    if matches:
        for i, match in enumerate(matches):
            print(f'  {i+1}. {match.group(1)} = {match.group(2)} (ko: {match.group(3)})')
else:
    print('\n未找到 ko.json 中是中文的部分')
