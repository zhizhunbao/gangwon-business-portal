/**
 * File validation utilities
 */

// Get configuration from environment variables with fallbacks
const getEnvNumber = (key, fallback) => {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : fallback;
};

const getEnvArray = (key, fallback) => {
  const value = import.meta.env[key];
  return value ? value.split(',').map(item => item.trim()) : fallback;
};

// File size limits from environment variables
export const MAX_IMAGE_SIZE = getEnvNumber('VITE_MAX_IMAGE_SIZE', 5 * 1024 * 1024); // 5MB default
export const MAX_DOCUMENT_SIZE = getEnvNumber('VITE_MAX_DOCUMENT_SIZE', 10 * 1024 * 1024); // 10MB default
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (backward compatibility)

// File extensions from environment variables
const ALLOWED_IMAGE_EXTENSIONS = getEnvArray('VITE_ALLOWED_IMAGE_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
const ALLOWED_DOCUMENT_EXTENSIONS = getEnvArray('VITE_ALLOWED_DOCUMENT_EXTENSIONS', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']);

// Convert extensions to MIME types (basic mapping)
const extensionToMimeType = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'txt': 'text/plain'
};

// Generate MIME types from extensions
const imageMimeTypes = ALLOWED_IMAGE_EXTENSIONS.map(ext => extensionToMimeType[ext]).filter(Boolean);
const documentMimeTypes = ALLOWED_DOCUMENT_EXTENSIONS.map(ext => extensionToMimeType[ext]).filter(Boolean);

// Allowed file types (for backward compatibility)
export const ALLOWED_FILE_TYPES = {
  images: imageMimeTypes,
  documents: documentMimeTypes,
  all: [...imageMimeTypes, ...documentMimeTypes]
};

/**
 * Format file size to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "5.2 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Determine file category from file name and type
 * @param {File} file - File object
 * @returns {string} File category ('image', 'document', or 'general')
 */
export function getFileCategory(file) {
  if (!file) return 'general';
  
  // Check by MIME type first
  if (file.type) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('application/') || file.type.startsWith('text/')) return 'document';
  }
  
  // Check by file extension
  if (file.name) {
    const extension = file.name.toLowerCase().split('.').pop();
    if (ALLOWED_IMAGE_EXTENSIONS.includes(extension)) return 'image';
    if (ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) return 'document';
  }
  
  return 'general';
}

/**
 * Get maximum file size for category
 * @param {string} category - File category ('image', 'document', or 'general')
 * @returns {number} Maximum file size in bytes
 */
export function getMaxFileSize(category) {
  switch (category) {
    case 'image':
      return MAX_IMAGE_SIZE;
    case 'document':
      return MAX_DOCUMENT_SIZE;
    default:
      return MAX_FILE_SIZE;
  }
}

/**
 * Validate file size
 * @param {File} file - File object to validate
 * @param {number} maxSize - Maximum file size in bytes (optional, will auto-detect based on file type)
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateFileSize(file, maxSize = null) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  // Auto-detect max size based on file category if not provided
  if (maxSize === null) {
    const category = getFileCategory(file);
    maxSize = getMaxFileSize(category);
  }
  
  if (file.size > maxSize) {
    const maxSizeFormatted = formatFileSize(maxSize);
    const fileSizeFormatted = formatFileSize(file.size);
    const category = getFileCategory(file);
    return {
      valid: false,
      error: `File size (${fileSizeFormatted}) exceeds maximum allowed size of ${maxSizeFormatted} for ${category} files`
    };
  }
  
  return { valid: true };
}

/**
 * Validate file extension
 * @param {File} file - File object to validate
 * @param {string} category - File category ('image', 'document', or 'general')
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateFileExtension(file, category = null) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!file.name || !file.name.includes('.')) {
    return { valid: false, error: 'File must have an extension' };
  }
  
  const extension = file.name.toLowerCase().split('.').pop();
  
  // Auto-detect category if not provided
  if (category === null) {
    category = getFileCategory(file);
  }
  
  let allowedExtensions;
  switch (category) {
    case 'image':
      allowedExtensions = ALLOWED_IMAGE_EXTENSIONS;
      break;
    case 'document':
      allowedExtensions = ALLOWED_DOCUMENT_EXTENSIONS;
      break;
    default:
      allowedExtensions = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS];
  }
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension '${extension}' is not allowed for ${category} files. Allowed extensions: ${allowedExtensions.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Validate file type (MIME type)
 * @param {File} file - File object to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types (optional, will auto-detect based on file category)
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateFileType(file, allowedTypes = null) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!file.type) {
    return { valid: false, error: 'File type could not be determined' };
  }
  
  // Auto-detect allowed types based on file category if not provided
  if (allowedTypes === null) {
    const category = getFileCategory(file);
    switch (category) {
      case 'image':
        allowedTypes = ALLOWED_FILE_TYPES.images;
        break;
      case 'document':
        allowedTypes = ALLOWED_FILE_TYPES.documents;
        break;
      default:
        allowedTypes = ALLOWED_FILE_TYPES.all;
    }
  }
  
  if (!allowedTypes.includes(file.type)) {
    const category = getFileCategory(file);
    const allowedTypesStr = allowedTypes.join(', ');
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed for ${category} files. Allowed types: ${allowedTypesStr}`
    };
  }
  
  return { valid: true };
}

/**
 * Validate file (size, extension, and MIME type)
 * @param {File} file - File object to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSize - Maximum file size in bytes (optional, auto-detected)
 * @param {string[]} options.allowedTypes - Array of allowed MIME types (optional, auto-detected)
 * @param {string} options.category - File category ('image', 'document', or 'general')
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = null,
    allowedTypes = null,
    category = null
  } = options;
  
  // Validate file extension
  const extensionValidation = validateFileExtension(file, category);
  if (!extensionValidation.valid) {
    return extensionValidation;
  }
  
  // Validate file size
  const sizeValidation = validateFileSize(file, maxSize);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  // Validate file type (MIME type)
  const typeValidation = validateFileType(file, allowedTypes);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  return { valid: true };
}

/**
 * Validate image file
 * @param {File} file - File object to validate
 * @param {number} maxSize - Maximum file size in bytes (optional, uses MAX_IMAGE_SIZE by default)
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateImageFile(file, maxSize = null) {
  return validateFile(file, {
    maxSize: maxSize || MAX_IMAGE_SIZE,
    category: 'image'
  });
}

/**
 * Validate document file
 * @param {File} file - File object to validate
 * @param {number} maxSize - Maximum file size in bytes (optional, uses MAX_DOCUMENT_SIZE by default)
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateDocumentFile(file, maxSize = null) {
  return validateFile(file, {
    maxSize: maxSize || MAX_DOCUMENT_SIZE,
    category: 'document'
  });
}

/**
 * Validate PDF file (backward compatibility)
 * @param {File} file - File object to validate
 * @param {number} maxSize - Maximum file size in bytes (optional, uses MAX_DOCUMENT_SIZE by default)
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validatePdfFile(file, maxSize = null) {
  return validateDocumentFile(file, maxSize);
}

