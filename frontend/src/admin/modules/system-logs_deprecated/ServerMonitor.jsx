/**
 * Server Monitor Component
 * 服务器监控 - 独立 Tab
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation, Card, Loading, Button, logsService, createTranslator } from './adapter';

export default function ServerMonitor() {
  const { t } = useTranslation();
  const tl = createTranslator(t);
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [renderStatus, setRenderStatus] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [healthResult, renderResult] = await Promise.all([
        logsService.getSystemHealth().catch(() => null),
        logsService.getRenderStatus().catch(() => null),
      ]);
      setHealthData(healthResult);
      setRenderStatus(renderResult);
    } catch (error) {
      console.error('[ServerMonitor] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !healthData && !renderStatus) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 系统健康状态 */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">🏥 {tl('health.title')}</h3>
            {healthData?.timestamp && (
              <span className="text-xs text-gray-400">
                {tl('health.lastCheck')}: {new Date(healthData.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {/* 总体状态 */}
          {healthData?.status && (
            <div className="mb-4 p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${
                  healthData.status === 'healthy' ? 'bg-green-500' :
                  healthData.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="font-medium text-gray-900">
                  {tl('serverMonitor.overallStatus') || '总体状态'}:
                </span>
                <span className={`font-semibold ${
                  healthData.status === 'healthy' ? 'text-green-600' :
                  healthData.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {healthData.status === 'healthy' ? tl('health.healthy') :
                   healthData.status === 'degraded' ? tl('health.degraded') : tl('health.unhealthy')}
                </span>
              </div>
            </div>
          )}

          {/* 服务状态网格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HealthIndicator 
              name={tl('health.api')} 
              status={healthData?.services?.api?.status || 'healthy'} 
              detail={healthData?.services?.api?.uptime}
              icon="🌐"
              tl={tl} 
            />
            <HealthIndicator 
              name={tl('health.database')} 
              status={healthData?.services?.database?.status || 'healthy'} 
              detail={healthData?.services?.database?.responseTime}
              icon="🗄️"
              tl={tl} 
            />
            <HealthIndicator 
              name={tl('health.cache')} 
              status={healthData?.services?.cache?.status || 'healthy'} 
              detail={healthData?.services?.cache?.hitRate}
              icon="⚡"
              tl={tl} 
            />
            <HealthIndicator 
              name={tl('health.storage')} 
              status={healthData?.services?.storage?.status || 'healthy'} 
              detail={healthData?.services?.storage?.usage}
              icon="💾"
              tl={tl} 
            />
          </div>
        </div>
      </Card>

      {/* 系统资源 */}
      {healthData?.resources && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">📊 {tl('serverMonitor.resources') || '系统资源'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ResourceGauge
                label={tl('serverMonitor.cpu') || 'CPU'}
                value={healthData.resources.cpu || 0}
                icon="🖥️"
              />
              <ResourceGauge
                label={tl('serverMonitor.memory') || '内存'}
                value={healthData.resources.memory || 0}
                icon="🧠"
              />
              <ResourceGauge
                label={tl('serverMonitor.disk') || '磁盘'}
                value={healthData.resources.disk || 0}
                icon="💿"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Render 部署状态 */}
      {renderStatus && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">🚀 {tl('render.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderStatus.backend && (
                <ServiceCard
                  name={tl('render.backend')}
                  status={renderStatus.backend.status}
                  url={renderStatus.backend.url}
                  responseTime={renderStatus.backend.responseTimeMs}
                  error={renderStatus.backend.error}
                  icon="⚙️"
                  tl={tl}
                />
              )}
              {renderStatus.frontend && (
                <ServiceCard
                  name={tl('render.frontend')}
                  status={renderStatus.frontend.status}
                  url={renderStatus.frontend.url}
                  responseTime={renderStatus.frontend.responseTimeMs}
                  error={renderStatus.frontend.error}
                  icon="🖼️"
                  tl={tl}
                />
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 服务详情 */}
      {healthData?.services && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">📋 {tl('serverMonitor.serviceDetails') || '服务详情'}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">{tl('serverMonitor.serviceName') || '服务名称'}</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">{tl('serverMonitor.status') || '状态'}</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{tl('serverMonitor.responseTime') || '响应时间'}</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">{tl('serverMonitor.uptime') || '运行时间'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(healthData.services).map(([name, service]) => (
                    <tr key={name} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{name}</td>
                      <td className="px-4 py-2 text-center">
                        <StatusBadge status={service.status} tl={tl} />
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-right">
                        {service.responseTime || service.responseTimeMs ? `${service.responseTime || service.responseTimeMs}ms` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 text-right">{service.uptime || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* 无数据提示 */}
      {!healthData && !renderStatus && !loading && (
        <Card>
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg mb-2">🖥️ {tl('serverMonitor.noData') || '暂无服务器监控数据'}</p>
            <p className="text-sm text-gray-400">{tl('serverMonitor.noDataHint') || '请检查后端服务是否正常运行'}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// 健康状态指示器
function HealthIndicator({ name, status, detail, icon, tl }) {
  const statusConfig = {
    healthy: { color: 'bg-green-500', text: tl('health.healthy'), textColor: 'text-green-600', bg: 'bg-green-50' },
    degraded: { color: 'bg-yellow-500', text: tl('health.degraded'), textColor: 'text-yellow-600', bg: 'bg-yellow-50' },
    unhealthy: { color: 'bg-red-500', text: tl('health.unhealthy'), textColor: 'text-red-600', bg: 'bg-red-50' },
  };
  const config = statusConfig[status] || statusConfig.healthy;

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg ${config.bg}`}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className={`w-2 h-2 rounded-full ${config.color}`} />
          <p className={`text-xs ${config.textColor}`}>{config.text}</p>
          {detail && <span className="text-xs text-gray-400">({detail})</span>}
        </div>
      </div>
    </div>
  );
}

// 资源使用仪表
function ResourceGauge({ label, value, icon }) {
  const getColor = (val) => {
    if (val > 90) return 'bg-red-500';
    if (val > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{icon} {label}</span>
        <span className={`text-sm font-bold ${
          value > 90 ? 'text-red-600' : value > 70 ? 'text-yellow-600' : 'text-green-600'
        }`}>{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getColor(value)}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

// 服务卡片
function ServiceCard({ name, status, url, responseTime, error, icon, tl }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{icon} {name}</span>
        <StatusBadge status={status} tl={tl} />
      </div>
      {url && <p className="text-xs text-gray-500 truncate mb-2">{url}</p>}
      {responseTime && (
        <p className="text-sm text-gray-600">
          {tl('render.responseTime')}: 
          <span className={`ml-1 font-medium ${responseTime > 2000 ? 'text-yellow-600' : 'text-green-600'}`}>
            {responseTime}ms
          </span>
        </p>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}

// 状态徽章
function StatusBadge({ status, tl }) {
  const statusConfig = {
    healthy: { bg: 'bg-green-100', text: 'text-green-700', label: tl('health.healthy') },
    degraded: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: tl('health.degraded') },
    unhealthy: { bg: 'bg-red-100', text: 'text-red-700', label: tl('health.unhealthy') },
    unknown: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Unknown' },
  };
  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
