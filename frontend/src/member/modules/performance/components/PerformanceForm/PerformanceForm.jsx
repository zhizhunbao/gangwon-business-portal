/**
 * Performance Form Component
 *
 * 成果输入表单。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { usePerformanceForm } from "../../hooks/usePerformanceForm";
import {
  Card,
  Button,
  Input,
  Select,
  Tabs,
  Modal,
  ModalFooter,
  Loading,
} from "@shared/components";
import SalesEmploymentForm from "./SalesEmploymentForm";
import GovernmentSupportForm from "./GovernmentSupportForm";
import IntellectualPropertyForm from "./IntellectualPropertyForm";

const PerformanceForm = () => {
  const { t } = useTranslation();
  const {
    id,
    formData,
    loading,
    saving,
    activeTab,
    setActiveTab,
    submitConfirm,
    setSubmitConfirm,
    uploading,
    uploadAttachments,
    handleChange,
    handleNestedChange,
    handleSaveDraft,
    confirmSubmit,
  } = usePerformanceForm();

  if (loading) return <Loading />;

  const tabs = [
    {
      key: "salesEmployment",
      label: t("performance.tabs.salesEmployment", "销售额雇佣"),
    },
    {
      key: "governmentSupport",
      label: t("performance.tabs.governmentSupport", "政府支持受惠历史"),
    },
    {
      key: "intellectualProperty",
      label: t("performance.tabs.intellectualProperty", "知识产权"),
    },
  ];

  const quarterOptions = [
    { value: "1", label: t("performance.quarter1", "第一季度") },
    { value: "2", label: t("performance.quarter2", "第二季度") },
    { value: "3", label: t("performance.quarter3", "第三季度") },
    { value: "4", label: t("performance.quarter4", "第四季度") },
  ];

  return (
    <div className="performance-form w-full max-w-full pb-20">
      <div className="mb-6 sm:mb-8 lg:mb-10 flex justify-between items-center gap-4 min-h-[48px]">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {id
            ? t("performance.edit", "编辑成果")
            : t("performance.createNew", "注册成果")}
        </h1>
        <div className="flex gap-3 flex-shrink-0">
          <Button
            onClick={handleSaveDraft}
            variant="secondary"
            disabled={saving}
          >
            {t("performance.saveDraft", "保存草稿")}
          </Button>
          <Button
            onClick={() => setSubmitConfirm({ open: true })}
            variant="primary"
            disabled={saving}
          >
            {t("common.submit", "제출")}
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t("performance.sections.basicInfo", "기본 정보")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("performance.year", "연도")}
              type="number"
              value={formData.year}
              onChange={(e) =>
                handleChange(
                  "year",
                  parseInt(e.target.value) || new Date().getFullYear(),
                )
              }
              required
            />
            <Select
              label={t("performance.quarter", "분기")}
              value={formData.quarter}
              onChange={(e) => handleChange("quarter", e.target.value)}
              options={quarterOptions}
              placeholder={t("performance.annual", "연간")}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          <div className="mt-6">
            {activeTab === "salesEmployment" && (
              <SalesEmploymentForm
                data={formData.salesEmployment}
                year={formData.year}
                onChange={handleNestedChange}
                onUpload={uploadAttachments}
                uploading={uploading}
              />
            )}
            {activeTab === "governmentSupport" && (
              <GovernmentSupportForm
                data={formData.governmentSupport}
                onChange={(val) => handleChange("governmentSupport", val)}
                onUpload={uploadAttachments}
                uploading={uploading}
              />
            )}
            {activeTab === "intellectualProperty" && (
              <IntellectualPropertyForm
                data={formData.intellectualProperty}
                onChange={(val) => handleChange("intellectualProperty", val)}
                onUpload={uploadAttachments}
                uploading={uploading}
              />
            )}
          </div>
        </div>
      </Card>

      <Modal
        isOpen={submitConfirm.open}
        onClose={() => setSubmitConfirm({ open: false })}
        title={t("common.confirmSubmitTitle", "提交确认")}
        size="sm"
      >
        <p className="py-4 text-gray-700">
          {t(
            "performance.confirmSubmitMessage",
            "提交后可能无法修改。是否继续？",
          )}
        </p>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setSubmitConfirm({ open: false })}
          >
            {t("common.cancel", "취소")}
          </Button>
          <Button variant="primary" onClick={confirmSubmit} disabled={saving}>
            {t("common.submit", "제출")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PerformanceForm;
