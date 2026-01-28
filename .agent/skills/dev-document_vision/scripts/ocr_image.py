"""
Extract text from image using OCR.

Usage:
    uv run python ocr_image.py <image_path>
"""

import sys
from pathlib import Path

try:
    from PIL import Image
    import pytesseract
except ImportError:
    print("Error: Required libraries not installed")
    print("Install with: uv add pillow pytesseract")
    sys.exit(1)


def ocr_image(image_path: str):
    """Extract text from image using OCR."""
    img_file = Path(image_path)
    
    if not img_file.exists():
        print(f"Error: Image file not found: {image_path}")
        return
    
    print(f"Extracting text from: {img_file.name}")
    
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        
        print("\n" + "="*60)
        print("EXTRACTED TEXT:")
        print("="*60)
        print(text)
        print("="*60)
        
    except Exception as e:
        print(f"Error during OCR: {e}")
        print("\nNote: Make sure Tesseract is installed on your system")
        print("Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ocr_image.py <image_path>")
        sys.exit(1)
    
    ocr_image(sys.argv[1])
