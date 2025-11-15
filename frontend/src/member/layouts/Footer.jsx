/**
 * Footer Component - Member Portal
 * 会员端页脚 - Windster Style
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@shared/components';
import apiService from '@shared/services/api.service';
import { API_PREFIX } from '@shared/utils/constants';
import './Footer.css';

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
      console.error('Error fetching term:', err);
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
      <footer className="member-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p className="footer-copyright">
              &copy; {currentYear} {t('footer.copyright')}
            </p>
          </div>
          <div className="footer-right">
            <div className="footer-links">
              <a 
                href="#" 
                className="footer-link"
                onClick={handleTermsClick}
              >
                {t('footer.termsOfService')}
              </a>
              <span className="footer-link-separator">|</span>
              <a 
                href="#" 
                className="footer-link"
                onClick={handlePrivacyClick}
              >
                {t('footer.privacyPolicy')}
              </a>
            </div>
            <div className="footer-info">
              <span className="footer-version">
                {t('footer.version')}: <strong>1.0.0</strong>
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
          <div className="footer-modal-loading">
            {t('footer.loading')}
          </div>
        ) : error ? (
          <div className="footer-modal-error">
            {error}
          </div>
        ) : (
          <div className="footer-modal-content">
            <div className="footer-term-content">
              {modalContent.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

