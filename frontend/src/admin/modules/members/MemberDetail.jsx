/**
 * Member Detail Component - Admin Portal
 * 企业会员详情
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Badge, Loading, Alert } from "@shared/components";
import { adminService } from "@shared/services";
import { useDateFormatter, useMessage } from "@shared/hooks";

export default function MemberDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    formatDateTime,
    formatDate: formatDateOnly,
    formatNumber,
    formatValue,
  } = useDateFormatter();
  const {
    message,
    messageVariant,
    showSuccess,
    showError,
    showWarning,
    clearMessage,
  } = useMessage();
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
    showSuccess(t('admin.members.approveSuccess', '승인 성공'));
    const memberData = await adminService.getMemberDetail(id);
    if (memberData) {
      setMember(memberData);
    }
  };

  const handleReject = async () => {
    const reason = prompt(
      t('admin.members.rejectReason', '거부 사유를 입력하세요 (선택사항)') ||
        "请输入拒绝原因（可选）",
    );
    await adminService.rejectMember(id, reason || null);
    showSuccess(t('admin.members.rejectSuccess', '거부 성공'));
    const memberData = await adminService.getMemberDetail(id);
    if (memberData) {
      setMember(memberData);
    }
  };

  const handleSearchNiceDnb = async () => {
    if (!member || !member.businessNumber) {
      setNiceDnbError(t('admin.members.detail.nicednbNoBusinessNumber', '사업자등록번호를 사용할 수 없습니다'));
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
        <p className="mb-6">{t("admin.members.detail.notFound")}</p>
        <Button onClick={() => navigate("/admin/members")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {message && (
        <Alert variant={messageVariant} className="mb-4" onClose={clearMessage}>
          {message}
        </Alert>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate("/admin/members")}>
          {t("common.back")}
        </Button>
        <div className="flex gap-4">
          {member.approvalStatus === "pending" && (
            <>
              <Button variant="outline" onClick={handleReject}>
                {t("admin.members.reject")}
              </Button>
              <Button onClick={handleApprove}>
                {t("admin.members.approve")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Basic Info Card */}
      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t('performance.companyInfo.sections.basicInfo', '기본 정보')}
          </h2>
        </div>

        {/* Logo Display */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label className="block text-sm text-gray-600 font-medium mb-3">
            {t('performance.companyInfo.sections.logo', '기업 로고')}
          </label>
          {member.logoUrl ? (
            <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
              <img
                src={member.logoUrl}
                alt="Company Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 text-xs sm:text-sm">
              {t('performance.companyInfo.profile.noLogo', '로고 없음')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.companyName", "기업명")}
            </label>
            <span className="text-base text-gray-900">
              {member.companyName || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.businessLicense", "사업자등록번호")}
            </label>
            <span className="text-base text-gray-900">
              {member.businessNumber || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.corporationNumber", "법인등록번호")}
            </label>
            <span className="text-base text-gray-900">
              {member.legalNumber || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.establishedDate", "설립일")}
            </label>
            <span className="text-base text-gray-900">
              {member.foundingDate ? formatDateOnly(member.foundingDate) : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.representative", "대표자")}
            </label>
            <span className="text-base text-gray-900">
              {member.representative || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.representativeBirthDate", "대표자 생년월일")}
            </label>
            <span className="text-base text-gray-900">
              {member.representativeBirthDate
                ? formatDateOnly(member.representativeBirthDate)
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.representativeGender", "대표자 성별")}
            </label>
            <span className="text-base text-gray-900">
              {member.representativeGender === "male"
                ? t("common.male", "남성")
                : member.representativeGender === "female"
                  ? t("common.female", "여성")
                  : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.representativePhone", "대표자 전화번호")}
            </label>
            <span className="text-base text-gray-900">
              {member.representativePhone || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.phone", "기업 전화번호")}
            </label>
            <span className="text-base text-gray-900">
              {member.phone || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.contactPersonName", "담당자명")}
            </label>
            <span className="text-base text-gray-900">
              {member.contactPersonName || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.contactPersonDepartment", "담당자 부서")}
            </label>
            <span className="text-base text-gray-900">
              {member.contactPersonDepartment || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.contactPersonPosition", "담당자 직책")}
            </label>
            <span className="text-base text-gray-900">
              {member.contactPersonPosition || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.contactPersonPhone", "담당자 전화번호")}
            </label>
            <span className="text-base text-gray-900">
              {member.contactPersonPhone || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t('admin.members.table.status', '상태')}
            </label>
            <div>
              <Badge
                variant={
                  member.approvalStatus === "approved"
                    ? "success"
                    : member.approvalStatus === "pending"
                      ? "warning"
                      : "danger"
                }
              >
                {t(`admin.members.status.${member.approvalStatus}`)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("admin.members.detail.createdAt", "가입일시")}
            </label>
            <span className="text-base text-gray-900">
              {member.createdAt ? formatDateTime(member.createdAt) : "-"}
            </span>
          </div>
        </div>
      </Card>

      {/* Address Info Card */}
      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t('performance.companyInfo.sections.addressInfo', '주소 정보')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.address", "주소")}
            </label>
            <span className="text-base text-gray-900">
              {member.address || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.region", "소재지")}
            </label>
            <span className="text-base text-gray-900">
              {member.region
                ? t(`profile.regions.${member.region}`, member.region)
                : "-"}
            </span>
          </div>
        </div>
      </Card>

      {/* Business Info Card */}
      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t('performance.companyInfo.sections.businessInfo', '사업 정보')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.ksicMajor", "한국표준산업분류코드[대분류]")}
            </label>
            <span className="text-base text-gray-900">
              {member.ksicMajor
                ? t(
                    `industryClassification.ksicMajor.${member.ksicMajor}`,
                    member.ksicMajor,
                  )
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.ksicSub", "지역주력산업코드[중분류]")}
            </label>
            <span className="text-base text-gray-900">
              {member.ksicSub
                ? t(
                    `industryClassification.ksicSub.${member.ksicSub}`,
                    member.ksicSub,
                  )
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.mainIndustryKsicMajor", "주력산업 KSIC 코드")}
            </label>
            <span className="text-base text-gray-900">
              {member.mainIndustryKsicMajor
                ? t(
                    `industryClassification.mainIndustryKsic.${member.mainIndustryKsicMajor}`,
                    member.mainIndustryKsicMajor,
                  )
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.mainIndustryKsicCodes", "주력산업 KSIC 세부 코드")}
            </label>
            <span className="text-base text-gray-900">
              {member.mainIndustryKsicCodes
                ? t(
                    `industryClassification.mainIndustryKsicCodes.${member.mainIndustryKsicCodes}`,
                    member.mainIndustryKsicCodes,
                  )
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.category", "기업 유형")}
            </label>
            <span className="text-base text-gray-900">
              {member.category
                ? t(
                    `performance.companyInfo.profile.categories.${member.category}`,
                    member.category,
                  )
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.industry", "업종")}
            </label>
            <span className="text-base text-gray-900">
              {member.industry
                ? t(
                    `industryClassification.startupType.${member.industry}`,
                    member.industry,
                  )
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.businessField", "사업분야")}
            </label>
            <span className="text-base text-gray-900">
              {member.businessField
                ? t(
                    `industryClassification.businessField.${member.businessField}`,
                    member.businessField,
                  )
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.sales", "매출액")}
            </label>
            <span className="text-base text-gray-900">
              {member.revenue ? `${formatNumber(member.revenue)} ${t('common.currency.krw', '원')}` : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.employeeCount", "직원 수")}
            </label>
            <span className="text-base text-gray-900">
              {member.employeeCount
                ? `${formatNumber(member.employeeCount)} ${t('common.people', '명')}`
                : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.website", "웹사이트")}
            </label>
            <span className="text-base text-gray-900">
              {member.website ? (
                <a
                  href={member.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {member.website}
                </a>
              ) : (
                "-"
              )}
            </span>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.mainBusiness", "주요 사업")}
            </label>
            <span className="text-base text-gray-900">
              {member.mainBusiness || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.description", "기업소개")}
            </label>
            <p className="text-base text-gray-900 whitespace-pre-wrap">
              {member.description || "-"}
            </p>
          </div>
        </div>
      </Card>

      {/* Additional Info Card */}
      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t('performance.companyInfo.sections.additionalInfo', '추가 정보')}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.email", "이메일")}
            </label>
            <span className="text-base text-gray-900">
              {member.email || "-"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.cooperationFields", "산업협력 희망 분야")}
            </label>
            <span className="text-base text-gray-900">
              {(() => {
                try {
                  const fields =
                    typeof member.cooperationFields === "string"
                      ? JSON.parse(member.cooperationFields)
                      : member.cooperationFields;
                  if (Array.isArray(fields) && fields.length > 0) {
                    return fields
                      .map((field) =>
                        t(
                          `performance.companyInfo.profile.cooperationFields.${field}`,
                          field,
                        ),
                      )
                      .join(", ");
                  }
                  return "-";
                } catch {
                  return member.cooperationFields || "-";
                }
              })()}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.participationPrograms", "참여 프로그램")}
            </label>
            <span className="text-base text-gray-900">
              {(() => {
                try {
                  const programs =
                    typeof member.participationPrograms === "string"
                      ? JSON.parse(member.participationPrograms)
                      : member.participationPrograms;
                  if (Array.isArray(programs) && programs.length > 0) {
                    return programs
                      .map((program) => {
                        const camelCaseProgram = program
                          .split("_")
                          .map((word, index) =>
                            index === 0
                              ? word
                              : word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join("");
                        return t(
                          `performance.companyInfo.profile.participationPrograms.${camelCaseProgram}`,
                          program,
                        );
                      })
                      .join(", ");
                  }
                  return "-";
                } catch {
                  return member.participationPrograms || "-";
                }
              })()}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-600 font-medium">
              {t("member.investmentStatus", "투자 유치")}
            </label>
            <span className="text-base text-gray-900">
              {(() => {
                try {
                  const status =
                    typeof member.investmentStatus === "string"
                      ? JSON.parse(member.investmentStatus)
                      : member.investmentStatus;
                  return status?.hasInvestment
                    ? `${status.amount || "-"} (${status.institution || "-"})`
                    : t("member.notSet", "미설정");
                } catch {
                  return t("member.notSet", "미설정");
                }
              })()}
            </span>
          </div>
        </div>
      </Card>

      {/* Nice D&B 信息卡片 */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t("admin.members.detail.nicednbInfo")}
          </h2>
          <Button
            onClick={handleSearchNiceDnb}
            disabled={niceDnbLoading || !member?.businessNumber}
            loading={niceDnbLoading}
            variant="outline"
          >
            {t("admin.members.detail.searchNiceDnb", "Nice D&B 조회")}
          </Button>
        </div>

        {niceDnbLoading && (
          <Loading text={t("common.loading", "로딩 중...")} />
        )}

        {niceDnbError && (
          <div className="p-8 text-center text-red-600">
            <p>{niceDnbError}</p>
          </div>
        )}

        {!niceDnbData && !niceDnbLoading && !niceDnbError && (
          <div className="p-12 text-center text-gray-500">
            <p className="mb-4">
              {t("admin.members.detail.nicednbPlaceholder")}
            </p>
          </div>
        )}

        {niceDnbData && niceDnbData.success && niceDnbData.data && (
          <div className="mt-6 space-y-6">
            {/* 如果 API 返回的营业执照号与查询时使用的不一致，显示警告 */}
            {niceDnbData.data.businessNumber &&
              member.businessNumber &&
              niceDnbData.data.businessNumber.replace(/-/g, "") !==
                member.businessNumber.replace(/-/g, "") && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>{t('admin.members.detail.nicednbWarning', '알림:')}</strong>
                  {t('admin.members.detail.nicednbMismatch', '조회에 사용된 사업자등록번호는')}{" "}
                  <strong>{member.businessNumber}</strong>
                  {t('admin.members.detail.nicednbButReturned', ', 하지만 Nice D&B API가 반환한 사업자등록번호는')}{" "}
                  <strong>{niceDnbData.data.businessNumber}</strong>
                  {t('admin.members.detail.nicednbInconsistent', ', 둘이 일치하지 않습니다.')}
                </div>
              )}

            {/* 基础信息卡片 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                {t("admin.members.detail.basicInfo")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.businessNumber")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.businessNumber ||
                      member.businessNumber ||
                      "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.legalNumber")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.legalNumber || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.companyName")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.companyName || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.companyNameEn")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.companyNameEn || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.representative")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.representative || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.establishedDate")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.establishedDate
                      ? formatDateOnly(niceDnbData.data.establishedDate)
                      : "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.address")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.address || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.zipCode")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.zipCode || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.phone")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.phone || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.fax")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.fax || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.email")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.email || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.industry")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.industry || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.industryCode")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.industryCode || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.companyScale")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.companyScale || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.companyType")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.companyType || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.mainBusiness")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.mainBusiness || "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.employeeCount")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.employeeCount
                      ? `${niceDnbData.data.employeeCount} ${t("common.personUnit", "명")}`
                      : "-"}
                    {niceDnbData.data.employeeCountDate &&
                      ` (${niceDnbData.data.employeeCountDate})`}
                  </span>
                </div>
              </div>
            </Card>

            {/* 信用信息卡片 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                {t("admin.members.detail.creditInfo")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.creditGrade")}
                  </label>
                  {niceDnbData.data.creditGrade ? (
                    <Badge variant="info" className="w-fit">
                      {niceDnbData.data.creditGrade}
                    </Badge>
                  ) : (
                    <span className="text-base text-gray-900">-</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-600 font-medium">
                    {t("admin.members.detail.creditDate")}
                  </label>
                  <span className="text-base text-gray-900">
                    {niceDnbData.data.creditDate
                      ? `${niceDnbData.data.creditDate.substring(0, 4)}-${niceDnbData.data.creditDate.substring(4, 6)}-${niceDnbData.data.creditDate.substring(6, 8)}`
                      : "-"}
                  </span>
                </div>
              </div>
            </Card>

            {/* 财务数据卡片 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                {t("admin.members.detail.financialData")}
              </h3>

              {/* 当前财务指标 */}
              {(niceDnbData.data.salesAmount ||
                niceDnbData.data.operatingProfit ||
                niceDnbData.data.assetAmount) && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-700 mb-4">
                    {t('admin.members.detail.currentFinancialIndicators', '현재 재무지표')} ({t('common.unit', '단위')}: {t('admin.members.detail.thousandKRW', '천원')})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {niceDnbData.data.salesAmount && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">
                          {t("admin.members.detail.salesAmount")}
                        </label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(niceDnbData.data.salesAmount)}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.operatingProfit && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">
                          {t("admin.members.detail.operatingProfit")}
                        </label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(niceDnbData.data.operatingProfit)}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.shareholderEquity && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">
                          {t("admin.members.detail.shareholderEquity")}
                        </label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(niceDnbData.data.shareholderEquity)}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.debtAmount && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">
                          {t("admin.members.detail.debtAmount")}
                        </label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(niceDnbData.data.debtAmount)}
                        </p>
                      </div>
                    )}
                    {niceDnbData.data.assetAmount && (
                      <div className="p-4 bg-gray-50 rounded">
                        <label className="text-sm text-gray-600 font-medium">
                          {t("admin.members.detail.assetAmount")}
                        </label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatNumber(niceDnbData.data.assetAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 재무 이력 데이터 테이블 */}
              {niceDnbData.financials && niceDnbData.financials.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-4">
                    {t(
                      "admin.members.detail.financialHistory",
                      "재무 이력 데이터",
                    )}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">
                            {t("admin.members.detail.year")}
                          </th>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">
                            {t("admin.members.detail.revenue")}
                          </th>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">
                            {t("admin.members.detail.profit")}
                          </th>
                          <th className="px-4 py-3 text-left bg-gray-50 font-semibold text-gray-900 border-b border-gray-200">
                            {t("admin.members.detail.employees")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {niceDnbData.financials.map((financial, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">
                              {financial.year || "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">
                              {financial.revenue
                                ? `${(financial.revenue / 100000000).toFixed(2)} ${t("common.billionWon", "억원")}`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">
                              {financial.profit
                                ? `${(financial.profit / 100000000).toFixed(2)} ${t("common.billionWon", "억원")}`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700 border-b border-gray-200">
                              {financial.employees
                                ? `${formatNumber(financial.employees)} ${t("common.personUnit", "명")}`
                                : "-"}
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
