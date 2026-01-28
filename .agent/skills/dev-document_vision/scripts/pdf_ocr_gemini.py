#!/usr/bin/env python3
"""
PDF OCR using Google Gemini Vision API
Alternative to Tesseract OCR - uses cloud API instead.

Usage:
    uv run python .skills/dev-pdf_ocr/scripts/pdf_ocr_gemini.py input.pdf
    uv run python .skills/dev-pdf_ocr/scripts/pdf_ocr_gemini.py input.pdf -o output.txt
"""

import argparse
import os
import shutil
import time
from pathlib import Path
from typing import List

try:
    import fitz  # PyMuPDF
    from PIL import Image
    import google.generativeai as genai
except ImportError as e:
    print(f"Error: Missing required library: {e}")
    print("Install with: uv add pymupdf pillow google-generativeai")
    exit(1)


def pdf_to_images(pdf_path: str, output_dir: str = "temp_images", dpi: int = 300) -> List[Path]:
    """Convert PDF pages to PNG images."""
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    print(f"Converting PDF to images (DPI: {dpi})...")
    doc = fitz.open(pdf_path)
    image_paths = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        mat = fitz.Matrix(dpi/72, dpi/72)
        pix = page.get_pixmap(matrix=mat)
        
        img_path = output_path / f"page_{page_num + 1}.png"
        pix.save(str(img_path))
        image_paths.append(img_path)
        print(f"  Rendered page {page_num + 1}/{len(doc)}")
    
    doc.close()
    print(f"✓ Converted {len(image_paths)} pages to images\n")
    return image_paths


def ocr_image_gemini(image_path: Path, model) -> str:
    """Extract text from image using Gemini Vision API."""
    img = Image.open(image_path)
    
    prompt = """Extract all text from this image. 
    
Rules:
- Preserve the original layout and structure
- Include all visible text, labels, and annotations
- If there are diagrams or charts, describe them briefly
- Maintain paragraph breaks and formatting
- Output plain text only

Text:"""
    
    response = model.generate_content([prompt, img])
    return response.text


def extract_text_from_pdf_gemini(
    pdf_path: str,
    output_path: str = None,
    api_key: str = None,
    dpi: int = 300,
    keep_images: bool = False
) -> str:
    """
    Complete OCR pipeline using Gemini Vision API.
    
    Args:
        pdf_path: Path to input PDF
        output_path: Path to save extracted text (optional)
        api_key: Gemini API key (or set GEMINI_API_KEY env var)
        dpi: Image resolution
        keep_images: Keep temporary images after processing
    
    Returns:
        Extracted text
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Configure Gemini API
    if api_key:
        genai.configure(api_key=api_key)
    elif os.getenv("GEMINI_API_KEY"):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    else:
        raise ValueError("Gemini API key not provided. Set GEMINI_API_KEY environment variable or pass --api-key")
    
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    print(f"Processing: {pdf_path.name}")
    print(f"Using: Google Gemini Vision API\n")
    
    # Convert PDF to images
    image_paths = pdf_to_images(str(pdf_path), dpi=dpi)
    
    # Extract text from each page
    print("Extracting text with Gemini Vision API...")
    full_text = ""
    for i, img_path in enumerate(image_paths, 1):
        print(f"  Processing page {i}/{len(image_paths)}...")
        try:
            page_text = ocr_image_gemini(img_path, model)
            full_text += f"\n{'='*60}\n"
            full_text += f"Page {i}\n"
            full_text += f"{'='*60}\n\n"
            full_text += page_text
            
            # Rate limiting - Gemini has 60 requests/minute limit
            if i < len(image_paths):
                time.sleep(1)  # Wait 1 second between requests
        except Exception as e:
            print(f"  Error processing page {i}: {e}")
            full_text += f"\n[Error extracting page {i}]\n"
    
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
        description="Extract text from image-based PDFs using Gemini Vision API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage (requires GEMINI_API_KEY env var)
  python pdf_ocr_gemini.py document.pdf
  
  # Save to file
  python pdf_ocr_gemini.py document.pdf -o output.txt
  
  # Provide API key directly
  python pdf_ocr_gemini.py document.pdf --api-key YOUR_API_KEY
  
  # High quality extraction
  python pdf_ocr_gemini.py document.pdf --dpi 600
  
  # Keep temporary images
  python pdf_ocr_gemini.py document.pdf --keep-images

Note: Gemini Vision API has rate limits (60 requests/minute for free tier)
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
        "--api-key",
        help="Gemini API key (or set GEMINI_API_KEY env var)"
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=300,
        help="Image resolution (default: 300)"
    )
    parser.add_argument(
        "--keep-images",
        action="store_true",
        help="Keep temporary images after processing"
    )
    
    args = parser.parse_args()
    
    try:
        # Extract text
        text = extract_text_from_pdf_gemini(
            args.pdf_file,
            output_path=args.output,
            api_key=args.api_key,
            dpi=args.dpi,
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
        import traceback
        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    main()
