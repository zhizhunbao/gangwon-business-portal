"""
Hybrid PDF to Markdown Converter - 混合PDF转换工具

Combines the best of both approaches:
1. Use pdfplumber for clean text extraction
2. Use PyMuPDF (fitz) for page images
3. Detect and mark garbled formulas with placeholders
4. Optionally extract formula regions as separate images

Usage:
    uv run python pdf_to_md_hybrid.py <pdf_file> [-o output.md] [--extract-formulas]
"""

import sys
import argparse
import re
from pathlib import Path

try:
    import pdfplumber
    import fitz  # PyMuPDF
    from PIL import Image
except ImportError as e:
    print(f"Error: {e}")
    print("Install: uv add pdfplumber pymupdf pillow")
    sys.exit(1)

# Import formula mapper
try:
    from formula_mapper import FormulaMapper
except ImportError:
    # Fallback if not in same directory
    FormulaMapper = None
    print("Warning: formula_mapper not found, using placeholders only")


class HybridPDFConverter:
    """Hybrid PDF converter: pdfplumber text + PyMuPDF images + formula mapping"""
    
    def __init__(self, pdf_path: Path, extract_formulas: bool = False):
        self.pdf_path = pdf_path
        self.extract_formulas = extract_formulas
        self.formula_counter = 0
        self.formula_mapper = FormulaMapper() if FormulaMapper else None
    
    def convert(self, output_path: Path, dpi: int = 200):
        """Convert PDF to markdown"""
        
        print(f"📄 Converting: {self.pdf_path.name}")
        print(f"   Method: Hybrid (pdfplumber text + PyMuPDF images)")
        if self.extract_formulas:
            print(f"   Formula extraction: Enabled")
        print()
        
        # Setup directories
        images_dir = output_path.parent / f"{output_path.stem}_pages"
        images_dir.mkdir(parents=True, exist_ok=True)
        
        if self.extract_formulas:
            formulas_dir = output_path.parent / f"{output_path.stem}_formulas"
            formulas_dir.mkdir(parents=True, exist_ok=True)
        else:
            formulas_dir = None
        
        # Open PDF with both libraries
        pdf_plumber = pdfplumber.open(self.pdf_path)
        pdf_fitz = fitz.open(self.pdf_path)
        
        md_lines = []
        
        # Header
        title = self.pdf_path.stem.replace('_', ' ')
        md_lines.append(f"# {title}\n")
        md_lines.append(f"**Source:** `{self.pdf_path.name}`  ")
        md_lines.append(f"**Total Pages:** {len(pdf_plumber.pages)}  ")
        md_lines.append(f"**Format:** Hybrid (pdfplumber + PyMuPDF)\n")
        md_lines.append("---\n")
        
        # Process each page
        for page_num in range(len(pdf_plumber.pages)):
            page_number = page_num + 1
            
            print(f"  Processing page {page_number}/{len(pdf_plumber.pages)}...")
            
            # 1. Save page image (for reference)
            image_filename = f"page_{page_number:03d}.png"
            image_path = images_dir / image_filename
            
            fitz_page = pdf_fitz[page_num]
            pix = fitz_page.get_pixmap(dpi=dpi)
            pix.save(str(image_path))
            
            # 2. Extract text with pdfplumber (native, clean)
            # Filter out images and figures to avoid extracting chart coordinates
            plumber_page = pdf_plumber.pages[page_num]
            
            # Get page without images/figures
            filtered_page = plumber_page.filter(lambda obj: obj['object_type'] not in ['image', 'figure', 'rect', 'curve'])
            text = filtered_page.extract_text()
            
            # Fallback to full page if filtering returns nothing
            if not text or not text.strip():
                text = plumber_page.extract_text()
            
            # 3. Build markdown for this page
            md_lines.append(f"## Page {page_number}\n")
            
            # Page image
            md_lines.append("### 📷 Page Image\n")
            md_lines.append(f"![Page {page_number}]({images_dir.name}/{image_filename})\n")
            
            # Text content - always include this section
            md_lines.append("### 📝 Text Content\n")
            
            if text and text.strip():
                # Process text: extract title and detect formulas
                formatted_text = self._process_text(text, image_path)
                md_lines.append(formatted_text.strip())
                md_lines.append("\n")
            else:
                # Empty page or image-only
                md_lines.append("*[No text content detected]*\n")
            
            # Notes section
            md_lines.append("### ✍️ Notes\n")
            md_lines.append("> [Add your notes here]\n")
            md_lines.append("---\n")
        
        # Close PDFs
        pdf_plumber.close()
        pdf_fitz.close()
        
        # Write output
        content = '\n'.join(md_lines)
        output_path.write_text(content, encoding='utf-8')
        
        print(f"\n✅ Converted: {self.pdf_path.name} → {output_path.name}")
        print(f"   Pages: {len(pdf_plumber.pages)}")
        print(f"   Images: {images_dir}/")
    
    def _process_text(self, text: str, image_path: Path) -> str:
        """Process text: extract title, detect and mark formulas"""
        
        lines = text.split('\n')
        
        # Clean lines: remove trailing single digits (chart coordinates embedded in text)
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            # Remove trailing single digit with comma/space (e.g., "text, 7" -> "text,")
            # Then remove trailing comma/space
            line = re.sub(r'[,\s]+\d$', '', line)
            cleaned_lines.append(line)
        
        processed_lines = []
        
        # Extract title (first substantial line)
        title = self._extract_title(cleaned_lines)
        if title:
            processed_lines.append(f"**{title}**\n")
        
        # Process remaining lines and consolidate consecutive formulas
        in_formula_block = False
        last_was_text = False
        
        # Pre-scan for coordinate sequences (e.g., "4", "3", "2", "1", "0")
        coordinate_indices = self._detect_coordinate_lines(cleaned_lines)
        
        for i, line in enumerate(cleaned_lines):
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Skip title line if already extracted
            if title and line == title:
                continue
            
            # Skip coordinate lines (chart axes)
            if i in coordinate_indices:
                continue
            
            # Check if line has garbled characters
            if self._has_garbled_chars(line):
                # Try to map formula first
                if self.formula_mapper:
                    success, mapped = self.formula_mapper.try_map_formula(line)
                    if success:
                        # Successfully mapped - add as regular text
                        if in_formula_block:
                            processed_lines.append("")
                            in_formula_block = False
                        processed_lines.append(mapped)
                        last_was_text = True
                        continue
                
                # Mapping failed - use placeholder
                if not in_formula_block:
                    # Add blank line before formula if previous was text
                    if last_was_text:
                        processed_lines.append("")
                    processed_lines.append("*[Mathematical formula - see image above]*")
                    in_formula_block = True
                    last_was_text = False
                # Otherwise skip - already marked this formula block
            else:
                # Regular text line - end formula block
                if in_formula_block:
                    # Add blank line after formula block
                    processed_lines.append("")
                    in_formula_block = False
                
                # Check if line starts with bullet point
                if line.startswith('•'):
                    # Add blank line before bullet if not first item
                    if processed_lines and processed_lines[-1] != "":
                        processed_lines.append("")
                
                processed_lines.append(line)
                last_was_text = True
        
        return '\n'.join(processed_lines)
    
    def _detect_coordinate_lines(self, lines: list[str]) -> set[int]:
        """Detect lines that are chart coordinates (e.g., "4", "3", "2", "1", "0")
        
        Returns set of line indices to skip
        """
        coordinate_indices = set()
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Check if it's a single digit or simple number
            if re.match(r'^\d+$', line) and len(line) <= 2:
                # Look ahead for more single digits (allow gaps for text lines)
                sequence = [int(line)]
                indices = [i]
                
                # Look ahead up to 15 lines
                for j in range(i + 1, min(i + 15, len(lines))):
                    next_line = lines[j].strip()
                    if re.match(r'^\d+$', next_line) and len(next_line) <= 2:
                        sequence.append(int(next_line))
                        indices.append(j)
                        
                        # Stop if we have enough for a sequence
                        if len(sequence) >= 5:
                            break
                
                # If we found 4+ single digits, check if they form a sequence
                if len(sequence) >= 4:
                    # Check if it's a monotonic sequence (all ascending or all descending)
                    diffs = [sequence[i+1] - sequence[i] for i in range(len(sequence)-1)]
                    
                    # All differences should be the same (±1 or ±2)
                    if all(d == diffs[0] for d in diffs) and abs(diffs[0]) <= 2:
                        coordinate_indices.update(indices)
        
        return coordinate_indices
    
    def _extract_title(self, lines: list[str]) -> str:
        """Extract title from first substantial line"""
        for line in lines:
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Check if it looks like a title
            if (len(line) < 100 and  # Not too long
                len(line) > 3 and  # Not too short
                not line.endswith(('.', ',', ';', ':')) and  # No ending punctuation
                not re.match(r'^\d+$', line)):  # Not just a number
                return line
        
        return ""
    
    def _has_garbled_chars(self, line: str) -> bool:
        """Detect if line contains garbled characters (from wrong font encoding)
        
        Only marks lines with actual garbled/unreadable characters as formulas.
        Readable math symbols (=, >, <, ±, etc.) are preserved.
        """
        
        # Check for garbled math characters (wrong font encoding)
        garbled_chars = re.findall(r'[𝒙𝒚𝒛𝒘𝒃𝒄𝒅𝒂𝒏𝒎𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝑥𝑦𝑧𝑤𝑏𝑐𝑑𝑎𝑛𝑚𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑖𝑗𝑘𝑙𝑔ℎȉ]', line)
        
        # If has ANY garbled characters, treat entire line as formula
        # This handles mixed text like "If x ℎ ℎ of line"
        if len(garbled_chars) >= 1:
            return True
        
        # Check for isolated formula fragments (likely part of formulas)
        # 1. Lines with only math symbols and spaces (e.g., "> 0", "= 1")
        if re.match(r'^[>\<≥≤=±\+\-\*/\s\d]+$', line) and len(line.strip()) < 15:
            return True
        
        # 2. Lines with only repeated numbers/spaces (e.g., "2 2 2 2")
        # But NOT single numbers (could be coordinates or labels)
        if re.match(r'^[\d\s]+$', line):
            numbers = line.split()
            # Only mark as formula if 4+ repeated numbers
            if len(numbers) >= 4:
                return True
        
        # 3. Very short lines with single symbols (e.g., ",", "where")
        if len(line.strip()) <= 2 and line.strip() in [',', '.', ':', ';']:
            return True
        
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Hybrid PDF to Markdown Converter (pdfplumber + PyMuPDF)"
    )
    parser.add_argument("pdf_file", type=Path, help="PDF file path")
    parser.add_argument("-o", "--output", type=Path, help="Output markdown file")
    parser.add_argument("--dpi", type=int, default=200, help="Image DPI (default: 200)")
    
    args = parser.parse_args()
    
    if not args.pdf_file.exists():
        print(f"Error: File not found: {args.pdf_file}")
        sys.exit(1)
    
    # Default output path
    if not args.output:
        args.output = args.pdf_file.parent / f"{args.pdf_file.stem}.md"
    
    # Convert
    converter = HybridPDFConverter(args.pdf_file)
    converter.convert(args.output, dpi=args.dpi)
    
    print("\n" + "=" * 60)
    print("✅ Conversion complete!")
    print("=" * 60)
    print(f"\nOutput: {args.output}")
    print(f"Images: {args.output.parent / f'{args.output.stem}_pages'}/")


if __name__ == "__main__":
    main()
