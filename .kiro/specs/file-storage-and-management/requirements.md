# Requirements Document - File Storage and Management

## Introduction

This specification defines the requirements for enhancing the file storage and management system of the Gangwon Business Portal. The current implementation provides basic file upload functionality using Supabase Storage, but several critical features are missing:

1. **Registration File Upload**: Files cannot be uploaded during registration (requires authentication)
2. **File Download**: No standardized file download mechanism
3. **File Validation**: Limited validation for file types, sizes, and security
4. **Attachment Management**: No comprehensive attachment lifecycle management
5. **File Organization**: Basic directory structure needs enhancement

The goal is to establish a robust, secure, and user-friendly file storage system that supports all business requirements across the portal.

## Glossary

- **System**: The Gangwon Business Portal file storage and management module
- **Attachment**: A file associated with a specific resource (member, performance record, project, etc.)
- **Bucket**: A Supabase Storage container for organizing files
- **Public File**: A file accessible without authentication
- **Private File**: A file requiring authentication and authorization to access
- **Signed URL**: A temporary URL with embedded authentication for private file access
- **MIME Type**: Multipurpose Internet Mail Extensions type identifying file format
- **File Lifecycle**: The stages a file goes through from upload to deletion
- **Orphaned File**: A file in storage without a corresponding database record

## Requirements

### Requirement 1: File Upload Without Authentication

**User Story:** As a new user registering an account, I want to upload my company logo and business license during registration, so that my application can be processed without additional steps.

#### Acceptance Criteria

1. THE System SHALL provide a public file upload endpoint that does not require authentication
2. WHEN uploading files during registration, THE System SHALL generate a temporary file ID that can be associated with the account later
3. THE System SHALL store uploaded files in a temporary location with a 24-hour expiration
4. WHEN registration is completed, THE System SHALL move files from temporary to permanent storage
5. THE System SHALL automatically delete temporary files that are not associated with an account within 24 hours

### Requirement 2: File Type Validation

**User Story:** As a system administrator, I want strict file type validation, so that only safe and appropriate files can be uploaded to the system.

#### Acceptance Criteria

1. THE System SHALL validate file extensions against an allowed list for each upload context
2. THE System SHALL verify MIME types match the file extension
3. THE System SHALL reject executable files (.exe, .bat, .sh, .cmd, .com, .scr)
4. THE System SHALL reject script files (.js, .vbs, .ps1) unless explicitly allowed for specific contexts
5. THE System SHALL scan file content headers to prevent MIME type spoofing

### Requirement 3: File Size Limits

**User Story:** As a system administrator, I want configurable file size limits, so that storage costs are controlled and system performance is maintained.

#### Acceptance Criteria

1. THE System SHALL enforce a maximum file size of 10MB for image uploads
2. THE System SHALL enforce a maximum file size of 50MB for document uploads
3. THE System SHALL enforce a maximum file size of 100MB for performance data attachments
4. THE System SHALL return clear error messages when file size limits are exceeded
5. THE System SHALL allow administrators to configure size limits per file type

### Requirement 4: Secure File Download

**User Story:** As a user, I want to securely download my uploaded files, so that I can access my documents when needed.

#### Acceptance Criteria

1. THE System SHALL provide a file download endpoint that verifies user authorization
2. WHEN downloading a private file, THE System SHALL verify the user owns the file or has permission to access it
3. THE System SHALL generate signed URLs for private files with 1-hour expiration
4. THE System SHALL log all file download attempts for audit purposes
5. THE System SHALL support direct download and redirect-to-signed-URL methods

### Requirement 5: File Organization

**User Story:** As a system architect, I want a clear file organization structure, so that files are easy to locate and manage.

#### Acceptance Criteria

1. THE System SHALL organize files by business ID in the directory structure: `/upload/{businessId}/{category}/`
2. THE System SHALL use category subdirectories: notice, press, program, performance, profile
3. THE System SHALL store common files (banners, system info) in `/upload/common/{category}/`
4. THE System SHALL generate unique filenames using UUID to prevent conflicts
5. THE System SHALL maintain original filenames in the database for user reference

### Requirement 6: Attachment Database Management

**User Story:** As a developer, I want comprehensive attachment metadata in the database, so that file relationships and lifecycle can be managed effectively.

#### Acceptance Criteria

1. THE System SHALL store attachment metadata including: file_id, resource_type, resource_id, file_path, original_name, stored_name, mime_type, size, uploaded_by, uploaded_at
2. THE System SHALL support polymorphic associations (attachments can belong to members, projects, performance records, etc.)
3. THE System SHALL cascade delete attachments when parent resources are deleted
4. THE System SHALL track attachment status (temporary, active, archived, deleted)
5. THE System SHALL maintain attachment version history when files are replaced

### Requirement 7: Image Processing

**User Story:** As a user, I want uploaded images to be optimized, so that pages load quickly and storage is used efficiently.

#### Acceptance Criteria

1. WHEN an image is uploaded, THE System SHALL generate a thumbnail version (max 200x200px)
2. THE System SHALL compress images to reduce file size while maintaining acceptable quality
3. THE System SHALL preserve original images for high-quality display when needed
4. THE System SHALL support common image formats: JPEG, PNG, GIF, WebP
5. THE System SHALL convert HEIC/HEIF images to JPEG for browser compatibility

### Requirement 8: File Upload Progress

**User Story:** As a user uploading large files, I want to see upload progress, so that I know the upload is working and how long it will take.

#### Acceptance Criteria

1. THE System SHALL support chunked file uploads for files larger than 5MB
2. THE System SHALL provide upload progress callbacks to the frontend
3. THE System SHALL allow resumable uploads for interrupted connections
4. THE System SHALL validate each chunk before accepting the next
5. THE System SHALL assemble chunks into the final file after all chunks are uploaded

### Requirement 9: Virus Scanning

**User Story:** As a security engineer, I want uploaded files to be scanned for malware, so that the system and users are protected from malicious files.

#### Acceptance Criteria

1. THE System SHALL scan all uploaded files for viruses and malware
2. WHEN a file fails virus scanning, THE System SHALL reject the upload and delete the file
3. THE System SHALL quarantine suspicious files for manual review
4. THE System SHALL log all virus scan results for security auditing
5. THE System SHALL notify administrators of detected threats

### Requirement 10: File Cleanup and Lifecycle

**User Story:** As a system administrator, I want automatic file cleanup, so that orphaned and temporary files don't consume storage unnecessarily.

#### Acceptance Criteria

1. THE System SHALL identify orphaned files (files in storage without database records)
2. THE System SHALL automatically delete temporary files older than 24 hours
3. THE System SHALL archive files from deleted resources rather than immediately deleting them
4. THE System SHALL permanently delete archived files after 90 days
5. THE System SHALL provide a manual cleanup tool for administrators

### Requirement 11: Bulk File Operations

**User Story:** As an administrator, I want to perform bulk file operations, so that I can efficiently manage large numbers of files.

#### Acceptance Criteria

1. THE System SHALL support bulk file deletion by resource type or date range
2. THE System SHALL support bulk file download as a ZIP archive
3. THE System SHALL provide progress feedback for bulk operations
4. THE System SHALL log all bulk operations for audit purposes
5. THE System SHALL allow administrators to cancel in-progress bulk operations

### Requirement 12: File Access Control

**User Story:** As a user, I want my files to be private, so that only authorized users can access them.

#### Acceptance Criteria

1. THE System SHALL enforce resource-level permissions for file access
2. WHEN a user requests a file, THE System SHALL verify they own the parent resource or have explicit permission
3. THE System SHALL allow admins to access all files for moderation purposes
4. THE System SHALL support sharing files with specific users or roles
5. THE System SHALL log all file access attempts with user and IP information

### Requirement 13: File Metadata and Search

**User Story:** As a user, I want to search for my uploaded files, so that I can quickly find specific documents.

#### Acceptance Criteria

1. THE System SHALL index file metadata for search (filename, upload date, file type, associated resource)
2. THE System SHALL support searching files by original filename
3. THE System SHALL support filtering files by upload date range
4. THE System SHALL support filtering files by file type (images, documents, etc.)
5. THE System SHALL return search results with file previews when applicable

### Requirement 14: File Versioning

**User Story:** As a user updating my company logo, I want to keep a history of previous versions, so that I can revert if needed.

#### Acceptance Criteria

1. WHEN a file is replaced, THE System SHALL create a new version rather than overwriting
2. THE System SHALL maintain up to 5 previous versions of each file
3. THE System SHALL allow users to view and download previous versions
4. THE System SHALL allow users to restore a previous version as the current version
5. THE System SHALL automatically delete versions older than 1 year

### Requirement 15: File Preview

**User Story:** As a user, I want to preview files before downloading, so that I can verify I'm downloading the correct file.

#### Acceptance Criteria

1. THE System SHALL generate preview URLs for images
2. THE System SHALL generate preview thumbnails for PDF documents (first page)
3. THE System SHALL provide file metadata (name, size, type, upload date) in preview
4. THE System SHALL support in-browser preview for common file types (images, PDFs)
5. THE System SHALL fall back to download for unsupported file types

