/**
 * Company Basic Info
 *
 * 企业基本信息部分。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Card, Input, Textarea, Select, Button } from "@shared/components";

const CompanyBasicInfo = ({
  data,
  isEditing,
  onChange,
  onLogoUpload,
  uploadingLogo,
  errors,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="shadow-sm p-0">
      <div className="flex items-center gap-3 border-b border-gray-100 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-gray-900 m-0">
          {t("performance.companyInfo.sections.basicInfo", "基本信息")}
        </h2>
      </div>
      <div className="p-6 sm:p-8 space-y-6">
        {/* Logo */}
        <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3 sm:mb-4">
            {t("performance.companyInfo.sections.logo", "企业Logo")}
          </label>
          <div className="flex flex-col items-start gap-4">
            {isEditing ? (
              <>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={(e) => onLogoUpload(e.target.files[0])}
                  className="hidden"
                  disabled={uploadingLogo}
                />
                {uploadingLogo ? (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-blue-300 rounded-lg flex flex-col items-center justify-center bg-blue-50">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                    <span className="text-xs text-blue-600">
                      {t("common.uploading", "上传中...")}
                    </span>
                  </div>
                ) : data.logoPreview || data.logoUrl ? (
                  <div
                    className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() =>
                      document.getElementById("logo-upload")?.click()
                    }
                    title={t(
                      "performance.companyInfo.profile.clickToChangeLogo",
                      "点击更换Logo",
                    )}
                  >
                    <img
                      src={data.logoPreview || data.logoUrl}
                      alt="Company Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "";
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 text-xs sm:text-sm hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() =>
                      document.getElementById("logo-upload")?.click()
                    }
                    title={t(
                      "performance.companyInfo.profile.clickToUploadLogo",
                      "点击上传Logo",
                    )}
                  >
                    {t("performance.companyInfo.profile.noLogo", "无Logo")}
                  </div>
                )}
                <small className="text-xs text-gray-500">
                  {t(
                    "performance.companyInfo.profile.logoHint",
                    "支持 JPG, PNG, GIF 格式，最大 10MB",
                  )}
                </small>
              </>
            ) : (
              <>
                {data.logoUrl ? (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                    <img
                      src={data.logoUrl}
                      alt="Company Logo"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "";
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 text-xs sm:text-sm">
                    {t("performance.companyInfo.profile.noLogo", "无Logo")}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label={t("performance.companyInfo.fields.companyName", "企业名称")}
            value={data.companyName}
            onChange={(e) => onChange("companyName", e.target.value)}
            disabled={!isEditing}
            required
            error={errors.companyName}
          />
          <Input
            label={t("performance.companyInfo.fields.email", "电子邮箱")}
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            disabled={!isEditing}
            error={errors.email}
          />
          <Input
            label={t(
              "performance.companyInfo.fields.businessNumber",
              "工商注册号",
            )}
            value={data.businessNumber}
            onChange={(e) => onChange("businessNumber", e.target.value)}
            disabled={!isEditing}
            error={errors.businessNumber}
          />
          <Input
            label={t(
              "performance.companyInfo.fields.corporationNumber",
              "法人注册号",
            )}
            value={data.legalNumber}
            onChange={(e) => onChange("legalNumber", e.target.value)}
            disabled={!isEditing}
            error={errors.legalNumber}
          />
          <Input
            label={t("performance.companyInfo.fields.foundingDate", "成立日期")}
            type="date"
            value={data.foundingDate}
            onChange={(e) => onChange("foundingDate", e.target.value)}
            disabled={!isEditing}
            required
            error={errors.foundingDate}
          />
          <Input
            label={t("performance.companyInfo.fields.website", "公司网站")}
            value={data.website}
            onChange={(e) => onChange("website", e.target.value)}
            disabled={!isEditing}
            placeholder="https://"
            error={errors.website}
          />
        </div>
        <div className="grid grid-cols-1 gap-6">
          <Input
            label={t("performance.companyInfo.fields.address", "公司地址")}
            value={data.address}
            onChange={(e) => onChange("address", e.target.value)}
            disabled={!isEditing}
            required
            error={errors.address}
          />
          <Textarea
            label={t("performance.companyInfo.fields.description", "公司介绍")}
            value={data.description}
            onChange={(e) => onChange("description", e.target.value)}
            disabled={!isEditing}
            rows={4}
          />
        </div>
      </div>
    </Card>
  );
};

export default CompanyBasicInfo;
