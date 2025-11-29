/**
 * Member Detail Component - Admin Portal
 * 企业会员详情
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Loading } from '@shared/components';
import { adminService } from '@shared/services';
import './MemberDetail.css';

export default function MemberDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);

  useEffect(() => {
    loadMemberDetail();
  }, [id]);

  const loadMemberDetail = async () => {
    setLoading(true);
    try {
      const memberData = await adminService.getMemberDetail(id);
      if (memberData) {
        setMember(memberData);
      }
    } catch (error) {
      console.error('Failed to load member detail:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.members.detail.loadFailed', '加载会员详情失败');
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await adminService.approveMember(id);
      loadMemberDetail();
      alert(t('admin.members.approveSuccess', '批准成功') || '批准成功');
    } catch (error) {
      console.error('Failed to approve member:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.members.approveFailed', '批准失败');
      alert(errorMessage);
    }
  };

  const handleReject = async () => {
    const reason = prompt(t('admin.members.rejectReason', '请输入拒绝原因（可选）') || '请输入拒绝原因（可选）');
    try {
      await adminService.rejectMember(id, reason || null);
      loadMemberDetail();
      alert(t('admin.members.rejectSuccess', '拒绝成功') || '拒绝成功');
    } catch (error) {
      console.error('Failed to reject member:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.members.rejectFailed', '拒绝失败');
      alert(errorMessage);
    }
  };

  const handleSearchNiceDnb = () => {
    // Note: Nice D&B API integration pending (see 1.4 Frontend Feature Completion)
    // This will call the backend Nice D&B service endpoint
  };

  const handleViewPerformance = () => {
    navigate(`/admin/performance?memberId=${id}`);
  };

  if (loading) {
    return <Loading />;
  }

  if (!member) {
    return (
      <div className="error-message">
        <p>{t('admin.members.detail.notFound')}</p>
        <Button onClick={() => navigate('/admin/members')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="admin-member-detail">
      <div className="page-header">
        <Button variant="outline" onClick={() => navigate('/admin/members')}>
          {t('common.back')}
        </Button>
        <div className="header-actions">
          {member.approvalStatus === 'pending' && (
            <>
              <Button variant="outline" onClick={handleReject}>
                {t('admin.members.reject')}
              </Button>
              <Button onClick={handleApprove}>
                {t('admin.members.approve')}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="member-info-card">
        <div className="card-header">
          <h2>{t('admin.members.detail.basicInfo')}</h2>
          <Badge 
            variant={member.approvalStatus === 'approved' ? 'success' : member.approvalStatus === 'pending' ? 'warning' : 'danger'}
          >
            {t(`members.status.${member.approvalStatus}`)}
          </Badge>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label>{t('admin.members.detail.businessNumber')}</label>
            <span>{member.businessLicense || member.businessNumber || '-'}</span>
          </div>
          <div className="info-item">
            <label>{t('admin.members.detail.companyName')}</label>
            <span>{member.companyName || '-'}</span>
          </div>
          <div className="info-item">
            <label>{t('admin.members.detail.representative')}</label>
            <span>{member.representative || member.representativeName || '-'}</span>
          </div>
          <div className="info-item">
            <label>{t('admin.members.detail.legalNumber')}</label>
            <span>{member.legalNumber || '-'}</span>
          </div>
          <div className="info-item">
            <label>{t('admin.members.detail.address')}</label>
            <span>{member.address || '-'}</span>
          </div>
          <div className="info-item">
            <label>{t('admin.members.detail.industry')}</label>
            <span>{member.industry || '-'}</span>
          </div>
          <div className="info-item">
            <label>{t('admin.members.detail.phone')}</label>
            <span>{member.phone || '-'}</span>
          </div>
          <div className="info-item">
            <label>{t('admin.members.detail.email')}</label>
            <span>{member.email || '-'}</span>
          </div>
        </div>

        <div className="action-buttons">
          <Button variant="outline" onClick={handleSearchNiceDnb}>
            {t('admin.members.detail.searchNiceDnb')}
          </Button>
          <Button variant="outline" onClick={handleViewPerformance}>
            {t('admin.members.detail.viewPerformance')}
          </Button>
        </div>
      </Card>

      {/* Nice D&B 信息卡片 */}
      <Card className="nicednb-card">
        <h2>{t('admin.members.detail.nicednbInfo')}</h2>
        <div className="nicednb-placeholder">
          <p>{t('admin.members.detail.nicednbPlaceholder')}</p>
          <Button onClick={handleSearchNiceDnb}>
            {t('admin.members.detail.searchNiceDnb')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

