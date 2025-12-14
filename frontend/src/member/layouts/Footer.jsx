/**
 * Footer Component - Member Portal
 * 会员端页脚 - Windster Style
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@shared/components';
import apiService from '@shared/services/api.service';
import { loggerService, exceptionService } from '@shared/services';
import { API_PREFIX } from '@shared/utils/constants';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOpenModal = async (type) => {
    setIsModalOpen(true);
    setIsLoading(true);
    setError(null);
    setModalTitle('');
    setModalContent('');

    try {
      const response = await apiService.get(`${API_PREFIX}/member/terms`, { type });
      const term = response.term;
      
      if (term) {
        setModalTitle(term.title);
        setModalContent(term.content);
      } else {
        setError(t('footer.error'));
      }
    } catch (err) {
      loggerService.error('Error fetching term', {
        module: 'MemberFooter',
        function: 'handleOpenModal',
        term_type: type,
        error_message: err.message,
        error_code: err.code
      });
      exceptionService.recordException(err, {
        request_path: window.location.pathname,
        error_code: err.code || 'FETCH_TERM_FAILED',
        context_data: { term_type: type }
      });
      setError(t('footer.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalTitle('');
    setModalContent('');
    setError(null);
  };

  const handleTermsClick = (e) => {
    e.preventDefault();
    handleOpenModal('terms_of_service');
  };

  const handlePrivacyClick = (e) => {
    e.preventDefault();
    handleOpenModal('privacy_policy');
  };

  return (
    <>
      <footer className="bg-white py-4 px-8 mt-auto transition-all duration-300 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] max-md:py-3 max-md:px-4 max-sm:py-2">
        <div className="max-w-full mx-auto flex justify-between items-center text-sm gap-6 whitespace-nowrap text-gray-600 max-md:gap-3 max-md:text-[0.8125rem] max-sm:text-xs max-sm:gap-2">
          <div className="flex items-center gap-3 flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
            <p className="m-0 text-sm leading-[1.4] font-normal whitespace-nowrap text-gray-600 max-sm:text-xs">
              &copy; {currentYear} {t('footer.copyright')}
            </p>
          </div>
          <div className="flex items-center gap-4 text-right whitespace-nowrap flex-shrink-0 max-md:gap-3">
            <div className="flex items-center gap-2 whitespace-nowrap max-md:gap-[0.375rem]">
              <a 
                href="#" 
                className="text-sm no-underline transition-colors duration-200 font-medium py-1 text-gray-600 hover:underline hover:text-blue-700 max-sm:text-xs"
                onClick={handleTermsClick}
              >
                {t('footer.termsOfService')}
              </a>
              <span className="text-sm mx-2 text-gray-300">|</span>
              <a 
                href="#" 
                className="text-sm no-underline transition-colors duration-200 font-medium py-1 text-gray-600 hover:underline hover:text-blue-700 max-sm:text-xs"
                onClick={handlePrivacyClick}
              >
                {t('footer.privacyPolicy')}
              </a>
            </div>
            <span className="text-sm mx-2 text-gray-300">|</span>
            <div className="flex items-center gap-4">
              <span className="text-sm flex items-center gap-1 text-gray-600 max-sm:text-xs">
                {t('footer.version')}: <strong className="font-semibold text-blue-700">1.0.0</strong>
              </span>
            </div>
          </div>
        </div>
      </footer>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalTitle}
        size="lg"
      >
        {isLoading ? (
          <div className="text-center p-8 text-gray-500">
            {t('footer.loading')}
          </div>
        ) : error ? (
          <div className="text-center p-8 text-red-600">
            {error}
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="leading-[1.8] text-gray-700">
              {modalContent.split('\n').map((line, index) => (
                <p key={index} className="mb-4 last:mb-0">{line}</p>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

