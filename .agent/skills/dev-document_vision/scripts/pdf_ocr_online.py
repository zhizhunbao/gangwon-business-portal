#!/usr/bin/env python3
"""
PDF OCR using Free Online OCR API (OCR.space)
No installation required, no API key needed for basic usage.

Usage:
    uv run python .skills/dev-pdf_ocr/scripts/pdf_ocr_online.py input.pdf
    uv run python .skills/dev-pdf_ocr/scripts/pdf_ocr_online.py input.pdf -o output.txt
"""

import argparse
import shutil
import time
from pathlib import Path
from typing import List
import requests

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: Missing PyMuPDF library")
    print("Install with: uv add pymupdf")
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


def ocr_image_online(image_path: Path, api_key: str = "helloworld") -> str:
    """
    Extract text from image using OCR.space free API.
    
    Free tier: 500 requests/day, no registration needed with 'helloworld' key.
    For more requests, register at https://ocr.space/ocrapi
    """
    url = "https://api.ocr.space/parse/image"
    
    with open(image_path, 'rb') as f:
        payload = {
            'apikey': api_key,
            'language': 'eng',  # English
            'isOverlayRequired': False,
            'detectOrientation': True,
            'scale': True,
            'OCREngine': 2,  # Engine 2 is better for documents
        }
        
        response = requests.post(
            url,
            files={'file': f},
            data=payload,
            timeout=60
        )
    
    if response.status_code == 200:
        result = response.json()
        if result.get('IsErroredOnProcessing'):
            error_msg = result.get('ErrorMessage', ['Unknown error'])[0]
            raise Exception(f"OCR API error: {error_msg}")
        
        # Extract text from all parsed results
        text = ""
        if 'ParsedResults' in result:
            for parsed in result['ParsedResults']:
                text += parsed.get('ParsedText', '')
        
        return text
    else:
        raise Exception(f"HTTP error: {response.status_code}")


def extract_text_from_pdf_online(
    pdf_path: str,
    output_path: str = None,
    api_key: str = "helloworld",
    dpi: int = 300,
    keep_images: bool = False
) -> str:
    """
    Complete OCR pipeline using free online API.
    
    Args:
        pdf_path: Path to input PDF
        output_path: Path to save extracted text (optional)
        api_key: OCR.space API key (default: free 'helloworld' key)
        dpi: Image resolution
        keep_images: Keep temporary images after processing
    
    Returns:
        Extracted text
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    print(f"Processing: {pdf_path.name}")
    print(f"Using: OCR.space Free API (500 requests/day limit)\n")
    
    # Convert PDF to images
    image_paths = pdf_to_images(str(pdf_path), dpi=dpi)
    
    # Extract text from each page
    print("Extracting text with online OCR...")
    full_text = ""
    for i, img_path in enumerate(image_paths, 1):
        print(f"  Processing page {i}/{len(image_paths)}...")
        try:
            page_text = ocr_image_online(img_path, api_key)
            full_text += f"\n{'='*60}\n"
            full_text += f"Page {i}\n"
            full_text += f"{'='*60}\n\n"
            full_text += page_text
            
            # Rate limiting - be nice to free API
            if i < len(image_paths):
                print("  Waiting 2 seconds (rate limit)...")
                time.sleep(2)
        except Exception as e:
            print(f"  Error processing page {i}: {e}")
            full_text += f"\n[Error extracting page {i}: {e}]\n"
    
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
        description="Extract text from image-based PDFs using free online OCR",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage (free, no registration)
  python pdf_ocr_online.py document.pdf
  
  # Save to file
  python pdf_ocr_online.py document.pdf -o output.txt
  
  # High quality extraction
  python pdf_ocr_online.py document.pdf --dpi 600
  
  # Use your own API key (for more requests)
  python pdf_ocr_online.py document.pdf --api-key YOUR_KEY
  
  # Keep temporary images
  python pdf_ocr_online.py document.pdf --keep-images

Note: 
- Free tier: 500 requests/day with 'helloworld' key
- Register at https://ocr.space/ocrapi for more requests
- Rate limited to avoid overwhelming the free service
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
        default="helloworld",
        help="OCR.space API key (default: free 'helloworld' key)"
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
        text = extract_text_from_pdf_online(
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
