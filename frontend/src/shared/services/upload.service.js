// Upload Service - 文件上传服务

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";
import { createService } from "@shared/utils/helpers";

class UploadService {
  // 上传公开文件
  async uploadPublic(file, onUploadProgress) {
    return await apiService.upload(`${API_PREFIX}/upload/public`, file, onUploadProgress);
  }

  // 上传私有文件
  async uploadPrivate(file, onUploadProgress) {
    return await apiService.upload(`${API_PREFIX}/upload/private`, file, onUploadProgress);
  }

  // 上传多个文件
  async uploadMultiple(files, onUploadProgress, isPublic) {
    const url = isPublic ? `${API_PREFIX}/upload/public` : `${API_PREFIX}/upload/private`;
    return await apiService.uploadMultiple(url, files, onUploadProgress);
  }

  // 获取文件下载信息
  async getFileInfo(fileId) {
    return await apiService.get(`${API_PREFIX}/upload/${fileId}`);
  }

  // 下载文件
  async downloadFile(fileId, filename) {
    const fileInfo = await this.getFileInfo(fileId);

    if (!fileInfo.file_url) {
      throw new Error("File URL not available");
    }

    const downloadFilename = filename ?? fileInfo.original_name ?? `file-${fileId}`;
    await this.downloadFromUrl(fileInfo.file_url, downloadFilename);
  }

  // 通过 URL 下载文件
  async downloadFileByUrl(fileUrl, filename) {
    await this.downloadFromUrl(fileUrl, filename);
  }

  // 内部下载方法
  async downloadFromUrl(fileUrl, filename) {
    if (typeof fileUrl === "string" && /^https?:\/\//i.test(fileUrl)) {
      try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename ?? "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        const link = document.createElement("a");
        link.href = fileUrl;
        if (filename) {
          link.download = filename;
        }
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    }

    await apiService.download(fileUrl, {}, filename);
  }


  // 删除文件
  async deleteFile(fileId) {
    await apiService.delete(`${API_PREFIX}/upload/${fileId}`);
  }

  // 上传文件并返回格式化的附件列表
  async uploadAttachments(files) {
    const uploadedFiles = [];
    for (const file of files) {
      const response = await this.uploadPublic(file);
      uploadedFiles.push({
        fileId: response.fileId ?? response.file_id ?? response.id,
        fileUrl: response.fileUrl ?? response.file_url ?? response.url,
        fileName: response.fileName ?? response.file_name ?? file.name,
        fileSize: response.fileSize ?? response.file_size ?? file.size,
        mimeType: response.mimeType ?? response.mime_type ?? file.type,
        // 保持向后兼容的字段
        original_name: file.name,
        file_url: response.fileUrl ?? response.file_url ?? response.url,
        file_size: file.size,
      });
    }
    return uploadedFiles;
  }

  // 使用 FormData 上传文件
  async uploadFile(formData, onUploadProgress) {
    const file = formData.get("file");
    const type = formData.get("type");

    const isPublic = type === "banner" || type === "notice" || type === "public" || type === "project";
    let url = isPublic ? `${API_PREFIX}/upload/public` : `${API_PREFIX}/upload/private`;

    const resourceType = formData.get("resource_type") ?? type;
    const resourceId = formData.get("resource_id");

    const queryParams = new URLSearchParams();
    if (resourceType) queryParams.append("resource_type", resourceType);
    if (resourceId) queryParams.append("resource_id", resourceId);

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await apiService.upload(url, file, onUploadProgress);

    return {
      id: response.id,
      filePath: response.file_url ?? response.file_path,
      fileUrl: response.file_url ?? response.file_path,
      ...response,
    };
  }
}

export default createService(UploadService);
