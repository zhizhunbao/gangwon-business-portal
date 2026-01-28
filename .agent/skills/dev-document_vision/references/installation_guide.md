# Tesseract OCR Installation Guide

## Windows Installation

### Method 1: Official Installer (Recommended)

1. Download the installer from:
   https://github.com/UB-Mannheim/tesseract/wiki

2. Run the installer (e.g., `tesseract-ocr-w64-setup-5.3.3.20231005.exe`)

3. During installation:
   - Check "Add to PATH" option
   - Select language packs you need:
     - English (default)
     - Chinese - Simplified
     - Chinese - Traditional

4. Verify installation:
   ```cmd
   tesseract --version
   tesseract --list-langs
   ```

### Method 2: Chocolatey

```powershell
choco install tesseract
```

### Method 3: Scoop

```powershell
scoop install tesseract
```

## Linux Installation

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-chi-sim  # Chinese Simplified
sudo apt-get install tesseract-ocr-chi-tra  # Chinese Traditional
```

### Fedora/RHEL

```bash
sudo dnf install tesseract
sudo dnf install tesseract-langpack-chi_sim
```

## macOS Installation

### Homebrew

```bash
brew install tesseract
brew install tesseract-lang  # All language packs
```

## Verify Installation

After installation, verify:

```bash
# Check version
tesseract --version

# List installed languages
tesseract --list-langs

# Test OCR on an image
tesseract test_image.png output
```

## Troubleshooting

### Issue: "tesseract is not recognized"

**Windows:**
1. Find Tesseract installation path (usually `C:\Program Files\Tesseract-OCR`)
2. Add to PATH:
   - Search "Environment Variables" in Windows
   - Edit "Path" variable
   - Add Tesseract installation directory
   - Restart terminal

**Linux/Mac:**
```bash
which tesseract  # Should show path
echo $PATH       # Check if tesseract directory is in PATH
```

### Issue: Language pack not found

Download additional language packs:
- Windows: Re-run installer and select languages
- Linux: `apt-get install tesseract-ocr-<lang>`
- Mac: `brew install tesseract-lang`

### Issue: Poor OCR quality

1. Check image quality (should be at least 300 DPI)
2. Ensure correct language is specified
3. Try different PSM modes
4. Preprocess image (contrast, sharpening)

## Alternative: Cloud OCR Services

If you cannot install Tesseract, use cloud services:

### Google Cloud Vision API

```python
from google.cloud import vision

client = vision.ImageAnnotatorClient()
with open('image.png', 'rb') as f:
    content = f.read()
image = vision.Image(content=content)
response = client.text_detection(image=image)
text = response.text_annotations[0].description
```

### Azure Computer Vision

```python
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from msrest.authentication import CognitiveServicesCredentials

client = ComputerVisionClient(endpoint, CognitiveServicesCredentials(key))
with open('image.png', 'rb') as f:
    result = client.read_in_stream(f, raw=True)
# ... process result
```

### AWS Textract

```python
import boto3

textract = boto3.client('textract')
with open('image.png', 'rb') as f:
    response = textract.detect_document_text(Document={'Bytes': f.read()})
text = '\n'.join([item['Text'] for item in response['Blocks'] if item['BlockType'] == 'LINE'])
```

## Python Configuration

If Tesseract is installed but Python can't find it:

```python
import pytesseract

# Windows - specify path explicitly
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Then use normally
text = pytesseract.image_to_string(image)
```
