/**
 * Performance Service
 * 绩效服务 - 封装绩效相关的 API 调用
 */

import apiService from './api.service';
import { API_PREFIX } from '@shared/utils/constants';

class PerformanceService {
  /**
   * List performance records with pagination and filtering
   * 获取绩效记录列表（分页和筛选）
   * 
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=20] - Items per page
   * @param {number} [params.year] - Filter by year
   * @param {number} [params.quarter] - Filter by quarter (1-4)
   * @param {string} [params.status] - Filter by status (draft, submitted, approved, rejected, revision_requested)
   * @param {string} [params.type] - Filter by type (sales, support, ip)
   * @returns {Promise<Object>} Paginated performance list
   */
  async listRecords(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 20,
    };
    
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
    
    const response = await apiService.get(`${API_PREFIX}/performance`, queryParams);
    
    // Map backend response to frontend format
    if (response && response.items) {
      return {
        records: response.items.map(item => ({
          id: item.id,
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
   * Get performance record details by ID
   * 获取绩效记录详情
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @returns {Promise<Object>} Performance record details
   */
  async getRecord(recordId) {
    const response = await apiService.get(`${API_PREFIX}/performance/${recordId}`);
    
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
        updatedAt: response.updated_at,
        reviews: response.reviews || []
      };
    }
    
    return response;
  }

  /**
   * Create a new performance record (draft)
   * 创建新的绩效记录（草稿）
   * 
   * @param {Object} data - Performance data
   * @param {number} data.year - Year
   * @param {number} [data.quarter] - Quarter (1-4), null for annual
   * @param {string} data.type - Type: "sales", "support", or "ip"
   * @param {Object} data.dataJson - Performance data in JSON format
   * @returns {Promise<Object>} Created performance record
   */
  async createRecord(data) {
    const requestData = {
      year: data.year,
      quarter: data.quarter || null,
      type: data.type,
      data_json: data.dataJson || data.data_json
    };
    
    const response = await apiService.post(`${API_PREFIX}/performance`, requestData);
    
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
   * Update a performance record (draft or revision_requested only)
   * 更新绩效记录（仅限草稿或需要修改状态）
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @param {Object} data - Performance data to update
   * @param {number} [data.year] - Year
   * @param {number} [data.quarter] - Quarter (1-4)
   * @param {string} [data.type] - Type: "sales", "support", or "ip"
   * @param {Object} [data.dataJson] - Performance data in JSON format
   * @returns {Promise<Object>} Updated performance record
   */
  async updateRecord(recordId, data) {
    const requestData = {};
    
    if (data.year !== undefined) {
      requestData.year = data.year;
    }
    if (data.quarter !== undefined) {
      requestData.quarter = data.quarter || null;
    }
    if (data.type !== undefined) {
      requestData.type = data.type;
    }
    if (data.dataJson !== undefined || data.data_json !== undefined) {
      requestData.data_json = data.dataJson || data.data_json;
    }
    
    const response = await apiService.put(`${API_PREFIX}/performance/${recordId}`, requestData);
    
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
   * Delete a performance record (draft only)
   * 删除绩效记录（仅限草稿状态）
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @returns {Promise<void>}
   */
  async deleteRecord(recordId) {
    await apiService.delete(`${API_PREFIX}/performance/${recordId}`);
  }

  /**
   * Submit a performance record for review
   * 提交绩效记录以供审核
   * 
   * @param {string} recordId - Performance record ID (UUID)
   * @returns {Promise<Object>} Updated performance record
   */
  async submitRecord(recordId) {
    const response = await apiService.post(`${API_PREFIX}/performance/${recordId}/submit`);
    
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
   * Convert frontend form data to backend format
   * 将前端表单数据转换为后端格式
   * 
   * @param {Object} formData - Frontend form data
   * @param {number} formData.year - Year
   * @param {string} formData.quarter - Quarter ("1", "2", "3", "4", or "")
   * @param {Object} formData.salesEmployment - Sales and employment data
   * @param {Array} formData.governmentSupport - Government support records
   * @param {Array} formData.intellectualProperty - Intellectual property records
   * @returns {Object} Backend format data
   */
  convertFormDataToBackendFormat(formData) {
    // Determine type based on which tab has data
    let type = 'sales'; // Default to sales
    if (formData.governmentSupport && formData.governmentSupport.length > 0) {
      type = 'support';
    } else if (formData.intellectualProperty && formData.intellectualProperty.length > 0) {
      type = 'ip';
    }

    const dataJson = {};

    // Sales and employment data
    if (formData.salesEmployment) {
      dataJson.sales_employment = {
        sales: {
          previous_year: formData.salesEmployment.sales?.previousYear || null,
          reporting_date: formData.salesEmployment.sales?.reportingDate || null,
        },
        export: {
          previous_year: formData.salesEmployment.export?.previousYear || null,
          reporting_date: formData.salesEmployment.export?.reportingDate || null,
        },
        employment: {
          current_employees: {
            previous_year: formData.salesEmployment.employment?.currentEmployees?.previousYear || null,
            reporting_date: formData.salesEmployment.employment?.currentEmployees?.reportingDate || null,
          },
          new_employees: {
            previous_year: formData.salesEmployment.employment?.newEmployees?.previousYear || null,
            reporting_date: formData.salesEmployment.employment?.newEmployees?.reportingDate || null,
          },
          total_employees: {
            previous_year: formData.salesEmployment.employment?.totalEmployees?.previousYear || null,
            reporting_date: formData.salesEmployment.employment?.totalEmployees?.reportingDate || null,
          },
        },
      };
    }

    // Government support data
    if (formData.governmentSupport && formData.governmentSupport.length > 0) {
      dataJson.government_support = formData.governmentSupport.map(item => ({
        project_name: item.projectName,
        startup_project_name: item.startupProjectName,
        start_date: item.startDate,
        end_date: item.endDate,
        support_amount: item.supportAmount ? parseFloat(item.supportAmount) : null,
        support_organization: item.supportOrganization,
      }));
    }

    // Intellectual property data
    if (formData.intellectualProperty && formData.intellectualProperty.length > 0) {
      dataJson.intellectual_property = formData.intellectualProperty.map(item => ({
        name: item.name,
        number: item.number,
        type: item.type,
        registration_type: item.registrationType,
        country: item.country,
        overseas_type: item.overseasType,
        registration_date: item.registrationDate,
        public_disclosure: item.publicDisclosure,
        // Note: proofDocument file upload should be handled separately
        proof_document_file_id: item.proofDocumentFileId || null,
      }));
    }

    return {
      year: formData.year,
      quarter: formData.quarter ? parseInt(formData.quarter) : null,
      type: type,
      data_json: dataJson
    };
  }
}

export default new PerformanceService();

