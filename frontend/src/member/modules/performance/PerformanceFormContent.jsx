/**
 * Performance Form Content - Member Portal
 * 成果输入表单组件
 */

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks';
import Card from '@shared/components/Card';
import Button from '@shared/components/Button';
import Input from '@shared/components/Input';
import Textarea from '@shared/components/Textarea';
import Select from '@shared/components/Select';
import { Tabs } from '@shared/components';
import { performanceService, uploadService, loggerService, exceptionService } from '@shared/services';
import { 
  DocumentIcon,
  CheckCircleIcon, 
  XIcon,
  PlusIcon,
  TrashIcon
} from '@shared/components/Icons';

export default function PerformanceFormContent() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('salesEmployment');
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    quarter: '',
    salesEmployment: {
      sales: { previousYear: '', reportingDate: '' },
      export: { previousYear: '', reportingDate: '' },
      employment: {
        currentEmployees: { previousYear: '', reportingDate: '' },
        newEmployees: { previousYear: '', reportingDate: '' },
        totalEmployees: { previousYear: '', reportingDate: '' }
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
    try {
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
    } catch (error) {
      loggerService.error('Failed to load performance record', {
        module: 'PerformanceFormContent',
        function: 'loadRecord',
        record_id: id,
        error_message: error.message
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'LOAD_RECORD_FAILED'
      });
      alert(error.response?.data?.detail || error.message || t('message.loadFailed', '加载失败'));
    } finally {
      setLoading(false);
    }
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
    if (!isAuthenticated) {
      alert(t('auth.loginRequired', '请先登录'));
      return;
    }

    setSaving(true);
    try {
      const backendData = performanceService.convertFormDataToBackendFormat(formData);
      
      if (id) {
        await performanceService.updateRecord(id, backendData);
      } else {
        await performanceService.createRecord(backendData);
      }
      
      alert(t('performance.saveDraft', '保存成功'));
      navigate('/member/performance/list');
    } catch (error) {
      loggerService.error('Failed to save performance record', {
        module: 'PerformanceFormContent',
        function: 'handleSaveDraft',
        error_message: error.message
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'SAVE_RECORD_FAILED'
      });
      alert(error.response?.data?.detail || error.message || t('message.saveFailed', '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      alert(t('auth.loginRequired', '请先登录'));
      return;
    }

    if (!window.confirm(t('performance.submitConfirm', '确定要提交此成果记录吗？提交后将无法修改。'))) {
      return;
    }

    setSaving(true);
    try {
      const backendData = performanceService.convertFormDataToBackendFormat(formData);
      let recordId = id;
      
      if (!recordId) {
        const created = await performanceService.createRecord(backendData);
        recordId = created.id;
      } else {
        await performanceService.updateRecord(recordId, backendData);
      }
      
      await performanceService.submitRecord(recordId);
      alert(t('performance.submitSuccess', '提交成功'));
      navigate('/member/performance/list');
    } catch (error) {
      loggerService.error('Failed to submit performance record', {
        module: 'PerformanceFormContent',
        function: 'handleSubmit',
        error_message: error.message
      });
      exceptionService.recordException(error, {
        request_path: window.location.pathname,
        error_code: error.code || 'SUBMIT_RECORD_FAILED'
      });
      alert(error.response?.data?.detail || error.message || t('message.submitFailed', '提交失败'));
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'salesEmployment', label: t('performance.tabs.salesEmployment', '매출 고용') },
    { key: 'governmentSupport', label: t('performance.tabs.governmentSupport', '정부지원 수혜 이력') },
    { key: 'intellectualProperty', label: t('performance.tabs.intellectualProperty', '지식재산권') }
  ];

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
    <div className="performance-form-content w-full max-w-full p-6 pb-8 sm:p-8 sm:pb-10 lg:p-10 lg:pb-12">
      <div className="mb-6 sm:mb-8 flex justify-between items-center gap-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
          {id ? t('performance.edit', '성과 수정') : t('performance.createNew', '성과 등록')}
        </h1>
        <div className="flex gap-3">
          <Button 
            onClick={handleSaveDraft} 
            variant="secondary"
            disabled={saving}
            className="flex items-center gap-2"
          >
            <DocumentIcon className="w-4 h-4" />
            {t('performance.saveDraft', '임시저장')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2"
          >
            <CheckCircleIcon className="w-4 h-4" />
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
                {t('performance.year', '연도')}
              </label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => handleChange('year', parseInt(e.target.value) || new Date().getFullYear())}
                min="2000"
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('performance.quarter', '분기')}
              </label>
              <Select
                value={formData.quarter}
                onChange={(e) => handleChange('quarter', e.target.value)}
              >
                <option value="">{t('performance.annual', '연간')}</option>
                <option value="1">{t('performance.quarter1', '1분기')}</option>
                <option value="2">{t('performance.quarter2', '2분기')}</option>
                <option value="3">{t('performance.quarter3', '3분기')}</option>
                <option value="4">{t('performance.quarter4', '4분기')}</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {t('performance.quarterHint', '분기를 선택하지 않으면 연간 성과로 처리됩니다.')}
              </p>
            </div>
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-semibold mb-4">{t('performance.salesEmploymentFields.sales', '매출액')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                <div>
                  <h3 className="text-md font-semibold mb-4">{t('performance.salesEmploymentFields.employment', '고용 창출')}</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.salesEmploymentFields.currentEmployees', '현재 직원 수')}
                        </label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.currentEmployees?.reportingDate || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.currentEmployees.reportingDate', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('performance.salesEmploymentFields.newEmployees', '신규 고용 인원')}
                        </label>
                        <Input
                          type="text"
                          value={formData.salesEmployment?.employment?.newEmployees?.reportingDate || ''}
                          onChange={(e) => handleNestedChange('salesEmployment.employment.newEmployees.reportingDate', e.target.value)}
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
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t('performance.governmentSupportFields.add', '추가')}
                  </Button>
                </div>
                {(formData.governmentSupport || []).map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">#{index + 1}</h4>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            governmentSupport: prev.governmentSupport.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-600"
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
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t('common.add', '추가')}
                  </Button>
                </div>
                {(formData.intellectualProperty || []).map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium">#{index + 1}</h4>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            intellectualProperty: prev.intellectualProperty.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

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
    </div>
  );
}

