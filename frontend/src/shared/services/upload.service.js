/**
 * Upload Service
 * 文件上传服务 - 封装文件上传和下载相关的 API 调用
 */

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";

class UploadService {
  /**
   * Upload a file (public)
   * 上传公开文件
   *
   * @param {File} file - File to upload
   * @param {Function} [onUploadProgress] - Progress callback
   * @returns {Promise<Object>} Upload response with file info
   */
  async uploadPublic(file, onUploadProgress) {
    const response = await apiService.upload(
      `${API_PREFIX}/upload/public`,
      file,
      onUploadProgress
    );
    return response;
  }

  /**
   * Upload a file (private)
   * 上传私有文件
   *
   * @param {File} file - File to upload
   * @param {Function} [onUploadProgress] - Progress callback
   * @returns {Promise<Object>} Upload response with file info
   */
  async uploadPrivate(file, onUploadProgress) {
    const response = await apiService.upload(
      `${API_PREFIX}/upload/private`,
      file,
      onUploadProgress
    );
    return response;
  }

  /**
   * Upload multiple files
   * 上传多个文件
   *
   * @param {File[]} files - Files to upload
   * @param {Function} [onUploadProgress] - Progress callback
   * @param {boolean} [isPublic=true] - Whether files are public
   * @returns {Promise<Object>} Upload response with files info
   */
  async uploadMultiple(files, onUploadProgress, isPublic = true) {
    const url = isPublic
      ? `${API_PREFIX}/upload/public`
      : `${API_PREFIX}/upload/private`;

    const response = await apiService.uploadMultiple(
      url,
      files,
      onUploadProgress
    );
    return response;
  }

  /**
   * Get file download info
   * 获取文件下载信息
   *
   * @param {string} fileId - File ID (UUID)
   * @returns {Promise<Object>} File download info (file_url, original_name, etc.)
   */
  async getFileInfo(fileId) {
    const response = await apiService.get(`${API_PREFIX}/upload/${fileId}`);
    return response;
  }

  /**
   * Download a file
   * 下载文件
   *
   * @param {string} fileId - File ID (UUID)
   * @param {string} [filename] - Optional filename for download
   * @returns {Promise<void>}
   */
  async downloadFile(fileId, filename = null) {
    // First get file info to get the download URL
    const fileInfo = await this.getFileInfo(fileId);

    if (!fileInfo.file_url) {
      throw new Error("File URL not available");
    }

    // Use the file URL to download
    const downloadFilename =
      filename || fileInfo.original_name || `file-${fileId}`;
    await this._downloadFileInternal(fileInfo.file_url, downloadFilename);
  }

  async _downloadFileInternal(fileUrl, filename) {
    // If the URL is absolute (e.g. Supabase storage URL), use browser download directly
    // to avoid CORS issues that can cause Axios "Network Error".
    if (typeof fileUrl === "string" && /^https?:\/\//i.test(fileUrl)) {
      const link = document.createElement("a");
      link.href = fileUrl;
      if (filename) {
        link.download = filename;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    await apiService.download(fileUrl, {}, filename);
  }

  /**
   * Download file by URL (direct download)
   * 通过 URL 直接下载文件
   *
   * @param {string} fileUrl - File URL
   * @param {string} [filename] - Optional filename for download
   * @returns {Promise<void>}
   */
  async downloadFileByUrl(fileUrl, filename = null) {
    // Same handling as _downloadFileInternal: prefer direct download for absolute URLs
    if (typeof fileUrl === "string" && /^https?:\/\//i.test(fileUrl)) {
      const link = document.createElement("a");
      link.href = fileUrl;
      if (filename) {
        link.download = filename;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    await apiService.download(fileUrl, {}, filename);
  }

  /**
   * Delete a file
   * 删除文件
   *
   * @param {string} fileId - File ID (UUID)
   * @returns {Promise<void>}
   */
  async deleteFile(fileId) {
    await apiService.delete(`${API_PREFIX}/upload/${fileId}`);
  }

  /**
   * Upload files and return formatted attachment list
   * 上传文件并返回格式化的附件列表
   *
   * @param {File[]} files - Files to upload
   * @returns {Promise<Array>} Formatted attachment list
   */
  async uploadAttachments(files) {
    const uploadedFiles = [];
    for (const file of files) {
      const response = await this.uploadPublic(file);
      uploadedFiles.push({
        file_id: response.file_id || response.id,
        file_url: response.file_url || response.url,
        original_name: file.name,
        stored_name: response.stored_name,
        file_size: file.size
      });
    }
    return uploadedFiles;
  }

  /**
   * Upload a file using FormData
   * 使用 FormData 上传文件
   *
   * @param {FormData} formData - FormData containing file and optional metadata
   * @param {Function} [onUploadProgress] - Progress callback
   * @returns {Promise<Object>} Upload response with file info
   */
  async uploadFile(formData, onUploadProgress) {
    // Extract file and type from FormData
    const file = formData.get('file');
    const type = formData.get('type') || 'private';
    
    // Determine upload endpoint based on type
    const isPublic = type === 'banner' || type === 'notice' || type === 'public';
    let url = isPublic
      ? `${API_PREFIX}/upload/public`
      : `${API_PREFIX}/upload/private`;
    
    // Extract resource_type and resource_id if present
    const resourceType = formData.get('resource_type') || type;
    const resourceId = formData.get('resource_id');
    
    // Build query params
    const queryParams = new URLSearchParams();
    if (resourceType) queryParams.append('resource_type', resourceType);
    if (resourceId) queryParams.append('resource_id', resourceId);
    
    // Append query params to URL if any
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
    
    // Use apiService.upload which handles FormData properly
    const response = await apiService.upload(
      url,
      file,
      onUploadProgress
    );
    
    // Return response in expected format
    return {
      id: response.id,
      filePath: response.file_url || response.file_path,
      fileUrl: response.file_url || response.file_path,
      ...response
    };
  }
}

export default new UploadService();
