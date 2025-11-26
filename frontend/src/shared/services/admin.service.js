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
          businessLicense: item.business_number,
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
        businessLicense: response.business_number,
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
    
    const response = await apiService.put(`${API_PREFIX}/admin/performance/${recordId}/approve`, requestData);
    
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
    
    const response = await apiService.put(`${API_PREFIX}/admin/performance/${recordId}/request-fix`, requestData);
    
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
    
    const response = await apiService.put(`${API_PREFIX}/admin/performance/${recordId}/reject`, requestData);
    
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
}

export default new AdminService();

