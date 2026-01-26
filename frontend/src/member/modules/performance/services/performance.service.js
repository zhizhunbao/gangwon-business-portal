/**
 * Performance Service
 *
 * 处理成果管理相关的 API 调用。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import apiService from "@shared/services/api.service";
import { API_PREFIX } from "@shared/utils/constants";

class PerformanceService {
  // --- 企业信息相关 ---

  async getCompanyProfile() {
    return await apiService.get(`${API_PREFIX}/member/profile`);
  }

  async updateCompanyProfile(data) {
    return await apiService.put(`${API_PREFIX}/member/profile`, data);
  }

  // --- 成果记录相关 ---

  async listRecords(params) {
    return await apiService.get(`${API_PREFIX}/performance`, params);
  }

  async getRecord(recordId) {
    return await apiService.get(`${API_PREFIX}/performance/${recordId}`);
  }

  async createRecord(data) {
    return await apiService.post(`${API_PREFIX}/performance`, data);
  }

  async updateRecord(recordId, data) {
    return await apiService.put(`${API_PREFIX}/performance/${recordId}`, data);
  }

  async deleteRecord(recordId) {
    return await apiService.delete(`${API_PREFIX}/performance/${recordId}`);
  }

  async submitRecord(recordId) {
    return await apiService.post(
      `${API_PREFIX}/performance/${recordId}/submit`,
    );
  }

  // --- 辅助方法 ---

  convertFormDataToBackendFormat(formData) {
    let type = "sales";

    if (formData.governmentSupport?.length > 0) {
      type = "support";
    }

    if (formData.intellectualProperty?.length > 0) {
      type = "ip";
    }

    const hskCode = formData.salesEmployment?.export?.hskCode?.trim();
    const exportCountry1 =
      formData.salesEmployment?.export?.exportCountry1?.trim();
    const exportCountry2 =
      formData.salesEmployment?.export?.exportCountry2?.trim();

    return {
      year: formData.year,
      quarter: formData.quarter ? parseInt(formData.quarter) : null,
      type,
      dataJson: {
        salesEmployment: formData.salesEmployment,
        governmentSupport: formData.governmentSupport,
        intellectualProperty: formData.intellectualProperty,
        notes: formData.notes,
      },
      hskCode: hskCode || null,
      exportCountry1: exportCountry1 || null,
      exportCountry2: exportCountry2 || null,
    };
  }
}

export const performanceService = new PerformanceService();
