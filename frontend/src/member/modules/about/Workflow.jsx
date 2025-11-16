/**
 * Workflow Component - About Page
 * 使用流程组件
 */

import { useTranslation } from 'react-i18next';
import Card, { CardBody } from '@shared/components/Card';
import './About.css';

export default function Workflow() {
  const { t } = useTranslation();

  return (
    <section className="workflow-section">
      <h2>{t('about.workflow.title')}</h2>
      <Card>
        <CardBody>
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
        </CardBody>
      </Card>
    </section>
  );
}

