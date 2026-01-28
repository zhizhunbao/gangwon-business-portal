/**
 * System Logs Module Export
 * 系统日志监控模块 - 可插拔设计
 * 
 * 功能: 概览 | 应用日志 | 异常 | 性能 | 审计
 * 
 * 迁移步骤:
 *   1. 复制整个 system-logs 文件夹到新项目
 *   2. 修改 adapter.js 中的 import 路径
 *   3. 注册 i18n (导入 locales 目录下的文件)
 *   4. 添加路由
 * 
 * 使用方式:
 *   import { SystemLogsDashboard } from '@/modules/system-logs';
 */

// 组件导出
export { default as SystemLogsDashboard } from './SystemLogsDashboard';
export { default as LogViewer } from './LogViewer';
export { default as ExceptionViewer } from './ExceptionViewer';
export { default as PerformanceViewer } from './PerformanceViewer';
export { default as AuditLogViewer } from './AuditLogViewer';

// 配置导出
export { 
  moduleConfig,
  I18N_NAMESPACE,
  createTranslator,
} from './adapter';
