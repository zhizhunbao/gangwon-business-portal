/**
 * About Page - Member Portal
 * 系统介绍
 */

import { useTranslation } from 'react-i18next';
import Card from '@shared/components/Card';
import { ChartIcon, ClipboardDocumentCheckIcon, BuildingIcon, ChatBubbleLeftRightIcon, PhoneIcon, EnvelopeIcon, LocationIcon } from '@shared/components/Icons';
import './About.css';

export default function About() {
  const { t } = useTranslation();

  const features = [
    {
      icon: ChartIcon,
      title: t('about.features.performance.title'),
      description: t('about.features.performance.description')
    },
    {
      icon: ClipboardDocumentCheckIcon,
      title: t('about.features.project.title'),
      description: t('about.features.project.description')
    },
    {
      icon: BuildingIcon,
      title: t('about.features.management.title'),
      description: t('about.features.management.description')
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: t('about.features.support.title'),
      description: t('about.features.support.description')
    }
  ];

  return (
    <div className="about">
      {/* 系统介绍 */}
      <section className="intro-section">
        <h1>{t('about.title')}</h1>
        <p className="subtitle">{t('about.subtitle')}</p>
        
        <Card>
          <div className="intro-content">
            <h2>{t('about.overview.title')}</h2>
            <p>{t('about.overview.description1')}</p>
            <p>{t('about.overview.description2')}</p>
            <p>{t('about.overview.description3')}</p>
          </div>
        </Card>
      </section>

      {/* 主要功能 */}
      <section className="features-section">
        <h2>{t('about.features.title')}</h2>
        <div className="features-grid">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="feature-card">
                <div className="feature-icon">
                  <IconComponent className="w-10 h-10" />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 使用流程 */}
      <section className="workflow-section">
        <h2>{t('about.workflow.title')}</h2>
        <Card>
          <div className="workflow-steps">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>{t('about.workflow.step1.title')}</h3>
                <p>{t('about.workflow.step1.description')}</p>
              </div>
            </div>
            
            <div className="workflow-arrow">→</div>
            
            <div className="workflow-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>{t('about.workflow.step2.title')}</h3>
                <p>{t('about.workflow.step2.description')}</p>
              </div>
            </div>
            
            <div className="workflow-arrow">→</div>
            
            <div className="workflow-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>{t('about.workflow.step3.title')}</h3>
                <p>{t('about.workflow.step3.description')}</p>
              </div>
            </div>
            
            <div className="workflow-arrow">→</div>
            
            <div className="workflow-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>{t('about.workflow.step4.title')}</h3>
                <p>{t('about.workflow.step4.description')}</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 联系方式 */}
      <section className="contact-section">
        <h2>{t('about.contact.title')}</h2>
        <div className="contact-grid">
          <Card className="contact-card">
            <div className="contact-icon">
              <PhoneIcon className="w-8 h-8" />
            </div>
            <h3>{t('about.contact.phone.title')}</h3>
            <p>{t('about.contact.phone.value')}</p>
            <small>{t('about.contact.phone.hours')}</small>
          </Card>

          <Card className="contact-card">
            <div className="contact-icon">
              <EnvelopeIcon className="w-8 h-8" />
            </div>
            <h3>{t('about.contact.email.title')}</h3>
            <p>{t('about.contact.email.value')}</p>
            <small>{t('about.contact.email.note')}</small>
          </Card>

          <Card className="contact-card">
            <div className="contact-icon">
              <LocationIcon className="w-8 h-8" />
            </div>
            <h3>{t('about.contact.address.title')}</h3>
            <p>{t('about.contact.address.value')}</p>
            <small>{t('about.contact.address.note')}</small>
          </Card>
        </div>
      </section>

      {/* 常见问题快速链接 */}
      <section className="faq-link-section">
        <Card className="cta-card">
          <h2>{t('about.faqLink.title')}</h2>
          <p>{t('about.faqLink.description')}</p>
          <a href="/member/support" className="btn btn-primary">
            {t('about.faqLink.button')} →
          </a>
        </Card>
      </section>
    </div>
  );
}

