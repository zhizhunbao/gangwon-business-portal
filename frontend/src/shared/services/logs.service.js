/**
 * Logs Service
 * 日志服务 - 封装日志相关的 API 调用
 */

import apiService from './api.service';
import { API_PREFIX } from '@shared/utils/constants';

class LogsService {
  /**
   * List application logs with pagination and filtering
   * 获取应用日志列表
   *
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=50] - Items per page
   * @param {string} [params.source] - Filter by source (backend/frontend)
   * @param {string} [params.level] - Filter by level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
   * @param {string} [params.layer] - Filter by layer (Router/Service/Database/Auth/Performance/System)
   * @param {string} [params.traceId] - Filter by trace ID
   * @param {string} [params.userId] - Filter by user ID
   * @param {string} [params.startDate] - Start date filter (ISO format)
   * @param {string} [params.endDate] - End date filter (ISO format)
   * @returns {Promise<Object>} Paginated log list
   */
  async listLogs(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 50,
    };

    if (params.source) queryParams.source = params.source;
    if (params.level) queryParams.level = params.level;
    if (params.layer) queryParams.layer = params.layer;
    if (params.traceId) queryParams.trace_id = params.traceId;
    if (params.userId) queryParams.user_id = params.userId;
    if (params.startDate) {
      queryParams.start_date = new Date(params.startDate).toISOString();
    }
    if (params.endDate) {
      queryParams.end_date = new Date(params.endDate).toISOString();
    }

    const response = await apiService.get(`${API_PREFIX}/v1/logging/logs`, queryParams);

    // Map backend response to frontend format
    if (response && response.items) {
      return {
        items: response.items.map(item => this._mapLogItem(item)),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  }

  /**
   * List system logs with pagination and filtering
   * 获取系统日志列表
   *
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=50] - Items per page
   * @param {string} [params.level] - Filter by level (DEBUG/INFO/WARNING/ERROR/CRITICAL)
   * @param {string} [params.traceId] - Filter by trace ID
   * @returns {Promise<Object>} Paginated system log list
   */
  async listSystemLogs(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 50,
    };

    if (params.level) queryParams.level = params.level;
    if (params.traceId) queryParams.trace_id = params.traceId;

    const response = await apiService.get(`${API_PREFIX}/v1/logging/system`, queryParams);

    if (response && response.items) {
      return {
        items: response.items.map(item => this._mapLogItem(item)),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  }

  /**
   * Delete a single system log by ID
   * 删除单条系统日志
   *
   * @param {string} logId - Log ID (UUID)
   * @returns {Promise<Object>} Delete result
   */
  async deleteSystemLog(logId) {
    return await apiService.delete(`${API_PREFIX}/v1/logging/system/${logId}`);
  }

  /**
   * Delete system logs matching a message pattern
   * 删除匹配指定消息的系统日志
   *
   * @param {string} message - Message pattern to match
   * @returns {Promise<Object>} Delete result with count
   */
  async deleteSystemLogsByMessage(message) {
    const encodedMessage = encodeURIComponent(message);
    return await apiService.delete(`${API_PREFIX}/v1/logging/system/by-message?message=${encodedMessage}`);
  }

  /**
   * List error logs (ERROR/CRITICAL level) with pagination and filtering
   * 获取异常日志列表
   *
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=50] - Items per page
   * @param {string} [params.level] - Filter by level (ERROR/CRITICAL)
   * @param {string} [params.traceId] - Filter by trace ID
   * @param {string} [params.userId] - Filter by user ID
   * @returns {Promise<Object>} Paginated error log list
   */
  async listErrorLogs(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 50,
    };

    if (params.level) queryParams.level = params.level;
    if (params.traceId) queryParams.trace_id = params.traceId;
    if (params.userId) queryParams.user_id = params.userId;

    const response = await apiService.get(`${API_PREFIX}/v1/logging/errors`, queryParams);

    if (response && response.items) {
      return {
        items: response.items.map(item => this._mapLogItem(item)),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  }

  /**
   * List performance logs with pagination and filtering
   * 获取性能日志列表
   *
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.pageSize=50] - Items per page
   * @param {string} [params.source] - Filter by source (backend/frontend)
   * @param {string} [params.traceId] - Filter by trace ID
   * @param {string} [params.userId] - Filter by user ID
   * @returns {Promise<Object>} Paginated performance log list
   */
  async listPerformanceLogs(params = {}) {
    const queryParams = {
      page: params.page || 1,
      page_size: params.pageSize || params.page_size || 50,
    };

    if (params.source) queryParams.source = params.source;
    if (params.traceId) queryParams.trace_id = params.traceId;
    if (params.userId) queryParams.user_id = params.userId;

    const response = await apiService.get(`${API_PREFIX}/v1/logging/performance`, queryParams);

    if (response && response.items) {
      return {
        items: response.items.map(item => this._mapLogItem(item)),
        total: response.total,
        page: response.page,
        pageSize: response.page_size,
        totalPages: response.total_pages,
      };
    }

    return { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };
  }

  /**
   * Get log statistics for dashboard
   * 获取日志统计数据
   *
   * @returns {Promise<Object>} Log statistics
   */
  async getLogStats() {
    try {
      const response = await apiService.get(`${API_PREFIX}/v1/logging/stats`);
      return {
        todayErrors: response.today_errors || 0,
        errorChange: response.error_change || 0,
        slowRequests: response.slow_requests || 0,
        securityAlerts: response.security_alerts || 0,
        todayRequests: response.today_requests || 0,
        avgResponseTime: response.avg_response_time || 0,
        apiHealth: response.api_health || 'healthy',
        dbHealth: response.db_health || 'healthy',
        cacheHealth: response.cache_health || 'healthy',
        storageHealth: response.storage_health || 'healthy',
      };
    } catch (error) {
      // Return default stats if API not available
      console.warn('Failed to get log stats, using defaults:', error);
      return {
        todayErrors: 0,
        errorChange: 0,
        slowRequests: 0,
        securityAlerts: 0,
        todayRequests: 0,
        avgResponseTime: 0,
        apiHealth: 'healthy',
        dbHealth: 'healthy',
        cacheHealth: 'healthy',
        storageHealth: 'healthy',
      };
    }
  }

  /**
   * Get recent errors
   * 获取最近的错误日志
   *
   * @param {Object} params
   * @param {number} [params.limit=10] - Number of errors to return
   * @returns {Promise<Object>} Recent errors
   */
  async getRecentErrors(params = {}) {
    // 使用 error_logs 表，与异常列表保持一致
    const queryParams = {
      page: 1,
      page_size: params.limit || 10,
      level: 'ERROR,CRITICAL',
    };

    const response = await apiService.get(`${API_PREFIX}/v1/logging/errors`, queryParams);

    if (response && response.items) {
      return {
        items: response.items.map(item => this._mapLogItem(item)),
        total: response.total,
      };
    }

    return { items: [], total: 0 };
  }

  /**
   * Get slow requests (performance issues)
   * 获取慢请求日志
   *
   * @param {Object} params
   * @param {number} [params.limit=10] - Number of records to return
   * @returns {Promise<Object>} Slow requests
   */
  async getSlowRequests(params = {}) {
    const queryParams = {
      page: 1,
      page_size: params.limit || 10,
    };

    try {
      // Get performance logs (slow requests are in performance_logs table)
      const response = await apiService.get(`${API_PREFIX}/v1/logging/performance`, queryParams);

      if (response && response.items) {
        // Filter for slow requests (duration > 500ms)
        const slowItems = response.items.filter(item => 
          (item.duration_ms && item.duration_ms > 500) || 
          (item.message && item.message.toLowerCase().includes('slow'))
        );
        
        return {
          items: slowItems.map(item => this._mapLogItem(item)),
          total: slowItems.length,
        };
      }
    } catch (error) {
      console.warn('Failed to get slow requests:', error);
    }

    return { items: [], total: 0 };
  }

  /**
   * Get security issues (auth failures, suspicious activity)
   * 获取安全相关日志
   *
   * @param {Object} params
   * @param {number} [params.limit=10] - Number of records to return
   * @returns {Promise<Object>} Security issues
   */
  async getSecurityIssues(params = {}) {
    const queryParams = {
      page: 1,
      page_size: params.limit || 10,
    };

    try {
      // Get auth-related warning/error logs
      const response = await apiService.get(`${API_PREFIX}/v1/logging/logs`, {
        ...queryParams,
        level: 'WARNING',
      });

      if (response && response.items) {
        // Filter for security-related logs
        const securityItems = response.items.filter(item => {
          const message = (item.message || '').toLowerCase();
          const layer = (item.layer || '').toLowerCase();
          return layer === 'auth' || 
                 message.includes('unauthorized') ||
                 message.includes('forbidden') ||
                 message.includes('invalid token') ||
                 message.includes('login failed');
        });
        
        return {
          items: securityItems.map(item => this._mapLogItem(item)),
          total: securityItems.length,
        };
      }
    } catch (error) {
      console.warn('Failed to get security issues:', error);
    }

    return { items: [], total: 0 };
  }

  /**
   * Get system health status
   * 获取系统健康状态
   *
   * @returns {Promise<Object>} System health data
   */
  async getSystemHealth() {
    try {
      const response = await apiService.get(`${API_PREFIX}/health`);
      return {
        status: response.status || 'unknown',
        timestamp: response.timestamp,
        version: response.version,
        services: {
          api: response.services?.api || { status: 'unknown' },
          database: response.services?.database || { status: 'unknown' },
          cache: response.services?.cache || { status: 'unknown' },
          storage: response.services?.storage || { status: 'unknown' },
        }
      };
    } catch (error) {
      console.warn('Failed to get system health:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          api: { status: 'unhealthy', error: error.message },
          database: { status: 'unknown' },
          cache: { status: 'unknown' },
          storage: { status: 'unknown' },
        }
      };
    }
  }

  /**
   * Get detailed system health (admin only)
   * 获取详细的系统健康状态（需要管理员权限）
   *
   * @returns {Promise<Object>} Detailed health data
   */
  async getDetailedHealth() {
    try {
      const response = await apiService.get(`${API_PREFIX}/health/detailed`);
      return {
        status: response.status || 'unknown',
        timestamp: response.timestamp,
        version: response.version,
        services: response.services || {},
        databaseMetrics: response.database_metrics ? {
          status: response.database_metrics.status,
          responseTimeMs: response.database_metrics.responseTimeMs,
          sizeMB: response.database_metrics.sizeMB,
          connections: response.database_metrics.connections || {},
          tableCount: response.database_metrics.tableCount,
        } : null
      };
    } catch (error) {
      console.warn('Failed to get detailed health:', error);
      return null;
    }
  }

  /**
   * Get database metrics (admin only)
   * 获取数据库指标（需要管理员权限）
   *
   * @returns {Promise<Object>} Database metrics
   */
  async getDatabaseMetrics() {
    try {
      const response = await apiService.get(`${API_PREFIX}/health/database`);
      return {
        status: response.status,
        responseTimeMs: response.responseTimeMs,
        sizeBytes: response.sizeBytes,
        sizeMB: response.sizeMB,
        connections: response.connections || { total: 0, active: 0, idle: 0 },
        tableCount: response.tableCount,
        timestamp: response.timestamp,
      };
    } catch (error) {
      console.warn('Failed to get database metrics:', error);
      return null;
    }
  }

  /**
   * Get Render deployment status (admin only)
   * 获取 Render 部署状态（需要管理员权限）
   *
   * @returns {Promise<Object>} Render services status
   */
  async getRenderStatus() {
    try {
      const response = await apiService.get(`${API_PREFIX}/health/render`);
      return {
        backend: response.backend || { status: 'unknown' },
        frontend: response.frontend || { status: 'unknown' },
      };
    } catch (error) {
      console.warn('Failed to get Render status:', error);
      return null;
    }
  }

  /**
   * Get a single log by ID
   * 获取单条日志详情
   *
   * @param {string} logId - Log ID (UUID)
   * @returns {Promise<Object>} Log details
   */
  async getLog(logId) {
    const response = await apiService.get(`${API_PREFIX}/v1/logging/logs/${logId}`);
    return this._mapLogItem(response);
  }

  /**
   * Map backend log item to frontend format
   * @private
   */
  _mapLogItem(item) {
    if (!item) return null;
    return {
      id: item.id,
      source: item.source,
      level: item.level,
      message: item.message,
      layer: item.layer,
      module: item.module,
      function: item.function,
      lineNumber: item.line_number,
      filePath: item.file_path,
      traceId: item.trace_id,
      requestId: item.request_id,
      userId: item.user_id,
      durationMs: item.duration_ms,
      extraData: item.extra_data,
      createdAt: item.created_at,
      userEmail: item.user_email,
      userCompanyName: item.user_company_name,
    };
  }

  /**
   * Delete a single log by ID
   * 删除单条日志
   *
   * @param {string} logId - Log ID (UUID)
   * @returns {Promise<Object>} Delete result
   */
  async deleteLog(logId) {
    return await apiService.delete(`${API_PREFIX}/v1/logging/logs/${logId}`);
  }

  /**
   * Delete logs matching a message pattern
   * 删除匹配指定消息的日志（用于清理已修复的错误）
   *
   * @param {string} message - Message pattern to match
   * @returns {Promise<Object>} Delete result with count
   */
  async deleteLogsByMessage(message) {
    const encodedMessage = encodeURIComponent(message);
    return await apiService.delete(`${API_PREFIX}/v1/logging/logs/by-message?message=${encodedMessage}`);
  }

  /**
   * Delete a single performance log by ID
   * 删除单条性能日志
   *
   * @param {string} logId - Log ID (UUID)
   * @returns {Promise<Object>} Delete result
   */
  async deletePerformanceLog(logId) {
    return await apiService.delete(`${API_PREFIX}/v1/logging/performance/${logId}`);
  }

  /**
   * Delete performance logs matching a message pattern
   * 删除匹配指定消息的性能日志
   *
   * @param {string} message - Message pattern to match
   * @returns {Promise<Object>} Delete result with count
   */
  async deletePerformanceLogsByMessage(message) {
    const encodedMessage = encodeURIComponent(message);
    return await apiService.delete(`${API_PREFIX}/v1/logging/performance/by-message?message=${encodedMessage}`);
  }

  /**
   * Delete a single error log by ID
   * 删除单条异常日志
   *
   * @param {string} logId - Log ID (UUID)
   * @returns {Promise<Object>} Delete result
   */
  async deleteErrorLog(logId) {
    return await apiService.delete(`${API_PREFIX}/v1/logging/errors/${logId}`);
  }

  /**
   * Delete error logs matching a message pattern
   * 删除匹配指定消息的异常日志
   *
   * @param {string} message - Message pattern to match
   * @returns {Promise<Object>} Delete result with count
   */
  async deleteErrorLogsByMessage(message) {
    const encodedMessage = encodeURIComponent(message);
    return await apiService.delete(`${API_PREFIX}/v1/logging/errors/by-message?message=${encodedMessage}`);
  }

  /**
   * Delete all logs from all tables
   * 清理所有日志（危险操作）
   *
   * @returns {Promise<Object>} Delete result with counts per table
   */
  async deleteAllLogs() {
    return await apiService.delete(`${API_PREFIX}/v1/logging/all`);
  }
}

export default new LogsService();
