---
name: docx-to-md
description: Word and PowerPoint document converter. Specializes in converting Office formats to Markdown with layout preservation and screenshots.
---

# Office Document Converter

## Objectives

- Convert Word (.docx) to Markdown (.md) while preserving formatting
- Convert PowerPoint (.pptx) to Markdown with high-quality screenshots
- Extract embedded images and media
- Automated requirement analysis document generation from client inputs

## Core Workflows

### 1. PPTX to Markdown (Screenshot Method)
Best for UI/UX feedback or design documents. Captures each slide as an image.
```bash
python .agent/skills/dev-office_converter/scripts/pptx_to_md_screenshot.py input.pptx
```

### 2. DOCX to Markdown
Standard conversion for text-heavy documents.
```bash
# Using mammoth strategy
python .agent/skills/dev-office_converter/scripts/convert_docx_mammoth.py input.docx output.md
```

### 3. PPTX to Image-only PDF
```bash
python .agent/skills/dev-office_converter/scripts/pptx_to_image_pdf.py input.pptx
```

## Features

- **Windows Office Integration**: Uses COM interface for perfect PPTX rendering.
- **Image Extraction**: Automatically saves assets to a dedicated folder.
- **UTF-8 Support**: Handles multi-language content (Korean, Chinese, English).

## Dependencies

- `python-pptx`
- `pywin32`
- `mammoth`
- `pathlib`
