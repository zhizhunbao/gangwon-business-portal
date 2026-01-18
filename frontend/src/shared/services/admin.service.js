// Admin Service - 管理员服务

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";
import { createService } from "@shared/utils/helpers";

class AdminService {
  // 获取会员列表
  async listMembers(params) {
    // api.service 会自动转换 camelCase → snake_case
    return await apiService.get(`${API_PREFIX}/admin/members`, params);
  }

  // 获取会员详情
  async getMemberDetail(memberId) {
    return await apiService.get(`${API_PREFIX}/admin/members/${memberId}`);
  }

  // 批准会员注册
  async approveMember(memberId) {
    return await apiService.put(`${API_PREFIX}/admin/members/${memberId}/approve`);
  }

  // 拒绝会员注册
  async rejectMember(memberId, reason) {
    const queryParams = reason ? { reason } : {};
    return await apiService.put(`${API_PREFIX}/admin/members/${memberId}/reject`, {}, { params: queryParams });
  }

  // 重置会员审批状态为待审核
  async resetMemberToPending(memberId) {
    return await apiService.put(`${API_PREFIX}/admin/members/${memberId}/reset-pending`);
  }


  // 获取绩效记录列表
  async listPerformanceRecords(params) {
    return await apiService.get(`${API_PREFIX}/admin/performance`, params);
  }

  // 获取绩效记录详情
  async getPerformanceRecord(recordId) {
    return await apiService.get(`${API_PREFIX}/admin/performance/${recordId}`);
  }

  // 批准绩效记录
  async approvePerformance(recordId, comments = null) {
    return await apiService.post(`${API_PREFIX}/admin/performance/${recordId}/approve`, { comments });
  }

  // 要求修改绩效记录
  async requestPerformanceRevision(recordId, comments) {
    return await apiService.post(`${API_PREFIX}/admin/performance/${recordId}/request-fix`, { comments });
  }

  // 驳回绩效记录
  async rejectPerformance(recordId, comments) {
    return await apiService.post(`${API_PREFIX}/admin/performance/${recordId}/reject`, { comments: comments ?? null });
  }


  // 获取审计日志列表
  async listAuditLogs(params) {
    return await apiService.get(`${API_PREFIX}/admin/audit-logs`, params);
  }

  // 获取审计日志详情
  async getAuditLog(logId) {
    return await apiService.get(`${API_PREFIX}/admin/audit-logs/${logId}`);
  }

  // 删除单条审计日志
  async deleteAuditLog(logId) {
    return await apiService.delete(`${API_PREFIX}/admin/audit-logs/${logId}`);
  }

  // 删除指定操作类型的审计日志
  async deleteAuditLogsByAction(action) {
    const encodedAction = encodeURIComponent(action);
    return await apiService.delete(`${API_PREFIX}/admin/audit-logs/by-action?action=${encodedAction}`);
  }

  // 导出会员数据
  async exportMembers(params) {
    return await apiService.download(`${API_PREFIX}/admin/members/export`, params);
  }

  // 获取项目详情
  async getProject(projectId) {
    return await apiService.get(`${API_PREFIX}/admin/projects/${projectId}`);
  }

  // 创建新项目
  async createProject(projectData) {
    return await apiService.post(`${API_PREFIX}/admin/projects`, projectData);
  }

  // 更新项目
  async updateProject(projectId, projectData) {
    return await apiService.put(`${API_PREFIX}/admin/projects/${projectId}`, projectData);
  }

  // 删除项目
  async deleteProject(projectId) {
    return await apiService.delete(`${API_PREFIX}/admin/projects/${projectId}`);
  }

  // 获取项目申请列表
  async getProjectApplications(projectId, params) {
    return await apiService.get(`${API_PREFIX}/admin/projects/${projectId}/applications`, { params });
  }

  // 查询 Nice D&B 企业信息
  async searchNiceDnb(businessNumber) {
    const cleanBusinessNumber = businessNumber.replace(/-/g, "");
    return await apiService.get(`${API_PREFIX}/admin/members/nice-dnb`, { businessNumber: cleanBusinessNumber });
  }

  // 导出绩效数据
  async exportPerformance(params) {
    return await apiService.download(`${API_PREFIX}/admin/performance/export`, params);
  }

  // 导出项目数据
  async exportProjects(params) {
    return await apiService.download(`${API_PREFIX}/admin/projects/export`, params);
  }

  // 导出项目申请数据
  async exportApplications(params) {
    return await apiService.download(`${API_PREFIX}/admin/applications/export`, params);
  }

  // 导出仪表盘数据
  async exportDashboard(params) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `dashboard_${params.year}_${params.quarter}_${timestamp}.${params.format === "excel" ? "xlsx" : "csv"}`;
    return await apiService.download(`${API_PREFIX}/admin/dashboard/export`, params, filename);
  }
}

export default createService(AdminService);
