/**
 * Footer Component - Admin Portal
 * 管理员端页脚
 */

import { useTranslation } from 'react-i18next';
import './Footer.css';

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="admin-footer">
      <div className="footer-content">
        <div className="footer-left">
          <p className="footer-copyright">
            &copy; {currentYear} {t('admin.footer.copyright')}
          </p>
        </div>
        <div className="footer-right">
          <div className="footer-info">
            <span className="footer-version">
              {t('admin.footer.version')}: <strong>1.0.0</strong>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

