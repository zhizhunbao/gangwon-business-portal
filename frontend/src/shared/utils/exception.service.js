/**
 * Frontend Exception Service - 前端异常上报服务
 * 
 * 实现异常批量上报、集成日志系统、支持异常重试机制和异常去重
 * Requirements: 12.1, 12.2, 12.3
 */

import { frontendExceptionHandler } from './exception.handler.js';

/**
 * 异常上报配置
 */
const DEFAULT_CONFIG = {
  // 批量上报配置
  batchSize: 10,           // 批量大小
  batchInterval: 5000,     // 批量间隔（毫秒）
  maxQueueSize: 1000,      // 最大队列大小
  
  // 重试配置
  maxRetries: 3,           // 最大重试次数
  retryDelays: [1000, 2000, 4000], // 重试延迟（指数退避）
  
  // 去重配置
  deduplicationWindow: 10000, // 去重时间窗口（毫秒）
  
  // 上报端点
  endpoint: '/api/v1/exceptions/frontend',
  
  // 过滤配置
  enableFiltering: true,
  maxStackLength: 5000,    // 最大堆栈长度
  
  // 性能配置
  enablePerformanceTracking: true
};

/**
 * 异常去重器
 */
class ExceptionDeduplicator {
  constructor(windowMs = 10000) {
    this.windowMs = windowMs;
    this.recentExceptions = new Map();
    
    // 定期清理过期记录
    setInterval(() => this._cleanup(), windowMs);
  }
  
  /**
   * 检查异常是否重复
   * @param {Object} exceptionRecord - 异常记录
   * @returns {boolean} 是否重复
   */
  isDuplicate(exceptionRecord) {
    const key = this._generateKey(exceptionRecord);
    const now = Date.now();
    
    if (this.recentExceptions.has(key)) {
      const lastSeen = this.recentExceptions.get(key);
      if (now - lastSeen < this.windowMs) {
        // 更新最后见到的时间
        this.recentExceptions.set(key, now);
        return true;
      }
    }
    
    // 记录新异常
    this.recentExceptions.set(key, now);
    return false;
  }
  
  /**
   * 生成异常唯一键
   * @private
   */
  _generateKey(exceptionRecord) {
    const { error, context } = exceptionRecord;
    
    // 基于错误类型、消息和URL生成键
    const keyParts = [
      error.name || 'Unknown',
      error.message || 'Unknown',
      context.url || 'Unknown'
    ];
    
    // 如果有堆栈信息，使用堆栈的前几行
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 3);
      keyParts.push(stackLines.join('|'));
    }
    
    return keyParts.join('::');
  }
  
  /**
   * 清理过期记录
   * @private
   */
  _cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, timestamp] of this.recentExceptions.entries()) {
      if (now - timestamp > this.windowMs) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.recentExceptions.delete(key));
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalTracked: this.recentExceptions.size,
      windowMs: this.windowMs
    };
  }
}

/**
 * 异常批量上报器
 */
class ExceptionBatchReporter {
  constructor(config) {
    this.config = config;
    this.queue = [];
    this.isProcessing = false;
    this.stats = {
      totalQueued: 0,
      totalSent: 0,
      totalFailed: 0,
      lastBatchTime: null
    };
    
    // 启动批量处理定时器
    this._startBatchTimer();
  }
  
  /**
   * 添加异常到队列
   * @param {Object} exceptionRecord - 异常记录
   */
  enqueue(exceptionRecord) {
    // 检查队列大小
    if (this.queue.length >= this.config.maxQueueSize) {
      console.warn('Exception queue is full, dropping oldest exception');
      this.queue.shift();
    }
    
    this.queue.push({
      ...exceptionRecord,
      queuedAt: Date.now()
    });
    
    this.stats.totalQueued++;
    
    // 如果达到批量大小，立即处理
    if (this.queue.length >= this.config.batchSize) {
      this._processBatch();
    }
  }
  
  /**
   * 启动批量处理定时器
   * @private
   */
  _startBatchTimer() {
    setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        this._processBatch();
      }
    }, this.config.batchInterval);
  }
  
  /**
   * 处理批量异常
   * @private
   */
  async _processBatch() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // 取出当前批次
      const batch = this.queue.splice(0, this.config.batchSize);
      
      // 发送批次
      await this._sendBatch(batch);
      
      this.stats.totalSent += batch.length;
      this.stats.lastBatchTime = new Date().toISOString();
      
    } catch (error) {
      console.error('Failed to process exception batch:', error);
      this.stats.totalFailed += this.queue.length;
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * 发送批量异常
   * @private
   */
  async _sendBatch(batch, retryCount = 0) {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          exceptions: batch,
          metadata: {
            batchSize: batch.length,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      // 重试逻辑
      if (retryCount < this.config.maxRetries) {
        const delay = this.config.retryDelays[retryCount] || 1000;
        
        console.warn(`Exception batch send failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._sendBatch(batch, retryCount + 1);
      }
      
      // 重试次数用尽，记录失败
      console.error('Exception batch send failed after all retries:', error);
      throw error;
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.queue.length,
      isProcessing: this.isProcessing
    };
  }
  
  /**
   * 强制刷新队列
   */
  async flush() {
    if (this.queue.length > 0) {
      await this._processBatch();
    }
  }
}

/**
 * 异常过滤器
 */
class ExceptionFilter {
  constructor(config) {
    this.config = config;
    
    // 默认过滤规则
    this.filterRules = [
      // 过滤脚本错误
      {
        name: 'script-error',
        test: (record) => record.error.message === 'Script error.',
        action: 'drop'
      },
      
      // 过滤网络错误（可配置）
      {
        name: 'network-error',
        test: (record) => record.classification.category === 'NETWORK',
        action: 'throttle',
        throttleRate: 0.1 // 只保留 10%
      },
      
      // 过滤低影响异常
      {
        name: 'low-impact',
        test: (record) => record.classification.userImpact === 'LOW',
        action: 'throttle',
        throttleRate: 0.2 // 只保留 20%
      }
    ];
  }
  
  /**
   * 过滤异常记录
   * @param {Object} exceptionRecord - 异常记录
   * @returns {boolean} 是否应该保留
   */
  shouldKeep(exceptionRecord) {
    if (!this.config.enableFiltering) {
      return true;
    }
    
    for (const rule of this.filterRules) {
      if (rule.test(exceptionRecord)) {
        switch (rule.action) {
          case 'drop':
            return false;
          case 'throttle':
            return Math.random() < (rule.throttleRate || 0.1);
          default:
            break;
        }
      }
    }
    
    return true;
  }
  
  /**
   * 清理异常记录
   * @param {Object} exceptionRecord - 异常记录
   * @returns {Object} 清理后的记录
   */
  sanitize(exceptionRecord) {
    const sanitized = { ...exceptionRecord };
    
    // 限制堆栈长度
    if (sanitized.error.stack && sanitized.error.stack.length > this.config.maxStackLength) {
      sanitized.error.stack = sanitized.error.stack.substring(0, this.config.maxStackLength) + '... [truncated]';
    }
    
    // 移除敏感信息
    if (sanitized.context) {
      // 移除可能包含敏感信息的字段
      delete sanitized.context.localStorage;
      delete sanitized.context.sessionStorage;
      delete sanitized.context.cookies;
    }
    
    return sanitized;
  }
}

/**
 * 前端异常服务主类
 */
export class FrontendExceptionService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // 初始化组件
    this.handler = frontendExceptionHandler;
    this.deduplicator = new ExceptionDeduplicator(this.config.deduplicationWindow);
    this.batchReporter = new ExceptionBatchReporter(this.config);
    this.filter = new ExceptionFilter(this.config);
    
    // 性能跟踪
    this.performanceStats = {
      totalProcessed: 0,
      totalReported: 0,
      totalFiltered: 0,
      totalDuplicated: 0,
      averageProcessingTime: 0
    };
    
    // 集成日志系统
    this._integrateWithLogger();
  }
  
  /**
   * 报告异常
   * @param {Error} error - 异常对象
   * @param {Object} additionalContext - 额外上下文
   */
  async reportException(error, additionalContext = {}) {
    const startTime = performance.now();
    
    try {
      // 处理异常，获取异常记录
      const exceptionRecord = this.handler.handle(error, additionalContext);
      
      this.performanceStats.totalProcessed++;
      
      // 检查是否重复
      if (this.deduplicator.isDuplicate(exceptionRecord)) {
        this.performanceStats.totalDuplicated++;
        return { status: 'duplicate', id: exceptionRecord.id };
      }
      
      // 过滤异常
      if (!this.filter.shouldKeep(exceptionRecord)) {
        this.performanceStats.totalFiltered++;
        return { status: 'filtered', id: exceptionRecord.id };
      }
      
      // 清理异常记录
      const sanitizedRecord = this.filter.sanitize(exceptionRecord);
      
      // 添加到上报队列
      this.batchReporter.enqueue(sanitizedRecord);
      
      this.performanceStats.totalReported++;
      
      // 更新性能统计
      const processingTime = performance.now() - startTime;
      this._updateAverageProcessingTime(processingTime);
      
      return { status: 'queued', id: exceptionRecord.id };
      
    } catch (serviceError) {
      console.error('Exception service failed:', serviceError);
      return { status: 'error', error: serviceError.message };
    }
  }
  
  /**
   * 集成日志系统
   * @private
   */
  _integrateWithLogger() {
    // 如果存在日志系统，集成异常报告
    if (window.logger) {
      const originalReportException = this.reportException.bind(this);
      
      this.reportException = async (error, additionalContext = {}) => {
        // 先通过日志系统记录
        try {
          window.logger.error('Exception occurred', {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            },
            context: additionalContext
          });
        } catch (logError) {
          console.warn('Failed to log exception:', logError);
        }
        
        // 然后通过异常服务处理
        return originalReportException(error, additionalContext);
      };
    }
  }
  
  /**
   * 更新平均处理时间
   * @private
   */
  _updateAverageProcessingTime(newTime) {
    const total = this.performanceStats.totalProcessed;
    const currentAvg = this.performanceStats.averageProcessingTime;
    
    this.performanceStats.averageProcessingTime = 
      (currentAvg * (total - 1) + newTime) / total;
  }
  
  /**
   * 获取服务统计信息
   */
  getStats() {
    return {
      performance: this.performanceStats,
      deduplication: this.deduplicator.getStats(),
      batchReporter: this.batchReporter.getStats(),
      config: {
        batchSize: this.config.batchSize,
        batchInterval: this.config.batchInterval,
        deduplicationWindow: this.config.deduplicationWindow
      }
    };
  }
  
  /**
   * 强制刷新所有待处理的异常
   */
  async flush() {
    await this.batchReporter.flush();
  }
  
  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 重新初始化需要配置的组件
    if (newConfig.deduplicationWindow) {
      this.deduplicator = new ExceptionDeduplicator(newConfig.deduplicationWindow);
    }
  }
}

// 导出单例实例
export const frontendExceptionService = new FrontendExceptionService();

// 默认导出
export default frontendExceptionService;