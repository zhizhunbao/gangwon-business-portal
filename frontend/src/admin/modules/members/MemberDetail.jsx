/**
 * Member Detail Component - Admin Portal
 * 企业会员详情
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Loading } from '@shared/components';
import { adminService, loggerService, exceptionService } from '@shared/services';

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
      loggerService.info('Loading member detail', {
        module: 'MemberDetail',
        function: 'loadMemberDetail',
        member_id: id
      });
      const memberData = await adminService.getMemberDetail(id);
      if (memberData) {
        setMember(memberData);
        loggerService.info('Member detail loaded successfully', {
          module: 'MemberDetail',
          function: 'loadMemberDetail',
          member_id: id
        });
      }
    } catch (error) {
      loggerService.error('Failed to load member detail', {
        module: 'MemberDetail',
        function: 'loadMemberDetail',
        member_id: id,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'LOAD_MEMBER_DETAIL_ERROR'
      });
      // Error logged, no alert needed
      console.error('Load member detail failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      loggerService.info('Approving member', {
        module: 'MemberDetail',
        function: 'handleApprove',
        member_id: id
      });
      await adminService.approveMember(id);
      loggerService.info('Member approved successfully', {
        module: 'MemberDetail',
        function: 'handleApprove',
        member_id: id
      });
      loadMemberDetail();
      // Approval successful
    } catch (error) {
      loggerService.error('Failed to approve member', {
        module: 'MemberDetail',
        function: 'handleApprove',
        member_id: id,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'APPROVE_MEMBER_ERROR'
      });
      // Error logged, no alert needed
      console.error('Approve failed:', error);
    }
  };

  const handleReject = async () => {
    const reason = prompt(t('admin.members.rejectReason', '请输入拒绝原因（可选）') || '请输入拒绝原因（可选）');
    try {
      loggerService.info('Rejecting member', {
        module: 'MemberDetail',
        function: 'handleReject',
        member_id: id
      });
      await adminService.rejectMember(id, reason || null);
      loggerService.info('Member rejected successfully', {
        module: 'MemberDetail',
        function: 'handleReject',
        member_id: id
      });
      loadMemberDetail();
      // Reject successful
    } catch (error) {
      loggerService.error('Failed to reject member', {
        module: 'MemberDetail',
        function: 'handleReject',
        member_id: id,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'REJECT_MEMBER_ERROR'
      });
      // Error logged, no alert needed
      console.error('Reject failed:', error);
    }
  };

  const handleSearchNiceDnb = async () => {
    if (!member || !member.businessNumber) {
      setNiceDnbError('营业执照号码不可用');
      return;
    }

    setNiceDnbLoading(true);
    setNiceDnbError(null);
    
    try {
      loggerService.info('Searching Nice D&B', {
        module: 'MemberDetail',
        function: 'handleSearchNiceDnb',
        business_number: member.businessNumber
      });
      const data = await adminService.searchNiceDnb(member.businessNumber);
      setNiceDnbData(data);
      loggerService.info('Nice D&B search succeeded', {
        module: 'MemberDetail',
        function: 'handleSearchNiceDnb',
        business_number: member.businessNumber
      });
    } catch (error) {
      loggerService.error('Failed to search Nice D&B', {
        module: 'MemberDetail',
        function: 'handleSearchNiceDnb',
        business_number: member.businessNumber,
        error_message: error.message,
        error_code: error.code
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: 'SEARCH_NICE_DNB_ERROR'
      });
      const errorMessage = error.response?.data?.detail || error.message || t('admin.members.detail.nicednbSearchFailed');
      setNiceDnbError(errorMessage);
    } finally {
      setNiceDnbLoading(false);
    }
  };



  if (loading) {
    return <Loading />;
  }

  if (!member) {
    return (
      <div className="p-12 text-center text-red-600">
        <p className="mb-6">{t('admin.members.detail.notFound')}</p>
        <Button onClick={() => navigate('/admin/members')}>
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/admin/members')}>
          {t('common.back')}
        </Button>
        <div className="flex gap-4">
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

      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">{t('admin.members.detail.basicInfo')}</h2>
          <Badge 
            variant={member.approvalStatus === 'approved' ? 'success' : member.approvalStatus === 'pending' ? 'warning' : 'danger'}
          >
            {t(`admin.members.status.${member.approvalStatus}`)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.businessNumber')}</label>
            <span className="text-base text-gray-900">{member.businessNumber || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.companyName')}</label>
            <span className="text-base text-gray-900">{member.companyName || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.representative')}</label>
            <span className="text-base text-gray-900">{member.representative || member.representativeName || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.legalNumber')}</label>
            <span className="text-base text-gray-900">{member.legalNumber || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.address')}</label>
            <span className="text-base text-gray-900">{member.address || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.industry')}</label>
            <span className="text-base text-gray-900">{member.industry || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.phone')}</label>
            <span className="text-base text-gray-900">{member.phone || '-'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.email')}</label>
            <span className="text-base text-gray-900">{member.email || '-'}</span>
          </div>
        </div>


      </Card>

      {/* Nice D&B 信息卡片 */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">{t('admin.members.detail.nicednbInfo')}</h2>
          <Button 
            onClick={handleSearchNiceDnb}
            disabled={niceDnbLoading || !member?.businessNumber}
            loading={niceDnbLoading}
            variant="outline"
          >
            {t('admin.members.detail.searchNiceDnb') || '查询 Nice D&B'}
          </Button>
        </div>

        {niceDnbLoading && (
          <Loading text={t('common.loading') || '查询中...'} />
        )}

        {niceDnbError && (
          <div className="p-8 text-center text-red-600">
            <p>{niceDnbError}</p>
          </div>
        )}

        {!niceDnbData && !niceDnbLoading && !niceDnbError && (
          <div className="p-12 text-center text-gray-500">
            <p className="mb-4">{t('admin.members.detail.nicednbPlaceholder')}</p>
          </div>
        )}

        {niceDnbData && niceDnbData.success && niceDnbData.data && (
          <div className="mt-6">
            {/* 如果 API 返回的营业执照号与查询时使用的不一致，显示警告 */}
            {niceDnbData.data.businessNumber && member.businessNumber && 
             niceDnbData.data.businessNumber.replace(/-/g, '') !== member.businessNumber.replace(/-/g, '') && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <strong>提示：</strong>查询使用的营业执照号为 <strong>{member.businessNumber}</strong>，但 Nice D&B API 返回的营业执照号为 <strong>{niceDnbData.data.businessNumber}</strong>，两者不一致。
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.businessNumber')}</label>
                <span className="text-base text-gray-900">{niceDnbData.data.businessNumber || member.businessNumber || '-'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.companyName')}</label>
                <span className="text-base text-gray-900">{niceDnbData.data.companyName || '-'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.representative')}</label>
                <span className="text-base text-gray-900">{niceDnbData.data.representative || '-'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.address')}</label>
                <span className="text-base text-gray-900">{niceDnbData.data.address || '-'}</span>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.industry')}</label>
                <span className="text-base text-gray-900">{niceDnbData.data.industry || '-'}</span>
              </div>
              {niceDnbData.data.establishedDate && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.establishedDate')}</label>
                  <span className="text-base text-gray-900">{new Date(niceDnbData.data.establishedDate).toLocaleDateString()}</span>
                </div>
              )}
              {niceDnbData.data.creditGrade && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.creditGrade')}</label>
                  <Badge variant="info">{niceDnbData.data.creditGrade}</Badge>
                </div>
              )}
            </div>

            {niceDnbData.financials && niceDnbData.financials.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.members.detail.financialData')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-3 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.year')}</th>
                        <th className="px-3 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.revenue')}</th>
                        <th className="px-3 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.profit')}</th>
                        <th className="px-3 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.assets')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {niceDnbData.financials.map((financial, index) => (
                        <tr key={index}>
                          <td className="px-3 py-3 text-gray-700 border-b border-gray-200">{financial.year || '-'}</td>
                          <td className="px-3 py-3 text-gray-700 border-b border-gray-200">{financial.revenue ? financial.revenue.toLocaleString() : '-'}</td>
                          <td className="px-3 py-3 text-gray-700 border-b border-gray-200">{financial.profit ? financial.profit.toLocaleString() : '-'}</td>
                          <td className="px-3 py-3 text-gray-700 border-b border-gray-200">{financial.assets ? financial.assets.toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {niceDnbData.insights && niceDnbData.insights.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.members.detail.insights')}</h3>
                <ul className="list-none p-0 m-0">
                  {niceDnbData.insights.map((insight, index) => (
                    <li key={index} className="px-3 py-3 mb-2 bg-gray-50 border-l-4 border-green-500 rounded">
                      <strong className="text-gray-900 mr-2">{insight.title || t('admin.members.detail.insight')}:</strong>
                      <span className="text-gray-700">{insight.description || '-'}</span>
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

