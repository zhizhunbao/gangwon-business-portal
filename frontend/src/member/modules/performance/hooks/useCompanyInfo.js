/**
 * Company Info Hook
 *
 * 处理企业信息的业务逻辑。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@shared/hooks";
import { useUpload } from "@shared/hooks";
import { performanceService } from "../services/performance.service";
import {
  formatNumber,
  parseFormattedNumber,
  validateImageFile,
  formatPhoneNumber,
} from "@shared/utils";

const safeJsonParse = (str, fallback) => {
  if (typeof str !== "string" || !str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    // 如果解析失败，检查是否是逗号分隔的字符串
    if (str.includes(",")) {
      return str.split(",").map((s) => s.trim());
    }
    return [str];
  }
};

export const useCompanyInfo = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState("success");
  const [companyData, setCompanyData] = useState({
    companyName: "",
    email: "",
    businessNumber: "",
    legalNumber: "",
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
    logoUrl: null,
    logoPreview: null,
    businessField: "",
    revenue: "",
    employeeCount: "",
    mainBusiness: "",
    cooperationFields: [],
    approvalStatus: null,
    contactPersonName: "",
    contactPersonDepartment: "",
    contactPersonPosition: "",
    contactPersonPhone: "",
    startupType: "",
    ksicMajor: "",
    ksicSub: "",
    mainIndustryKsicMajor: "",
    mainIndustryKsicCodes: "",
    participationPrograms: [],
    investmentStatus: { hasInvestment: false, amount: "", institution: "" },
  });

  const { uploading: uploadingLogo, upload: uploadLogo } = useUpload();
  const logoPreviewRef = useRef(null);

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

    try {
      const response = await performanceService.getCompanyProfile();
      // 兼容直接返回资料或嵌套在 member 对象中的格式
      const profile = response?.member || response;

      setCompanyData({
        companyName: profile.companyName || "",
        email: profile.email || "",
        businessNumber: profile.businessNumber || "",
        legalNumber: profile.legalNumber || "",
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
        logoUrl: profile.logoUrl || null,
        logoPreview: null,
        businessField: profile.businessField || "",
        revenue: profile.revenue ? formatNumber(profile.revenue) : "",
        employeeCount: profile.employeeCount
          ? formatNumber(profile.employeeCount)
          : "",
        mainBusiness: profile.mainBusiness || "",
        cooperationFields: Array.isArray(profile.cooperationFields)
          ? profile.cooperationFields
          : safeJsonParse(profile.cooperationFields, []),
        approvalStatus: profile.approvalStatus || null,
        contactPersonName: profile.contactPersonName || "",
        contactPersonDepartment: profile.contactPersonDepartment || "",
        contactPersonPosition: profile.contactPersonPosition || "",
        contactPersonPhone: profile.contactPersonPhone || "",
        startupType: profile.startupType || "",
        ksicMajor: profile.ksicMajor || "",
        ksicSub: profile.ksicSub || "",
        mainIndustryKsicMajor: profile.mainIndustryKsicMajor || "",
        mainIndustryKsicCodes: profile.mainIndustryKsicCodes || "",
        participationPrograms: Array.isArray(profile.participationPrograms)
          ? profile.participationPrograms
          : safeJsonParse(profile.participationPrograms, []),
        investmentStatus:
          typeof profile.investmentStatus === "object" &&
          profile.investmentStatus !== null
            ? profile.investmentStatus
            : safeJsonParse(profile.investmentStatus, {
                hasInvestment: false,
                amount: "",
                institution: "",
              }),
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, cleanupLogoPreview]);

  useEffect(() => {
    if (isAuthenticated) loadProfile();
  }, [isAuthenticated, loadProfile]);

  useEffect(() => {
    return () => cleanupLogoPreview();
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
      if (field === "revenue" || field === "employeeCount") {
        const numValue = parseFormattedNumber(value);
        if (!isNaN(numValue) || value === "") {
          setCompanyData((prev) => ({
            ...prev,
            [field]: value === "" ? "" : formatNumber(numValue),
          }));
        }
        return;
      }
      if (
        ["phone", "representativePhone", "contactPersonPhone"].includes(field)
      ) {
        const formatted = formatPhoneNumber(value);
        setCompanyData((prev) => ({ ...prev, [field]: formatted }));
        validateField(field, formatted);
        return;
      }
      if (field === "ksicMajor") {
        setCompanyData((prev) => ({ ...prev, ksicMajor: value, ksicSub: "" }));
        return;
      }
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

  const handleInvestmentStatusChange = useCallback((field, value) => {
    setCompanyData((prev) => {
      const newInvestmentStatus = { ...prev.investmentStatus };
      if (field === "hasInvestment") {
        newInvestmentStatus.hasInvestment = value;
        if (!value) {
          newInvestmentStatus.amount = "";
          newInvestmentStatus.institution = "";
        }
      } else {
        newInvestmentStatus[field] = value;
      }
      return { ...prev, investmentStatus: newInvestmentStatus };
    });
  }, []);

  const handleSave = async () => {
    const requiredFieldsMap = {
      companyName: t("member.companyName", "Company Name"),
      foundingDate: t("member.establishedDate", "Established Date"),
      representative: t("member.representative", "Representative"),
      phone: t("member.phone", "Phone"),
      address: t("member.address", "Address"),
    };
    const requiredFields = Object.keys(requiredFieldsMap);
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
    try {
      const saveData = {
        companyName: companyData.companyName,
        email: companyData.email,
        industry: companyData.industry,
        revenue: companyData.revenue
          ? parseFormattedNumber(companyData.revenue)
          : null,
        employeeCount: companyData.employeeCount
          ? parseFormattedNumber(companyData.employeeCount)
          : null,
        foundingDate: companyData.foundingDate,
        region: companyData.region,
        address: companyData.address,
        website: companyData.website,
        corporationNumber: companyData.legalNumber,
        representative: companyData.representative,
        representativeBirthDate: companyData.representativeBirthDate,
        representativeGender: companyData.representativeGender,
        representativePhone: companyData.representativePhone,
        phone: companyData.phone,
        logoUrl: companyData.logoUrl,
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
        participationPrograms: JSON.stringify(
          companyData.participationPrograms,
        ),
        investmentStatus: JSON.stringify(companyData.investmentStatus),
      };

      await performanceService.updateCompanyProfile(saveData);
      setIsEditing(false);
      setMessageVariant("success");
      setMessage(t("performance.companyInfo.message.saveSuccess", "保存成功"));
      setTimeout(() => setMessage(null), 3000);
      await loadProfile();
    } catch (error) {
      console.error("Failed to save profile:", error);
      setMessageVariant("error");
      setMessage(t("common.saveFailed", "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setFieldErrors({});
    cleanupLogoPreview();
    loadProfile();
  }, [cleanupLogoPreview, loadProfile]);

  const handleLogoUpload = async (file) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setMessageVariant("error");
      setMessage(validation.error);
      return;
    }

    try {
      const uploadResponse = await uploadLogo(file);
      setCompanyData((prev) => ({
        ...prev,
        logoUrl: uploadResponse.fileUrl || uploadResponse.url,
      }));
      setMessageVariant("success");
      setMessage(
        t("performance.companyInfo.message.logoUploadSuccess", "Logo上传成功"),
      );
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessageVariant("error");
      setMessage(t("common.uploadFailed", "上传失败"));
    }
  };

  return {
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
  };
};
