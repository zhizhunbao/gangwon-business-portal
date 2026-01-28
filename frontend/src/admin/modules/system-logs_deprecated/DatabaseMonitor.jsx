/**
 * Database Monitor Component
 * 数据库监控 - 独立 Tab
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation, Card, Loading, Button, logsService, createTranslator } from './adapter';

export default function DatabaseMonitor() {
  const { t } = useTranslation();
  const tl = createTranslator(t);
  const [loading, setLoading] = useState(true);
  const [dbMetrics, setDbMetrics] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await logsService.getDatabaseMetrics().catch(() => null);
      setDbMetrics(result);
    } catch (error) {
      console.error('[DatabaseMonitor] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !dbMetrics) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 主要指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title={tl('database.responseTime')}
          value={dbMetrics?.responseTimeMs || 0}
          unit="ms"
          status={getResponseTimeStatus(dbMetrics?.responseTimeMs)}
          icon="⚡"
        />
        <MetricCard
          title={tl('database.size')}
          value={dbMetrics?.sizeMB || 0}
          unit="MB"
          status="normal"
          icon="💾"
        />
        <MetricCard
          title={tl('database.connections')}
          value={`${dbMetrics?.connections?.active || 0} / ${dbMetrics?.connections?.total || 0}`}
          subtitle={tl('database.activeTotal')}
          status={getConnectionStatus(dbMetrics?.connections)}
          icon="🔗"
        />
        <MetricCard
          title={tl('database.tables')}
          value={dbMetrics?.tableCount || 0}
          status="normal"
          icon="📊"
        />
      </div>

      {/* 详细信息 */}
      {dbMetrics && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">📋 {tl('databaseMonitor.details') || '详细信息'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 连接池状态 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{tl('databaseMonitor.connectionPool') || '连接池状态'}</h4>
                <div className="space-y-2">
                  <DetailRow label={tl('databaseMonitor.activeConnections') || '活跃连接'} value={dbMetrics.connections?.active || 0} />
                  <DetailRow label={tl('databaseMonitor.idleConnections') || '空闲连接'} value={dbMetrics.connections?.idle || 0} />
                  <DetailRow label={tl('databaseMonitor.totalConnections') || '总连接数'} value={dbMetrics.connections?.total || 0} />
                  <DetailRow label={tl('databaseMonitor.maxConnections') || '最大连接数'} value={dbMetrics.connections?.max || '-'} />
                </div>
              </div>

              {/* 性能指标 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{tl('databaseMonitor.performance') || '性能指标'}</h4>
                <div className="space-y-2">
                  <DetailRow label={tl('database.responseTime')} value={`${dbMetrics.responseTimeMs || 0}ms`} highlight={dbMetrics.responseTimeMs > 100} />
                  <DetailRow label={tl('databaseMonitor.queryCount') || '查询次数'} value={dbMetrics.queryCount || '-'} />
                  <DetailRow label={tl('databaseMonitor.slowQueries') || '慢查询'} value={dbMetrics.slowQueries || 0} highlight={dbMetrics.slowQueries > 0} />
                  <DetailRow label={tl('databaseMonitor.cacheHitRate') || '缓存命中率'} value={dbMetrics.cacheHitRate ? `${dbMetrics.cacheHitRate}%` : '-'} />
                </div>
              </div>
            </div>

            {/* 表信息 */}
            {dbMetrics.tables && dbMetrics.tables.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{tl('databaseMonitor.tableInfo') || '表信息'}</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{tl('databaseMonitor.tableName') || '表名'}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{tl('databaseMonitor.rowCount') || '行数'}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{tl('databaseMonitor.tableSize') || '大小'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dbMetrics.tables.map((table, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 font-mono">{table.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">{table.rowCount?.toLocaleString() || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 text-right">{table.size || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 无数据提示 */}
      {!dbMetrics && !loading && (
        <Card>
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">📊 {tl('databaseMonitor.noData') || '暂无数据库监控数据'}</p>
            <p className="text-sm text-gray-400">{tl('databaseMonitor.noDataHint') || '请检查后端服务是否正常运行'}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// 指标卡片组件
function MetricCard({ title, value, unit, subtitle, status, icon }) {
  const statusColors = {
    normal: 'text-gray-900',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    good: 'text-green-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === 'good' ? 'bg-green-100 text-green-700' :
          status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
          status === 'danger' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {status === 'good' ? '正常' : status === 'warning' ? '警告' : status === 'danger' ? '异常' : '—'}
        </span>
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${statusColors[status] || statusColors.normal}`}>
        {value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// 详情行组件
function DetailRow({ label, value, highlight = false }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-yellow-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

// 辅助函数
function getResponseTimeStatus(ms) {
  if (!ms) return 'normal';
  if (ms > 200) return 'danger';
  if (ms > 100) return 'warning';
  return 'good';
}

function getConnectionStatus(connections) {
  if (!connections) return 'normal';
  const ratio = connections.active / (connections.total || 1);
  if (ratio > 0.9) return 'danger';
  if (ratio > 0.7) return 'warning';
  return 'good';
}
