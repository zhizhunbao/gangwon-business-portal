#!/usr/bin/env python3
"""
PDF OCR Text Extractor
Converts image-based PDFs to text using OCR.

Usage:
    uv run python .skills/dev-pdf_ocr/scripts/pdf_ocr_extractor.py input.pdf
    uv run python .skills/dev-pdf_ocr/scripts/pdf_ocr_extractor.py input.pdf -o output.txt
    uv run python .skills/dev-pdf_ocr/scripts/pdf_ocr_extractor.py input.pdf --lang eng+chi_sim --dpi 600
"""

import argparse
import shutil
from pathlib import Path
from typing import List

try:
    import fitz  # PyMuPDF
    from PIL import Image
    import pytesseract
except ImportError as e:
    print(f"Error: Missing required library: {e}")
    print("Install with: uv add pymupdf pillow pytesseract")
    exit(1)


def pdf_to_images(pdf_path: str, output_dir: str = "temp_images", dpi: int = 300) -> List[Path]:
    """
    Convert PDF pages to PNG images.
    
    Args:
        pdf_path: Path to input PDF file
        output_dir: Directory to save temporary images
        dpi: Resolution for rendering (higher = better quality, slower)
    
    Returns:
        List of paths to generated PNG images
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    print(f"Converting PDF to images (DPI: {dpi})...")
    doc = fitz.open(pdf_path)
    image_paths = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        # Render at specified DPI
        mat = fitz.Matrix(dpi/72, dpi/72)
        pix = page.get_pixmap(matrix=mat)
        
        img_path = output_path / f"page_{page_num + 1}.png"
        pix.save(str(img_path))
        image_paths.append(img_path)
        print(f"  Rendered page {page_num + 1}/{len(doc)}")
    
    doc.close()
    print(f"✓ Converted {len(image_paths)} pages to images\n")
    return image_paths


def ocr_image(image_path: Path, lang: str = "eng+chi_sim", psm: int = 6) -> str:
    """
    Extract text from image using OCR.
    
    Args:
        image_path: Path to image file
        lang: Tesseract language code(s)
        psm: Page segmentation mode
    
    Returns:
        Extracted text
    """
    img = Image.open(image_path)
    
    # Configure OCR parameters
    custom_config = f'--oem 3 --psm {psm}'
    text = pytesseract.image_to_string(img, lang=lang, config=custom_config)
    
    return text


def extract_text_from_pdf_ocr(
    pdf_path: str,
    output_path: str = None,
    lang: str = "eng+chi_sim",
    dpi: int = 300,
    psm: int = 6,
    keep_images: bool = False
) -> str:
    """
    Complete OCR pipeline for image-based PDFs.
    
    Args:
        pdf_path: Path to input PDF
        output_path: Path to save extracted text (optional)
        lang: OCR language(s)
        dpi: Image resolution
        psm: Page segmentation mode
        keep_images: Keep temporary images after processing
    
    Returns:
        Extracted text
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    print(f"Processing: {pdf_path.name}")
    print(f"Language: {lang}, DPI: {dpi}, PSM: {psm}\n")
    
    # Convert PDF to images
    image_paths = pdf_to_images(str(pdf_path), dpi=dpi)
    
    # Extract text from each page
    print("Extracting text with OCR...")
    full_text = ""
    for i, img_path in enumerate(image_paths, 1):
        print(f"  Processing page {i}/{len(image_paths)}...")
        page_text = ocr_image(img_path, lang=lang, psm=psm)
        full_text += f"\n{'='*60}\n"
        full_text += f"Page {i}\n"
        full_text += f"{'='*60}\n\n"
        full_text += page_text
    
    print(f"\n✓ Extracted text from {len(image_paths)} pages")
    print(f"  Total characters: {len(full_text)}")
    
    # Save to file if output path specified
    if output_path:
        output_file = Path(output_path)
        output_file.write_text(full_text, encoding='utf-8')
        print(f"✓ Saved to: {output_file}")
    
    # Cleanup temporary images
    if not keep_images:
        shutil.rmtree("temp_images", ignore_errors=True)
        print("✓ Cleaned up temporary images")
    else:
        print(f"✓ Temporary images kept in: temp_images/")
    
    return full_text


def main():
    parser = argparse.ArgumentParser(
        description="Extract text from image-based PDFs using OCR",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python pdf_ocr_extractor.py document.pdf
  
  # Save to file
  python pdf_ocr_extractor.py document.pdf -o output.txt
  
  # High quality extraction
  python pdf_ocr_extractor.py document.pdf --dpi 600
  
  # English only (faster)
  python pdf_ocr_extractor.py document.pdf --lang eng
  
  # Keep temporary images
  python pdf_ocr_extractor.py document.pdf --keep-images

Language codes:
  eng          - English
  chi_sim      - Simplified Chinese
  chi_tra      - Traditional Chinese
  eng+chi_sim  - English + Chinese (default)
  
PSM modes:
  3  - Fully automatic (default)
  6  - Uniform block of text (recommended for documents)
  11 - Sparse text (for diagrams)
        """
    )
    
    parser.add_argument(
        "pdf_file",
        help="Path to input PDF file"
    )
    parser.add_argument(
        "-o", "--output",
        help="Path to output text file (default: print to console)"
    )
    parser.add_argument(
        "--lang",
        default="eng+chi_sim",
        help="OCR language(s) (default: eng+chi_sim)"
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=300,
        help="Image resolution (default: 300, higher = better quality)"
    )
    parser.add_argument(
        "--psm",
        type=int,
        default=6,
        help="Page segmentation mode (default: 6)"
    )
    parser.add_argument(
        "--keep-images",
        action="store_true",
        help="Keep temporary images after processing"
    )
    
    args = parser.parse_args()
    
    try:
        # Check if Tesseract is installed
        try:
            pytesseract.get_tesseract_version()
        except Exception:
            print("Error: Tesseract OCR is not installed or not in PATH")
            print("\nInstallation instructions:")
            print("  Windows: https://github.com/UB-Mannheim/tesseract/wiki")
            print("  Linux:   apt-get install tesseract-ocr tesseract-ocr-chi-sim")
            print("  Mac:     brew install tesseract tesseract-lang")
            exit(1)
        
        # Extract text
        text = extract_text_from_pdf_ocr(
            args.pdf_file,
            output_path=args.output,
            lang=args.lang,
            dpi=args.dpi,
            psm=args.psm,
            keep_images=args.keep_images
        )
        
        # Print to console if no output file specified
        if not args.output:
            print("\n" + "="*60)
            print("EXTRACTED TEXT")
            print("="*60 + "\n")
            print(text)
    
    except Exception as e:
        print(f"\nError: {e}")
        exit(1)


if __name__ == "__main__":
    main()
