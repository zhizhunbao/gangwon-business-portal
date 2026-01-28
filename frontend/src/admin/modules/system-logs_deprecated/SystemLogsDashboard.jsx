/**
 * System Logs Dashboard
 * 系统日志监控仪表盘 - 一眼抓住 Bug、性能、安全问题
 * 
 * Tabs: 概览 | 应用日志 | 异常 | 性能 | 审计
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation, Card, Loading, Button, logsService, createTranslator } from './adapter';
import { ConfirmModal } from '@shared/components';
import LogViewer from './LogViewer';
import ExceptionViewer from './ExceptionViewer';
import PerformanceViewer from './PerformanceViewer';
import AuditLogViewer from './AuditLogViewer';
import DatabaseMonitor from './DatabaseMonitor';
import ServerMonitor from './ServerMonitor';
import SystemLogViewer from './SystemLogViewer';

export default function SystemLogsDashboard() {
  const { t } = useTranslation();
  const tl = createTranslator(t);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [dbMetrics, setDbMetrics] = useState(null);
  const [renderStatus, setRenderStatus] = useState(null);
  const [errors, setErrors] = useState([]);
  const [slowRequests, setSlowRequests] = useState([]);
  const [securityIssues, setSecurityIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [clearAllModal, setClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const [logFilter, setLogFilter] = useState(null);
  const [exceptionFilter, setExceptionFilter] = useState(null);
  const [perfFilter, setPerfFilter] = useState(null);
  const [auditFilter, setAuditFilter] = useState(null);

  // Tab 配置
  const TABS = [
    { key: 'overview', label: tl('tabs.overview'), icon: '📊' },
    { key: 'logs', label: tl('tabs.logs'), icon: '📝' },
    { key: 'exceptions', label: tl('tabs.exceptions'), icon: '🐛' },
    { key: 'performance', label: tl('tabs.performance'), icon: '⚡' },
    { key: 'audit', label: tl('tabs.audit'), icon: '📋' },
    { key: 'system', label: tl('tabs.system'), icon: '🔧' },
    { key: 'database', label: tl('tabs.database'), icon: '🗄️' },
    { key: 'server', label: tl('tabs.server'), icon: '🖥️' },
  ];

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [statsData, healthResult, dbResult, renderResult, errorsData, perfData, securityData] = await Promise.all([
        logsService.getLogStats().catch(() => null),
        logsService.getSystemHealth().catch(() => null),
        logsService.getDatabaseMetrics().catch(() => null),
        logsService.getRenderStatus().catch(() => null),
        logsService.getRecentErrors({ limit: 5 }).catch(() => ({ items: [] })),
        logsService.getSlowRequests({ limit: 5 }).catch(() => ({ items: [] })),
        logsService.getSecurityIssues({ limit: 5 }).catch(() => ({ items: [] })),
      ]);
      
      setStats(statsData);
      setHealthData(healthResult);
      setDbMetrics(dbResult);
      setRenderStatus(renderResult);
      setErrors(errorsData?.items || []);
      setSlowRequests(perfData?.items || []);
      setSecurityIssues(securityData?.items || []);
    } catch (error) {
      console.error('[SystemLogs] Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboardData]);

  const goToExceptions = (filter) => { setExceptionFilter(filter); setActiveTab('exceptions'); };
  const goToPerformance = (filter) => { setPerfFilter(filter); setActiveTab('performance'); };
  const goToLogs = (filter) => { setLogFilter(filter); setActiveTab('logs'); };
  const goToAudit = (filter) => { setAuditFilter(filter); setActiveTab('audit'); };
  const goToSystem = () => setActiveTab('system');
  const goToDatabase = () => setActiveTab('database');
  const goToServer = () => setActiveTab('server');

  const handleClearAllLogs = async () => {
    setClearingAll(true);
    try {
      await logsService.deleteAllLogs();
      setClearAllModal(false);
      setRefreshKey(k => k + 1);
      loadDashboardData();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    } finally {
      setClearingAll(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{tl('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{tl('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            {tl('autoRefresh')}
          </label>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            {tl('refresh')}
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => setClearAllModal(true)}
          >
            🗑️ {tl('actions.clearAllLogs')}
          </Button>
        </div>
      </div>

      {/* 清理所有日志确认弹窗 */}
      <ConfirmModal
        isOpen={clearAllModal}
        onClose={() => setClearAllModal(false)}
        onConfirm={handleClearAllLogs}
        title={tl('actions.clearAllLogs')}
        message={tl('actions.confirmClearAll')}
        confirmText={tl('actions.clearAllLogs')}
        loading={clearingAll}
      />

      {/* Tab 切换 */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'exceptions' && stats?.todayErrors > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {stats.todayErrors}
                </span>
              )}
              {tab.key === 'performance' && stats?.slowRequests > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded-full">
                  {stats.slowRequests}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'overview' && (
        <OverviewTab
          tl={tl}
          stats={stats}
          healthData={healthData}
          dbMetrics={dbMetrics}
          renderStatus={renderStatus}
          errors={errors}
          slowRequests={slowRequests}
          securityIssues={securityIssues}
          goToExceptions={goToExceptions}
          goToPerformance={goToPerformance}
          goToLogs={goToLogs}
          goToAudit={goToAudit}
          goToSystem={goToSystem}
          goToDatabase={goToDatabase}
          goToServer={goToServer}
        />
      )}
      {activeTab === 'logs' && <LogViewer key={refreshKey} initialFilter={logFilter} />}
      {activeTab === 'exceptions' && <ExceptionViewer key={refreshKey} initialFilter={exceptionFilter} />}
      {activeTab === 'performance' && <PerformanceViewer key={refreshKey} initialFilter={perfFilter} />}
      {activeTab === 'audit' && <AuditLogViewer key={refreshKey} initialFilter={auditFilter} />}
      {activeTab === 'system' && <SystemLogViewer key={refreshKey} />}
      {activeTab === 'database' && <DatabaseMonitor key={refreshKey} />}
      {activeTab === 'server' && <ServerMonitor key={refreshKey} />}
    </div>
  );
}

// 概览 Tab 内容
function OverviewTab({ tl, stats, healthData, dbMetrics, renderStatus, errors, slowRequests, securityIssues, goToExceptions, goToPerformance, goToLogs, goToAudit, goToSystem, goToDatabase, goToServer }) {
  // 获取服务状态
  const getServiceStatus = (serviceName) => {
    return healthData?.services?.[serviceName]?.status || 'unknown';
  };

  // 计算总体健康状态
  const overallHealth = healthData?.status || 'unknown';

  return (
    <div className="space-y-6">
      {/* 第一行：关键指标 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MiniStatCard
          title={tl('stats.todayErrors')}
          value={stats?.todayErrors || 0}
          icon="🐛"
          status={stats?.todayErrors > 0 ? 'danger' : 'good'}
          onClick={() => goToExceptions({})}
        />
        <MiniStatCard
          title={tl('stats.slowRequests')}
          value={stats?.slowRequests || 0}
          icon="🐢"
          status={stats?.slowRequests > 5 ? 'warning' : 'good'}
          onClick={() => goToPerformance({ minDuration: '500' })}
        />
        <MiniStatCard
          title={tl('stats.securityAlerts')}
          value={stats?.securityAlerts || 0}
          icon="🔒"
          status={stats?.securityAlerts > 0 ? 'warning' : 'good'}
          onClick={() => goToAudit({})}
        />
        <MiniStatCard
          title={tl('stats.todayRequests')}
          value={stats?.todayRequests?.toLocaleString() || 0}
          icon="📊"
          status="normal"
          onClick={() => goToLogs({})}
        />
        <MiniStatCard
          title={tl('stats.avgResponse')}
          value={`${stats?.avgResponseTime || 0}ms`}
          icon="⚡"
          status={stats?.avgResponseTime > 500 ? 'warning' : 'good'}
          onClick={() => goToPerformance({})}
        />
        <MiniStatCard
          title={tl('overview.dbResponse') || 'DB 响应'}
          value={dbMetrics?.responseTimeMs ? `${dbMetrics.responseTimeMs}ms` : '-'}
          icon="🗄️"
          status={dbMetrics?.responseTimeMs > 100 ? 'warning' : 'good'}
          onClick={goToDatabase}
        />
      </div>

      {/* 第二行：服务状态概览 + 数据库概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 服务状态 */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                🖥️ {tl('overview.serverStatus') || '服务状态'}
              </h3>
              <button onClick={goToServer} className="text-sm text-blue-600 hover:text-blue-800">
                {tl('issues.viewAll') || '查看详情'} →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ServiceStatusItem name={tl('health.api')} status={getServiceStatus('api')} tl={tl} />
              <ServiceStatusItem name={tl('health.database')} status={getServiceStatus('database')} tl={tl} />
              <ServiceStatusItem name={tl('health.cache')} status={getServiceStatus('cache')} tl={tl} />
              <ServiceStatusItem name={tl('health.storage')} status={getServiceStatus('storage')} tl={tl} />
            </div>
            {renderStatus && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">{tl('render.title')}</p>
                <div className="flex gap-4">
                  {renderStatus.backend && (
                    <div className="flex items-center gap-2">
                      <StatusDot status={renderStatus.backend.status} />
                      <span className="text-sm text-gray-700">{tl('render.backend')}</span>
                      {renderStatus.backend.responseTimeMs && (
                        <span className="text-xs text-gray-400">{renderStatus.backend.responseTimeMs}ms</span>
                      )}
                    </div>
                  )}
                  {renderStatus.frontend && (
                    <div className="flex items-center gap-2">
                      <StatusDot status={renderStatus.frontend.status} />
                      <span className="text-sm text-gray-700">{tl('render.frontend')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 数据库概览 */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                🗄️ {tl('overview.databaseStatus') || '数据库状态'}
              </h3>
              <button onClick={goToDatabase} className="text-sm text-blue-600 hover:text-blue-800">
                {tl('issues.viewAll') || '查看详情'} →
              </button>
            </div>
            {dbMetrics ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{tl('database.responseTime')}</p>
                  <p className={`text-xl font-bold ${dbMetrics.responseTimeMs > 100 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {dbMetrics.responseTimeMs || 0}ms
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{tl('database.size')}</p>
                  <p className="text-xl font-bold text-gray-900">{dbMetrics.sizeMB || 0} MB</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{tl('database.connections')}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {dbMetrics.connections?.active || 0} / {dbMetrics.connections?.total || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{tl('database.tables')}</p>
                  <p className="text-xl font-bold text-gray-900">{dbMetrics.tableCount || 0}</p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4">
                {tl('overview.noData') || '暂无数据'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 第三行：问题列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <IssueList
          title={`🐛 ${tl('issues.recentErrors')}`}
          issues={errors.map(e => ({
            severity: e.level === 'CRITICAL' ? 'critical' : 'high',
            message: e.message,
            source: `${e.module || 'unknown'}:${e.function || ''}`,
            time: formatTime(e.createdAt),
          }))}
          emptyText={tl('issues.noIssues')}
          onViewAll={() => goToExceptions({})}
          tl={tl}
        />
        <IssueList
          title={`🐢 ${tl('issues.slowRequests')}`}
          issues={slowRequests.map(r => ({
            severity: r.durationMs > 3000 ? 'critical' : r.durationMs > 1000 ? 'high' : 'medium',
            message: `${r.extraData?.request_method || 'GET'} ${r.extraData?.request_path || r.message}`,
            source: `${r.durationMs}ms`,
            time: formatTime(r.createdAt),
          }))}
          emptyText={tl('issues.noIssues')}
          onViewAll={() => goToPerformance({})}
          tl={tl}
        />
        <IssueList
          title={`🔒 ${tl('issues.securityAlerts')}`}
          issues={securityIssues.map(s => ({
            severity: s.level === 'CRITICAL' ? 'critical' : 'medium',
            message: s.message,
            source: s.extraData?.ip_address || 'unknown',
            time: formatTime(s.createdAt),
          }))}
          emptyText={tl('issues.noIssues')}
          onViewAll={() => goToAudit({})}
          tl={tl}
        />
      </div>
    </div>
  );
}

// 迷你统计卡片
function MiniStatCard({ title, value, icon, status, onClick }) {
  const statusColors = {
    good: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
    normal: 'border-gray-200 bg-white',
  };

  return (
    <div 
      className={`rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${statusColors[status] || statusColors.normal}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 truncate">{title}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// 服务状态项
function ServiceStatusItem({ name, status, tl }) {
  const statusConfig = {
    healthy: { color: 'bg-green-500', text: tl('health.healthy') },
    degraded: { color: 'bg-yellow-500', text: tl('health.degraded') },
    unhealthy: { color: 'bg-red-500', text: tl('health.unhealthy') },
    unknown: { color: 'bg-gray-400', text: 'Unknown' },
  };
  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{name}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-xs text-gray-500">{config.text}</span>
      </div>
    </div>
  );
}

// 状态点
function StatusDot({ status }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    unhealthy: 'bg-red-500',
    unknown: 'bg-gray-400',
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status] || colors.unknown}`} />;
}

// 问题列表组件
function IssueList({ title, issues, emptyText, onViewAll, tl }) {
  const severityColors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <button onClick={onViewAll} className="text-sm text-blue-600 hover:text-blue-800">
          {tl('issues.viewAll')} →
        </button>
      </div>
      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {issues.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {emptyText} ✓
          </div>
        ) : (
          issues.slice(0, 5).map((issue, index) => (
            <div key={index} className="p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[issue.severity] || severityColors.medium}`}>
                      {issue.severity?.toUpperCase() || 'MEDIUM'}
                    </span>
                    <span className="text-xs text-gray-400">{issue.time}</span>
                  </div>
                  <p className="text-sm text-gray-900 mt-1 truncate">{issue.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{issue.source}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 时间格式化
function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  
  if (diff < 60000) return '방금';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  
  const pad = (n) => String(n).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
}
