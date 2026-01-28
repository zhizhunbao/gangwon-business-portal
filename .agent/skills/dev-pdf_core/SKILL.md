---
name: dev-pdf_core
description: Standard PDF structural operations including text/table extraction, merging, and splitting.
---

# PDF Core Toolkit

## Objectives

- Extract text and tables from PDF files accurately
- Merge, split, and manipulate PDF documents
- Convert PDF pages to images
- Fill PDF forms programmatically

## Core Workflows

### 1. Smart Text & Table Extraction
Uses `pdfplumber` for high-fidelity layout preservation.

```bash
# Basic conversion to markdown
python .agent/skills/dev-pdf_core/scripts/pdf_converter.py input.pdf
```

### 2. Merge and Split
```python
from pypdf import PdfWriter, PdfReader

# Merge
writer = PdfWriter()
for pdf in ["1.pdf", "2.pdf"]:
    writer.append(pdf)
writer.write("merged.pdf")
```

### 3. PDF to Images
```python
# Convert pages to PNG
python .agent/skills/dev-pdf_core/scripts/pdf_to_png.py input.pdf output_dir/
```

## Library Selection

| Task | Library |
|------|---------|
| Text/Tables | `pdfplumber` |
| Merge/Split/Forms | `pypdf` |
| Image Extraction | `PyMuPDF (fitz)` |
| PDF Creation | `reportlab` |
