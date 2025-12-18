/**
 * Performance Form Content - Member Portal
 * 成果输入表单组件
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import Select from '@shared/components/Select';
import { Tabs, Modal, ModalFooter } from '@shared/components';
import { performanceService, uploadService } from '@shared/services';
import { 
  DocumentIcon,
  CheckCircleIcon, 
  XIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon
} from '@shared/components/Icons';

export default function PerformanceFormContent() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('salesEmployment');
  const [submitConfirm, setSubmitConfirm] = useState({ open: false });
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    quarter: '',
    salesEmployment: {
      sales: { previousYear: '', currentYear: '', reportingDate: '' },
      export: { previousYear: '', currentYear: '', reportingDate: '' },
      employment: {
        currentEmployees: { previousYear: '', currentYear: '' },
        newEmployees: { previousYear: '', currentYear: '' },
        totalEmployees: { previousYear: '', currentYear: '' }
      }
    },
    governmentSupport: [],
    intellectualProperty: [],
    attachments: [],
    notes: ''
  });

  useEffect(() => {
    if (id && isAuthenticated) {
      loadRecord();
    }
  }, [id, isAuthenticated, i18n.language]);

  const loadRecord = async () => {
    if (!id) return;
    setLoading(true);
    const record = await performanceService.getRecord(id);
    if (record) {
      const dataJson = typeof record.dataJson === 'string' 
        ? JSON.parse(record.dataJson) 
        : record.dataJson || {};
      
      setFormData({
        year: record.year,
        quarter: record.quarter ? record.quarter.toString() : '',
        salesEmployment: dataJson.sales_employment || formData.salesEmployment,
        governmentSupport: dataJson.government_support || [],
        intellectualProperty: dataJson.intellectual_property || [],
        attachments: dataJson.attachments || [],
        notes: dataJson.notes || ''
      });
    }
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedChange = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] = { ...current[keys[i]] };
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    const backendData = performanceService.convertFormDataToBackendFormat(formData);
    
    if (id) {
      await performanceService.updateRecord(id, backendData);
    } else {
      await performanceService.createRecord(backendData);
    }
    
    setSaving(false);
    navigate('/member/performance/list');
  };

  const handleSubmit = () => {
    setSubmitConfirm({ open: true });
  };

  const confirmSubmit = async () => {
    setSaving(true);
    const backendData = performanceService.convertFormDataToBackendFormat(formData);
    let recordId = id;
    
    if (!recordId) {
      const created = await performanceService.createRecord(backendData);
      recordId = created.id;
    } else {
      await performanceService.updateRecord(recordId, backendData);
    }
    
    await performanceService.submitRecord(recordId);
    setSaving(false);
    setSubmitConfirm({ open: false });
    navigate('/member/performance/list');
  };

  const tabs = [
    { key: 'salesEmployment', label: t('performance.tabs.salesEmployment', '매출 고용') },
    { key: 'governmentSupport', label: t('performance.tabs.governmentSupport', '정부지원 수혜 이력') },
    { key: 'intellectualProperty', label: t('performance.tabs.intellectualProperty', '지식재산권') }
  ];

  // 季度选项
  const quarterOptions = useMemo(() => [
    { value: '1', label: t('performance.quarter1', '1분기') },
    { value: '2', label: t('performance.quarter2', '2분기') },
    { value: '3', label: t('performance.quarter3', '3분기') },
    { value: '4', label: t('performance.quarter4', '4분기') }
  ], [t]);

  // 知识产权类型选项
  const ipTypeOptions = useMemo(() => [
    { value: 'patent', label: t('performance.intellectualPropertyFields.types.patent', '특허') },
    { value: 'trademark', label: t('performance.intellectualPropertyFields.types.trademark', '상표권') },
    { value: 'utility', label: t('performance.intellectualPropertyFields.types.utility', '실용신안') },
    { value: 'design', label: t('performance.intellectualPropertyFields.types.design', '디자인') },
    { value: 'other', label: t('performance.intellectualPropertyFields.types.other', '기타') }
  ], [t]);

  // 知识产权登记类型选项
  const registrationTypeOptions = useMemo(() => [
    { value: 'application', label: t('performance.intellectualPropertyFields.registrationTypes.application', '신청') },
    { value: 'registered', label: t('performance.intellectualPropertyFields.registrationTypes.registered', '등록') }
  ], [t]);

  // 国家选项
  const countryOptions = useMemo(() => [
    { value: 'korea', label: t('performance.intellectualPropertyFields.countries.korea', '대한민국') },
    { value: 'usa', label: t('performance.intellectualPropertyFields.countries.usa', '미국') },
    { value: 'china', label: t('performance.intellectualPropertyFields.countries.china', '중국') },
    { value: 'japan', label: t('performance.intellectualPropertyFields.countries.japan', '일본') },
    { value: 'europe', label: t('performance.intellectualPropertyFields.countries.europe', '유럽') },
    { value: 'uk', label: t('performance.intellectualPropertyFields.countries.uk', '영국') },
    { value: 'other', label: t('performance.intellectualPropertyFields.countries.other', '기타 국가') }
  ], [t]);

  // 海外申请类型选项
  const overseasTypeOptions = useMemo(() => [
    { value: 'domestic', label: t('performance.intellectualPropertyFields.overseasTypes.domestic', '국내 신청') },
    { value: 'pct', label: t('performance.intellectualPropertyFields.overseasTypes.pct', 'PCT 해외 신청') },
    { value: 'general', label: t('performance.intellectualPropertyFields.overseasTypes.general', '일반 해외 신청') }
  ], [t]);

  // 附件上传处理
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    const uploadedFiles = await uploadService.uploadAttachments(files);
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), ...uploadedFiles]
    }));
    setUploading(false);
    e.target.value = '';
  };

  // 删除附件
  const handleRemoveAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading', '加载中...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="performance-form-content w-full max-w-full">
      {/* 固定高度的标题栏 */}
      <div className="mb-6 sm:mb-8 lg:mb-10 flex justify-between items-center gap-4 min-h-[48px]">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {id ? t('performance.edit', '성과 수정') : t('performance.createNew', '성과 등록')}
        </h1>
        <div className="flex gap-3 flex-shrink-0">
          <Button 
            onClick={handleSaveDraft} 
            variant="secondary"
            disabled={saving}
          >
            {t('performance.saveDraft', '임시저장')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="primary"
            disabled={saving}
          >
            {t('common.submit', '제출')}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('performance.sections.basicInfo', '기본 정보')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('performance.year', '연도')} <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => handleChange('year', parseInt(e.target.value) || new Date().getFullYear())}
                min="2000"
                max={new Date().getFullYear() + 1}
                required
              />
            </div>
            <Select
              label={t('performance.quarter', '분기')}
              value={formData.quarter}
              onChange={(e) => handleChange('quarter', e.target.value)}
              options={quarterOptions}
              placeholder={t('performance.annual', '연간')}
              help={t('performance.quarterHint', '분기를 선택하지 않으면 연간 성과로 처리됩니다.')}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <Tabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={setActiveTab}
          />
          
          <div className="mt-6">
            {activeTab === 'salesEmployment' && (
              <div className="space-y-8">
                {/* 매출액 (销售额) */}
                <div>
                  <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">
                    {t('performance.salesEmploymentFields.sales', '매출액')}
                    <span className="text-sm font-normal text-gray-500 ml-2">({t('performance.salesEmploymentFields.unit.won', '원')})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('performance.salesEmploymentFields.previousYear', '전년도')}
                      </label>
                      <Input
                        type="text"
                        value={formData.salesEmployment?.sales?.previousYear || ''}
                        onChange={(e) => handleNestedChange('salesEmployment.sales.previousYear', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.year}{t('performance.year', '연도')}
                      </label>
                      <Input
                        type="text"
                        value={formData.salesEmployment?.sales?.currentYear || ''}
                        onChange={(e) => handleNestedChange('salesEmployment.sales.currentYear', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('performance.salesEmploymentFields.reportingDate', '작성 기준일')}
                      </label>
                      <Input
                        type="date"
                        value={formData.salesEmployment?.sales?.reportingDate || ''}
                        onChange={(e) => handleNestedChange('salesEmployment.sales.reportingDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 수출액 (出口额) */}
                <div>
                  <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">
                    {t('performance.salesEmploymentFields.export', '수출액')}
                    <span className="text-sm font-normal text-gray-500 ml-2">({t('performance.salesEmploymentFields.unit.won', '원')})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('performance.salesEmploymentFields.previousYear', '전년도')}
                      </label>
                      <Input
                        type="text"
                        value={formData.salesEmployment?.export?.previousYear || ''}
                        onChange={(e) => handleNestedChange('salesEmployment.export.previousYear', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.year}{t('performance.year', '연도')}
                      </label>
                      <Input
                        type="text"
                        value={formData.salesEmployment?.export?.currentYear || ''}
                        onChange={(e) => handleNestedChange('salesEmployment.export.currentYear', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('performance.salesEmploymentFields.reportingDate', '작성 기준일')}
                      </label>
                      <Input
                        type="date"
                        value={formData.salesEmployment?.export?.reportingDate || ''}
                        onChange={(e) => handleNestedChange('salesEmployment.export.reportingDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 고용 창출 (雇佣创造) */}
                <div>
                  <h3 className="text-md font-semibold mb-4 pb-2 border-b border-gray-200">
                    {t('performance.salesEmploymentFields.employment', '고용 창출')}
                    <span className="text-sm font-normal text-gray-500 ml-2">({t('performance.salesEmploymentFields.unit.people', '명')})</span>
                  </h3>
                  <div className="space-y-4">
                    {/* 현재 직원 수 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700">
                          {t('performance.salesEmploymentFields.currentEmployees', '현재 직원 수')}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('performance.salesEmploymentFields.previousYear', '전년도')}</label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.currentEmployees?.previousYear || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.currentEmployees.previousYear', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{formData.year}{t('performance.year', '연도')}</label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.currentEmployees?.currentYear || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.currentEmployees.currentYear', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    {/* 신규 고용 인원 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700">
                          {t('performance.salesEmploymentFields.newEmployees', '신규 고용 인원')}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('performance.salesEmploymentFields.previousYear', '전년도')}</label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.newEmployees?.previousYear || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.newEmployees.previousYear', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{formData.year}{t('performance.year', '연도')}</label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.newEmployees?.currentYear || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.newEmployees.currentYear', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    {/* 총 인원 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700">
                          {t('performance.salesEmploymentFields.totalEmployees', '총 인원')}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('performance.salesEmploymentFields.previousYear', '전년도')}</label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.totalEmployees?.previousYear || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.totalEmployees.previousYear', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{formData.year}{t('performance.year', '연도')}</label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.totalEmployees?.currentYear || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.totalEmployees.currentYear', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'governmentSupport' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-semibold">{t('performance.governmentSupport', '정부지원')}</h3>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const newItem = {
                        projectName: '',
                        startupProjectName: '',
                        startDate: '',
                        endDate: '',
                        supportAmount: '',
                        supportOrganization: ''
                      };
                      setFormData(prev => ({
                        ...prev,
                        governmentSupport: [...(prev.governmentSupport || []), newItem]
                      }));
                    }}
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    {t('performance.governmentSupportFields.add', '추가')}
                  </Button>
                </div>
                
                {(formData.governmentSupport || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    {t('common.noData', '데이터가 없습니다')}
                  </div>
                )}
                
                {(formData.governmentSupport || []).map((item, index) => (
                  <Card key={index} className="p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-blue-600">#{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            governmentSupport: prev.governmentSupport.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.governmentSupportFields.projectName', '실행 프로젝트명')}
                        </label>
                        <Input
                          value={item.projectName || ''}
                          onChange={(e) => {
                            const updated = [...formData.governmentSupport];
                            updated[index] = { ...item, projectName: e.target.value };
                            setFormData(prev => ({ ...prev, governmentSupport: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.governmentSupportFields.startupProjectName', '창업 프로젝트명')}
                        </label>
                        <Input
                          value={item.startupProjectName || ''}
                          onChange={(e) => {
                            const updated = [...formData.governmentSupport];
                            updated[index] = { ...item, startupProjectName: e.target.value };
                            setFormData(prev => ({ ...prev, governmentSupport: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.governmentSupportFields.supportOrganization', '지원 기관명')}
                        </label>
                        <Input
                          value={item.supportOrganization || ''}
                          onChange={(e) => {
                            const updated = [...formData.governmentSupport];
                            updated[index] = { ...item, supportOrganization: e.target.value };
                            setFormData(prev => ({ ...prev, governmentSupport: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.governmentSupportFields.supportAmount', '지원 금액')}
                          <span className="text-xs text-gray-500 ml-1">({t('performance.governmentSupportFields.supportAmountUnit', '천원')})</span>
                        </label>
                        <Input
                          type="text"
                          value={item.supportAmount || ''}
                          onChange={(e) => {
                            const updated = [...formData.governmentSupport];
                            updated[index] = { ...item, supportAmount: e.target.value };
                            setFormData(prev => ({ ...prev, governmentSupport: updated }));
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.governmentSupportFields.startDate', '시작일')}
                        </label>
                        <Input
                          type="date"
                          value={item.startDate || ''}
                          onChange={(e) => {
                            const updated = [...formData.governmentSupport];
                            updated[index] = { ...item, startDate: e.target.value };
                            setFormData(prev => ({ ...prev, governmentSupport: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.governmentSupportFields.endDate', '종료일')}
                        </label>
                        <Input
                          type="date"
                          value={item.endDate || ''}
                          onChange={(e) => {
                            const updated = [...formData.governmentSupport];
                            updated[index] = { ...item, endDate: e.target.value };
                            setFormData(prev => ({ ...prev, governmentSupport: updated }));
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'intellectualProperty' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-semibold">{t('performance.intellectualProperty', '지식재산권')}</h3>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const newItem = {
                        name: '',
                        number: '',
                        type: '',
                        registrationType: '',
                        country: '',
                        overseasType: '',
                        registrationDate: '',
                        publicDisclosure: false
                      };
                      setFormData(prev => ({
                        ...prev,
                        intellectualProperty: [...(prev.intellectualProperty || []), newItem]
                      }));
                    }}
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    {t('common.add', '추가')}
                  </Button>
                </div>
                
                {(formData.intellectualProperty || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    {t('common.noData', '데이터가 없습니다')}
                  </div>
                )}
                
                {(formData.intellectualProperty || []).map((item, index) => (
                  <Card key={index} className="p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-blue-600">#{index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            intellectualProperty: prev.intellectualProperty.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.intellectualPropertyFields.name', '지식재산권명')}
                        </label>
                        <Input
                          value={item.name || ''}
                          onChange={(e) => {
                            const updated = [...formData.intellectualProperty];
                            updated[index] = { ...item, name: e.target.value };
                            setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.intellectualPropertyFields.number', '지식재산권번호')}
                        </label>
                        <Input
                          value={item.number || ''}
                          onChange={(e) => {
                            const updated = [...formData.intellectualProperty];
                            updated[index] = { ...item, number: e.target.value };
                            setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Select
                          label={t('performance.intellectualPropertyFields.type', '지식재산권 구분')}
                          value={item.type || ''}
                          onChange={(e) => {
                            const updated = [...formData.intellectualProperty];
                            updated[index] = { ...item, type: e.target.value };
                            setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                          }}
                          options={ipTypeOptions}
                          placeholder={t('common.select', '선택')}
                        />
                      </div>
                      <Select
                        label={t('performance.intellectualPropertyFields.registrationType', '지식재산권 등록 구분')}
                        value={item.registrationType || ''}
                        onChange={(e) => {
                          const updated = [...formData.intellectualProperty];
                          updated[index] = { ...item, registrationType: e.target.value };
                          setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                        }}
                        options={registrationTypeOptions}
                        placeholder={t('common.select', '선택')}
                      />
                      <Select
                        label={t('performance.intellectualPropertyFields.country', '등록 국가')}
                        value={item.country || ''}
                        onChange={(e) => {
                          const updated = [...formData.intellectualProperty];
                          updated[index] = { ...item, country: e.target.value };
                          setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                        }}
                        options={countryOptions}
                        placeholder={t('common.select', '선택')}
                      />
                      <Select
                        label={t('performance.intellectualPropertyFields.overseasType', '해외 신청 구분')}
                        value={item.overseasType || ''}
                        onChange={(e) => {
                          const updated = [...formData.intellectualProperty];
                          updated[index] = { ...item, overseasType: e.target.value };
                          setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                        }}
                        options={overseasTypeOptions}
                        placeholder={t('common.select', '선택')}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.intellectualPropertyFields.registrationDate', '등록일')}
                        </label>
                        <Input
                          type="date"
                          value={item.registrationDate || ''}
                          onChange={(e) => {
                            const updated = [...formData.intellectualProperty];
                            updated[index] = { ...item, registrationDate: e.target.value };
                            setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                          }}
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.publicDisclosure || false}
                            onChange={(e) => {
                              const updated = [...formData.intellectualProperty];
                              updated[index] = { ...item, publicDisclosure: e.target.checked };
                              setFormData(prev => ({ ...prev, intellectualProperty: updated }));
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {t('performance.intellectualPropertyFields.publicDisclosure', '공개 희망 여부')}
                          </span>
                        </label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 증빙서류 (证明文件) */}
      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-2">{t('performance.proofDocument', '증빙서류')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('performance.proofDocumentsDesc', '매출액, 고용인원, 정부지원 등 관련 증빙서류를 업로드해주세요.')}</p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              id="attachment-upload"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <label 
              htmlFor="attachment-upload" 
              className="cursor-pointer flex flex-col items-center"
            >
              {uploading ? (
                <>
                  <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                  <span className="text-sm text-blue-600">{t('common.uploading', '업로드 중...')}</span>
                </>
              ) : (
                <>
                  <UploadIcon className="w-10 h-10 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">{t('common.clickToUpload', '클릭하여 파일 업로드')}</span>
                  <span className="text-xs text-gray-400 mt-1">{t('performance.fileUploadHint', '파일 형식: PDF / 최대 10MB')}</span>
                </>
              )}
            </label>
          </div>
          
          {/* 已上传文件列表 */}
          {(formData.attachments || []).length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('performance.uploadedFiles', '업로드된 파일')}</h3>
              <div className="space-y-2">
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <DocumentIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-700">{file.original_name || file.name}</span>
                      {file.file_size && (
                        <span className="text-xs text-gray-400">
                          ({(file.file_size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 비고 (备注) */}
      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('performance.sections.notes', '비고')}</h2>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder={t('performance.notesPlaceholder', '기타 설명이 필요한 사항을 입력하세요')}
            rows={4}
          />
        </div>
      </Card>

      <Modal
        isOpen={submitConfirm.open}
        onClose={() => setSubmitConfirm({ open: false })}
        title={t('performance.submitConfirmTitle', '提交确认')}
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-700">
            {t('performance.submitConfirm', '确定要提交此成果记录吗？提交后将无法修改。')}
          </p>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setSubmitConfirm({ open: false })}
          >
            {t('common.cancel', '取消')}
          </Button>
          <Button
            variant="primary"
            onClick={confirmSubmit}
            disabled={saving}
          >
            {t('common.confirm', '确认')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

