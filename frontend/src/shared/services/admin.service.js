/**
 * Admin Service
 * 管理员服务 - 封装管理员相关的 API 调用
 */

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";

class AdminService {
  /**
   * List members with pagination and filtering
   * 获取会员列表（分页和筛选）
   *
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=20] - Items per page
   * @param {string} [params.search] - Search term
   * @param {string} [params.industry] - Filter by industry
   * @param {string} [params.region] - Filter by region
   * @param {string} [params.approvalStatus] - Filter by approval status (pending, approved, rejected)
   * @param {string} [params.status] - Filter by status
   * @returns {Promise<Object>} Paginated member list
   */
  async listMembers(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 20,
    };

    if (params.search) {
      queryParams.search = params.search;
    }
    if (params.industry) {
      queryParams.industry = params.industry;
    }
    if (params.region) {
      queryParams.region = params.region;
    }
    if (params.approvalStatus) {
      queryParams.approval_status = params.approvalStatus;
    }
    if (params.status) {
      queryParams.status = params.status;
    }

    const response = await this._listMembersInternal(queryParams);

    // Map backend response to frontend format
    // Backend returns: { items: [...], total: ..., page: ..., page_size: ..., total_pages: ... }
    // axios interceptor already extracts response.data, so response is the data object directly
    if (response && response.items && Array.isArray(response.items)) {
      const result = {
        members: response.items.map((item) => {
          return {
            id: item.id,
            businessNumber: item.business_number,
            companyName: item.company_name,
            email: item.email,
            status: item.status,
            approvalStatus: item.approval_status,
            industry: item.industry,
            createdAt: item.created_at,
            // Additional fields for compatibility
            // Use nullish coalescing to preserve null values
            representative: item.representative ?? null,
            address: item.address ?? null,
            phone: null,
          };
        }),
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

      return result;
    }

    return {
      members: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  }

  async _listMembersInternal(queryParams) {
    try {
      // apiService.get already returns response.data (via axios interceptor)
      // So response is already the data object, not { data: {...} }
      const response = await apiService.get(
        `${API_PREFIX}/admin/members`,
        queryParams
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get member details by ID
   * 获取会员详情
   *
   * @param {string} memberId - Member ID (UUID)
   * @returns {Promise<Object>} Member details
   */

  async getMemberDetail(memberId) {
    const response = await apiService.get(
      `${API_PREFIX}/admin/members/${memberId}`
    );

    // Map backend fields to frontend fields
    if (response) {
      const mappedResponse = {
        id: response.id,
        businessNumber: response.business_number,
        companyName: response.company_name,
        email: response.email,
        status: response.status,
        approvalStatus: response.approval_status,
        industry: response.industry,
        sales: response.revenue ? parseFloat(response.revenue) : null,
        revenue: response.revenue ? parseFloat(response.revenue) : null,
        employeeCount: response.employee_count,
        establishedDate: response.founding_date,
        foundingDate: response.founding_date,
        region: response.region,
        // Use nullish coalescing to preserve null values
        address: response.address ?? null,
        website: response.website,
        websiteUrl: response.website,
        logo: response.logo_url,
        logoUrl: response.logo_url,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        // Additional fields for compatibility
        // Use nullish coalescing to preserve null values
        representative: response.representative ?? null,
        legalNumber: response.legal_number ?? null,
        phone: response.phone ?? null,
        category: null,
        description: null,
      };

      return mappedResponse;
    }

    return response;
  }

  /**
   * Approve a member registration
   * 批准会员注册
   *
   * @param {string} memberId - Member ID (UUID)
   * @returns {Promise<Object>} Approval result
   */

  async approveMember(memberId) {
    return await apiService.put(
      `${API_PREFIX}/admin/members/${memberId}/approve`
    );
  }

  /**
   * Reject a member registration
   * 拒绝会员注册
   *
   * @param {string} memberId - Member ID (UUID)
   * @param {string} [reason] - Rejection reason
   * @returns {Promise<Object>} Rejection result
   */
  async rejectMember(memberId, reason = null) {
    const queryParams = reason ? { reason } : {};
    return await this._rejectMemberInternal(memberId, queryParams);
  }

  async _rejectMemberInternal(memberId, queryParams) {
    const url = `${API_PREFIX}/admin/members/${memberId}/reject`;
    return await apiService.put(url, {}, { params: queryParams });
  }

  /**
   * List performance records with pagination and filtering (Admin)
   * 获取绩效记录列表（管理员，分页和筛选）
   *
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=20] - Items per page
   * @param {string} [params.memberId] - Filter by member ID
   * @param {number} [params.year] - Filter by year
   * @param {number} [params.quarter] - Filter by quarter (1-4)
   * @param {string} [params.status] - Filter by status
   * @param {string} [params.type] - Filter by type (sales, support, ip)
   * @returns {Promise<Object>} Paginated performance list
   */
  async listPerformanceRecords(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 20,
    };

    if (params.memberId) {
      queryParams.member_id = params.memberId;
    }
    if (
      params.year !== undefined &&
      params.year !== null &&
      params.year !== ""
    ) {
      queryParams.year = parseInt(params.year);
    }
    if (
      params.quarter !== undefined &&
      params.quarter !== null &&
      params.quarter !== ""
    ) {
      queryParams.quarter = parseInt(params.quarter);
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.type) {
      queryParams.type = params.type;
    }
    if (params.searchKeyword && params.searchKeyword.trim()) {
      queryParams.search_keyword = params.searchKeyword.trim();
    }

    const response = await this._listPerformanceRecordsInternal(queryParams);

    // Map backend response to frontend format
    if (response && response.items) {
      const result = {
        records: response.items.map((item) => ({
          id: item.id,
          memberId: item.member_id,
          memberCompanyName: item.member_company_name,
          memberBusinessNumber: item.member_business_number,
          year: item.year,
          quarter: item.quarter,
          type: item.type,
          status: item.status,
          submittedAt: item.submitted_at,
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

      return result;
    }

    return {
      records: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  }

  async _listPerformanceRecordsInternal(queryParams) {
    return await apiService.get(`${API_PREFIX}/admin/performance`, queryParams);
  }

  /**
   * Get performance record details by ID (Admin)
   * 获取绩效记录详情（管理员）
   *
   * @param {string} recordId - Performance record ID (UUID)
   * @returns {Promise<Object>} Performance record details
   */

  async getPerformanceRecord(recordId) {
    const response = await apiService.get(
      `${API_PREFIX}/admin/performance/${recordId}`
    );

    // Map backend response to frontend format
    if (response) {
      const mappedResponse = {
        id: response.id,
        memberId: response.member_id,
        year: response.year,
        quarter: response.quarter,
        type: response.type,
        status: response.status,
        dataJson: response.data_json,
        submittedAt: response.submitted_at,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        attachments: response.attachments || [],
        reviews: response.reviews || [],
      };

      return mappedResponse;
    }

    return response;
  }

  /**
   * Approve a performance record (Admin)
   * 批准绩效记录（管理员）
   *
   * @param {string} recordId - Performance record ID (UUID, corresponds to backend performance_id)
   * @param {string} [comments] - Approval comments
   * @returns {Promise<Object>} Updated performance record
   */
  async approvePerformance(recordId, comments = null) {
    const requestData = {
      comments: comments || null,
    };

    const response = await this._approvePerformanceInternal(
      recordId,
      requestData
    );

    // Map backend response to frontend format
    if (response) {
      const mappedResponse = {
        id: response.id,
        year: response.year,
        quarter: response.quarter,
        type: response.type,
        status: response.status,
        dataJson: response.data_json,
        submittedAt: response.submitted_at,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
      };

      return mappedResponse;
    }

    return response;
  }

  async _approvePerformanceInternal(recordId, requestData) {
    return await apiService.post(
      `${API_PREFIX}/admin/performance/${recordId}/approve`,
      requestData
    );
  }

  /**
   * Request revision for a performance record (Admin)
   * 要求修改绩效记录（管理员）
   *
   * @param {string} recordId - Performance record ID (UUID, corresponds to backend performance_id)
   * @param {string} comments - Revision comments
   * @returns {Promise<Object>} Updated performance record
   */
  async requestPerformanceRevision(recordId, comments) {
    const requestData = {
      comments: comments,
    };

    const response = await this._requestPerformanceRevisionInternal(
      recordId,
      requestData
    );

    // Map backend response to frontend format
    if (response) {
      const mappedResponse = {
        id: response.id,
        year: response.year,
        quarter: response.quarter,
        type: response.type,
        status: response.status,
        dataJson: response.data_json,
        submittedAt: response.submitted_at,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
      };

      return mappedResponse;
    }

    return response;
  }

  async _requestPerformanceRevisionInternal(recordId, requestData) {
    return await apiService.post(
      `${API_PREFIX}/admin/performance/${recordId}/request-fix`,
      requestData
    );
  }

  /**
   * Reject a performance record (Admin)
   * 驳回绩效记录（管理员）
   *
   * @param {string} recordId - Performance record ID (UUID, corresponds to backend performance_id)
   * @param {string} [comments] - Rejection comments
   * @returns {Promise<Object>} Updated performance record
   */
  async rejectPerformance(recordId, comments = null) {
    const requestData = {
      comments: comments || null,
    };

    const response = await this._rejectPerformanceInternal(
      recordId,
      requestData
    );

    // Map backend response to frontend format
    if (response) {
      const mappedResponse = {
        id: response.id,
        year: response.year,
        quarter: response.quarter,
        type: response.type,
        status: response.status,
        dataJson: response.data_json,
        submittedAt: response.submitted_at,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
      };

      return mappedResponse;
    }

    return response;
  }

  async _rejectPerformanceInternal(recordId, requestData) {
    return await apiService.post(
      `${API_PREFIX}/admin/performance/${recordId}/reject`,
      requestData
    );
  }

  /**
   * List audit logs with pagination and filtering (Admin)
   * 获取审计日志列表（管理员，分页和筛选）
   *
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=20] - Items per page
   * @param {string} [params.userId] - Filter by user ID
   * @param {string} [params.action] - Filter by action type
   * @param {string} [params.resourceType] - Filter by resource type
   * @param {string} [params.resourceId] - Filter by resource ID
   * @param {string} [params.startDate] - Start date filter (ISO format)
   * @param {string} [params.endDate] - End date filter (ISO format)
   * @returns {Promise<Object>} Paginated audit log list
   */
  async listAuditLogs(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 20,
    };

    if (params.userId) {
      queryParams.user_id = params.userId;
    }
    if (params.action) {
      queryParams.action = params.action;
    }
    if (params.resourceType) {
      queryParams.resource_type = params.resourceType;
    }
    if (params.resourceId) {
      queryParams.resource_id = params.resourceId;
    }
    if (params.startDate) {
      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO format
      const date = new Date(params.startDate);
      queryParams.start_date = date.toISOString();
    }
    if (params.endDate) {
      // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO format
      const date = new Date(params.endDate);
      queryParams.end_date = date.toISOString();
    }

    const response = await this._listAuditLogsInternal(queryParams);

    // Map backend response to frontend format
    if (response && response.items) {
      const result = {
        logs: response.items.map((item) => ({
          id: item.id,
          userId: item.user_id,
          action: item.action,
          resourceType: item.resource_type,
          resourceId: item.resource_id,
          ipAddress: item.ip_address,
          userAgent: item.user_agent,
          createdAt: item.created_at,
          userEmail: item.user_email,
          userCompanyName: item.user_company_name,
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

      return result;
    }

    return {
      logs: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  }

  async _listAuditLogsInternal(queryParams) {
    return await apiService.get(`${API_PREFIX}/admin/audit-logs`, queryParams);
  }

  /**
   * Get audit log details by ID (Admin)
   * 获取审计日志详情（管理员）
   *
   * @param {string} logId - Audit log ID (UUID)
   * @returns {Promise<Object>} Audit log details
   */

  async getAuditLog(logId) {
    const response = await apiService.get(
      `${API_PREFIX}/admin/audit-logs/${logId}`
    );

    // Map backend response to frontend format
    if (response) {
      const mappedResponse = {
        id: response.id,
        userId: response.user_id,
        action: response.action,
        resourceType: response.resource_type,
        resourceId: response.resource_id,
        ipAddress: response.ip_address,
        userAgent: response.user_agent,
        createdAt: response.created_at,
        userEmail: response.user_email,
        userCompanyName: response.user_company_name,
      };

      return mappedResponse;
    }

    return response;
  }

  /**
   * Export members data to Excel or CSV (Admin)
   * 导出会员数据到 Excel 或 CSV（管理员）
   *
   * @param {Object} params - Export parameters (same as listMembers)
   * @param {string} [params.format='excel'] - Export format: 'excel' or 'csv'
   * @returns {Promise<void>} Downloads the file
   */
  async exportMembers(params = {}) {
    const queryParams = {
      format: params.format || "excel",
    };

    if (params.search) {
      queryParams.search = params.search;
    }
    if (params.industry) {
      queryParams.industry = params.industry;
    }
    if (params.region) {
      queryParams.region = params.region;
    }
    if (params.approvalStatus) {
      queryParams.approval_status = params.approvalStatus;
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.language) {
      queryParams.language = params.language;
    }

    return await this._exportMembersInternal(queryParams);
  }

  async _exportMembersInternal(queryParams) {
    return await apiService.download(
      `${API_PREFIX}/admin/members/export`,
      queryParams
    );
  }

  /**
   * Get project details by ID (Admin)
   * 获取项目详情（管理员）
   *
   * @param {string} projectId - Project ID (UUID)
   * @returns {Promise<Object>} Project details
   */

  async getProject(projectId) {
    return await apiService.get(`${API_PREFIX}/admin/projects/${projectId}`);
  }

  /**
   * Create a new project (Admin)
   * 创建新项目（管理员）
   *
   * @param {Object} projectData - Project data (JSON object)
   * @returns {Promise<Object>} Created project
   */
  async createProject(projectData) {
    return await this._createProjectInternal(projectData);
  }

  async _createProjectInternal(projectData) {
    return await apiService.post(`${API_PREFIX}/admin/projects`, projectData);
  }

  /**
   * Update an existing project (Admin)
   * 更新项目（管理员）
   *
   * @param {string} projectId - Project ID
   * @param {Object} projectData - Project data (JSON object)
   * @returns {Promise<Object>} Updated project
   */
  async updateProject(projectId, projectData) {
    return await this._updateProjectInternal(projectId, projectData);
  }

  async _updateProjectInternal(projectId, projectData) {
    return await apiService.put(
      `${API_PREFIX}/admin/projects/${projectId}`,
      projectData
    );
  }

  /**
   * Delete a project (Admin)
   * 删除项目（管理员）
   *
   * @param {string} projectId - Project ID
   * @returns {Promise<void>}
   */
  async deleteProject(projectId) {
    return await this._deleteProjectInternal(projectId);
  }

  async _deleteProjectInternal(projectId) {
    return await apiService.delete(`${API_PREFIX}/admin/projects/${projectId}`);
  }

  /**
   * Get project applications (Admin)
   * 获取项目申请列表（管理员）
   *
   * @param {string} projectId - Project ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Applications data with pagination
   */
  async getProjectApplications(projectId, params = {}) {
    return await apiService.get(`${API_PREFIX}/admin/projects/${projectId}/applications`, { params });
  }

  /**
   * Search Nice D&B company information
   * 查询 Nice D&B 企业信息
   *
   * @param {string} businessNumber - Business registration number (with or without dashes)
   * @returns {Promise<Object>} Nice D&B company data
   */
  async searchNiceDnb(businessNumber) {
    // Remove dashes from business number
    const cleanBusinessNumber = businessNumber.replace(/-/g, "");

    return await this._searchNiceDnbInternal(cleanBusinessNumber);
  }

  async _searchNiceDnbInternal(cleanBusinessNumber) {
    return await apiService.get(`${API_PREFIX}/admin/members/nice-dnb`, {
      business_number: cleanBusinessNumber,
    });
  }

  /**
   * Export performance data to Excel or CSV (Admin)
   * 导出绩效数据到 Excel 或 CSV（管理员）
   *
   * @param {Object} params - Export parameters
   * @param {string} [params.format='excel'] - Export format: 'excel' or 'csv'
   * @param {number} [params.year] - Filter by year
   * @param {number} [params.quarter] - Filter by quarter (1-4)
   * @param {string} [params.status] - Filter by status
   * @param {string} [params.type] - Filter by type (sales, support, ip)
   * @param {string} [params.memberId] - Filter by member ID
   * @returns {Promise<void>} Downloads the file
   */
  async exportPerformance(params = {}) {
    const queryParams = {
      format: params.format || "excel",
    };

    if (params.year) {
      queryParams.year = params.year;
    }
    if (params.quarter) {
      queryParams.quarter = params.quarter;
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.type) {
      queryParams.type = params.type;
    }
    if (params.memberId) {
      queryParams.member_id = params.memberId;
    }

    return await this._exportPerformanceInternal(queryParams);
  }

  async _exportPerformanceInternal(queryParams) {
    return await apiService.download(
      `${API_PREFIX}/admin/performance/export`,
      queryParams
    );
  }

  /**
   * Export projects data to Excel or CSV (Admin)
   * 导出项目数据到 Excel 或 CSV（管理员）
   *
   * @param {Object} params - Export parameters
   * @param {string} [params.format='excel'] - Export format: 'excel' or 'csv'
   * @param {string} [params.status] - Filter by status
   * @param {string} [params.search] - Search term
   * @returns {Promise<void>} Downloads the file
   */
  async exportProjects(params = {}) {
    const queryParams = {
      format: params.format || "excel",
    };

    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.search) {
      queryParams.search = params.search;
    }

    return await this._exportProjectsInternal(queryParams);
  }

  async _exportProjectsInternal(queryParams) {
    return await apiService.download(
      `${API_PREFIX}/admin/projects/export`,
      queryParams
    );
  }

  /**
   * Export project applications data to Excel or CSV (Admin)
   * 导出项目申请数据到 Excel 或 CSV（管理员）
   *
   * @param {Object} params - Export parameters
   * @param {string} [params.format='excel'] - Export format: 'excel' or 'csv'
   * @param {string} [params.projectId] - Filter by project ID
   * @param {string} [params.status] - Filter by status
   * @returns {Promise<void>} Downloads the file
   */
  async exportApplications(params = {}) {
    const queryParams = {
      format: params.format || "excel",
    };

    if (params.projectId) {
      queryParams.project_id = params.projectId;
    }
    if (params.status) {
      queryParams.status = params.status;
    }

    return await this._exportApplicationsInternal(queryParams);
  }

  async _exportApplicationsInternal(queryParams) {
    return await apiService.download(
      `${API_PREFIX}/admin/applications/export`,
      queryParams
    );
  }

  /**
   * Export dashboard data to Excel or CSV (Admin)
   * 导出仪表盘数据到 Excel 或 CSV（管理员）
   *
   * @param {Object} params - Export parameters
   * @param {string} [params.format='excel'] - Export format: 'excel' or 'csv'
   * @param {string|number} [params.year='all'] - Filter by year ('all' or specific year)
   * @param {string} [params.quarter='all'] - Filter by quarter ('all', 'Q1', 'Q2', 'Q3', 'Q4')
   * @returns {Promise<void>} Downloads the file
   */
  async exportDashboard(params = {}) {
    const queryParams = {
      format: params.format || "excel",
      year: params.year || "all",
      quarter: params.quarter || "all",
    };

    return await this._exportDashboardInternal(queryParams);
  }

  async _exportDashboardInternal(queryParams) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `dashboard_${queryParams.year}_${
      queryParams.quarter
    }_${timestamp}.${queryParams.format === "excel" ? "xlsx" : "csv"}`;
    return await apiService.download(
      `${API_PREFIX}/admin/dashboard/export`,
      queryParams,
      filename
    );
  }
}

export default new AdminService();
