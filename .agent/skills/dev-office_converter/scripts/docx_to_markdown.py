#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DOCX转Markdown脚本
用于将DOCX文件转换为Markdown格式的文档

使用方法:
    python docx_to_markdown.py <docx_file_path> [output_dir]

示例:
    python docx_to_markdown.py ../public/pdfs/knowledge-reasoning/Lab5\ KR\ Blocks/CST8503_Lab5_KR_Blocks.docx
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import List, Optional, Tuple

from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml.ns import qn


class DOCXToMarkdownConverter:
    """DOCX转Markdown转换器"""

    def __init__(self):
        self.supported_formats = ['.docx']

    def _get_paragraph_text(self, paragraph) -> str:
        """
        获取段落文本，保留超链接信息

        Args:
            paragraph: python-docx 段落对象

        Returns:
            str: 包含超链接的段落文本
        """
        runs_text: List[str] = []

        for child in paragraph._p:  # pylint: disable=protected-access
            tag = child.tag

            if tag == qn("w:hyperlink"):
                r_id = child.get(qn("r:id"))
                text = "".join(t.text for t in child.iter(qn("w:t")) if t.text)

                if r_id and r_id in paragraph.part.rels:
                    rel = paragraph.part.rels[r_id]
                    if rel.reltype == RT.HYPERLINK and text:
                        runs_text.append(f"[{text}]({rel.target_ref})")
                        continue

                if text:
                    runs_text.append(text)

            elif tag == qn("w:r"):
                text = "".join(t.text for t in child.iter(qn("w:t")) if t.text)
                if text:
                    runs_text.append(text)

        combined_text = "".join(runs_text).strip()
        return combined_text

    def extract_text_from_docx(self, docx_path: str) -> List[Tuple[int, str]]:
        """
        从DOCX文件中提取文本

        Args:
            docx_path: DOCX文件路径

        Returns:
            List[Tuple[int, str]]: 包含段落号和文本的元组列表
        """
        try:
            paragraphs_text = []

            doc = Document(docx_path)
            for para_num, para in enumerate(doc.paragraphs, 1):
                text = self._get_paragraph_text(para)
                if text and text.strip():  # 只添加非空段落
                    paragraphs_text.append((para_num, text))

            return paragraphs_text

        except Exception as e:
            print(f"错误：无法读取DOCX文件 {docx_path}: {e}")
            return []

    def clean_text(self, text: str) -> str:
        """
        清理和格式化文本

        Args:
            text: 原始文本

        Returns:
            str: 清理后的文本
        """
        # 移除多余的空白字符
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def format_as_markdown(self, paragraphs_text: List[Tuple[int, str]], title: str) -> str:
        """
        将提取的文本格式化为Markdown

        Args:
            paragraphs_text: 段落文本列表
            title: 文档标题

        Returns:
            str: Markdown格式的文本
        """
        markdown_content = []

        # 添加标题
        markdown_content.append(f"# {title}\n")
        markdown_content.append("---\n")

        # 添加正文内容
        for para_num, text in paragraphs_text:
            cleaned_text = self.clean_text(text)
            if cleaned_text:
                markdown_content.append(cleaned_text)
                markdown_content.append("\n\n")

        return '\n'.join(markdown_content)

    def convert_docx_to_markdown(self, docx_path: str, output_dir: Optional[str] = None) -> str:
        """
        将DOCX转换为Markdown文件

        Args:
            docx_path: DOCX文件路径
            output_dir: 输出目录（可选）

        Returns:
            str: 生成的Markdown文件路径
        """
        docx_path = Path(docx_path)

        if not docx_path.exists():
            raise FileNotFoundError(f"DOCX文件不存在: {docx_path}")

        if docx_path.suffix.lower() not in self.supported_formats:
            raise ValueError(f"不支持的文件格式: {docx_path.suffix}")

        # 确定输出目录
        if output_dir:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
        else:
            output_dir = docx_path.parent

        # 生成输出文件名
        output_filename = f"{docx_path.stem}.md"
        output_path = output_dir / output_filename

        print(f"正在处理DOCX文件: {docx_path}")
        print(f"输出文件: {output_path}")

        # 提取文本
        paragraphs_text = self.extract_text_from_docx(str(docx_path))
        if not paragraphs_text:
            raise ValueError("无法从DOCX中提取文本内容")

        print(f"成功提取 {len(paragraphs_text)} 段内容")

        # 生成Markdown
        title = docx_path.stem.replace('_', ' ').replace('-', ' ')
        markdown_content = self.format_as_markdown(paragraphs_text, title)

        # 写入文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(markdown_content)

        print(f"Markdown文件已生成: {output_path}")
        return str(output_path)


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="将DOCX文件转换为Markdown格式",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python docx_to_markdown.py ../public/pdfs/knowledge-reasoning/Lab5\\ KR\\ Blocks/CST8503_Lab5_KR_Blocks.docx
  python docx_to_markdown.py ../public/pdfs/knowledge-reasoning/Lab5\\ KR\\ Blocks/CST8503_Lab5_KR_Blocks.docx ./output
        """
    )

    parser.add_argument(
        'docx_path',
        help='DOCX文件路径'
    )

    parser.add_argument(
        'output_dir',
        nargs='?',
        help='输出目录（可选，默认为DOCX文件所在目录）'
    )

    args = parser.parse_args()

    converter = DOCXToMarkdownConverter()

    try:
        docx_path = Path(args.docx_path)

        if docx_path.is_file():
            # 处理单个文件
            converter.convert_docx_to_markdown(str(docx_path), args.output_dir)
        else:
            print(f"错误: 文件不存在或不是有效的DOCX文件: {docx_path}")
            sys.exit(1)

    except Exception as e:
        print(f"错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

