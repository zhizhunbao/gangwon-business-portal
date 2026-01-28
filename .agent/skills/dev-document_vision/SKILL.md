---
name: dev-document_vision
description: Vision-based document analysis including OCR, formula recognition, and hybrid screenshot/text extraction. Use for scanned documents or complex mathematical content.
---

# Document Vision & OCR

## Objectives

- Extract text from image-based/scanned PDFs
- Recognize mathematical formulas using Pix2Text
- Hybrid extraction: Combine full-page screenshots with searchable text
- High-fidelity visual preservation of documentation

## Core Workflows

### 1. Hybrid Conversion (Recommended for Slides)
Captures full page images while keeping extracted text.
```bash
python .agent/skills/dev-document_vision/scripts/pdf_to_md_hybrid.py input.pdf -o output.md
```

### 2. OCR and Formula Recognition
Uses Pix2Text to detect and convert formulas to LaTeX.
```bash
python .agent/skills/dev-document_vision/scripts/pdf_to_image_md.py input.pdf -o output.md
```

### 3. Basic OCR
```bash
python .agent/skills/dev-document_vision/scripts/ocr_image.py screenshot.png
```

## Features

- **LaTeX Support**: Detects and converts formulas to `$formula$` format.
- **DPI Control**: Supports high-resolution rendering (300+ DPI) for better OCR accuracy.
- **Bilingual Ready**: Supports English and Simplified Chinese recognition.

## Dependencies

- `pymupdf` (fitz)
- `pix2text`
- `pytesseract`
- `pillow`
