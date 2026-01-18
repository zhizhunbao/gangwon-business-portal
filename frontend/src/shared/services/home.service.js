// Home Service - 首页相关服务（公告、项目）

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";
import { toCamelCase, createService } from "@shared/utils/helpers";

class HomeService {
  // ============================================================================
  // 公告相关
  // ============================================================================

  // 获取公告列表
  async listNotices(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.search) queryParams.search = params.search;

    const response = await apiService.get(`${API_PREFIX}/notices`, queryParams);

    if (response && response.items) {
      return {
        items: response.items.map(toCamelCase),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 获取最新5条公告
  async getLatestNotices() {
    const response = await apiService.get(`${API_PREFIX}/notices/latest5`);
    return (response ?? []).map(toCamelCase);
  }

  // 获取公告详情
  async getNotice(noticeId) {
    const response = await apiService.get(`${API_PREFIX}/notices/${noticeId}`);
    return toCamelCase(response);
  }

  // ============================================================================
  // 项目相关
  // ============================================================================

  // 获取项目列表
  async listProjects(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };

    const response = await apiService.get(`${API_PREFIX}/projects`, queryParams);

    if (response && response.items) {
      return {
        items: response.items.map(toCamelCase),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 获取最新1条项目
  async getLatestProject() {
    const response = await apiService.get(`${API_PREFIX}/projects/latest1`);
    return response ? toCamelCase(response) : null;
  }

  // 获取项目详情
  async getProject(projectId) {
    const response = await apiService.get(`${API_PREFIX}/projects/${projectId}`);
    return toCamelCase(response);
  }

  // ============================================================================
  // 横幅相关
  // ============================================================================

  // 获取活跃横幅
  async getBanners(params) {
    const queryParams = params?.bannerType ? { banner_type: params.bannerType } : {};
    const response = await apiService.get(`${API_PREFIX}/banners`, queryParams);
    return response.items.map(toCamelCase);
  }

  // ============================================================================
  // 系统信息相关
  // ============================================================================

  // 获取系统信息
  async getSystemInfo() {
    const response = await apiService.get(`${API_PREFIX}/system-info`);
    return response ? toCamelCase(response) : null;
  }

  // ============================================================================
  // 弹窗相关
  // ============================================================================

  // 获取活跃弹窗
  async getActivePopup() {
    const response = await apiService.get(`${API_PREFIX}/popup`);
    return response ? toCamelCase(response) : null;
  }

  // ============================================================================
  // 法律内容相关
  // ============================================================================

  // 获取法律内容
  async getLegalContent(contentType) {
    const response = await apiService.get(`${API_PREFIX}/legal-content/${contentType}`);
    return response ? toCamelCase(response) : null;
  }
}

export default createService(HomeService);
