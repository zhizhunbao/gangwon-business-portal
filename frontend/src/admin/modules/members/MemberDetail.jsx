/**
 * Member Detail Component - Admin Portal
 * 企业会员详情
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Loading } from '@shared/components';
import { adminService } from '@shared/services';
import { formatDate } from '@shared/utils/format';

export default function MemberDetail() {
  const { t, i18n } = useTranslation();
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
    const memberData = await adminService.getMemberDetail(id);
    if (memberData) {
      setMember(memberData);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    await adminService.approveMember(id);
    loadMemberDetail();
  };

  const handleReject = async () => {
    const reason = prompt(t('admin.members.rejectReason', '请输入拒绝原因（可选）') || '请输入拒绝原因（可选）');
    await adminService.rejectMember(id, reason || null);
    loadMemberDetail();
  };

  const handleSearchNiceDnb = async () => {
    if (!member || !member.businessNumber) {
      setNiceDnbError('营业执照号码不可用');
      return;
    }

    setNiceDnbLoading(true);
    setNiceDnbError(null);
    
    const data = await adminService.searchNiceDnb(member.businessNumber);
    setNiceDnbData(data);
    setNiceDnbLoading(false);
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
            <span className="text-base text-gray-900">{member.representative || '-'}</span>
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
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">状态</label>
            <div>
              <Badge 
                variant={member.approvalStatus === 'approved' ? 'success' : member.approvalStatus === 'pending' ? 'warning' : 'danger'}
              >
                {t(`admin.members.status.${member.approvalStatus}`)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.createdAt', '가입일시')}</label>
            <span className="text-base text-gray-900">
              {member.createdAt ? formatDate(member.createdAt, 'yyyy-MM-dd HH:mm', i18n.language) : '-'}
            </span>
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
          <div className="mt-6 space-y-6">
            {/* 如果 API 返回的营业执照号与查询时使用的不一致，显示警告 */}
            {niceDnbData.data.businessNumber && member.businessNumber && 
             niceDnbData.data.businessNumber.replace(/-/g, '') !== member.businessNumber.replace(/-/g, '') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <strong>提示：</strong>查询使用的营业执照号为 <strong>{member.businessNumber}</strong>，但 Nice D&B API 返回的营业执照号为 <strong>{niceDnbData.data.businessNumber}</strong>，两者不一致。
              </div>
            )}

            {/* 基础信息卡片 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                {t('admin.members.detail.basicInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.businessNumber')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.businessNumber || member.businessNumber || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.legalNumber')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.legalNumber || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.companyName')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.companyName || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.companyNameEn')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.companyNameEn || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.representative')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.representative || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.establishedDate')}</label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.establishedDate 
                      ? formatDate(niceDnbData.data.establishedDate, 'yyyy-MM-dd', i18n.language)
                      : '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.address')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.address || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.zipCode')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.zipCode || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.phone')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.phone || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.fax')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.fax || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.email')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.email || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.industry')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.industry || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.industryCode')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.industryCode || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.companyScale')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.companyScale || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.companyType')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.companyType || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.mainBusiness')}</label>
                  <span className="text-base text-gray-900">{niceDnbData.data.mainBusiness || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.employeeCount')}</label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.employeeCount ? `${niceDnbData.data.employeeCount} 人` : '-'}
                    {niceDnbData.data.employeeCountDate && ` (${niceDnbData.data.employeeCountDate})`}
                  </span>
                </div>
              </div>
            </Card>

            {/* 信用信息卡片 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                {t('admin.members.detail.creditInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.creditGrade')}</label>
                  {niceDnbData.data.creditGrade ? (
                    <Badge variant="info" className="w-fit">{niceDnbData.data.creditGrade}</Badge>
                  ) : (
                    <span className="text-base text-gray-900">-</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.creditDate')}</label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.creditDate 
                      ? `${niceDnbData.data.creditDate.substring(0, 4)}-${niceDnbData.data.creditDate.substring(4, 6)}-${niceDnbData.data.creditDate.substring(6, 8)}`
                      : '-'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 财务数据卡片 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                {t('admin.members.detail.financialData')}
              </h3>
              
              {/* 当前财务指标 */}
              {(niceDnbData.data.salesAmount || niceDnbData.data.operatingProfit || niceDnbData.data.assetAmount) && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-4">当前财务指标（单位：千韩元）</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {niceDnbData.data.salesAmount && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.salesAmount')}</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {niceDnbData.data.salesAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.operatingProfit && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.operatingProfit')}</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {niceDnbData.data.operatingProfit.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.shareholderEquity && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.shareholderEquity')}</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {niceDnbData.data.shareholderEquity.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.debtAmount && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.debtAmount')}</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {niceDnbData.data.debtAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.assetAmount && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">{t('admin.members.detail.assetAmount')}</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {niceDnbData.data.assetAmount.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 财务历史数据表格 */}
              {niceDnbData.financials && niceDnbData.financials.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">财务历史数据</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.year')}</th>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.revenue')}</th>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.profit')}</th>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">{t('admin.members.detail.employees')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {niceDnbData.financials.map((financial, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">{financial.year || '-'}</td>
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">
                              {financial.revenue ? `${(financial.revenue / 100000000).toFixed(2)} 亿韩元` : '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">
                              {financial.profit ? `${(financial.profit / 100000000).toFixed(2)} 亿韩元` : '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">
                              {financial.employees ? `${financial.employees.toLocaleString()} 人` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}


