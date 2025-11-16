/**
 * Quick Links Page - Member Portal
 * 快捷入口页面
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import { ClipboardDocumentCheckIcon, ChartIcon, BuildingIcon, ChatBubbleLeftRightIcon } from '@shared/components/Icons';
import './Home.css';

export default function QuickLinks() {
  const { t } = useTranslation();

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
      <div className="page-header">
        <h1>{t('home.quickLinks.title', '快捷入口')}</h1>
        <p className="page-description">{t('home.quickLinks.description', '快速访问常用功能')}</p>
      </div>

      {/* 快捷入口 */}
      <section id="quickLinks" className="quick-links-section">
        <div className="quick-links-grid">
          {quickLinks.map((link, index) => {
            const IconComponent = link.icon;
            return (
              <Card key={index} className={`quick-link-card ${link.color}`}>
                <Link to={link.link} className="quick-link-content">
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
    </div>
  );
}

