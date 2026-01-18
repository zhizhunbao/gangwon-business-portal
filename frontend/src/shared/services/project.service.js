// Project Service - 项目管理服务

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";
import { createService } from "@shared/utils/helpers";

class ProjectService {
  // 获取项目列表
  async listProjects(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };

    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.search) {
      queryParams.search = params.search;
    }

    const response = await apiService.get(`${API_PREFIX}/projects`, queryParams);

    if (response && response.items) {
      return {
        records: response.items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          targetAudience: item.target_audience,
          startDate: item.start_date,
          endDate: item.end_date,
          imageUrl: item.image_url,
          status: item.status,
          applicationsCount: item.applications_count,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        })),
        pagination: {
          total: response.total,
          page: response.page,
          pageSize: response.page_size,
          totalPages: response.total_pages,
        },
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 获取项目详情
  async getProject(projectId) {
    const response = await apiService.get(`${API_PREFIX}/projects/${projectId}`);

    if (response) {
      return {
        id: response.id,
        title: response.title,
        description: response.description,
        targetAudience: response.target_audience,
        startDate: response.start_date,
        endDate: response.end_date,
        imageUrl: response.image_url,
        status: response.status,
        applicationsCount: response.applications_count,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
      };
    }

    return null;
  }

  // 申请项目
  async applyToProject(projectId, data) {
    const requestData = {
      application_reason: data.applicationReason ?? data.application_reason,
      attachments: data.attachments ?? null,
    };

    const response = await apiService.post(`${API_PREFIX}/projects/${projectId}/apply`, requestData);

    if (response) {
      return {
        id: response.id,
        memberId: response.member_id,
        projectId: response.project_id,
        project: response.project ? {
          id: response.project.id,
          title: response.project.title,
          description: response.project.description,
          status: response.project.status,
        } : null,
        status: response.status,
        applicationReason: response.application_reason,
        attachments: response.attachments,
        submittedAt: response.submitted_at,
        reviewedAt: response.reviewed_at,
      };
    }

    return null;
  }

  // 获取我的项目申请列表
  async getMyApplications(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };

    if (params.status) {
      queryParams.status = params.status;
    }

    const response = await apiService.get(`${API_PREFIX}/my-applications`, queryParams);

    if (response && response.items) {
      return {
        records: response.items.map((item) => ({
          id: item.id,
          memberId: item.member_id,
          projectId: item.project_id,
          projectTitle: item.project_title,
          status: item.status,
          applicationReason: item.application_reason,
          attachments: item.attachments,
          submittedAt: item.submitted_at,
          reviewedAt: item.reviewed_at,
        })),
        pagination: {
          total: response.total,
          page: response.page,
          pageSize: response.page_size,
          totalPages: response.total_pages,
        },
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 取消项目申请
  async cancelApplication(applicationId) {
    const response = await apiService.post(`${API_PREFIX}/member/applications/${applicationId}/cancel`);

    if (response) {
      return {
        id: response.id,
        memberId: response.member_id,
        projectId: response.project_id,
        status: response.status,
        applicationReason: response.application_reason,
        attachments: response.attachments,
        submittedAt: response.submitted_at,
        reviewedAt: response.reviewed_at,
      };
    }

    return null;
  }
}

export default createService(ProjectService);
