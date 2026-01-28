#!/usr/bin/env python3
"""
Convert DOCX to Markdown using mammoth (no pandoc required).

Usage:
    python convert_docx_mammoth.py input.docx output.md
    python convert_docx_mammoth.py input.docx  # Auto-generate output name
    python convert_docx_mammoth.py input.docx --no-cleanup  # Skip format cleanup
"""

import sys
import re
from pathlib import Path
import mammoth


def cleanup_markdown(content: str) -> str:
    """
    Clean up markdown formatting issues from mammoth conversion.
    
    Args:
        content: Raw markdown content
        
    Returns:
        Cleaned markdown content
    """
    # Replace __text__ with **text** (proper markdown bold)
    content = re.sub(r'__([^_]+)__', r'**\1**', content)
    
    # Remove unnecessary escape characters
    content = content.replace(r'\-', '-')
    content = content.replace(r'\.', '.')
    content = content.replace(r'\(', '(')
    content = content.replace(r'\)', ')')
    content = content.replace(r'\[', '[')
    content = content.replace(r'\]', ']')
    
    # Clean up multiple blank lines (more than 2 consecutive)
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    # Ensure proper spacing around headings
    lines = content.split('\n')
    cleaned_lines = []
    for i, line in enumerate(lines):
        # Add blank line before headings (if not already there)
        if line.startswith('#') and i > 0 and cleaned_lines and cleaned_lines[-1].strip():
            cleaned_lines.append('')
        cleaned_lines.append(line)
    
    content = '\n'.join(cleaned_lines)
    
    # Remove trailing whitespace from each line
    content = '\n'.join(line.rstrip() for line in content.split('\n'))
    
    # Ensure file ends with single newline
    content = content.rstrip() + '\n'
    
    return content


def convert_docx_to_md(docx_path: Path, md_path: Path = None, cleanup: bool = True):
    """
    Convert DOCX to Markdown using mammoth.
    
    Args:
        docx_path: Path to input DOCX file
        md_path: Path to output MD file (optional)
        cleanup: Whether to clean up formatting (default: True)
    """
    if not docx_path.exists():
        print(f"✗ File not found: {docx_path}")
        sys.exit(1)
    
    # Auto-generate output path if not provided
    if md_path is None:
        md_path = docx_path.with_suffix('.md')
    
    md_path.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Converting: {docx_path.name}")
    print(f"Output: {md_path}")
    
    try:
        with open(docx_path, 'rb') as docx_file:
            result = mammoth.convert_to_markdown(docx_file)
            content = result.value
            
            # Apply cleanup if requested
            if cleanup:
                content = cleanup_markdown(content)
                print("  Format cleanup: enabled")
            
            md_path.write_text(content, encoding='utf-8')
        
        # Print warnings if any (filter out common style warnings)
        if result.messages:
            important_warnings = [
                msg for msg in result.messages 
                if 'Unrecognised paragraph style' not in str(msg)
            ]
            if important_warnings:
                print("\nWarnings:")
                for message in important_warnings:
                    print(f"  - {message}")
        
        print(f"\n✓ Conversion successful!")
        print(f"  Output: {md_path}")
        
        # Show preview
        content = md_path.read_text(encoding='utf-8')
        lines = content.split('\n')
        print(f"  Lines: {len(lines)}")
        print(f"  Size: {len(content)} bytes")
        
    except Exception as e:
        print(f"✗ Conversion failed: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_docx_mammoth.py <input.docx> [output.md] [--no-cleanup]")
        print("Example: python convert_docx_mammoth.py Lab1_Template.docx")
        print("         python convert_docx_mammoth.py Lab1_Template.docx Lab1.md")
        print("         python convert_docx_mammoth.py Lab1_Template.docx --no-cleanup")
        sys.exit(1)
    
    # Parse arguments
    docx_path = Path(sys.argv[1])
    md_path = None
    cleanup = True
    
    for arg in sys.argv[2:]:
        if arg == '--no-cleanup':
            cleanup = False
        elif not arg.startswith('--'):
            md_path = Path(arg)
    
    convert_docx_to_md(docx_path, md_path, cleanup)


if __name__ == '__main__':
    main()
