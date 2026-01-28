"""
Convert PDF files to PNG images using PyMuPDF.

Usage:
    uv run python pdf_to_png.py <pdf_file> [output_dir] [dpi]
    
Examples:
    # Convert with default settings (300 DPI, same directory as PDF)
    uv run python pdf_to_png.py document.pdf
    
    # Specify output directory
    uv run python pdf_to_png.py document.pdf output/images
    
    # Specify DPI for higher quality
    uv run python pdf_to_png.py document.pdf output/images 600
"""

import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF not installed")
    print("Install with: uv add pymupdf")
    sys.exit(1)


def pdf_to_png(pdf_path: str, output_dir: str = None, dpi: int = 300):
    """
    Convert PDF to PNG images.
    
    Args:
        pdf_path: Path to the PDF file
        output_dir: Directory to save PNG files (default: same as PDF)
        dpi: Resolution for output images (default: 300)
    """
    pdf_file = Path(pdf_path)
    
    if not pdf_file.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        return
    
    # Set output directory
    if output_dir:
        out_dir = Path(output_dir)
    else:
        out_dir = pdf_file.parent
    
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Converting {pdf_file.name} to PNG...")
    print(f"Output directory: {out_dir}")
    print(f"DPI: {dpi}")
    
    try:
        # Open PDF
        pdf_document = fitz.open(pdf_path)
        page_count = len(pdf_document)
        
        # Calculate zoom factor for desired DPI (default 72 DPI)
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        
        # Convert each page
        base_name = pdf_file.stem
        for page_num in range(page_count):
            page = pdf_document[page_num]
            pix = page.get_pixmap(matrix=mat)
            
            output_path = out_dir / f"{base_name}_page_{page_num + 1}.png"
            pix.save(output_path)
            print(f"  ✓ Saved: {output_path.name}")
        
        pdf_document.close()
        print(f"\n✅ Success! Converted {page_count} page(s)")
        
    except Exception as e:
        print(f"❌ Error during conversion: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_png.py <pdf_path> [output_dir] [dpi]")
        print("\nExamples:")
        print("  python pdf_to_png.py document.pdf")
        print("  python pdf_to_png.py document.pdf output/images")
        print("  python pdf_to_png.py document.pdf output/images 600")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    
    pdf_to_png(pdf_path, output_dir, dpi)
