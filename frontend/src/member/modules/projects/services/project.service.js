/**
 * 项目服务
 *
 * 处理项目相关的 API 请求，包括列表、详情、申请等。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { apiService } from "@shared/services";
import { API_PREFIX } from "@shared/utils/constants";

class ProjectService {
  // 获取项目列表
  async listProjects(params) {
    const response = await apiService.get(`${API_PREFIX}/projects`, params);
    return response;
  }

  // 获取项目详情
  async getProject(projectId) {
    return await apiService.get(`${API_PREFIX}/projects/${projectId}`);
  }

  // 申请项目
  async applyToProject(projectId, data) {
    return await apiService.post(
      `${API_PREFIX}/projects/${projectId}/apply`,
      data,
    );
  }

  // 获取我的项目申请列表
  async getMyApplications(params) {
    return await apiService.get(`${API_PREFIX}/my-applications`, params);
  }

  // 取消项目申请
  async cancelApplication(applicationId) {
    return await apiService.post(
      `${API_PREFIX}/member/applications/${applicationId}/cancel`,
    );
  }
}

export const projectService = new ProjectService();
