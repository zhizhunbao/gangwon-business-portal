/**
 * Home Page - Member Portal
 * 企业会员首页
 */

import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import { apiService } from '@shared/services';
import { API_PREFIX, BANNER_TYPES } from '@shared/utils/constants';
import { ClipboardDocumentCheckIcon, ChartIcon, BuildingIcon, ChatBubbleLeftRightIcon } from '@shared/components/Icons';
import './Home.css';

export default function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [mainBanners, setMainBanners] = useState([]); // 主横幅(1)
  const [secondaryBanner, setSecondaryBanner] = useState(null); // 主横幅(2) 小尺寸
  const [notices, setNotices] = useState([]);
  const [latestNews, setLatestNews] = useState(null); // 新闻资料（最近1条）
  const [stats, setStats] = useState({
    projectsParticipated: 0,
    performanceSubmitted: 0,
    pendingReview: 0,
    documentsUploaded: 0
  });
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadBanners = useCallback(async () => {
    try {
      const response = await apiService.get(`${API_PREFIX}/content/banners`);
      if (response.banners) {
        // 分离主横幅(1)和次横幅(2)
        const primaryBanners = response.banners
          .filter(b => b.type === BANNER_TYPES.MAIN_PRIMARY)
          .map(b => ({
            id: b.id,
            imageUrl: b.imageUrl,
            link: b.linkUrl || null
          }));
        
        const secondary = response.banners.find(b => b.type === BANNER_TYPES.MAIN_SECONDARY);
        
        setMainBanners(primaryBanners);
        setSecondaryBanner(secondary ? {
          id: secondary.id,
          imageUrl: secondary.imageUrl,
          link: secondary.linkUrl || null
        } : null);
      }
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  }, []);

  const loadNotices = useCallback(async () => {
    try {
      const response = await apiService.get(`${API_PREFIX}/content/notices`, { limit: 5 });
      if (response.notices) {
        setNotices(response.notices.map(n => ({
          id: n.id,
          title: n.title,
          date: n.publishedAt ? new Date(n.publishedAt).toISOString().split('T')[0] : '',
          important: n.category === 'announcement'
        })));
      }
    } catch (error) {
      console.error('Failed to load notices:', error);
    }
  }, []);

  const loadLatestNews = useCallback(async () => {
    try {
      // 获取最新1条新闻资料
      // 注意：目前 notices API 返回的可能是公告和新闻的混合数据
      // 根据文档，新闻资料应该是单独的类型，这里暂时使用 notices API
      // 后续需要后端提供单独的 news API 端点
      const response = await apiService.get(`${API_PREFIX}/content/notices`, { limit: 1, category: 'news' });
      if (response.notices && response.notices.length > 0) {
        const newsItem = response.notices[0];
        setLatestNews({
          id: newsItem.id,
          title: newsItem.title,
          thumbnailUrl: newsItem.thumbnailUrl || newsItem.imageUrl || null,
          publishedAt: newsItem.publishedAt ? new Date(newsItem.publishedAt).toISOString().split('T')[0] : ''
        });
      }
    } catch (error) {
      console.error('Failed to load latest news:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiService.get(`${API_PREFIX}/member/dashboard/stats`);
      if (response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  // 监听语言变化，重新加载数据
  useEffect(() => {
    setIsLoading(true);
    // 并行执行所有数据加载，减少总延迟时间
    Promise.all([
      loadBanners(),
      loadNotices(),
      loadLatestNews(),
      loadStats() // 统计数据虽然与语言无关，但也并行加载
    ]).catch(error => {
      console.error('Failed to load data:', error);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [i18n.language, loadBanners, loadNotices, loadLatestNews, loadStats]); // 当语言变化时，重新加载数据

  // 横幅自动切换
  useEffect(() => {
    if (mainBanners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mainBanners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [mainBanners.length]);

  // 横幅点击跳转处理
  const handleBannerClick = (link) => {
    if (link) {
      if (link.startsWith('http://') || link.startsWith('https://')) {
        // 外部链接，新窗口打开
        window.open(link, '_blank');
      } else if (link.startsWith('/')) {
        // 内部路由
        navigate(link);
      } else {
        // 其他情况，尝试作为内部路由处理
        navigate(`/${link}`);
      }
    }
  };

  const quickLinks = [
    { 
      title: t('home.quickLinks.projectApplication'),
      description: t('home.quickLinks.projectApplicationDesc'),
      icon: ClipboardDocumentCheckIcon,
      link: '/member/projects',
      color: 'primary'
    },
    { 
      title: t('home.quickLinks.performance'),
      description: t('home.quickLinks.performanceDesc'),
      icon: ChartIcon,
      link: '/member/performance',
      color: 'success'
    },
    { 
      title: t('home.quickLinks.profile'),
      description: t('home.quickLinks.profileDesc'),
      icon: BuildingIcon,
      link: '/member/profile',
      color: 'info'
    },
    { 
      title: t('home.quickLinks.support'),
      description: t('home.quickLinks.supportDesc'),
      icon: ChatBubbleLeftRightIcon,
      link: '/member/support',
      color: 'warning'
    }
  ];

  return (
    <div className="home">
      {/* 1. 主横幅(1)图片 - 点击时如有URL则跳转到该页面 */}
      <section className="banner-section">
        <div className="banner-carousel">
          {mainBanners.length > 0 && (
            <>
              <div 
                className={`banner-image ${mainBanners[currentBanner].link ? 'banner-clickable' : ''}`}
                style={{ 
                  backgroundImage: `url(${mainBanners[currentBanner].imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  height: '400px',
                  borderRadius: '6px',
                  cursor: mainBanners[currentBanner].link ? 'pointer' : 'default'
                }}
                onClick={() => handleBannerClick(mainBanners[currentBanner].link)}
              >
                <div className="banner-overlay">
                  <h1>{t('home.banner.welcome')}</h1>
                  <p>{t('home.banner.subtitle')}</p>
                </div>
              </div>
              
              {/* 横幅指示器 */}
              {mainBanners.length > 1 && (
                <div className="banner-indicators">
                  {mainBanners.map((_, index) => (
                    <button
                      key={index}
                      className={`indicator ${index === currentBanner ? 'active' : ''}`}
                      onClick={() => setCurrentBanner(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* 2. 公告（提取管理员输入的内容最近5条） */}
      <section className="notices-section">
        <div className="section-header">
          <h2>{t('home.notices.title')}</h2>
          <Link to="/member/projects" className="view-all">
            {t('common.more')} →
          </Link>
        </div>
        
        <Card>
          <div className="notices-list">
            {notices.length > 0 ? (
              notices.map((notice) => (
                <div key={notice.id} className="notice-item">
                  <Link to={`/member/projects/notices/${notice.id}`}>
                    <div className="notice-content">
                      {notice.important && (
                        <span className="badge badge-danger">{t('home.notices.important')}</span>
                      )}
                      <span className="notice-title">{notice.title}</span>
                    </div>
                    <span className="notice-date">{notice.date}</span>
                  </Link>
                </div>
              ))
            ) : (
              <div className="notice-item">
                <span className="notice-title">{t('home.notices.empty')}</span>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 3. 新闻资料（提取管理员输入的最近1条缩略图，点击时跳转到该公告板） */}
      {latestNews && (
        <section className="news-section">
          <div className="section-header">
            <h2>{t('home.news.title')}</h2>
            <Link to="/member/projects" className="view-all">
              {t('common.more')} →
            </Link>
          </div>
          <Card>
            <Link to={`/member/projects/news/${latestNews.id}`} className="news-item">
              {latestNews.thumbnailUrl && (
                <div className="news-thumbnail">
                  <img src={latestNews.thumbnailUrl} alt={latestNews.title} />
                </div>
              )}
              <div className="news-content">
                <h3 className="news-title">{latestNews.title}</h3>
                <span className="news-date">{latestNews.publishedAt}</span>
              </div>
            </Link>
          </Card>
        </section>
      )}

      {/* 4. 管理员输入的主横幅(2)（小尺寸） */}
      {secondaryBanner && (
        <section className="secondary-banner-section">
          <div 
            className={`secondary-banner ${secondaryBanner.link ? 'banner-clickable' : ''}`}
            style={{
              backgroundImage: `url(${secondaryBanner.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              height: '200px',
              borderRadius: '8px',
              cursor: secondaryBanner.link ? 'pointer' : 'default'
            }}
            onClick={() => handleBannerClick(secondaryBanner.link)}
          />
        </section>
      )}

      {/* 快捷入口（可选，文档未明确要求但作为增强功能） */}
      <section className="quick-links-section">
        <h2>{t('home.quickLinks.title')}</h2>
        <div className="quick-links-grid">
          {quickLinks.map((link, index) => {
            const IconComponent = link.icon;
            return (
              <Card key={index} className={`quick-link-card ${link.color}`}>
                <Link to={link.link}>
                  <div className="card-icon">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <h3>{link.title}</h3>
                  <p>{link.description}</p>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 统计概览（可选，文档未明确要求但作为增强功能） */}
      <section className="stats-section">
        <h2>{t('home.stats.title')}</h2>
        <div className="stats-grid">
          <Card className="stat-card">
            <div className="stat-value">{stats.projectsParticipated}</div>
            <div className="stat-label">{t('home.stats.projectsParticipated')}</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value">{stats.performanceSubmitted}</div>
            <div className="stat-label">{t('home.stats.performanceSubmitted')}</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value">{stats.pendingReview}</div>
            <div className="stat-label">{t('home.stats.pendingReview')}</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value">{stats.documentsUploaded}</div>
            <div className="stat-label">{t('home.stats.documentsUploaded')}</div>
          </Card>
        </div>
      </section>
    </div>
  );
}

