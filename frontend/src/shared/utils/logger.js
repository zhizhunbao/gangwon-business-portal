/**
 * Logger Module - 前端日志系统入口
 *
 * 统一导出所有日志相关功能，提供便捷的使用接口。
 */

// 导出核心模块
export {
  LoggerCore,
  loggerCore,
  LOG_LEVELS,
  LOG_LAYERS,
  debug,
  info,
  warn,
  error,
  critical,
} from "./logger.core.js";

// 导出上下文管理器
export {
  ContextManager,
  contextManager,
  getTraceId,
  generateRequestId,
  getCurrentRequestId,
  setUserId,
  getUserId,
  getContext,
} from "./logger.context.js";

// 导出去重器
export {
  Deduplicator,
  deduplicator,
  shouldLog,
  cleanup,
} from "./logger.dedup.js";

// 导出传输管理器
export {
  LogTransport,
  logTransport,
  enqueue,
  flush,
} from "./logger.transport.js";

// 默认导出日志核心
export { loggerCore as default, loggerCore as logger } from "./logger.core.js";
