// Content Service - 内容管理服务（Admin）

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";
import { toCamelCase, toSnakeCase, createService } from "@shared/utils/helpers";

class ContentService {
  // ============================================================================
  // 公告管理（Admin）
  // ============================================================================

  // 获取公告列表
  async listNotices(params = {}) {
    const response = await apiService.get(`${API_PREFIX}/admin/content/notices`, { params: toSnakeCase(params) });
    return {
      items: response.items?.map(toCamelCase) || [],
      total: response.total || 0,
      page: response.page || 1,
      pageSize: response.page_size || 10,
    };
  }

  // 获取公告详情
  async getNotice(noticeId) {
    const response = await apiService.get(`${API_PREFIX}/notices/${noticeId}`);
    return toCamelCase(response);
  }

  // 创建公告
  async createNotice(data) {
    const payload = toSnakeCase({
      title: data.title,
      contentHtml: data.contentHtml,
      boardType: data.boardType,
      attachments: data.attachments,
    });
    const response = await apiService.post(`${API_PREFIX}/admin/content/notices`, payload);
    return toCamelCase(response);
  }

  // 更新公告
  async updateNotice(noticeId, data) {
    const payload = toSnakeCase(data);
    const response = await apiService.put(`${API_PREFIX}/admin/content/notices/${noticeId}`, payload);
    return toCamelCase(response);
  }

  // 删除公告
  async deleteNotice(noticeId) {
    return await apiService.delete(`${API_PREFIX}/admin/content/notices/${noticeId}`);
  }

  // ============================================================================
  // 项目管理（Admin）
  // ============================================================================

  // 创建项目
  async createProject(data) {
    const payload = toSnakeCase({ title: data.title, imageUrl: data.imageUrl });
    const response = await apiService.post(`${API_PREFIX}/admin/content/project`, payload);
    return toCamelCase(response);
  }

  // 更新项目
  async updateProject(projectId, data) {
    const payload = toSnakeCase(data);
    const response = await apiService.put(`${API_PREFIX}/admin/content/project/${projectId}`, payload);
    return toCamelCase(response);
  }

  // 删除项目
  async deleteProject(projectId) {
    return await apiService.delete(`${API_PREFIX}/admin/content/project/${projectId}`);
  }

  // ============================================================================
  // 横幅管理（Admin）
  // ============================================================================

  // 获取所有横幅
  async getAllBanners() {
    const response = await apiService.get(`${API_PREFIX}/admin/content/banners`);
    return response.items.map(toCamelCase);
  }

  // 创建横幅
  async createBanner(data) {
    const payload = toSnakeCase({
      bannerType: data.bannerType,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      isActive: data.isActive,
      displayOrder: data.displayOrder,
    });
    const response = await apiService.post(`${API_PREFIX}/admin/content/banners`, payload);
    return toCamelCase(response);
  }

  // 更新横幅
  async updateBanner(bannerId, data) {
    const payload = toSnakeCase(data);
    const response = await apiService.put(`${API_PREFIX}/admin/content/banners/${bannerId}`, payload);
    return toCamelCase(response);
  }

  // 删除横幅
  async deleteBanner(bannerId) {
    return await apiService.delete(`${API_PREFIX}/admin/content/banners/${bannerId}`);
  }

  // ============================================================================
  // 系统信息管理（Admin）
  // ============================================================================

  // 获取系统信息
  async getSystemInfo() {
    const response = await apiService.get(`${API_PREFIX}/admin/content/system-info`);
    return toCamelCase(response);
  }

  // 更新系统信息
  async updateSystemInfo(data) {
    const payload = toSnakeCase({ contentHtml: data.contentHtml, imageUrl: data.imageUrl });
    const response = await apiService.put(`${API_PREFIX}/admin/content/system-info`, payload);
    return toCamelCase(response);
  }

  // ============================================================================
  // 弹窗管理（Admin）
  // ============================================================================

  // 获取所有弹窗
  async getAllPopups() {
    const response = await apiService.get(`${API_PREFIX}/admin/content/popups`);
    return response.popups.map(toCamelCase);
  }

  // 获取弹窗详情
  async getPopup(popupId) {
    const response = await apiService.get(`${API_PREFIX}/admin/content/popups/${popupId}`);
    return toCamelCase(response);
  }

  // 创建弹窗
  async createPopup(data) {
    const payload = toSnakeCase({
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      width: data.width,
      height: data.height,
      position: data.position,
      isActive: data.isActive,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
    });
    const response = await apiService.post(`${API_PREFIX}/admin/content/popups`, payload);
    return toCamelCase(response);
  }

  // 更新弹窗
  async updatePopup(popupId, data) {
    const payload = toSnakeCase(data);
    const response = await apiService.put(`${API_PREFIX}/admin/content/popups/${popupId}`, payload);
    return toCamelCase(response);
  }

  // 删除弹窗
  async deletePopup(popupId) {
    return await apiService.delete(`${API_PREFIX}/admin/content/popups/${popupId}`);
  }

  // ============================================================================
  // 法律内容管理（Admin）
  // ============================================================================

  // 更新法律内容
  async updateLegalContent(contentType, data) {
    const payload = toSnakeCase({ contentHtml: data.contentHtml });
    const response = await apiService.put(`${API_PREFIX}/admin/content/legal/${contentType}`, payload);
    return toCamelCase(response);
  }
}

export default createService(ContentService);
