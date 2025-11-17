/**
 * About Page - Member Portal
 * 系统介绍
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Banner } from '@shared/components';
import { BANNER_TYPES, API_PREFIX } from '@shared/utils/constants';
import { apiService } from '@shared/services';
import { PageContainer } from '@member/layouts';
import './About.css';

export default function About() {
  const { t, i18n } = useTranslation();
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        setLoading(true);
        const data = await apiService.get(`${API_PREFIX}/content/about`);
        
        if (data.about && data.about.htmlContent) {
          setHtmlContent(data.about.htmlContent);
        } else {
          setHtmlContent('');
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching about content:', err);
        setError(err.message || t('about.fetchError'));
      } finally {
        setLoading(false);
      }
    };

    fetchAboutContent();
  }, [i18n.language, t]);

  return (
    <div className="about">
      <Banner
        bannerType={BANNER_TYPES.ABOUT}
        sectionClassName="member-banner-section"
      />
      <PageContainer>
        <div className="about-content">
          {loading && <div className="about-loading">{t('about.loading')}</div>}
          {error && <div className="about-error">{t('about.errorMessage', { message: error })}</div>}
          {!loading && !error && htmlContent && (
            <div 
              className="about-html-content-wrapper"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </div>
      </PageContainer>
    </div>
  );
}

