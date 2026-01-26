/**
 * Company Info Component
 *
 * 企业信息页面。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useCompanyInfo } from "../../hooks/useCompanyInfo";
import {
  Card,
  Button,
  Alert,
  Loading,
  LoginModal,
  Badge,
} from "@shared/components";
import { UserIcon } from "@shared/components/Icons";
import CompanyProfileHeader from "./CompanyProfileHeader";
import CompanyBasicInfo from "./CompanyBasicInfo";
import CompanyRepresentativeInfo from "./CompanyRepresentativeInfo";
import CompanyContactPersonInfo from "./CompanyContactPersonInfo";
import CompanyBusinessInfo from "./CompanyBusinessInfo";
import CompanyInvestmentStatus from "./CompanyInvestmentStatus";

const CompanyInfo = () => {
  const { t } = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const {
    isAuthenticated,
    isEditing,
    setIsEditing,
    loading,
    saving,
    fieldErrors,
    message,
    messageVariant,
    companyData,
    uploadingLogo,
    handleChange,
    handleCooperationFieldChange,
    handleParticipationProgramChange,
    handleInvestmentStatusChange,
    handleSave,
    handleCancel,
    handleLogoUpload,
  } = useCompanyInfo();

  if (!isAuthenticated) {
    return (
      <div className="performance-company-info w-full max-w-full">
        <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
            {t("performance.companyInfo.title", "企业信息")}
          </h1>
        </div>
        <Card>
          <div className="text-center p-12">
            <div className="mb-6 flex justify-center">
              <UserIcon className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {t("performance.companyInfo.profile.loginRequired", "需要登录")}
            </h2>
            <p className="text-gray-500 mb-8">
              {t(
                "performance.companyInfo.profile.loginRequiredDesc",
                "请先登录以查看企业信息",
              )}
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="primary" onClick={() => setShowLoginModal(true)}>
                {t("common.login", "登录")}
              </Button>
              <Link to="/member/register">
                <Button variant="secondary">
                  {t("common.register", "注册")}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  if (loading && !companyData.companyName) {
    return <Loading />;
  }

  return (
    <div className="performance-company-info w-full max-w-full pb-20">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant}>{message}</Alert>
        </div>
      )}

      <CompanyProfileHeader
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        approvalStatus={companyData.approvalStatus}
      />

      <div className="space-y-6 sm:space-y-8">
        <CompanyBasicInfo
          data={companyData}
          isEditing={isEditing}
          onChange={handleChange}
          onLogoUpload={handleLogoUpload}
          uploadingLogo={uploadingLogo}
          errors={fieldErrors}
        />

        <CompanyRepresentativeInfo
          data={companyData}
          isEditing={isEditing}
          onChange={handleChange}
          errors={fieldErrors}
        />

        <CompanyContactPersonInfo
          data={companyData}
          isEditing={isEditing}
          onChange={handleChange}
          errors={fieldErrors}
        />

        <CompanyBusinessInfo
          data={companyData}
          isEditing={isEditing}
          onChange={handleChange}
          onCooperationChange={handleCooperationFieldChange}
          onParticipationChange={handleParticipationProgramChange}
        />

        <CompanyInvestmentStatus
          data={companyData}
          isEditing={isEditing}
          onChange={handleInvestmentStatusChange}
        />
      </div>
    </div>
  );
};

export default CompanyInfo;
