/**
 * Upload Service
 * 文件上传服务 - 封装文件上传和下载相关的 API 调用
 */

import apiService from './api.service';
import { API_PREFIX } from '@shared/utils/constants';

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
    try {
      // First get file info to get the download URL
      const fileInfo = await this.getFileInfo(fileId);
      
      if (!fileInfo.file_url) {
        throw new Error('File URL not available');
      }

      // Use the file URL to download
      const downloadFilename = filename || fileInfo.original_name || `file-${fileId}`;
      await apiService.download(fileInfo.file_url, {}, downloadFilename);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
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
}

export default new UploadService();

