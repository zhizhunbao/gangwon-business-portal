/**
 * Logger Context Manager - 日志上下文管理器
 * 
 * 管理日志追踪上下文，包括：
 * - traceId 生成（UUID v4 格式）
 * - requestId 生成（{traceId}-{sequence} 格式）
 * - userId 管理
 * 
 * Requirements: 2.1, 2.2
 */

/**
 * 生成 UUID v4
 * @returns {string} UUID v4 格式的字符串
 */
function generateUUIDv4() {
  // 使用 crypto API（如果可用）
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 回退到传统方法
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 验证 UUID v4 格式
 * @param {string} uuid - UUID 字符串
 * @returns {boolean} 是否是有效的 UUID v4
 */
function isValidUUIDv4(uuid) {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
}

/**
 * 上下文管理器类
 */
export class ContextManager {
  constructor() {
    // 初始化 traceId（会话级别）
    this._traceId = this._initializeTraceId();
    
    // 请求序列号（用于生成 requestId）
    this._requestSequence = 0;
    
    // 当前 requestId（用于追踪当前请求）
    this._currentRequestId = null;
    
    // 用户 ID
    this._userId = null;
    
    // 从 localStorage 恢复 userId（如果存在）
    this._restoreUserId();
  }
  
  /**
   * 初始化 traceId
   * @private
   * @returns {string} traceId
   */
  _initializeTraceId() {
    // 尝试从 sessionStorage 获取现有的 traceId
    try {
      const storedTraceId = sessionStorage.getItem('log_trace_id');
      if (storedTraceId && isValidUUIDv4(storedTraceId)) {
        return storedTraceId;
      }
    } catch (error) {
      // sessionStorage 不可用，继续生成新的
      console.warn('Failed to access sessionStorage:', error);
    }
    
    // 生成新的 traceId
    const newTraceId = generateUUIDv4();
    
    // 保存到 sessionStorage
    try {
      sessionStorage.setItem('log_trace_id', newTraceId);
    } catch (error) {
      console.warn('Failed to save traceId to sessionStorage:', error);
    }
    
    return newTraceId;
  }
  
  /**
   * 从 localStorage 恢复 userId
   * @private
   */
  _restoreUserId() {
    try {
      const storedUserId = localStorage.getItem('log_user_id');
      if (storedUserId) {
        this._userId = storedUserId;
      }
    } catch (error) {
      console.warn('Failed to restore userId from localStorage:', error);
    }
  }
  
  /**
   * 获取 traceId
   * @returns {string} traceId
   */
  getTraceId() {
    return this._traceId;
  }
  
  /**
   * 重置 traceId（用于新会话）
   * @returns {string} 新的 traceId
   */
  resetTraceId() {
    this._traceId = generateUUIDv4();
    this._requestSequence = 0;
    this._currentRequestId = null;
    
    // 保存到 sessionStorage
    try {
      sessionStorage.setItem('log_trace_id', this._traceId);
    } catch (error) {
      console.warn('Failed to save new traceId to sessionStorage:', error);
    }
    
    return this._traceId;
  }
  
  /**
   * 生成新的 requestId
   * @returns {string} requestId in format {traceId}-{sequence} (e.g., "550e8400-e29b-41d4-a716-446655440000-001")
   */
  generateRequestId() {
    this._requestSequence += 1;
    // 格式化序列号为3位数字，不足补0
    const sequence = String(this._requestSequence).padStart(3, '0');
    const requestId = `${this._traceId}-${sequence}`;
    this._currentRequestId = requestId;
    return requestId;
  }
  
  /**
   * 获取当前 requestId
   * @returns {string|null} 当前的 requestId，如果没有则返回 null
   */
  getCurrentRequestId() {
    return this._currentRequestId;
  }
  
  /**
   * 设置当前 requestId（用于从服务器响应中恢复）
   * @param {string} requestId - requestId
   */
  setCurrentRequestId(requestId) {
    this._currentRequestId = requestId;
  }
  
  /**
   * 清除当前 requestId
   */
  clearCurrentRequestId() {
    this._currentRequestId = null;
  }
  
  /**
   * 设置 userId
   * @param {string} userId - 用户 ID
   */
  setUserId(userId) {
    this._userId = userId;
    
    // 保存到 localStorage
    try {
      if (userId) {
        localStorage.setItem('log_user_id', userId);
      } else {
        localStorage.removeItem('log_user_id');
      }
    } catch (error) {
      console.warn('Failed to save userId to localStorage:', error);
    }
  }
  
  /**
   * 获取 userId
   * @returns {string|null} userId
   */
  getUserId() {
    return this._userId;
  }
  
  /**
   * 清除 userId
   */
  clearUserId() {
    this._userId = null;
    
    try {
      localStorage.removeItem('log_user_id');
    } catch (error) {
      console.warn('Failed to remove userId from localStorage:', error);
    }
  }
  
  /**
   * 获取完整的上下文信息
   * @returns {Object} 上下文对象
   */
  getContext() {
    return {
      traceId: this._traceId,
      requestSequence: this._requestSequence,
      currentRequestId: this._currentRequestId,
      userId: this._userId
    };
  }
  
  /**
   * 重置所有上下文（用于登出等场景）
   */
  reset() {
    this.resetTraceId();
    this.clearUserId();
  }
}

// 创建全局上下文管理器实例
export const contextManager = new ContextManager();

// 导出便捷函数
export const getTraceId = () => contextManager.getTraceId();
export const generateRequestId = () => contextManager.generateRequestId();
export const getCurrentRequestId = () => contextManager.getCurrentRequestId();
export const setUserId = (userId) => contextManager.setUserId(userId);
export const getUserId = () => contextManager.getUserId();
export const getContext = () => contextManager.getContext();

export default contextManager;