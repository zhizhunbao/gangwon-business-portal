/**
 * System Logs Module Adapter
 * 模块适配器 - 迁移到其他项目时只需修改此文件
 * 
 * 使用方式:
 *   1. 复制整个 system-logs 文件夹到新项目
 *   2. 修改此文件中的 import 路径，适配新项目的组件和服务
 *   3. 注册 i18n (导入 locales 目录下的文件)
 *   4. 添加路由
 */

// ============================================================
// UI 组件适配
// 迁移时修改这些 import 路径指向新项目的组件库
// ============================================================

export { Loading, Button, Select, Card, Badge } from '@shared/components';

// 如果新项目没有这些组件，可以使用内置的简单实现：
// export { Loading, Button, Select, Card, Badge } from './components/ui';


// ============================================================
// 服务适配
// 迁移时修改这些 import 路径指向新项目的 API 服务
// ============================================================

export { logsService, adminService } from '@shared/services';

// 如果新项目的 API 结构不同，可以创建适配层：
// import { api } from '@/services/api';
// export const logsService = createLogsServiceAdapter(api);


// ============================================================
// 工具函数适配
// ============================================================

export { formatDateTime } from '@shared/utils';

// 如果新项目没有这个函数，可以使用内置实现：
// export function formatDateTime(dateStr, format = 'yyyy-MM-dd HH:mm:ss', locale = 'zh') {
//   if (!dateStr) return '';
//   const date = new Date(dateStr);
//   return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'ko-KR');
// }


// ============================================================
// i18n 适配
// ============================================================

export { useTranslation } from 'react-i18next';

// i18n 命名空间前缀
export const I18N_NAMESPACE = 'admin.systemLogs';

// 创建翻译辅助函数
export function createTranslator(t) {
  return (key, options) => t(`${I18N_NAMESPACE}.${key}`, options);
}


// ============================================================
// 配置
// ============================================================

export const moduleConfig = {
  // API 端点前缀
  apiPrefix: '/api',
  
  // 功能开关
  features: {
    healthCheck: true,
    databaseMetrics: true,
    renderStatus: true,
    auditLogs: true,
    performanceLogs: true,
    exceptionLogs: true,
  },
  
  // 刷新间隔 (ms)
  refreshInterval: 30000,
  
  // 分页
  defaultPageSize: 50,
  
  // 阈值
  thresholds: {
    slowRequest: 500,
    verySlowRequest: 1000,
    criticalRequest: 3000,
    dbResponseWarning: 100,
  },
};


// ============================================================
// 类型定义 (供 TypeScript 项目参考)
// ============================================================

/**
 * @typedef {Object} LogItem
 * @property {string} id
 * @property {string} level - DEBUG | INFO | WARNING | ERROR | CRITICAL
 * @property {string} message
 * @property {string} [layer]
 * @property {string} [module]
 * @property {string} [traceId]
 * @property {string} [userId]
 * @property {number} [durationMs]
 * @property {Object} [extraData]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} HealthData
 * @property {string} status - healthy | degraded | unhealthy
 * @property {string} timestamp
 * @property {Object} services
 * @property {Object} [render]
 */

/**
 * @typedef {Object} LogsService
 * @property {function} listLogs
 * @property {function} getLogStats
 * @property {function} getRecentErrors
 * @property {function} getSlowRequests
 * @property {function} getSecurityIssues
 * @property {function} getSystemHealth
 * @property {function} getDatabaseMetrics
 * @property {function} getRenderStatus
 */
