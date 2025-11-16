/**
 * Support Page - Member Portal
 * 支持中心
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import Select from '@shared/components/Select';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import { EyeIcon, CheckCircleIcon, WarningIcon, MegaphoneIcon } from '@shared/components/Icons';
import './Support.css';

// 选项卡类型
const TAB_TYPES = {
  INQUIRY: 'inquiry',
  FAQ: 'faq',
  NOTIFICATIONS: 'notifications'
};

export default function Support() {
  const { t } = useTranslation();
  
  // 从 URL hash 获取当前激活的选项卡
  const getActiveTabFromHash = useCallback(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && Object.values(TAB_TYPES).includes(hash)) {
      return hash;
    }
    // 默认显示第一个选项卡
    return TAB_TYPES.INQUIRY;
  }, []);

  const [activeTab, setActiveTab] = useState(getActiveTabFromHash);
  const [inquiries, setInquiries] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // 监听 URL hash 变化，更新激活的选项卡
  useEffect(() => {
    const handleHashChange = () => {
      const newTab = getActiveTabFromHash();
      setActiveTab(newTab);
    };

    // 初始设置
    handleHashChange();

    // 监听 hash 变化
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [getActiveTabFromHash]);

  // Mock data
  useEffect(() => {
    setInquiries([
      {
        id: 1,
        subject: '项目申请相关问题',
        category: 'project',
        status: 'answered',
        createdAt: '2024-12-10',
        answeredAt: '2024-12-12'
      },
      {
        id: 2,
        subject: '绩效数据提交问题',
        category: 'performance',
        status: 'pending',
        createdAt: '2024-12-15'
      }
    ]);

    setFaqs([
      {
        id: 1,
        category: 'project',
        question: '如何申请项目？',
        answer: '登录后进入项目管理页面，选择想要申请的项目，点击"申请"按钮填写申请表即可。',
        views: 234
      },
      {
        id: 2,
        category: 'performance',
        question: '绩效数据什么时候提交？',
        answer: '季度绩效数据应在每季度结束后30天内提交，年度绩效数据应在每年结束后60天内提交。',
        views: 156
      },
      {
        id: 3,
        category: 'account',
        question: '如何修改企业信息？',
        answer: '进入"企业资料"页面，点击"编辑"按钮即可修改企业信息。注意：营业执照号码不可修改。',
        views: 189
      }
    ]);

    setNotifications([
      {
        id: 1,
        type: 'approval',
        title: '您的项目申请已批准',
        content: '2025年度创业支持项目申请已通过审核。',
        read: false,
        createdAt: '2024-12-20'
      },
      {
        id: 2,
        type: 'supplement',
        title: '绩效数据需要补充',
        content: '2024年第四季度绩效数据需要补充证明文件。',
        read: false,
        createdAt: '2024-12-18'
      },
      {
        id: 3,
        type: 'notice',
        title: '系统维护通知',
        content: '系统将于2024年12月25日进行维护，预计2小时。',
        read: true,
        createdAt: '2024-12-15'
      }
    ]);
  }, []);

  const [inquiryForm, setInquiryForm] = useState({
    category: '',
    subject: '',
    content: '',
    attachments: []
  });

  const handleInquiryChange = (field, value) => {
    setInquiryForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitInquiry = async () => {
    try {
      // TODO: API 调用提交咨询
      console.log('Submitting inquiry:', inquiryForm);
      alert(t('message.submitSuccess'));
      setInquiryForm({
        category: '',
        subject: '',
        content: '',
        attachments: []
      });
    } catch (error) {
      console.error('Failed to submit:', error);
      alert(t('message.submitFailed'));
    }
  };

  const categoryOptions = [
    { value: '', label: t('support.selectCategory') },
    { value: 'project', label: t('support.categories.project') },
    { value: 'performance', label: t('support.categories.performance') },
    { value: 'account', label: t('support.categories.account') },
    { value: 'technical', label: t('support.categories.technical') },
    { value: 'other', label: t('support.categories.other') }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  // 获取 submenu 配置
  const getSubmenuItems = () => {
    return [
      {
        key: 'support-inquiry',
        hash: 'inquiry',
        label: t('support.inquiry', '1:1 咨询'),
        isTab: true,
        basePath: '/member/support'
      },
      {
        key: 'support-faq',
        hash: 'faq',
        label: t('support.faq', '常见问题'),
        isTab: true,
        basePath: '/member/support'
      },
      {
        key: 'support-notifications',
        hash: 'notifications',
        label: t('support.notifications', '通知中心'),
        isTab: true,
        basePath: '/member/support',
        render: ({ item, currentHash }) => {
          const defaultHash = TAB_TYPES.INQUIRY;
          const active = currentHash === item.hash || 
            (currentHash === '' && item.hash === defaultHash);
          return (
            <a
              href={`${item.basePath}#${item.hash}`}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = item.hash;
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              }}
              className={`submenu-link ${active ? 'active' : ''}`}
            >
              <span className="submenu-label">{item.label}</span>
              {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{unreadCount}</span>}
            </a>
          );
        }
      }
    ];
  };

  return (
    <div className="support">
      <Banner
        bannerType={BANNER_TYPES.SUPPORT}
        sectionClassName="member-banner-section"
      />
      <Submenu
        items={getSubmenuItems()}
        className="support-submenu"
        headerSelector=".member-header"
      />

      <div className="page-header">
      </div>

      {/* 1:1 咨询 */}
      {activeTab === TAB_TYPES.INQUIRY && (
        <div className="tab-content">
          <div className="support-grid">
            {/* 咨询表单 */}
            <Card>
              <h2>{t('support.newInquiry')}</h2>
              <div className="form-section">
                <div className="form-group">
                  <label>{t('support.category')} *</label>
                  <Select
                    value={inquiryForm.category}
                    onChange={(e) => handleInquiryChange('category', e.target.value)}
                    options={categoryOptions}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('support.subject')} *</label>
                  <Input
                    value={inquiryForm.subject}
                    onChange={(e) => handleInquiryChange('subject', e.target.value)}
                    placeholder={t('support.subjectPlaceholder')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t('support.content')} *</label>
                  <Textarea
                    value={inquiryForm.content}
                    onChange={(e) => handleInquiryChange('content', e.target.value)}
                    rows={8}
                    placeholder={t('support.contentPlaceholder')}
                    required
                  />
                </div>

                <Button
                  onClick={handleSubmitInquiry}
                  variant="primary"
                  disabled={!inquiryForm.category || !inquiryForm.subject || !inquiryForm.content}
                >
                  {t('common.submit')}
                </Button>
              </div>
            </Card>

            {/* 咨询历史 */}
            <Card>
              <h2>{t('support.inquiryHistory')}</h2>
              {inquiries.length === 0 ? (
                <div className="no-data">
                  <p>{t('support.noInquiries')}</p>
                </div>
              ) : (
                <div className="inquiries-list">
                  {inquiries.map((inquiry) => (
                    <Link key={inquiry.id} to={`/member/support/inquiry/${inquiry.id}`} className="ac-card inquiry-item">
                      <div 
                        className="ac-card-img" 
                        style={{ 
                          backgroundImage: `url('/uploads/banners/support.png')` 
                        }}
                      />
                      <div className="ac-card-body">
                        <div className="inquiry-header">
                          <h2>{inquiry.subject}</h2>
                          <span className={`badge ${inquiry.status === 'answered' ? 'badge-success' : 'badge-warning'}`}>
                            {t(`support.status.${inquiry.status}`)}
                          </span>
                        </div>
                        <div className="inquiry-meta" style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          <span>{t(`support.categories.${inquiry.category}`)}</span>
                          <span>{t('support.createdDate')}: {inquiry.createdAt}</span>
                          {inquiry.answeredAt && (
                            <span>{t('support.answeredDate')}: {inquiry.answeredAt}</span>
                          )}
                        </div>
                        <span className="ac-btn bg-light-grey arrow">{t('common.details')}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* FAQ */}
      {activeTab === TAB_TYPES.FAQ && (
        <div className="tab-content">
          <Card>
            <div className="faq-header">
              <h2>{t('support.faq')}</h2>
            </div>

            {faqs.length === 0 ? (
              <div className="no-data">
                <p>{t('common.noData')}</p>
              </div>
            ) : (
              <div className="faq-list">
                {faqs.map((faq) => (
                  <div key={faq.id} className="ac-card faq-item">
                    <div 
                      className="ac-card-img" 
                      style={{ 
                        backgroundImage: `url('/uploads/banners/support.png')` 
                      }}
                    />
                    <div className="ac-card-body">
                      <span className="faq-category">{t(`support.categories.${faq.category}`)}</span>
                      <h2>Q: {faq.question}</h2>
                      <p>A: {faq.answer}</p>
                      <div className="faq-meta" style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                        <span>
                          <EyeIcon className="w-4 h-4" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                          {faq.views} {t('support.views')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 通知中心 */}
      {activeTab === TAB_TYPES.NOTIFICATIONS && (
        <div className="tab-content">
          <Card>
            <h2>{t('support.notifications')}</h2>
            {notifications.length === 0 ? (
              <div className="no-data">
                <p>{t('support.noNotifications')}</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  >
                    <div className="notification-icon">
                      {notification.type === 'approval' && <CheckCircleIcon className="w-5 h-5" />}
                      {notification.type === 'supplement' && <WarningIcon className="w-5 h-5" />}
                      {notification.type === 'notice' && <MegaphoneIcon className="w-5 h-5" />}
                    </div>
                    <div className="notification-content">
                      <h3>{notification.title}</h3>
                      <p>{notification.content}</p>
                      <span className="notification-date">{notification.createdAt}</span>
                    </div>
                    {!notification.read && <div className="unread-dot" />}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

