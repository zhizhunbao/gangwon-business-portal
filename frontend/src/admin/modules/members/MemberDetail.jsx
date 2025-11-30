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
  const [niceDnbData, setNiceDnbData] = useState(null);
  const [niceDnbLoading, setNiceDnbLoading] = useState(false);
  const [niceDnbError, setNiceDnbError] = useState(null);

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

  const handleSearchNiceDnb = async () => {
    if (!member || !member.businessNumber) {
      alert(t('admin.members.detail.noBusinessNumber', '缺少营业执照号，无法查询 Nice D&B 信息'));
      return;
    }

    setNiceDnbLoading(true);
    setNiceDnbError(null);
    
    try {
      const data = await adminService.searchNiceDnb(member.businessNumber);
      setNiceDnbData(data);
    } catch (error) {
      console.error('Failed to search Nice D&B:', error);
      const errorMessage = error.response?.data?.detail || error.message || t('admin.members.detail.nicednbSearchFailed', '查询 Nice D&B 信息失败');
      setNiceDnbError(errorMessage);
      alert(errorMessage);
    } finally {
      setNiceDnbLoading(false);
    }
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
            <span>{member.businessNumber || '-'}</span>
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
        <div className="card-header">
          <h2>{t('admin.members.detail.nicednbInfo')}</h2>
          <Button 
            onClick={handleSearchNiceDnb}
            disabled={niceDnbLoading || !member?.businessNumber}
            variant="outline"
          >
            {niceDnbLoading 
              ? t('common.loading', '加载中...') 
              : t('admin.members.detail.searchNiceDnb')}
          </Button>
        </div>

        {niceDnbLoading && (
          <div className="nicednb-loading">
            <p>{t('common.loading', '加载中...')}</p>
          </div>
        )}

        {niceDnbError && (
          <div className="nicednb-error">
            <p>{niceDnbError}</p>
          </div>
        )}

        {!niceDnbData && !niceDnbLoading && !niceDnbError && (
          <div className="nicednb-placeholder">
            <p>{t('admin.members.detail.nicednbPlaceholder')}</p>
          </div>
        )}

        {niceDnbData && niceDnbData.success && niceDnbData.data && (
          <div className="nicednb-content">
            <div className="info-grid">
              <div className="info-item">
                <label>{t('admin.members.detail.businessNumber')}</label>
                <span>{niceDnbData.data.businessNumber || '-'}</span>
              </div>
              <div className="info-item">
                <label>{t('admin.members.detail.companyName')}</label>
                <span>{niceDnbData.data.companyName || '-'}</span>
              </div>
              <div className="info-item">
                <label>{t('admin.members.detail.representative')}</label>
                <span>{niceDnbData.data.representative || '-'}</span>
              </div>
              <div className="info-item">
                <label>{t('admin.members.detail.address')}</label>
                <span>{niceDnbData.data.address || '-'}</span>
              </div>
              <div className="info-item">
                <label>{t('admin.members.detail.industry')}</label>
                <span>{niceDnbData.data.industry || '-'}</span>
              </div>
              {niceDnbData.data.establishedDate && (
                <div className="info-item">
                  <label>{t('admin.members.detail.establishedDate', '成立日期')}</label>
                  <span>{new Date(niceDnbData.data.establishedDate).toLocaleDateString()}</span>
                </div>
              )}
              {niceDnbData.data.creditGrade && (
                <div className="info-item">
                  <label>{t('admin.members.detail.creditGrade', '信用等级')}</label>
                  <Badge variant="info">{niceDnbData.data.creditGrade}</Badge>
                </div>
              )}
            </div>

            {niceDnbData.financials && niceDnbData.financials.length > 0 && (
              <div className="nicednb-section">
                <h3>{t('admin.members.detail.financialData', '财务数据')}</h3>
                <div className="table-wrapper">
                  <table className="nicednb-table">
                    <thead>
                      <tr>
                        <th>{t('admin.members.detail.year', '年度')}</th>
                        <th>{t('admin.members.detail.revenue', '营业收入')}</th>
                        <th>{t('admin.members.detail.profit', '净利润')}</th>
                        <th>{t('admin.members.detail.assets', '总资产')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {niceDnbData.financials.map((financial, index) => (
                        <tr key={index}>
                          <td>{financial.year || '-'}</td>
                          <td>{financial.revenue ? financial.revenue.toLocaleString() : '-'}</td>
                          <td>{financial.profit ? financial.profit.toLocaleString() : '-'}</td>
                          <td>{financial.assets ? financial.assets.toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {niceDnbData.insights && niceDnbData.insights.length > 0 && (
              <div className="nicednb-section">
                <h3>{t('admin.members.detail.insights', '企业洞察')}</h3>
                <ul className="nicednb-insights">
                  {niceDnbData.insights.map((insight, index) => (
                    <li key={index}>
                      <strong>{insight.title || t('admin.members.detail.insight', '洞察')}:</strong>
                      <span>{insight.description || '-'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

