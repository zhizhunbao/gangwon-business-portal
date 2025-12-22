/**
 * Logger Transport Module - 日志传输模块
 * 
 * 负责将日志批量上报到后端：
 * - 批量上报（优化配置避免循环）
 * - 失败重试（减少重试次数）
 * - 敏感信息过滤
 * - 智能队列管理
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */

import { LOGGING_CONFIG } from '@shared/config/logging.config';

/**
 * 过滤敏感信息
 * @param {Object} data - 要过滤的数据
 * @returns {Object} 过滤后的数据
 */
function filterSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // 使用配置中的敏感字段列表
  const sensitiveFields = LOGGING_CONFIG.sensitiveFiltering.fields;
  
  const filtered = Array.isArray(data) ? [] : {};
  
  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    
    // 检查是否是敏感字段
    if (sensitiveFields.some(sensitive => keyLower.includes(sensitive))) {
      filtered[key] = '[FILTERED]';
    } else if (value && typeof value === 'object') {
      // 递归过滤嵌套对象
      filtered[key] = filterSensitiveData(value);
    } else {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

/**
 * 传输管理器类
 */
export class LogTransport {
  constructor(config = {}) {
    // 使用统一配置，允许覆盖
    const defaultConfig = LOGGING_CONFIG.transport;
    
    this.config = {
      endpoint: config.endpoint || '/api/v1/logging/frontend/logs',
      batchSize: config.batchSize || defaultConfig.batchSize,
      batchInterval: config.batchInterval || defaultConfig.batchInterval,
      maxRetries: config.maxRetries || defaultConfig.maxRetries,
      retryDelays: config.retryDelays || defaultConfig.retryDelays,
      enableSensitiveFiltering: config.enableSensitiveFiltering !== false,
      maxQueueSize: config.maxQueueSize || defaultConfig.maxQueueSize,
      requestTimeout: config.requestTimeout || defaultConfig.requestTimeout,
      ...config
    };
    
    // 日志队列
    this._queue = [];
    
    // 批处理定时器
    this._batchTimer = null;
    
    // 重试队列
    this._retryQueue = [];
    
    // 统计信息
    this._stats = {
      totalEnqueued: 0,
      totalSent: 0,
      totalFailed: 0,
      totalRetries: 0,
      batchesSent: 0,
      droppedLogs: 0
    };
    
    // 启动批处理定时器
    this._startBatchTimer();
  }
  
  /**
   * 启动批处理定时器
   * @private
   */
  _startBatchTimer() {
    if (this._batchTimer) {
      clearInterval(this._batchTimer);
    }
    
    this._batchTimer = setInterval(() => {
      if (this._queue.length > 0) {
        this._processBatch();
      }
    }, this.config.batchInterval);
  }
  
  /**
   * 入队日志条目
   * @param {Object} logEntry - 日志条目
   */
  enqueue(logEntry) {
    // 检查队列大小限制，防止内存泄漏
    if (this._queue.length >= this.config.maxQueueSize) {
      // 丢弃最旧的日志
      this._queue.shift();
      this._stats.droppedLogs++;
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[LogTransport] Queue full, dropping oldest log');
      }
    }
    
    // 过滤敏感信息
    const filteredEntry = this.config.enableSensitiveFiltering 
      ? filterSensitiveData(logEntry) 
      : logEntry;
    
    // 添加到队列
    this._queue.push(filteredEntry);
    this._stats.totalEnqueued++;
    
    // 检查是否达到批处理大小
    if (this._queue.length >= this.config.batchSize) {
      this._processBatch();
    }
  }
  
  /**
   * 处理批次
   * @private
   */
  async _processBatch() {
    if (this._queue.length === 0) {
      return;
    }
    
    // 取出当前队列中的所有日志
    const batch = this._queue.splice(0, this.config.batchSize);
    
    try {
      await this._sendBatch(batch);
      this._stats.totalSent += batch.length;
      this._stats.batchesSent++;
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[LogTransport] Sent batch of ${batch.length} logs`);
      }
    } catch (error) {
      console.warn('[LogTransport] Failed to send batch:', error);
      
      // 添加到重试队列
      this._retryQueue.push({
        batch,
        retryCount: 0,
        lastError: error
      });
      
      // 处理重试
      this._processRetries();
    }
  }
  
  /**
   * 发送批次到后端
   * @private
   * @param {Array} batch - 日志批次
   * @returns {Promise} 发送结果
   */
  async _sendBatch(batch) {
    // 映射前端日志字段到后端期望的字段名
    const mappedBatch = batch.map(logEntry => ({
      level: logEntry.level,
      message: logEntry.message,
      layer: logEntry.layer,
      module: logEntry.file, // 映射 file -> module
      function: logEntry.function,
      line_number: logEntry.line, // 映射 line -> line_number
      trace_id: logEntry.trace_id,
      user_id: logEntry.user_id,
      ip_address: logEntry.ip_address,
      user_agent: logEntry.user_agent,
      request_method: logEntry.request_method,
      request_path: logEntry.request_path,
      request_data: logEntry.request_data,
      response_status: logEntry.response_status,
      duration_ms: logEntry.duration_ms,
      extra_data: logEntry.extra_data
    }));

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs: mappedBatch,
        timestamp: new Date().toISOString(),
        batch_size: mappedBatch.length
      }),
      // 添加超时控制，避免长时间等待
      signal: AbortSignal.timeout(this.config.requestTimeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * 处理重试
   * @private
   */
  async _processRetries() {
    const retryItems = [...this._retryQueue];
    this._retryQueue = [];
    
    for (const item of retryItems) {
      if (item.retryCount >= this.config.maxRetries) {
        // 超过最大重试次数，放弃
        this._stats.totalFailed += item.batch.length;
        console.error('[LogTransport] Max retries exceeded, dropping batch:', item.lastError);
        continue;
      }
      
      // 计算延迟时间
      const delay = this.config.retryDelays[item.retryCount] || this.config.retryDelays[this.config.retryDelays.length - 1];
      
      // 延迟后重试
      setTimeout(async () => {
        try {
          await this._sendBatch(item.batch);
          this._stats.totalSent += item.batch.length;
          this._stats.totalRetries++;
          this._stats.batchesSent++;
          
          if (process.env.NODE_ENV === 'development') {
            console.debug(`[LogTransport] Retry ${item.retryCount + 1} succeeded for batch of ${item.batch.length} logs`);
          }
        } catch (error) {
          console.warn(`[LogTransport] Retry ${item.retryCount + 1} failed:`, error);
          
          // 增加重试次数并重新入队
          item.retryCount++;
          item.lastError = error;
          this._retryQueue.push(item);
          
          // 如果还有重试机会，继续处理
          if (item.retryCount < this.config.maxRetries) {
            this._processRetries();
          }
        }
      }, delay);
    }
  }
  
  /**
   * 立即刷新所有待发送的日志
   * @returns {Promise} 刷新结果
   */
  async flush() {
    // 处理当前队列
    if (this._queue.length > 0) {
      await this._processBatch();
    }
    
    // 等待所有重试完成
    while (this._retryQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  /**
   * 关闭传输器
   * @returns {Promise} 关闭结果
   */
  async close() {
    // 清除定时器
    if (this._batchTimer) {
      clearInterval(this._batchTimer);
      this._batchTimer = null;
    }
    
    // 刷新剩余日志
    await this.flush();
  }
  
  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 如果批处理间隔改变，重启定时器
    if (newConfig.batchInterval !== undefined) {
      this._startBatchTimer();
    }
  }
  
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this._stats,
      queueSize: this._queue.length,
      retryQueueSize: this._retryQueue.length,
      config: { ...this.config }
    };
  }
  
  /**
   * 清空队列
   */
  clear() {
    this._queue = [];
    this._retryQueue = [];
  }
  
  /**
   * 重置统计信息
   */
  resetStats() {
    this._stats = {
      totalEnqueued: 0,
      totalSent: 0,
      totalFailed: 0,
      totalRetries: 0,
      batchesSent: 0,
      droppedLogs: 0
    };
  }
}

// 创建全局传输管理器实例
export const logTransport = new LogTransport();

// 导出便捷函数
export const enqueue = (logEntry) => logTransport.enqueue(logEntry);
export const flush = () => logTransport.flush();

export default logTransport;