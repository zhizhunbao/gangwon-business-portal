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
      
      if (data && data.content_html) {
        setHtmlContent(data.content_html);
      } else {
        setHtmlContent('');
      }
      setError(null);
      setLoading(false);
    };

    fetchAboutContent();
  }, [i18n.language, t]);

  return (
    <div className="w-full max-w-full flex flex-col p-0 m-0 overflow-x-hidden">
      <Banner
        bannerType={BANNER_TYPES.ABOUT}
        sectionClassName="mb-6 md:mb-6"
      />
      <PageContainer>
        <div className="w-full max-w-full flex flex-col gap-0 mt-8 animate-fade-in">
          {loading && <div className="text-center py-12 px-8 text-base text-gray-500">{t('about.loading')}</div>}
          {error && <div className="text-center py-12 px-8 text-base text-red-600">{t('about.errorMessage', { message: error })}</div>}
          {!loading && !error && htmlContent && (
            <div 
              className="w-full py-8 prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </div>
      </PageContainer>
    </div>
  );
}

