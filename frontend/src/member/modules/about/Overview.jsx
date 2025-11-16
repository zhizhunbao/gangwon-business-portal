/**
 * Overview Component - About Page
 * 系统概述组件
 */

import { useTranslation } from 'react-i18next';
import Card, { CardBody } from '@shared/components/Card';
import './About.css';

export default function Overview() {
  const { t } = useTranslation();

  return (
    <section className="overview-section">
      <h2>{t('about.overview.title')}</h2>
      <Card>
        <CardBody>
          <div className="intro-content">
            <p>{t('about.overview.description1')}</p>
            <p>{t('about.overview.description2')}</p>
            <p>{t('about.overview.description3')}</p>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

