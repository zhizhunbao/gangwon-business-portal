/**
 * Member Service
 * 会员服务 - 封装会员相关的 API 调用
 */

import apiService from './api.service';
import { API_PREFIX } from '@shared/utils/constants';

class MemberService {
  /**
   * Get current member's profile
   * 获取当前会员资料
   * 
   * @returns {Promise<Object>} Member profile data
   */
  async getProfile() {
    const response = await apiService.get(`${API_PREFIX}/member/profile`);
    
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
        corporationNumber: null, // Not in backend response yet
        representativeName: null, // Not in backend response yet
        phone: null, // Not in backend response yet
        category: null, // Not in backend response yet
        description: null, // Not in backend response yet
        businessField: null, // Not in backend response yet
        mainBusiness: null, // Not in backend response yet
        cooperationFields: [] // Not in backend response yet
      };
    }
    
    return response;
  }

  /**
   * Verify company information
   * 验证公司信息
   * 
   * @param {Object} data - Company verification data
   * @param {string} data.businessNumber - Business registration number
   * @param {string} [data.companyName] - Company name (optional)
   * @returns {Promise<Object>} Verification result
   */
  async verifyCompany(data) {
    const requestData = {
      business_number: data.businessNumber?.replace(/-/g, '') || data.business_number,
      company_name: data.companyName || null
    };
    
    const response = await apiService.post(`${API_PREFIX}/members/verify-company`, requestData);
    return response;
  }

  /**
   * Update current member's profile
   * 更新当前会员资料
   * 
   * @param {Object} data - Profile data to update
   * @param {string} [data.companyName] - Company name
   * @param {string} [data.email] - Email
   * @param {string} [data.industry] - Industry
   * @param {number} [data.revenue] - Annual revenue
   * @param {number} [data.employeeCount] - Employee count
   * @param {string} [data.foundingDate] - Founding date (YYYY-MM-DD)
   * @param {string} [data.region] - Region
   * @param {string} [data.address] - Address
   * @param {string} [data.website] - Website URL
   * @returns {Promise<Object>} Updated member profile
   */
  async updateProfile(data) {
    // Map frontend fields to backend fields
    const requestData = {};
    
    if (data.companyName !== undefined) {
      requestData.company_name = data.companyName;
    }
    if (data.email !== undefined) {
      requestData.email = data.email;
    }
    if (data.industry !== undefined) {
      requestData.industry = data.industry;
    }
    if (data.revenue !== undefined || data.sales !== undefined) {
      requestData.revenue = data.revenue || data.sales;
    }
    if (data.employeeCount !== undefined) {
      requestData.employee_count = data.employeeCount;
    }
    if (data.foundingDate !== undefined || data.establishedDate !== undefined) {
      requestData.founding_date = data.foundingDate || data.establishedDate;
    }
    if (data.region !== undefined) {
      requestData.region = data.region;
    }
    if (data.address !== undefined) {
      requestData.address = data.address;
    }
    if (data.website !== undefined || data.websiteUrl !== undefined) {
      requestData.website = data.website || data.websiteUrl;
    }
    
    const response = await apiService.put(`${API_PREFIX}/member/profile`, requestData);
    
    // Map backend response to frontend format
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
        updatedAt: response.updated_at
      };
    }
    
    return response;
  }
}

export default new MemberService();

