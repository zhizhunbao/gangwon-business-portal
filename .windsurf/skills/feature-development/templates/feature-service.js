import { apiClient } from '@/shared/services/api.client';

/**
 * {{FeatureName}} Feature Service
 * 
 * @description API service for {{featureName}} feature
 * @author {{author}}
 * @created {{date}}
 */
export class {{FeatureName}}Service {
  /**
   * Get all {{featureName}} items
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} List of {{featureName}} items
   */
  static async getAll(params = {}) {
    const response = await apiClient.get('/api/{{featureRoute}}', { params });
    return response.data;
  }

  /**
   * Get {{featureName}} by ID
   * @param {string|number} id - {{FeatureName}} ID
   * @returns {Promise<Object>} {{FeatureName}} item
   */
  static async getById(id) {
    const response = await apiClient.get(`/api/{{featureRoute}}/${id}`);
    return response.data;
  }

  /**
   * Create new {{featureName}}
   * @param {Object} data - {{FeatureName}} data
   * @returns {Promise<Object>} Created {{featureName}}
   */
  static async create(data) {
    const response = await apiClient.post('/api/{{featureRoute}}', data);
    return response.data;
  }

  /**
   * Update {{featureName}}
   * @param {string|number} id - {{FeatureName}} ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated {{featureName}}
   */
  static async update(id, data) {
    const response = await apiClient.put(`/api/{{featureRoute}}/${id}`, data);
    return response.data;
  }

  /**
   * Delete {{featureName}}
   * @param {string|number} id - {{FeatureName}} ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    await apiClient.delete(`/api/{{featureRoute}}/${id}`);
  }

  /**
   * Search {{featureName}} items
   * @param {Object} searchParams - Search parameters
   * @returns {Promise<Array>} Search results
   */
  static async search(searchParams) {
    const response = await apiClient.get('/api/{{featureRoute}}/search', { 
      params: searchParams 
    });
    return response.data;
  }

  /**
   * Get {{featureName}} statistics
   * @returns {Promise<Object>} Statistics data
   */
  static async getStatistics() {
    const response = await apiClient.get('/api/{{featureRoute}}/statistics');
    return response.data;
  }

  /**
   * Export {{featureName}} data
   * @param {Object} exportParams - Export parameters
   * @returns {Promise<Blob>} Export file
   */
  static async export(exportParams = {}) {
    const response = await apiClient.get('/api/{{featureRoute}}/export', {
      params: exportParams,
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Import {{featureName}} data
   * @param {FormData} fileData - File data for import
   * @returns {Promise<Object>} Import results
   */
  static async import(fileData) {
    const response = await apiClient.post('/api/{{featureRoute}}/import', fileData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Bulk operations on {{featureName}} items
   * @param {Object} bulkData - Bulk operation data
   * @returns {Promise<Object>} Operation results
   */
  static async bulkOperation(bulkData) {
    const response = await apiClient.post('/api/{{featureRoute}}/bulk', bulkData);
    return response.data;
  }
}

// Export singleton instance
export const {{featureName}}Service = {{FeatureName}}Service;
