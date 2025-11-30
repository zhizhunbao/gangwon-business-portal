/**
 * Admin Service
 * 管理员服务 - 封装管理员相关的 API 调用
 */

import apiService from './api.service';
import { API_PREFIX } from '@shared/utils/constants';

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
    
    const response = await apiService.get(`${API_PREFIX}/admin/members`, queryParams);
    
    // Map backend response to frontend format
    if (response && response.items) {
      return {
        members: response.items.map(item => ({
          id: item.id,
          businessNumber: item.business_number,
          companyName: item.company_name,
          email: item.email,
          status: item.status,
          approvalStatus: item.approval_status,
          industry: item.industry,
          createdAt: item.created_at,
          // Additional fields for compatibility
          representative: null,
          address: null,
          phone: null
        })),
        pagination: {
          total: response.total,
          page: response.page,
          pageSize: response.page_size,
          totalPages: response.total_pages
        },
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages
      };
    }
    
    return {
      members: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0
      },
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0
    };
  }

  /**
   * Get member details by ID
   * 获取会员详情
   * 
   * @param {string} memberId - Member ID (UUID)
   * @returns {Promise<Object>} Member details
   */
  async getMemberDetail(memberId) {
    const response = await apiService.get(`${API_PREFIX}/admin/members/${memberId}`);
    
    // Map backend fields to frontend fields
    if (response) {
      return {
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
        address: response.address,
        website: response.website,
        websiteUrl: response.website,
        logo: response.logo_url,
        logoUrl: response.logo_url,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        // Additional fields for compatibility
        representative: null,
        representativeName: null,
        legalNumber: null,
        phone: null,
        category: null,
        description: null
      };
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
    const response = await apiService.put(`${API_PREFIX}/admin/members/${memberId}/approve`);
    return response;
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
    const url = `${API_PREFIX}/admin/members/${memberId}/reject`;
    const response = await apiService.put(url, {}, { params: queryParams });
    return response;
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
    if (params.year !== undefined && params.year !== null && params.year !== '') {
      queryParams.year = parseInt(params.year);
    }
    if (params.quarter !== undefined && params.quarter !== null && params.quarter !== '') {
      queryParams.quarter = parseInt(params.quarter);
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.type) {
      queryParams.type = params.type;
    }
    
    const response = await apiService.get(`${API_PREFIX}/admin/performance`, queryParams);
    
    // Map backend response to frontend format
    if (response && response.items) {
      return {
        records: response.items.map(item => ({
          id: item.id,
          memberId: item.member_id,
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
          totalPages: response.total_pages
        },
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages
      };
    }
    
    return {
      records: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0
      },
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0
    };
  }

  /**
   * Get performance record details by ID (Admin)
   * 获取绩效记录详情（管理员）
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @returns {Promise<Object>} Performance record details
   */
  async getPerformanceRecord(recordId) {
    const response = await apiService.get(`${API_PREFIX}/admin/performance/${recordId}`);
    
    // Map backend response to frontend format
    if (response) {
      return {
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
        reviews: response.reviews || []
      };
    }
    
    return response;
  }

  /**
   * Approve a performance record (Admin)
   * 批准绩效记录（管理员）
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @param {string} [comments] - Approval comments
   * @returns {Promise<Object>} Updated performance record
   */
  async approvePerformance(recordId, comments = null) {
    const requestData = {
      status: 'approved',
      comments: comments || null
    };
    
    const response = await apiService.post(`${API_PREFIX}/admin/performance/${recordId}/approve`, requestData);
    
    // Map backend response to frontend format
    if (response) {
      return {
        id: response.id,
        year: response.year,
        quarter: response.quarter,
        type: response.type,
        status: response.status,
        dataJson: response.data_json,
        submittedAt: response.submitted_at,
        createdAt: response.created_at,
        updatedAt: response.updated_at
      };
    }
    
    return response;
  }

  /**
   * Request revision for a performance record (Admin)
   * 要求修改绩效记录（管理员）
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @param {string} comments - Revision comments
   * @returns {Promise<Object>} Updated performance record
   */
  async requestPerformanceRevision(recordId, comments) {
    const requestData = {
      status: 'revision_requested',
      comments: comments
    };
    
    const response = await apiService.post(`${API_PREFIX}/admin/performance/${recordId}/request-fix`, requestData);
    
    // Map backend response to frontend format
    if (response) {
      return {
        id: response.id,
        year: response.year,
        quarter: response.quarter,
        type: response.type,
        status: response.status,
        dataJson: response.data_json,
        submittedAt: response.submitted_at,
        createdAt: response.created_at,
        updatedAt: response.updated_at
      };
    }
    
    return response;
  }

  /**
   * Reject a performance record (Admin)
   * 驳回绩效记录（管理员）
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @param {string} [comments] - Rejection comments
   * @returns {Promise<Object>} Updated performance record
   */
  async rejectPerformance(recordId, comments = null) {
    const requestData = {
      status: 'rejected',
      comments: comments || null
    };
    
    const response = await apiService.post(`${API_PREFIX}/admin/performance/${recordId}/reject`, requestData);
    
    // Map backend response to frontend format
    if (response) {
      return {
        id: response.id,
        year: response.year,
        quarter: response.quarter,
        type: response.type,
        status: response.status,
        dataJson: response.data_json,
        submittedAt: response.submitted_at,
        createdAt: response.created_at,
        updatedAt: response.updated_at
      };
    }
    
    return response;
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
    
    const response = await apiService.get(`${API_PREFIX}/admin/audit-logs`, queryParams);
    
    // Map backend response to frontend format
    if (response && response.items) {
      return {
        logs: response.items.map(item => ({
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
          totalPages: response.total_pages
        },
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages
      };
    }
    
    return {
      logs: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0
      },
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0
    };
  }

  /**
   * Get audit log details by ID (Admin)
   * 获取审计日志详情（管理员）
   * 
   * @param {string} logId - Audit log ID (UUID)
   * @returns {Promise<Object>} Audit log details
   */
  async getAuditLog(logId) {
    const response = await apiService.get(`${API_PREFIX}/admin/audit-logs/${logId}`);
    
    // Map backend response to frontend format
    if (response) {
      return {
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
      format: params.format || 'excel',
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
    
    const response = await apiService.download(`${API_PREFIX}/admin/members/export`, queryParams);
    return response;
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
    const cleanBusinessNumber = businessNumber.replace(/-/g, '');
    
    const response = await apiService.get(`${API_PREFIX}/admin/members/nice-dnb`, {
      business_number: cleanBusinessNumber
    });
    
    return response;
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
      format: params.format || 'excel',
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
    
    const response = await apiService.download(`${API_PREFIX}/admin/performance/export`, queryParams);
    return response;
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
      format: params.format || 'excel',
    };
    
    if (params.status) {
      queryParams.status = params.status;
    }
    if (params.search) {
      queryParams.search = params.search;
    }
    
    const response = await apiService.download(`${API_PREFIX}/admin/projects/export`, queryParams);
    return response;
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
      format: params.format || 'excel',
    };
    
    if (params.projectId) {
      queryParams.project_id = params.projectId;
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    
    const response = await apiService.download(`${API_PREFIX}/admin/applications/export`, queryParams);
    return response;
  }
}

export default new AdminService();

