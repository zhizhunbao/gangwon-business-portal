/**
 * Footer Component - Member Portal
 * 会员端页脚 - Windster Style
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TermsModal, TERM_TYPES } from '@shared/components';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTermType, setCurrentTermType] = useState(null);

  const handleOpenModal = (type) => {
    setIsModalOpen(true);
    setCurrentTermType(type);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentTermType(null);
  };

  const handleTermsClick = (e) => {
    e.preventDefault();
    handleOpenModal(TERM_TYPES.TERMS_OF_SERVICE);
  };

  const handlePrivacyClick = (e) => {
    e.preventDefault();
    handleOpenModal(TERM_TYPES.PRIVACY_POLICY);
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

      <TermsModal
        isOpen={isModalOpen}
        termType={currentTermType}
        onClose={handleCloseModal}
      />
    </>
  );
}

