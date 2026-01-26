/**
 * Home 模块 API 服务
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { apiService } from "@shared/services";
import { API_PREFIX } from "@shared/utils/constants";

/**
 * 首页相关 API 服务
 */
export const homeService = {
  /**
   * 获取公告列表
   */
  async listNotices(params) {
    return await apiService.get(`${API_PREFIX}/notices`, params);
  },

  /**
   * 获取最新5条公告
   */
  async getLatestNotices() {
    return await apiService.get(`${API_PREFIX}/notices/latest5`);
  },

  /**
   * 获取项目列表
   */
  async listProjects(params) {
    return await apiService.get(`${API_PREFIX}/projects`, params);
  },

  /**
   * 获取最新1条项目
   */
  async getLatestProject() {
    return await apiService.get(`${API_PREFIX}/projects/latest1`);
  },
};

export default homeService;
