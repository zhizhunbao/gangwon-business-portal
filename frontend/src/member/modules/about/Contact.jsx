/**
 * Contact Component - About Page
 * 联系方式组件
 */

import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Card, { CardBody } from '@shared/components/Card';
import { PhoneIcon, EnvelopeIcon, LocationIcon } from '@shared/components/Icons';
import './About.css';

export default function Contact() {
  const { t } = useTranslation();

  return (
    <>
      <section className="contact-section">
        <h2>{t('about.contact.title')}</h2>
        <div className="contact-grid">
          <Card className="contact-card">
            <CardBody>
              <div className="contact-icon">
                <PhoneIcon className="w-8 h-8" />
              </div>
              <h3>{t('about.contact.phone.title')}</h3>
              <p>{t('about.contact.phone.value')}</p>
              <small>{t('about.contact.phone.hours')}</small>
            </CardBody>
          </Card>

          <Card className="contact-card">
            <CardBody>
              <div className="contact-icon">
                <EnvelopeIcon className="w-8 h-8" />
              </div>
              <h3>{t('about.contact.email.title')}</h3>
              <p>{t('about.contact.email.value')}</p>
              <small>{t('about.contact.email.note')}</small>
            </CardBody>
          </Card>

          <Card className="contact-card">
            <CardBody>
              <div className="contact-icon">
                <LocationIcon className="w-8 h-8" />
              </div>
              <h3>{t('about.contact.address.title')}</h3>
              <p>{t('about.contact.address.value')}</p>
              <small>{t('about.contact.address.note')}</small>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* 常见问题快速链接 */}
      <section className="faq-link-section">
        <Card className="cta-card">
          <CardBody>
            <h2>{t('about.faqLink.title')}</h2>
            <p>{t('about.faqLink.description')}</p>
            <Link to="/member/support" className="btn btn-primary">
              {t('about.faqLink.button')} →
            </Link>
          </CardBody>
        </Card>
      </section>
    </>
  );
}

