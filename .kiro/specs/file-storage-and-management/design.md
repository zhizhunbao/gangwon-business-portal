# Design Document - File Storage and Management

## Overview

This design document outlines the enhancement of the file storage and management system for the Gangwon Business Portal. The current implementation provides basic file upload functionality using Supabase Storage, but lacks several critical features needed for production use.

**Key Enhancements:**
1. **Public Upload Endpoint**: Support file uploads during registration without authentication
2. **Comprehensive Validation**: File type, size, and content validation
3. **Secure Download**: Authorization checks and signed URLs
4. **File Lifecycle Management**: Temporary storage, archival, and cleanup
5. **Image Processing**: Thumbnail generation and compression
6. **Advanced Features**: Chunked uploads, virus scanning, versioning, search

The enhanced system will provide a robust, secure, and user-friendly file management experience across all portal features.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│              (Member Portal / Admin Portal)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS + Multipart Form Data
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (FastAPI)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         File Upload Middleware                        │  │
│  │  - Size Validation                                    │  │
│  │  - Type Validation                                    │  │
│  │  - Virus Scanning                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Database   │  │   Supabase   │  │ Image Proc.  │
│ (Attachments)│  │   Storage    │  │   Service    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### File Upload Flow

```
User → Upload Request → Validation → Virus Scan → Storage
                                                  → Thumbnail (if image)
                                                  → Database Record
                                                  → Return File Info
```

### File Download Flow

```
User → Download Request → Auth Check → Permission Check
                                    → Generate Signed URL
                                    → Return URL or Redirect
                                    → Log Access
```


## Components and Interfaces

### 1. Enhanced Storage Service (`backend/src/common/modules/storage/service.py`)

**Key Methods:**
```python
class StorageService:
    # Public Upload (no auth required)
    async def upload_public(file: UploadFile, category: str) -> dict
    
    # Authenticated Upload
    async def upload_private(file: UploadFile, user_id: UUID, category: str, resource_type: str, resource_id: UUID) -> dict
    
    # File Validation
    def validate_file_type(file: UploadFile, allowed_types: list) -> bool
    def validate_file_size(file: UploadFile, max_size: int) -> bool
    def validate_mime_type(file: UploadFile) -> bool
    
    # Download
    async def get_file(file_id: UUID, user_id: UUID) -> dict
    def create_signed_url(file_path: str, expires_in: int = 3600) -> str
    
    # Image Processing
    async def generate_thumbnail(file_path: str, max_size: tuple = (200, 200)) -> str
    async def compress_image(file_path: str, quality: int = 85) -> str
    
    # Lifecycle Management
    async def move_to_permanent(temp_file_id: UUID, resource_id: UUID) -> None
    async def archive_file(file_id: UUID) -> None
    async def cleanup_temp_files() -> int
    async def cleanup_orphaned_files() -> int
```

### 2. Attachment Model (`backend/src/common/modules/db/models.py`)

```python
class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    resource_type = Column(String(50), nullable=False)  # member, project, performance, etc.
    resource_id = Column(UUID, nullable=False)
    
    file_path = Column(String(500), nullable=False)
    original_name = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    
    status = Column(String(20), default="active")  # temporary, active, archived, deleted
    uploaded_by = Column(UUID, ForeignKey("members.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Versioning
    version = Column(Integer, default=1)
    parent_id = Column(UUID, ForeignKey("attachments.id"), nullable=True)
    
    # Thumbnails
    thumbnail_path = Column(String(500), nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_attachments_resource', 'resource_type', 'resource_id'),
        Index('idx_attachments_status', 'status'),
        Index('idx_attachments_uploaded_at', 'uploaded_at'),
    )
```

### 3. File Validator (`backend/src/common/modules/storage/validator.py`)

```python
class FileValidator:
    ALLOWED_EXTENSIONS = {
        'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        'document': ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
        'archive': ['.zip', '.tar', '.gz']
    }
    
    MAX_SIZES = {
        'image': 10 * 1024 * 1024,  # 10MB
        'document': 50 * 1024 * 1024,  # 50MB
        'attachment': 100 * 1024 * 1024  # 100MB
    }
    
    def validate(file: UploadFile, context: str) -> tuple[bool, str]
    def check_extension(filename: str, allowed: list) -> bool
    def check_mime_type(file: UploadFile) -> bool
    def check_content_header(file: UploadFile) -> bool
```

## Data Models

### Attachment Table Schema

```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    uploaded_by UUID REFERENCES members(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES attachments(id),
    thumbnail_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_resource ON attachments(resource_type, resource_id);
CREATE INDEX idx_attachments_status ON attachments(status);
CREATE INDEX idx_attachments_uploaded_at ON attachments(uploaded_at);
```

### File Organization Structure

```
/upload
  /temp                          # Temporary uploads (24h expiration)
    /{uuid}.{ext}
  /{businessId}                  # User-specific files
    /profile                     # Company logo, business license
    /performance                 # Performance data attachments
    /project                     # Project application files
  /common                        # Shared files
    /banners                     # Banner images
    /system-info                 # System introduction images
    /notices                     # Notice attachments
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Upload and Storage Properties

**Property 1: Public Upload Without Authentication**
*For any* file upload to the public endpoint, the upload should succeed without requiring an authentication token.
**Validates: Requirements 1.1**

**Property 2: Temporary File ID Generation**
*For any* file uploaded during registration, a unique temporary file ID should be generated.
**Validates: Requirements 1.2**

**Property 3: Temporary File Expiration**
*For any* temporary file, it should be stored with a 24-hour expiration timestamp.
**Validates: Requirements 1.3**

**Property 4: File Migration on Registration**
*For any* completed registration with temporary files, those files should be moved to permanent storage.
**Validates: Requirements 1.4**

**Property 5: Temporary File Cleanup**
*For any* temporary file older than 24 hours without an associated account, it should be automatically deleted.
**Validates: Requirements 1.5**

### Validation Properties

**Property 6: Extension Validation**
*For any* file upload, the file extension should be validated against the allowed list for that context.
**Validates: Requirements 2.1**

**Property 7: MIME Type Matching**
*For any* uploaded file, the MIME type should match the file extension.
**Validates: Requirements 2.2**

**Property 8: Executable File Rejection**
*For any* file with executable extensions (.exe, .bat, .sh, etc.), the upload should be rejected.
**Validates: Requirements 2.3**

**Property 9: Script File Context Validation**
*For any* script file upload (.js, .vbs, .ps1), it should only be accepted in explicitly allowed contexts.
**Validates: Requirements 2.4**

**Property 10: Content Header Validation**
*For any* uploaded file, the content header should be scanned to prevent MIME type spoofing.
**Validates: Requirements 2.5**

**Property 11: Image Size Limit**
*For any* image upload, files larger than 10MB should be rejected.
**Validates: Requirements 3.1**

**Property 12: Document Size Limit**
*For any* document upload, files larger than 50MB should be rejected.
**Validates: Requirements 3.2**

**Property 13: Attachment Size Limit**
*For any* performance data attachment, files larger than 100MB should be rejected.
**Validates: Requirements 3.3**

**Property 14: Size Limit Error Messages**
*For any* file exceeding size limits, a clear error message should be returned.
**Validates: Requirements 3.4**

**Property 15: Configurable Size Limits**
*For any* file type, administrators should be able to configure the size limit.
**Validates: Requirements 3.5**

### Download and Access Properties

**Property 16: Download Authorization**
*For any* file download request, user authorization should be verified before granting access.
**Validates: Requirements 4.1**

**Property 17: Ownership Verification**
*For any* private file download, the system should verify the user owns the file or has explicit permission.
**Validates: Requirements 4.2**

**Property 18: Signed URL Generation**
*For any* private file, a signed URL with 1-hour expiration should be generated.
**Validates: Requirements 4.3**

**Property 19: Download Audit Logging**
*For any* file download attempt, the event should be logged with user and file information.
**Validates: Requirements 4.4**

**Property 20: Download Method Support**
*For any* file download, both direct download and signed URL redirect methods should be supported.
**Validates: Requirements 4.5**

### Organization Properties

**Property 21: Business ID Directory Structure**
*For any* user file upload, the file should be stored in /upload/{businessId}/{category}/ structure.
**Validates: Requirements 5.1**

**Property 22: Category Subdirectories**
*For any* file upload, it should be stored in the appropriate category subdirectory.
**Validates: Requirements 5.2**

**Property 23: Common File Storage**
*For any* common file (banners, system info), it should be stored in /upload/common/{category}/.
**Validates: Requirements 5.3**

**Property 24: UUID Filename Generation**
*For any* uploaded file, a unique UUID-based filename should be generated.
**Validates: Requirements 5.4**

**Property 25: Original Filename Preservation**
*For any* uploaded file, the original filename should be stored in the database.
**Validates: Requirements 5.5**

### Metadata and Lifecycle Properties

**Property 26: Complete Metadata Storage**
*For any* uploaded file, all required metadata fields should be stored in the database.
**Validates: Requirements 6.1**

**Property 27: Polymorphic Associations**
*For any* attachment, it should support association with different resource types.
**Validates: Requirements 6.2**

**Property 28: Cascade Deletion**
*For any* deleted parent resource, associated attachments should also be deleted.
**Validates: Requirements 6.3**

**Property 29: Status Tracking**
*For any* attachment, its status should be tracked through lifecycle stages.
**Validates: Requirements 6.4**

**Property 30: Version History**
*For any* replaced file, the previous version should be maintained in history.
**Validates: Requirements 6.5**

### Image Processing Properties

**Property 31: Thumbnail Generation**
*For any* uploaded image, a thumbnail (max 200x200px) should be automatically generated.
**Validates: Requirements 7.1**

**Property 32: Image Compression**
*For any* uploaded image, it should be compressed to reduce file size.
**Validates: Requirements 7.2**

**Property 33: Original Image Preservation**
*For any* compressed image, the original should be preserved.
**Validates: Requirements 7.3**

**Property 34: Image Format Support**
*For any* image in JPEG, PNG, GIF, or WebP format, it should be accepted.
**Validates: Requirements 7.4**

**Property 35: HEIC Conversion**
*For any* HEIC/HEIF image upload, it should be converted to JPEG.
**Validates: Requirements 7.5**

### Advanced Features Properties

**Property 36-40**: Chunked uploads, virus scanning, cleanup, bulk operations (Requirements 8-11)
**Property 41-45**: Access control, search, versioning, preview (Requirements 12-15)

*Note: Properties 36-75 follow the same pattern for remaining requirements.*


## Error Handling

| Error Type | HTTP Status | Description |
|------------|-------------|-------------|
| `FileTooLargeError` | 413 | File exceeds size limit |
| `InvalidFileTypeError` | 422 | File type not allowed |
| `VirusScanFailedError` | 422 | File failed virus scan |
| `FileNotFoundError` | 404 | File does not exist |
| `UnauthorizedFileAccessError` | 403 | User lacks permission to access file |
| `StorageQuotaExceededError` | 507 | Storage quota exceeded |

## Testing Strategy

### Unit Testing
- File validation logic
- MIME type checking
- Size limit enforcement
- Path generation
- Metadata extraction

### Property-Based Testing
Using **pytest** with **Hypothesis** (minimum 100 iterations):

```python
# Feature: file-storage-and-management, Property 1: Public Upload Without Authentication
@settings(max_examples=100)
@given(file_data=st.binary(min_size=1, max_size=1024))
async def test_public_upload_no_auth(file_data):
    """Test that public uploads work without authentication"""
    # Test implementation
```

### Integration Testing
- Complete upload → storage → download flow
- Temporary → permanent file migration
- File versioning workflow
- Bulk operations

## Security Considerations

1. **File Type Validation**: Check both extension and content
2. **Virus Scanning**: Integrate ClamAV or similar
3. **Size Limits**: Prevent DoS attacks
4. **Access Control**: Verify ownership before download
5. **Signed URLs**: Time-limited access to private files
6. **Audit Logging**: Track all file operations

## API Endpoints

### POST /api/upload/public
Upload file without authentication (for registration).

**Request:** Multipart form data
**Response:**
```json
{
  "file_id": "uuid",
  "temp_url": "https://...",
  "expires_at": "2025-01-30T10:00:00Z"
}
```

### POST /api/upload/private
Upload file with authentication.

**Headers:** `Authorization: Bearer <token>`
**Request:** Multipart form data
**Response:**
```json
{
  "file_id": "uuid",
  "url": "https://...",
  "thumbnail_url": "https://..."
}
```

### GET /api/files/{file_id}
Download or get signed URL for file.

**Headers:** `Authorization: Bearer <token>`
**Response:**
```json
{
  "url": "https://...",
  "expires_at": "2025-01-29T11:00:00Z",
  "metadata": {
    "name": "document.pdf",
    "size": 1024000,
    "mime_type": "application/pdf"
  }
}
```

### DELETE /api/files/{file_id}
Delete file (archives instead of immediate deletion).

### GET /api/files/search
Search files by metadata.

**Query Parameters:** `filename`, `date_from`, `date_to`, `type`

## Dependencies

### External Dependencies
- **authentication-and-authorization**: User authentication and permissions
- **backend-architecture-standards**: Database models, error handling
- **frontend-architecture-standards**: Upload components, progress tracking

### Third-Party Libraries
**Backend:**
- `python-magic`: MIME type detection
- `Pillow`: Image processing
- `pyclamd`: Virus scanning (optional)

**Frontend:**
- `axios`: File upload with progress
- `react-dropzone`: Drag-and-drop upload UI

## Performance Considerations

- **Chunked Uploads**: For files > 5MB
- **Async Processing**: Thumbnail generation, virus scanning
- **CDN**: Serve public files through CDN
- **Caching**: Cache signed URLs for repeated access
- **Database Indexes**: On resource_type, resource_id, status

## Migration Strategy

1. **Phase 1**: Add Attachment model and public upload endpoint
2. **Phase 2**: Implement validation and virus scanning
3. **Phase 3**: Add image processing and thumbnails
4. **Phase 4**: Implement versioning and advanced features
5. **Phase 5**: Migrate existing files to new structure

