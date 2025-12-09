# Implementation Plan - File Storage and Management

- [ ] 1. Set up database models and migrations
  - Create Attachment model with all required fields (id, resource_type, resource_id, file_path, original_name, stored_name, mime_type, size, status, uploaded_by, uploaded_at, version, parent_id, thumbnail_path)
  - Add database indexes for performance (resource_type+resource_id, status, uploaded_at)
  - Create Alembic migration for attachments table
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 1.1 Write property test for attachment model
  - **Property 26: Complete Metadata Storage**
  - **Validates: Requirements 6.1**

- [ ] 2. Implement core file validator
  - Create FileValidator class with extension, MIME type, and size validation methods
  - Define ALLOWED_EXTENSIONS dictionary for image, document, and archive types
  - Define MAX_SIZES dictionary for different file contexts
  - Implement check_extension, check_mime_type, and check_content_header methods
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 2.1 Write property test for extension validation
  - **Property 6: Extension Validation**
  - **Validates: Requirements 2.1**

- [ ]* 2.2 Write property test for MIME type matching
  - **Property 7: MIME Type Matching**
  - **Validates: Requirements 2.2**

- [ ]* 2.3 Write property test for executable file rejection
  - **Property 8: Executable File Rejection**
  - **Validates: Requirements 2.3**

- [ ]* 2.4 Write property test for size limit enforcement
  - **Property 11: Image Size Limit**
  - **Property 12: Document Size Limit**
  - **Property 13: Attachment Size Limit**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 3. Enhance StorageService with core upload functionality
  - Implement upload_public method for unauthenticated uploads
  - Implement upload_private method for authenticated uploads
  - Add file path generation logic using UUID
  - Integrate FileValidator into upload methods
  - Create database records for uploaded files
  - _Requirements: 1.1, 1.2, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 3.1 Write property test for public upload without authentication
  - **Property 1: Public Upload Without Authentication**
  - **Validates: Requirements 1.1**

- [ ]* 3.2 Write property test for temporary file ID generation
  - **Property 2: Temporary File ID Generation**
  - **Validates: Requirements 1.2**

- [ ]* 3.3 Write property test for UUID filename generation
  - **Property 24: UUID Filename Generation**
  - **Validates: Requirements 5.4**

- [ ]* 3.4 Write property test for original filename preservation
  - **Property 25: Original Filename Preservation**
  - **Validates: Requirements 5.5**

- [ ] 4. Implement temporary file management
  - Add temporary file storage with 24-hour expiration timestamp
  - Implement move_to_permanent method to migrate files after registration
  - Create cleanup_temp_files scheduled task for automatic deletion
  - Add status tracking (temporary, active, archived, deleted)
  - _Requirements: 1.3, 1.4, 1.5, 6.4_

- [ ]* 4.1 Write property test for temporary file expiration
  - **Property 3: Temporary File Expiration**
  - **Validates: Requirements 1.3**

- [ ]* 4.2 Write property test for file migration on registration
  - **Property 4: File Migration on Registration**
  - **Validates: Requirements 1.4**

- [ ]* 4.3 Write property test for temporary file cleanup
  - **Property 5: Temporary File Cleanup**
  - **Validates: Requirements 1.5**

- [ ] 5. Implement secure file download functionality
  - Create get_file method with authorization checks
  - Implement ownership verification logic
  - Add create_signed_url method for private files with 1-hour expiration
  - Support both direct download and signed URL redirect methods
  - Add audit logging for all download attempts
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 5.1 Write property test for download authorization
  - **Property 16: Download Authorization**
  - **Validates: Requirements 4.1**

- [ ]* 5.2 Write property test for ownership verification
  - **Property 17: Ownership Verification**
  - **Validates: Requirements 4.2**

- [ ]* 5.3 Write property test for signed URL generation
  - **Property 18: Signed URL Generation**
  - **Validates: Requirements 4.3**

- [ ]* 5.4 Write property test for download audit logging
  - **Property 19: Download Audit Logging**
  - **Validates: Requirements 4.4**

- [ ] 6. Add image processing capabilities
  - Implement generate_thumbnail method (max 200x200px)
  - Implement compress_image method with quality parameter
  - Add automatic thumbnail generation on image upload
  - Preserve original images alongside compressed versions
  - Support JPEG, PNG, GIF, WebP formats
  - Add HEIC/HEIF to JPEG conversion
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 6.1 Write property test for thumbnail generation
  - **Property 31: Thumbnail Generation**
  - **Validates: Requirements 7.1**

- [ ]* 6.2 Write property test for image compression
  - **Property 32: Image Compression**
  - **Validates: Requirements 7.2**

- [ ]* 6.3 Write property test for original image preservation
  - **Property 33: Original Image Preservation**
  - **Validates: Requirements 7.3**

- [ ] 7. Create upload API endpoints
  - Create POST /api/upload/public endpoint (no authentication required)
  - Create POST /api/upload/private endpoint (authentication required)
  - Add multipart form data handling
  - Return file_id, URLs, and metadata in responses
  - Implement proper error handling with appropriate HTTP status codes
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [ ]* 7.1 Write integration test for public upload endpoint
  - Test complete upload flow without authentication
  - _Requirements: 1.1_

- [ ]* 7.2 Write integration test for private upload endpoint
  - Test complete upload flow with authentication
  - _Requirements: 2.1_

- [ ] 8. Create download and file management API endpoints
  - Create GET /api/files/{file_id} endpoint for download/signed URL
  - Create DELETE /api/files/{file_id} endpoint for file archival
  - Create GET /api/files/search endpoint for file search
  - Add query parameter support for search (filename, date_from, date_to, type)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ]* 8.1 Write integration test for file download endpoint
  - Test authorization and signed URL generation
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 8.2 Write integration test for file search endpoint
  - Test search by filename, date range, and file type
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 9. Implement file versioning system
  - Add version field and parent_id relationship to Attachment model
  - Modify upload logic to create new versions instead of overwriting
  - Implement version history retrieval (maintain up to 5 versions)
  - Add restore previous version functionality
  - Create cleanup task for versions older than 1 year
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 6.5_

- [ ]* 9.1 Write property test for version history
  - **Property 30: Version History**
  - **Validates: Requirements 6.5, 14.1, 14.2**

- [ ] 10. Add file access control and permissions
  - Implement resource-level permission checks
  - Add ownership verification in get_file method
  - Allow admin access to all files
  - Implement file sharing with specific users/roles
  - Add comprehensive access logging with user and IP information
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 10.1 Write property test for access control
  - **Property 16: Download Authorization**
  - **Property 17: Ownership Verification**
  - **Validates: Requirements 12.1, 12.2**

- [ ] 11. Implement file lifecycle and cleanup operations
  - Create cleanup_orphaned_files method to identify files without database records
  - Implement archive_file method for soft deletion
  - Create scheduled task for permanent deletion of archived files after 90 days
  - Add manual cleanup tool for administrators
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 11.1 Write property test for orphaned file detection
  - Test identification of files in storage without database records
  - _Requirements: 10.1_

- [ ]* 11.2 Write property test for cascade deletion
  - **Property 28: Cascade Deletion**
  - **Validates: Requirements 6.3**

- [ ] 12. Add bulk file operations
  - Implement bulk deletion by resource type or date range
  - Add bulk download as ZIP archive functionality
  - Provide progress feedback for bulk operations
  - Add audit logging for all bulk operations
  - Implement cancellation support for in-progress operations
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 12.1 Write integration test for bulk operations
  - Test bulk deletion and bulk download
  - _Requirements: 11.1, 11.2_

- [ ] 13. Implement chunked upload support
  - Add support for chunked uploads for files > 5MB
  - Implement chunk validation before accepting next chunk
  - Add chunk assembly into final file
  - Support resumable uploads for interrupted connections
  - Provide upload progress callbacks
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 13.1 Write integration test for chunked uploads
  - Test complete chunked upload flow with large files
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 14. Add file preview functionality
  - Generate preview URLs for images
  - Generate preview thumbnails for PDF documents (first page)
  - Provide file metadata in preview (name, size, type, upload date)
  - Support in-browser preview for common file types
  - Implement fallback to download for unsupported types
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 14.1 Write integration test for file preview
  - Test preview generation for images and PDFs
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 15. Integrate virus scanning (optional)
  - Integrate ClamAV or similar virus scanning library
  - Scan all uploaded files for viruses and malware
  - Reject uploads that fail virus scanning
  - Quarantine suspicious files for manual review
  - Log all virus scan results
  - Notify administrators of detected threats
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 15.1 Write integration test for virus scanning
  - Test file rejection on virus detection
  - _Requirements: 9.1, 9.2_

- [ ] 16. Create frontend upload components
  - Create FileUpload component with drag-and-drop support
  - Add upload progress indicator
  - Implement file validation feedback
  - Add thumbnail preview for images
  - Support multiple file selection
  - _Requirements: 1.1, 8.2_

- [ ]* 16.1 Write unit tests for upload components
  - Test file validation and progress tracking
  - _Requirements: 1.1, 8.2_

- [ ] 17. Create frontend file management components
  - Create FileList component for displaying uploaded files
  - Add FilePreview component for viewing files
  - Implement file download functionality
  - Add file deletion with confirmation
  - Support file search and filtering
  - _Requirements: 4.1, 13.1, 13.2, 13.3, 13.4, 15.1, 15.2, 15.3_

- [ ]* 17.1 Write unit tests for file management components
  - Test file list, preview, and download functionality
  - _Requirements: 4.1, 13.1, 15.1_

- [ ] 18. Update existing modules to use new file storage system
  - Update member registration to use public upload endpoint
  - Update performance module to use new attachment system
  - Update project module to use new attachment system
  - Update content module to use new attachment system
  - Migrate existing file references to new Attachment model
  - _Requirements: 1.1, 1.4, 6.2_

- [ ]* 18.1 Write integration tests for module updates
  - Test registration with file upload
  - Test performance and project file attachments
  - _Requirements: 1.1, 1.4, 6.2_

- [ ] 19. Add configuration and admin tools
  - Create admin interface for configuring file size limits
  - Add admin tool for manual file cleanup
  - Create dashboard for storage usage statistics
  - Add file audit log viewer
  - Implement storage quota management
  - _Requirements: 3.5, 10.5_

- [ ]* 19.1 Write unit tests for admin tools
  - Test configuration updates and cleanup tools
  - _Requirements: 3.5, 10.5_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
