/**
 * Logger Deduplication Module - 日志去重模块
 * 
 * 防止短时间内重复记录相同日志：
 * - 10 秒时间窗口内相同日志不重复记录
 * - 定期清理过期记录
 * 
 * Requirements: 5.4
 */

/**
 * 生成日志条目的唯一键
 * @param {Object} logEntry - 日志条目
 * @returns {string} 唯一键
 */
function generateLogKey(logEntry) {
  // 使用关键字段生成唯一键
  // 不包括 created_at 和 request_id，因为这些字段每次都不同
  const keyParts = [
    logEntry.level,
    logEntry.layer,
    logEntry.message,
    logEntry.file,
    logEntry.function,
    // 如果有 extra_data，也包含在键中
    logEntry.extra_data ? JSON.stringify(logEntry.extra_data) : ''
  ];
  
  return keyParts.join('|');
}

/**
 * 去重器类
 */
export class Deduplicator {
  constructor(config = {}) {
    // 时间窗口（毫秒），默认 10 秒
    this.windowMs = config.windowMs || 10000;
    
    // 存储最近的日志记录
    // Map<logKey, timestamp>
    this._recentLogs = new Map();
    
    // 清理间隔（毫秒），默认每 30 秒清理一次
    this._cleanupInterval = config.cleanupInterval || 30000;
    
    // 启动定期清理
    this._startCleanupTimer();
  }
  
  /**
   * 启动定期清理定时器
   * @private
   */
  _startCleanupTimer() {
    // 清除现有定时器
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
    }
    
    // 启动新定时器
    this._cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this._cleanupInterval);
  }
  
  /**
   * 检查是否应该记录日志
   * @param {Object} logEntry - 日志条目
   * @returns {boolean} 是否应该记录
   */
  shouldLog(logEntry) {
    const logKey = generateLogKey(logEntry);
    const now = Date.now();
    
    // 检查是否在时间窗口内已经记录过
    if (this._recentLogs.has(logKey)) {
      const lastTimestamp = this._recentLogs.get(logKey);
      const timeDiff = now - lastTimestamp;
      
      // 如果在时间窗口内，不记录
      if (timeDiff < this.windowMs) {
        return false;
      }
    }
    
    // 记录当前时间戳
    this._recentLogs.set(logKey, now);
    
    return true;
  }
  
  /**
   * 清理过期的日志记录
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    // 找出所有过期的键
    for (const [key, timestamp] of this._recentLogs.entries()) {
      if (now - timestamp >= this.windowMs) {
        expiredKeys.push(key);
      }
    }
    
    // 删除过期的键
    for (const key of expiredKeys) {
      this._recentLogs.delete(key);
    }
    
    // 如果在开发环境，输出清理信息
    if (process.env.NODE_ENV === 'development' && expiredKeys.length > 0) {
      console.debug(`[Deduplicator] Cleaned up ${expiredKeys.length} expired log entries`);
    }
  }
  
  /**
   * 获取当前缓存的日志数量
   * @returns {number} 缓存的日志数量
   */
  getCacheSize() {
    return this._recentLogs.size;
  }
  
  /**
   * 清空所有缓存
   */
  clear() {
    this._recentLogs.clear();
  }
  
  /**
   * 停止去重器（清理定时器）
   */
  stop() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
  
  /**
   * 重启去重器
   */
  restart() {
    this.stop();
    this._startCleanupTimer();
  }
  
  /**
   * 更新配置
   * @param {Object} config - 新配置
   */
  updateConfig(config) {
    if (config.windowMs !== undefined) {
      this.windowMs = config.windowMs;
    }
    
    if (config.cleanupInterval !== undefined) {
      this._cleanupInterval = config.cleanupInterval;
      this.restart();
    }
  }
  
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      cacheSize: this._recentLogs.size,
      windowMs: this.windowMs,
      cleanupInterval: this._cleanupInterval
    };
  }
}

// 创建全局去重器实例
export const deduplicator = new Deduplicator();

// 导出便捷函数
export const shouldLog = (logEntry) => deduplicator.shouldLog(logEntry);
export const cleanup = () => deduplicator.cleanup();

export default deduplicator;