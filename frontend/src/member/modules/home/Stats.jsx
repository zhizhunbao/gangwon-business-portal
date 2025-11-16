/**
 * Stats Page - Member Portal
 * 我的概览页面 - 统计概览
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, memo } from 'react';
import Card from '@shared/components/Card';
import { apiService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';
import './Home.css';

function Stats() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState({
    projectsParticipated: 0,
    performanceSubmitted: 0,
    pendingReview: 0,
    documentsUploaded: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiService.get(`${API_PREFIX}/member/dashboard/stats`);
      if (response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, i18n.language]);

  return (
    <div className="home">
      <div className="page-header">
        <h1>{t('home.stats.title', '我的概览')}</h1>
        <p className="page-description">{t('home.stats.description', '查看您的业务数据统计')}</p>
      </div>

      {/* 统计概览 */}
      <section id="stats" className="stats-section">
        {isLoading ? (
          <div className="loading-state">
            <p>{t('common.loading', '加载中...')}</p>
          </div>
        ) : (
          <div className="stats-grid">
            <Card className="stat-card">
              <div className="stat-content">
                <div className="stat-value">{stats.projectsParticipated}</div>
                <div className="stat-label">{t('home.stats.projectsParticipated')}</div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-content">
                <div className="stat-value">{stats.performanceSubmitted}</div>
                <div className="stat-label">{t('home.stats.performanceSubmitted')}</div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-content">
                <div className="stat-value">{stats.pendingReview}</div>
                <div className="stat-label">{t('home.stats.pendingReview')}</div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="stat-content">
                <div className="stat-value">{stats.documentsUploaded}</div>
                <div className="stat-label">{t('home.stats.documentsUploaded')}</div>
              </div>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}

// 使用 memo 包装，避免不必要的重渲染
export default memo(Stats);

