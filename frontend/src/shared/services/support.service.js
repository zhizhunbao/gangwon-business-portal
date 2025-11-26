/**
 * Support Service
 * 支持模块服务 - 封装 FAQ 和咨询 API
 */

import { apiService } from './index';
import { API_PREFIX } from '@shared/utils/constants';

/**
 * 转换后端 snake_case 到前端 camelCase
 */
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

/**
 * 转换前端 camelCase 到后端 snake_case
 */
function toSnakeCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = toSnakeCase(value);
  }
  return result;
}

/**
 * 状态映射：后端状态 → 前端状态
 */
function mapStatus(status) {
  const statusMap = {
    'pending': 'pending',
    'replied': 'answered',
    'closed': 'closed'
  };
  return statusMap[status] || status;
}

const supportService = {
  // ========== FAQ ==========
  
  /**
   * 获取 FAQ 列表
   * @param {Object} params - 查询参数
   * @param {string} params.category - 分类筛选（可选）
   * @returns {Promise<Array>} FAQ 列表
   */
  async listFAQs(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.category) {
        queryParams.append('category', params.category);
      }
      
      const url = `${API_PREFIX}/faqs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get(url);
      
      // 后端返回格式: { items: [...] }
      const items = response.items || response.records || response.faqs || [];
      return toCamelCase(items);
    } catch (error) {
      console.error('Failed to list FAQs:', error);
      throw error;
    }
  },

  // ========== 咨询 (Inquiries) ==========
  
  /**
   * 提交咨询
   * @param {Object} data - 咨询数据
   * @param {string} data.subject - 咨询标题
   * @param {string} data.content - 咨询内容
   * @returns {Promise<Object>} 创建的咨询记录
   */
  async createInquiry(data) {
    try {
      // 后端只需要 subject 和 content
      const requestData = {
        subject: data.subject,
        content: data.content
      };
      
      const response = await apiService.post(
        `${API_PREFIX}/inquiries`,
        toSnakeCase(requestData)
      );
      
      const result = toCamelCase(response);
      // 状态映射
      if (result.status) {
        result.status = mapStatus(result.status);
      }
      return result;
    } catch (error) {
      console.error('Failed to create inquiry:', error);
      throw error;
    }
  },

  /**
   * 获取我的咨询列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码（默认：1）
   * @param {number} params.pageSize - 每页数量（默认：20）
   * @returns {Promise<Object>} 咨询列表响应（包含 items, total, page, pageSize, totalPages）
   */
  async listMyInquiries(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.pageSize) {
        queryParams.append('page_size', params.pageSize.toString());
      }
      
      const url = `${API_PREFIX}/inquiries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get(url);
      
      // 后端返回格式: { items: [...], total, page, page_size, total_pages }
      const result = toCamelCase(response);
      
      // 状态映射
      if (result.items) {
        result.items = result.items.map(item => ({
          ...item,
          status: mapStatus(item.status)
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to list inquiries:', error);
      throw error;
    }
  },

  /**
   * 获取咨询详情
   * @param {string} inquiryId - 咨询 ID
   * @returns {Promise<Object>} 咨询详情
   */
  async getInquiry(inquiryId) {
    try {
      const response = await apiService.get(`${API_PREFIX}/inquiries/${inquiryId}`);
      const result = toCamelCase(response);
      
      // 状态映射
      if (result.status) {
        result.status = mapStatus(result.status);
      }
      
      // 字段映射：后端 admin_reply → 前端 answer
      if (result.adminReply) {
        result.answer = result.adminReply;
      }
      
      // 字段映射：后端 replied_at → 前端 answeredAt
      if (result.repliedAt) {
        result.answeredAt = result.repliedAt;
      }
      
      // 字段映射：后端 created_at → 前端 createdAt
      if (result.createdAt) {
        // 已通过 toCamelCase 转换
      }
      
      return result;
    } catch (error) {
      console.error('Failed to get inquiry:', error);
      throw error;
    }
  }
};

export default supportService;

