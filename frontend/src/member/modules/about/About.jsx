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
// About styles converted to Tailwind classes

export default function About() {
  const { t, i18n } = useTranslation();
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAboutContent = async () => {
      setLoading(true);
      // Use correct API endpoint: /api/system-info instead of /api/content/about
      const data = await apiService.get(`${API_PREFIX}/system-info`);
      
      if (data && data.contentHtml) {
        setHtmlContent(data.contentHtml);
      } else {
        setHtmlContent('');
      }
      setError(null);
      setLoading(false);
    };

    fetchAboutContent();
  }, [i18n.language, t]);

  return (
    <div className="about w-full flex flex-col">
      <Banner
        bannerType={BANNER_TYPES.ABOUT}
        sectionClassName="mb-16"
        height="400px"
        fullWidth={true}
      />
      <PageContainer className="pb-8" fullWidth={false}>
        <div className="w-full">
          {loading && <div className="text-center py-12 px-8 text-base text-gray-500">{t('about.loading')}</div>}
          {error && <div className="text-center py-12 px-8 text-base text-red-600">{t('about.errorMessage', { message: error })}</div>}
          {!loading && !error && htmlContent && (
            <div 
              className="w-full prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </div>
      </PageContainer>
    </div>
  );
}

