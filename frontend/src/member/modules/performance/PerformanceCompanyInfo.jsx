/**
 * Performance Company Info - Member Portal
 */

import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@shared/hooks";
import Card from "@shared/components/Card";
import Button from "@shared/components/Button";
import { Alert, Loading, AddressSearch, LoginModal } from "@shared/components";
import Input from "@shared/components/Input";
import Textarea from "@shared/components/Textarea";
import Select from "@shared/components/Select";
import { Badge, Modal, ModalFooter } from "@shared/components";
import { memberService } from "@shared/services";
import { useUpload } from "@shared/hooks";
import {
  UserIcon,
  BuildingIcon,
  LocationIcon,
  PhoneIcon,
  CalendarIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  TeamIcon,
  GlobeIcon,
  EditIcon,
  CheckCircleIcon,
} from "@shared/components/Icons";
import {
  formatNumber,
  parseFormattedNumber,
  validateImageFile,
  formatPhoneNumber,
} from "@shared/utils";
import {
  STARTUP_TYPE_KEYS,
  KSIC_MAJOR_CATEGORY_KEYS,
  getSubCategoryKeysByMajor,
  BUSINESS_FIELD_KEYS,
  MAIN_INDUSTRY_KSIC_MAJOR_KEYS,
  getMainIndustryKsicCodesByMajor,
  translateOptions,
} from "@shared/data/industryClassification";

export default function PerformanceCompanyInfo() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 使用统一的上传 hook
  const { uploading: uploadingLogo, upload: uploadLogo } = useUpload();

  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState("success");
  const [companyData, setCompanyData] = useState({
    companyName: "",
    email: "",
    businessNumber: "",
    corporationNumber: "",
    foundingDate: "",
    representative: "",
    representativeBirthDate: "",
    representativeGender: "",
    representativePhone: "",
    phone: "",
    address: "",
    region: "",
    category: "",
    industry: "",
    description: "",
    website: "",
    logo: null,
    logoPreview: null,
    businessField: "",
    sales: "",
    employeeCount: "",
    mainBusiness: "",
    cooperationFields: [],
    approvalStatus: null,
    // Contact person fields
    contactPersonName: "",
    contactPersonDepartment: "",
    contactPersonPosition: "",
    contactPersonPhone: "",
    // New business info fields (Task 5)
    startupType: "",
    ksicMajor: "",
    ksicSub: "",
    // Main industry KSIC codes
    mainIndustryKsicMajor: "",
    mainIndustryKsicCodes: "",
    // New fields for Task 6
    participationPrograms: [],
    investmentStatus: { hasInvestment: false, amount: "", institution: "" },
  });

  // 使用 ref 存储 logoPreview URL，便于清理
  const logoPreviewRef = useRef(null);

  // 清理 logo 预览 URL 的辅助函数
  const cleanupLogoPreview = useCallback(() => {
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current);
      logoPreviewRef.current = null;
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    cleanupLogoPreview();

    const profile = await memberService.getProfile();
    setCompanyData({
      companyName: profile.companyName || "",
      email: profile.email || "",
      businessNumber: profile.businessNumber || "",
      corporationNumber: profile.legalNumber || "",
      foundingDate: profile.foundingDate || "",
      representative: profile.representative || "",
      representativeBirthDate: profile.representativeBirthDate || "",
      representativeGender: profile.representativeGender || "",
      representativePhone: profile.representativePhone || "",
      phone: profile.phone || "",
      address: profile.address || "",
      region: profile.region || "",
      category: profile.category || "",
      industry: profile.industry || "",
      description: profile.description || "",
      website: profile.website || "",
      logo: profile.logoUrl || null,
      logoPreview: null,
      businessField: profile.businessField || "",
      sales:
        profile.sales || profile.revenue
          ? formatNumber(profile.sales || profile.revenue)
          : "",
      employeeCount: profile.employeeCount
        ? formatNumber(profile.employeeCount)
        : "",
      mainBusiness: profile.mainBusiness || "",
      cooperationFields: (() => {
        try {
          return typeof profile.cooperationFields === "string"
            ? JSON.parse(profile.cooperationFields)
            : Array.isArray(profile.cooperationFields)
              ? profile.cooperationFields
              : [];
        } catch {
          return [];
        }
      })(),
      approvalStatus: profile.approvalStatus || null,
      // Contact person fields
      contactPersonName: profile.contactPersonName || "",
      contactPersonDepartment: profile.contactPersonDepartment || "",
      contactPersonPosition: profile.contactPersonPosition || "",
      contactPersonPhone: profile.contactPersonPhone || "",
      // New business info fields (Task 5)
      startupType: profile.startupType || "",
      ksicMajor: profile.ksicMajor || "",
      ksicSub: profile.ksicSub || "",
      mainIndustryKsicMajor: profile.mainIndustryKsicMajor || "",
      mainIndustryKsicCodes: profile.mainIndustryKsicCodes || "",
      // New fields for Task 6
      participationPrograms: (() => {
        try {
          return typeof profile.participationPrograms === "string"
            ? JSON.parse(profile.participationPrograms)
            : Array.isArray(profile.participationPrograms)
              ? profile.participationPrograms
              : [];
        } catch {
          return [];
        }
      })(),
      investmentStatus: (() => {
        try {
          return typeof profile.investmentStatus === "string"
            ? JSON.parse(profile.investmentStatus)
            : profile.investmentStatus || {
                hasInvestment: false,
                amount: "",
                institution: "",
              };
        } catch {
          return { hasInvestment: false, amount: "", institution: "" };
        }
      })(),
    });
    setLoading(false);
  }, [isAuthenticated, cleanupLogoPreview]);

  useEffect(() => {
    if (isAuthenticated) loadProfile();
  }, [isAuthenticated, loadProfile]);

  // 清理 logo 预览 URL
  useEffect(() => {
    return () => {
      cleanupLogoPreview();
    };
  }, [cleanupLogoPreview]);

  const validateField = useCallback(
    (field, value) => {
      const errors = { ...fieldErrors };

      if (field === "phone" && value && !/^[\d\s\-+()]+$/.test(value)) {
        errors.phone = t(
          "performance.companyInfo.validation.invalidPhone",
          "请输入有效的电话号码",
        );
      } else if (
        field === "website" &&
        value &&
        !/^https?:\/\/.+/.test(value)
      ) {
        errors.website = t(
          "performance.companyInfo.validation.invalidWebsite",
          "请输入有效的网站地址",
        );
      } else if (
        field === "email" &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        errors.email = t(
          "performance.companyInfo.validation.invalidEmail",
          "请输入有效的邮箱地址",
        );
      } else {
        delete errors[field];
      }

      setFieldErrors(errors);
    },
    [fieldErrors, t],
  );

  const handleChange = useCallback(
    (field, value) => {
      if (field === "sales" || field === "employeeCount") {
        const numValue = parseFormattedNumber(value);
        if (!isNaN(numValue) || value === "") {
          setCompanyData((prev) => ({
            ...prev,
            [field]: value === "" ? "" : formatNumber(numValue),
          }));
        }
        return;
      }

      // Handle phone number formatting for all three phone fields
      if (
        field === "phone" ||
        field === "representativePhone" ||
        field === "contactPersonPhone"
      ) {
        const formatted = formatPhoneNumber(value);
        setCompanyData((prev) => ({ ...prev, [field]: formatted }));
        validateField(field, formatted);
        return;
      }

      // Handle KSIC major category change - reset sub-category when major changes
      if (field === "ksicMajor") {
        setCompanyData((prev) => ({ ...prev, ksicMajor: value, ksicSub: "" }));
        return;
      }

      // Handle main industry KSIC major change - reset codes when major changes
      if (field === "mainIndustryKsicMajor") {
        setCompanyData((prev) => ({
          ...prev,
          mainIndustryKsicMajor: value,
          mainIndustryKsicCodes: "",
        }));
        return;
      }

      setCompanyData((prev) => ({ ...prev, [field]: value }));
      if (["phone", "website", "email"].includes(field))
        validateField(field, value);
    },
    [validateField],
  );

  const handleCooperationFieldChange = useCallback((field, checked) => {
    setCompanyData((prev) => {
      const fields = prev.cooperationFields || [];
      return {
        ...prev,
        cooperationFields: checked
          ? [...fields, field]
          : fields.filter((f) => f !== field),
      };
    });
  }, []);

  // Handler for participation programs (Task 6.2)
  const handleParticipationProgramChange = useCallback((program, checked) => {
    setCompanyData((prev) => {
      const programs = prev.participationPrograms || [];
      return {
        ...prev,
        participationPrograms: checked
          ? [...programs, program]
          : programs.filter((p) => p !== program),
      };
    });
  }, []);

  // Handler for investment status (Task 6.3)
  const handleInvestmentStatusChange = useCallback((field, value) => {
    setCompanyData((prev) => {
      const newInvestmentStatus = { ...prev.investmentStatus };

      if (field === "hasInvestment") {
        newInvestmentStatus.hasInvestment = value;
        // Clear amount and institution when "no investment" is selected
        if (!value) {
          newInvestmentStatus.amount = "";
          newInvestmentStatus.institution = "";
        }
      } else {
        newInvestmentStatus[field] = value;
      }

      return {
        ...prev,
        investmentStatus: newInvestmentStatus,
      };
    });
  }, []);

  // 必填字段列表和对应的显示名称
  const requiredFieldsMap = useMemo(
    () => ({
      companyName: t("member.companyName", "Company Name"),
      foundingDate: t("member.establishedDate", "Established Date"),
      representative: t("member.representative", "Representative"),
      phone: t("member.phone", "Phone"),
      address: t("member.address", "Address"),
    }),
    [t],
  );

  const requiredFields = useMemo(
    () => Object.keys(requiredFieldsMap),
    [requiredFieldsMap],
  );

  const handleSave = useCallback(async () => {
    const missingFields = requiredFields.filter((field) => !companyData[field]);

    if (Object.keys(fieldErrors).length > 0) {
      setMessageVariant("error");
      setMessage(
        t("performance.companyInfo.validation.fieldErrors", "请修正表单错误"),
      );
      return;
    }

    if (missingFields.length > 0) {
      const missingFieldNames = missingFields
        .map((field) => requiredFieldsMap[field])
        .join(", ");
      setMessageVariant("error");
      setMessage(
        t("performance.companyInfo.validation.missingRequiredFields", {
          fields: missingFieldNames,
        }),
      );
      return;
    }

    setSaving(true);
    const saveData = {
      companyName: companyData.companyName,
      email: companyData.email,
      industry: companyData.industry,
      revenue: companyData.sales
        ? parseFormattedNumber(companyData.sales)
        : null,
      employeeCount: companyData.employeeCount
        ? parseFormattedNumber(companyData.employeeCount)
        : null,
      foundingDate: companyData.foundingDate,
      region: companyData.region,
      address: companyData.address,
      website: companyData.website,
      corporationNumber: companyData.corporationNumber,
      representative: companyData.representative,
      representativeBirthDate: companyData.representativeBirthDate,
      representativeGender: companyData.representativeGender,
      representativePhone: companyData.representativePhone,
      phone: companyData.phone,
      logoUrl: companyData.logo,
      // Contact person fields
      contactPersonName: companyData.contactPersonName,
      contactPersonDepartment: companyData.contactPersonDepartment,
      contactPersonPosition: companyData.contactPersonPosition,
      contactPersonPhone: companyData.contactPersonPhone,
      // Business info fields
      mainBusiness: companyData.mainBusiness,
      description: companyData.description,
      cooperationFields: JSON.stringify(companyData.cooperationFields),
      // New business info fields (Task 5)
      startupType: companyData.startupType,
      ksicMajor: companyData.ksicMajor,
      ksicSub: companyData.ksicSub,
      category: companyData.category,
      businessField: companyData.businessField,
      // Main industry KSIC codes
      mainIndustryKsicMajor: companyData.mainIndustryKsicMajor || null,
      mainIndustryKsicCodes: companyData.mainIndustryKsicCodes || null,
      // New fields for Task 6
      participationPrograms: JSON.stringify(companyData.participationPrograms),
      investmentStatus: JSON.stringify(companyData.investmentStatus),
    };

    await memberService.updateProfile(saveData);
    setIsEditing(false);
    setMessageVariant("success");
    setMessage(t("performance.companyInfo.message.saveSuccess", "保存成功"));
    setTimeout(() => setMessage(null), 3000);
    await loadProfile();
    setSaving(false);
  }, [companyData, fieldErrors, requiredFields, t, loadProfile]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setFieldErrors({});
    cleanupLogoPreview();
    loadProfile();
  }, [cleanupLogoPreview, loadProfile]);

  const handleLogoFileSelect = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const validation = validateImageFile(file);
      if (!validation.valid) {
        setMessageVariant("error");
        setMessage(validation.error);
        e.target.value = "";
        return;
      }

      try {
        const uploadResponse = await uploadLogo(file);
        setCompanyData((prev) => ({
          ...prev,
          logo: uploadResponse.fileUrl || uploadResponse.url,
        }));
        setMessageVariant("success");
        setMessage(
          t(
            "performance.companyInfo.message.logoUploadSuccess",
            "Logo上传成功",
          ),
        );
        setTimeout(() => setMessage(null), 3000);
      } catch (err) {
        setMessageVariant("error");
        setMessage(t("common.uploadFailed", "上传失败"));
      }
      e.target.value = "";
    },
    [t, uploadLogo],
  );

  const regionOptions = useMemo(
    () => [
      { value: "chuncheon", label: t("profile.regions.chuncheon", "춘천시") },
      { value: "wonju", label: t("profile.regions.wonju", "원주시") },
      { value: "gangneung", label: t("profile.regions.gangneung", "강릉시") },
      { value: "donghae", label: t("profile.regions.donghae", "동해시") },
      { value: "taebaek", label: t("profile.regions.taebaek", "태백시") },
      { value: "sokcho", label: t("profile.regions.sokcho", "속초시") },
      { value: "samcheok", label: t("profile.regions.samcheok", "삼척시") },
      { value: "hongcheon", label: t("profile.regions.hongcheon", "홍천군") },
      { value: "hoengseong", label: t("profile.regions.hoengseong", "횡성군") },
      { value: "yeongwol", label: t("profile.regions.yeongwol", "영월군") },
      {
        value: "pyeongchang",
        label: t("profile.regions.pyeongchang", "평창군"),
      },
      { value: "jeongseon", label: t("profile.regions.jeongseon", "정선군") },
      { value: "cheorwon", label: t("profile.regions.cheorwon", "철원군") },
      { value: "hwacheon", label: t("profile.regions.hwacheon", "화천군") },
      { value: "yanggu", label: t("profile.regions.yanggu", "양구군") },
      { value: "inje", label: t("profile.regions.inje", "인제군") },
      { value: "goseong", label: t("profile.regions.goseong", "고성군") },
      { value: "yangyang", label: t("profile.regions.yangyang", "양양군") },
      { value: "other", label: t("profile.regions.other", "기타 지역") },
    ],
    [t, i18n.language],
  );

  const categoryOptions = useMemo(
    () => [
      {
        value: "tech",
        label: t("performance.companyInfo.profile.categories.tech", "科技"),
      },
      {
        value: "manufacturing",
        label: t(
          "performance.companyInfo.profile.categories.manufacturing",
          "制造业",
        ),
      },
      {
        value: "service",
        label: t(
          "performance.companyInfo.profile.categories.service",
          "服务业",
        ),
      },
      {
        value: "retail",
        label: t("performance.companyInfo.profile.categories.retail", "零售业"),
      },
      {
        value: "other",
        label: t("performance.companyInfo.profile.categories.other", "其他"),
      },
    ],
    [t, i18n.language],
  );

  const businessFieldOptions = useMemo(() => {
    return translateOptions(BUSINESS_FIELD_KEYS, t);
  }, [t, i18n.language]);

  const cooperationFieldOptions = useMemo(
    () => [
      {
        value: "field1",
        label: t(
          "performance.companyInfo.profile.cooperationFields.field1",
          "技术合作",
        ),
      },
      {
        value: "field2",
        label: t(
          "performance.companyInfo.profile.cooperationFields.field2",
          "市场拓展",
        ),
      },
      {
        value: "field3",
        label: t(
          "performance.companyInfo.profile.cooperationFields.field3",
          "人才培养",
        ),
      },
    ],
    [t, i18n.language],
  );

  // Participation program options (Task 6.2)
  const participationProgramOptions = useMemo(
    () => [
      {
        value: "startup_center_university",
        label: t(
          "performance.companyInfo.profile.participationPrograms.startupCenterUniversity",
          "창업중심대학",
        ),
      },
      {
        value: "global_business",
        label: t(
          "performance.companyInfo.profile.participationPrograms.globalBusiness",
          "글로벌 사업",
        ),
      },
      {
        value: "rise_business",
        label: t(
          "performance.companyInfo.profile.participationPrograms.riseBusiness",
          "RISE 사업",
        ),
      },
      {
        value: "none",
        label: t(
          "performance.companyInfo.profile.participationPrograms.none",
          "없음",
        ),
      },
    ],
    [t, i18n.language],
  );

  // Startup type options with i18n (Task 5.1)
  const startupTypeOptions = useMemo(() => {
    return translateOptions(STARTUP_TYPE_KEYS, t);
  }, [t, i18n.language]);

  // KSIC major categories with i18n (Task 5.2)
  const ksicMajorOptions = useMemo(() => {
    return translateOptions(KSIC_MAJOR_CATEGORY_KEYS, t);
  }, [t, i18n.language]);

  // KSIC sub-categories based on selected major category (Task 5.3)
  const ksicSubOptions = useMemo(() => {
    const subKeys = getSubCategoryKeysByMajor(companyData.ksicMajor);
    return translateOptions(subKeys, t);
  }, [companyData.ksicMajor, t, i18n.language]);

  // Main industry KSIC major categories
  const mainIndustryKsicMajorOptions = useMemo(() => {
    return translateOptions(MAIN_INDUSTRY_KSIC_MAJOR_KEYS, t);
  }, [t, i18n.language]);

  // Main industry KSIC codes based on selected major category
  const mainIndustryKsicCodeOptions = useMemo(() => {
    const codeKeys = getMainIndustryKsicCodesByMajor(
      companyData.mainIndustryKsicMajor,
    );
    return translateOptions(codeKeys, t);
  }, [companyData.mainIndustryKsicMajor, t, i18n.language]);

  if (!isAuthenticated) {
    return (
      <>
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
                <Button
                  variant="primary"
                  onClick={() => setShowLoginModal(true)}
                >
                  {t("common.login", "Login")}
                </Button>
                <Link to="/member/register">
                  <Button variant="secondary">
                    {t("common.register", "Register")}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={() => {
            setShowLoginModal(false);
            window.location.reload();
          }}
        />
      </>
    );
  }

  return (
    <div className="performance-company-info w-full max-w-full">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant}>{message}</Alert>
        </div>
      )}
      {/* 标题栏 */}
      <div className="mb-6 sm:mb-8 lg:mb-10 flex justify-between items-center gap-4 sm:gap-6 min-h-[48px]">
        <div className="flex items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
            {t("performance.companyInfo.title", "企业信息")}
          </h1>
          {companyData.approvalStatus && (
            <Badge
              variant={
                companyData.approvalStatus === "approved"
                  ? "success"
                  : companyData.approvalStatus === "pending"
                    ? "warning"
                    : companyData.approvalStatus === "rejected"
                      ? "danger"
                      : "gray"
              }
              className="text-xs sm:text-sm"
            >
              {companyData.approvalStatus === "approved" &&
                t("member.approved", "Approved")}
              {companyData.approvalStatus === "pending" &&
                t("member.pending", "Pending")}
              {companyData.approvalStatus === "rejected" &&
                t("member.rejected", "Rejected")}
            </Badge>
          )}
        </div>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="primary"
            disabled={loading || saving}
          >
            {t("common.edit", "Edit")}
          </Button>
        ) : (
          <div className="flex gap-3 sm:gap-4 flex-shrink-0">
            <Button onClick={handleSave} variant="primary" disabled={saving}>
              {t("common.save", "Save")}
            </Button>
            <Button
              onClick={handleCancel}
              variant="secondary"
              disabled={saving}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">
            {t("performance.companyInfo.sections.basicInfo", "基本信息")}
          </h2>
        </div>
        <div className="p-6 sm:p-8 lg:p-10">
          {/* Logo Section */}
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
                    onChange={handleLogoFileSelect}
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
                  ) : companyData.logoPreview || companyData.logo ? (
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
                        src={companyData.logoPreview || companyData.logo}
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
                  {companyData.logo ? (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-2 border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                      <img
                        src={companyData.logo}
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
          {/* Basic Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.companyName", "Company Name")}{" "}
                <span className="text-red-600">*</span>
              </label>
              <Input
                value={companyData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                disabled={!isEditing}
                required
                error={fieldErrors.companyName}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.businessLicense", "Business License")}
              </label>
              <Input value={companyData.businessNumber} disabled={true} />
              <small className="mt-2 text-xs text-gray-500">
                {t(
                  "performance.companyInfo.profile.businessLicenseHint",
                  "营业执照号不可修改",
                )}
              </small>
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.corporationNumber", "Corporation Number")}
              </label>
              <Input
                value={companyData.corporationNumber}
                onChange={(e) =>
                  handleChange("corporationNumber", e.target.value)
                }
                disabled={!isEditing}
                error={fieldErrors.corporationNumber}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.establishedDate", "Established Date")}{" "}
                <span className="text-red-600">*</span>
              </label>
              <Input
                type="date"
                value={companyData.foundingDate}
                onChange={(e) => handleChange("foundingDate", e.target.value)}
                disabled={!isEditing}
                required
                error={fieldErrors.foundingDate}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.representative", "Representative")}{" "}
                <span className="text-red-600">*</span>
              </label>
              <Input
                value={companyData.representative}
                onChange={(e) => handleChange("representative", e.target.value)}
                disabled={!isEditing}
                required
                error={fieldErrors.representative}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.representativeBirthDate", "대표자 생년월일")}
              </label>
              <Input
                type="date"
                value={companyData.representativeBirthDate}
                onChange={(e) =>
                  handleChange("representativeBirthDate", e.target.value)
                }
                disabled={!isEditing}
                error={fieldErrors.representativeBirthDate}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.representativeGender", "대표자 성별")}
              </label>
              <Select
                value={companyData.representativeGender}
                onChange={(e) =>
                  handleChange("representativeGender", e.target.value)
                }
                options={[
                  { value: "male", label: t("common.male", "남성") },
                  { value: "female", label: t("common.female", "여성") },
                ]}
                disabled={!isEditing}
                placeholder={t("common.select", "선택")}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.representativePhone", "대표자 전화번호")}
              </label>
              <Input
                type="tel"
                value={companyData.representativePhone}
                onChange={(e) =>
                  handleChange("representativePhone", e.target.value)
                }
                disabled={!isEditing}
                error={fieldErrors.representativePhone}
                maxLength={13}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.phone", "기업 전화번호")}{" "}
                <span className="text-red-600">*</span>
              </label>
              <Input
                type="tel"
                value={companyData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                disabled={!isEditing}
                required
                error={fieldErrors.phone}
                maxLength={13}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.contactPersonName", "담당자명")}
              </label>
              <Input
                value={companyData.contactPersonName}
                onChange={(e) =>
                  handleChange("contactPersonName", e.target.value)
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.contactPersonDepartment", "담당자 부서")}
              </label>
              <Input
                value={companyData.contactPersonDepartment}
                onChange={(e) =>
                  handleChange("contactPersonDepartment", e.target.value)
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.contactPersonPosition", "담당자 직책")}
              </label>
              <Input
                value={companyData.contactPersonPosition}
                onChange={(e) =>
                  handleChange("contactPersonPosition", e.target.value)
                }
                disabled={!isEditing}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
                {t("member.contactPersonPhone", "담당자 전화번호")}
              </label>
              <Input
                type="tel"
                value={companyData.contactPersonPhone}
                onChange={(e) =>
                  handleChange("contactPersonPhone", e.target.value)
                }
                disabled={!isEditing}
                error={fieldErrors.contactPersonPhone}
                maxLength={13}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Address Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">
            {t("performance.companyInfo.sections.addressInfo", "地址信息")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.address", "Address")}{" "}
              <span className="text-red-600">*</span>
            </label>
            <AddressSearch
              value={companyData.address}
              onChange={(address) => handleChange("address", address)}
              disabled={!isEditing}
              required
              error={fieldErrors.address}
            />
          </div>
          <Select
            label={t("member.region", "Region")}
            value={companyData.region}
            onChange={(e) => handleChange("region", e.target.value)}
            options={regionOptions}
            disabled={!isEditing}
            required
            placeholder={t("common.select", "선택")}
          />
        </div>
      </Card>

      {/* Business Info */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">
            {t("performance.companyInfo.sections.businessInfo", "业务信息")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 p-6 sm:p-8 lg:p-10">
          {/* KSIC Major Category - Task 5.2 */}
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.ksicMajor", "한국표준산업분류코드[대분류]")}
            </label>
            <Select
              value={companyData.ksicMajor}
              onChange={(e) => handleChange("ksicMajor", e.target.value)}
              options={ksicMajorOptions}
              disabled={!isEditing}
              placeholder={t("common.select", "선택")}
            />
          </div>
          {/* KSIC Sub Category - Task 5.3 */}
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.ksicSub", "지역주력산업코드[중분류]")}
            </label>
            <Select
              value={companyData.ksicSub}
              onChange={(e) => handleChange("ksicSub", e.target.value)}
              options={ksicSubOptions}
              disabled={!isEditing || !companyData.ksicMajor}
              placeholder={
                companyData.ksicMajor
                  ? t("common.select", "선택")
                  : t("member.selectMajorFirst", "대분류를 먼저 선택하세요")
              }
            />
          </div>

          <Select
            label={t("member.mainIndustryKsicMajor", "주력산업 KSIC 코드")}
            value={companyData.mainIndustryKsicMajor || ""}
            onChange={(e) =>
              handleChange("mainIndustryKsicMajor", e.target.value)
            }
            options={mainIndustryKsicMajorOptions}
            disabled={!isEditing}
            placeholder={t("common.select", "선택")}
          />

          <Select
            label={t("member.mainIndustryKsicCodes", "주력산업 KSIC 세부 코드")}
            value={companyData.mainIndustryKsicCodes || ""}
            onChange={(e) =>
              handleChange("mainIndustryKsicCodes", e.target.value)
            }
            options={mainIndustryKsicCodeOptions}
            disabled={!isEditing || !companyData.mainIndustryKsicMajor}
            placeholder={t("common.select", "선택")}
          />

          <Select
            label={t("member.category", "Category")}
            value={companyData.category}
            onChange={(e) => handleChange("category", e.target.value)}
            options={categoryOptions}
            disabled={!isEditing}
            required
            placeholder={t("common.select", "선택하세요")}
          />
          <Select
            label={t("member.industry", "Industry")}
            value={companyData.industry}
            onChange={(e) => handleChange("industry", e.target.value)}
            options={startupTypeOptions}
            disabled={!isEditing}
            required
            placeholder={t("common.select", "선택")}
          />
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.businessField", "Business Field")}
            </label>
            <Select
              value={companyData.businessField}
              onChange={(e) => handleChange("businessField", e.target.value)}
              options={businessFieldOptions}
              disabled={!isEditing}
              placeholder={t("common.select", "선택")}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.sales", "Sales")}
            </label>
            <Input
              type="text"
              value={companyData.sales}
              onChange={(e) => handleChange("sales", e.target.value)}
              disabled={!isEditing}
              placeholder="0"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.employeeCount", "Employees")}
            </label>
            <Input
              type="text"
              value={companyData.employeeCount}
              onChange={(e) => handleChange("employeeCount", e.target.value)}
              disabled={!isEditing}
              placeholder="0"
            />
          </div>
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.website", "Website")}
            </label>
            <Input
              type="url"
              value={companyData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              disabled={!isEditing}
              placeholder="https://example.com"
              error={fieldErrors.website}
            />
          </div>
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.mainBusiness", "Main Business")}
            </label>
            <Textarea
              value={companyData.mainBusiness}
              onChange={(e) => handleChange("mainBusiness", e.target.value)}
              disabled={!isEditing}
              rows={4}
            />
          </div>
          <div className="flex flex-col col-span-1 sm:col-span-2">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.description", "Description")}
            </label>
            <Textarea
              value={companyData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={!isEditing}
              rows={5}
              maxLength={500}
            />
            <small className="mt-2 text-xs text-gray-500">
              {companyData.description.length}/500
            </small>
          </div>
        </div>
      </Card>

      {/* Additional Company Info - Task 6 */}
      <Card className="mb-6 sm:mb-8 shadow-sm hover:shadow-md transition-all p-0">
        <div className="flex items-center gap-3 sm:gap-4 border-b border-gray-200 p-6 sm:p-8 lg:p-10 pb-4 sm:pb-5 lg:pb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 m-0">
            {t("performance.companyInfo.sections.additionalInfo", "추가 정보")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:gap-8 p-6 sm:p-8 lg:p-10">
          {/* Email Field */}
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.email", "이메일")}
            </label>
            {isEditing ? (
              <Input
                type="email"
                value={companyData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="example@company.com"
                error={fieldErrors.email}
              />
            ) : (
              <span className="text-base text-gray-900">
                {companyData.email || "-"}
              </span>
            )}
          </div>

          {/* Task 6.1: Cooperation Fields - 产业合作期望领域 */}
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.cooperationFields", "산업협력 희망 분야")}
            </label>
            {isEditing ? (
              <div className="flex flex-col gap-3 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {cooperationFieldOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={companyData.cooperationFields.includes(
                        option.value,
                      )}
                      onChange={(e) =>
                        handleCooperationFieldChange(
                          option.value,
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {Array.isArray(companyData.cooperationFields) &&
                companyData.cooperationFields.length > 0 ? (
                  companyData.cooperationFields.map((field, index) => {
                    const fieldOption = cooperationFieldOptions.find(
                      (opt) => opt.value === field,
                    );
                    return (
                      <span
                        key={index}
                        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md"
                      >
                        {fieldOption ? fieldOption.label : field}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-gray-500">
                    {t("common.notSet", "미설정")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Task 6.2: Participation Programs */}
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.participationPrograms", "참여 프로그램")}
            </label>
            {isEditing ? (
              <div className="flex flex-col gap-3 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {participationProgramOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={companyData.participationPrograms.includes(
                        option.value,
                      )}
                      onChange={(e) =>
                        handleParticipationProgramChange(
                          option.value,
                          e.target.checked,
                        )
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {companyData.participationPrograms?.length > 0 ? (
                  companyData.participationPrograms.map((program, index) => {
                    const programOption = participationProgramOptions.find(
                      (opt) => opt.value === program,
                    );
                    return (
                      <span
                        key={index}
                        className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md"
                      >
                        {programOption ? programOption.label : program}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-gray-500">
                    {t("common.notSet", "미설정")}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Task 6.3: Investment Status */}
          <div className="flex flex-col">
            <label className="text-sm sm:text-base font-medium text-gray-700 mb-2">
              {t("member.investmentStatus", "투자 유치")}
            </label>
            {isEditing ? (
              <div className="flex flex-col gap-4 mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* No Investment Option */}
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    checked={!companyData.investmentStatus?.hasInvestment}
                    onChange={(e) =>
                      handleInvestmentStatusChange(
                        "hasInvestment",
                        !e.target.checked,
                      )
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {t(
                      "performance.companyInfo.profile.investmentStatus.none",
                      "없음",
                    )}
                  </span>
                </label>

                {/* Investment Amount */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-600">
                    {t(
                      "performance.companyInfo.profile.investmentStatus.amount",
                      "투자 금액 (백만원)",
                    )}
                  </label>
                  <Input
                    type="text"
                    value={companyData.investmentStatus?.amount || ""}
                    onChange={(e) =>
                      handleInvestmentStatusChange("amount", e.target.value)
                    }
                    disabled={!companyData.investmentStatus?.hasInvestment}
                    placeholder="0"
                    className={
                      !companyData.investmentStatus?.hasInvestment
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }
                  />
                </div>

                {/* Investment Institution */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-600">
                    {t(
                      "performance.companyInfo.profile.investmentStatus.institution",
                      "투자 기관",
                    )}
                  </label>
                  <Input
                    type="text"
                    value={companyData.investmentStatus?.institution || ""}
                    onChange={(e) =>
                      handleInvestmentStatusChange(
                        "institution",
                        e.target.value,
                      )
                    }
                    disabled={!companyData.investmentStatus?.hasInvestment}
                    placeholder={t(
                      "performance.companyInfo.profile.investmentStatus.institutionPlaceholder",
                      "투자 기관명 입력",
                    )}
                    className={
                      !companyData.investmentStatus?.hasInvestment
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {companyData.investmentStatus?.hasInvestment ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        {t(
                          "performance.companyInfo.profile.investmentStatus.amount",
                          "투자 금액",
                        )}
                        :
                      </span>
                      <span className="text-sm text-gray-900">
                        {companyData.investmentStatus?.amount || "-"}{" "}
                        {t("common.millionWon", "백만원")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        {t(
                          "performance.companyInfo.profile.investmentStatus.institution",
                          "투자 기관",
                        )}
                        :
                      </span>
                      <span className="text-sm text-gray-900">
                        {companyData.investmentStatus?.institution || "-"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">
                    {t(
                      "performance.companyInfo.profile.investmentStatus.none",
                      "없음",
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
