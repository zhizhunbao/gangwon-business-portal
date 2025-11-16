/**
 * Features Component - About Page
 * 主要功能组件
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Card, { CardBody } from '@shared/components/Card';
import './About.css';

export default function Features() {
  const { t } = useTranslation();

  const features = [
    {
      title: t('about.features.performance.title'),
      description: t('about.features.performance.description'),
      link: '/member/performance',
      linkText: t('common.visit') || 'Visit',
      imageUrl: '/uploads/banners/performance.png'
    },
    {
      title: t('about.features.project.title'),
      description: t('about.features.project.description'),
      link: '/member/projects',
      linkText: t('common.visit') || 'Visit',
      imageUrl: '/uploads/banners/projects.png'
    },
    {
      title: t('about.features.management.title'),
      description: t('about.features.management.description'),
      link: '/member/profile',
      linkText: t('common.visit') || 'Visit',
      imageUrl: '/uploads/banners/main_primary.png'
    },
    {
      title: t('about.features.support.title'),
      description: t('about.features.support.description'),
      link: '/member/support',
      linkText: t('common.visit') || 'Visit',
      imageUrl: '/uploads/banners/support.png'
    }
  ];

  return (
    <section className="features-section">
      <h2>{t('about.features.title')}</h2>
      <div className="features-grid">
        {features.map((feature, index) => (
          <Link key={index} to={feature.link} className="feature-card-link">
            <Card className="feature-card" hover>
              <div 
                className="feature-card-img" 
                style={{ 
                  backgroundImage: `url(${feature.imageUrl})` 
                }}
              />
              <CardBody>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-link-btn">{feature.linkText} →</span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

