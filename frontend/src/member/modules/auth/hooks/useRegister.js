import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@shared/hooks";
import authService from "../services/auth.service";
import {
  formatBusinessLicense,
  formatCorporationNumber,
  formatPhoneNumber,
  formatNumber,
  parseFormattedNumber,
  validateImageFile,
  validateFile,
  ALLOWED_FILE_TYPES,
} from "@shared/utils";

const STORAGE_KEY = "register_form_draft";
const TOTAL_STEPS = 5;

// 从 localStorage 加载保存的表单数据
const loadSavedFormData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        password: "",
        passwordConfirm: "",
        logo: null,
        businessLicenseFile: null,
        agreeAll: false,
        termsOfService: false,
        privacyPolicy: false,
        thirdPartySharing: false,
        marketingConsent: false,
      };
    }
  } catch (e) {
    // AOP 系统会自动记录错误
  }
  return null;
};

// 保存表单数据到 localStorage
const saveFormData = (data) => {
  try {
    const toSave = { ...data };
    delete toSave.password;
    delete toSave.passwordConfirm;
    delete toSave.logo;
    delete toSave.businessLicenseFile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    // AOP 系统会自动记录错误
  }
};

const clearSavedFormData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // AOP 系统会自动记录错误
  }
};

export const useRegister = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  const defaultFormData = {
    businessNumber: "",
    password: "",
    passwordConfirm: "",
    companyName: "",
    region: "",
    category: "",
    corporationNumber: "",
    address: "",
    addressDetail: "",
    representative: "",
    establishedDate: "",
    logo: null,
    businessLicenseFile: null,
    email: "",
    phone: "",
    representativePhone: "",
    contactPersonPhone: "",
    contactPersonName: "",
    contactPersonDepartment: "",
    contactPersonPosition: "",
    startupType: "",
    ksicMajor: "",
    ksicSub: "",
    businessField: "",
    sales: "",
    employeeCount: "",
    websiteUrl: "",
    mainBusiness: "",
    cooperationFields: [],
    agreeAll: false,
    termsOfService: false,
    privacyPolicy: false,
    thirdPartySharing: false,
    marketingConsent: false,
  };

  const [formData, setFormData] = useState(() => {
    const saved = loadSavedFormData();
    return saved ? { ...defaultFormData, ...saved } : defaultFormData;
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [fileErrors, setFileErrors] = useState({});
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [currentTermType, setCurrentTermType] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Auto save
  useEffect(() => {
    const timer = setTimeout(() => {
      saveFormData(formData);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleAddressSelect = (address) =>
    setFormData((prev) => ({ ...prev, address }));

  const handleViewTerms = (termType) => {
    setCurrentTermType(termType);
    setTermsModalOpen(true);
  };

  const handleCloseTermsModal = () => {
    setTermsModalOpen(false);
    setCurrentTermType(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "agreeAll") {
        setFormData((prev) => ({
          ...prev,
          agreeAll: checked,
          termsOfService: checked,
          privacyPolicy: checked,
          thirdPartySharing: checked,
          marketingConsent: checked,
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: checked }));
      }
    } else if (name === "sales" || name === "employeeCount") {
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue) || value === "") {
        setFormData((prev) => ({
          ...prev,
          [name]: value === "" ? "" : formatNumber(numValue),
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBusinessNumberChange = (e) =>
    setFormData((prev) => ({
      ...prev,
      businessNumber: formatBusinessLicense(e.target.value),
    }));
  const handleCorporationNumberChange = (e) =>
    setFormData((prev) => ({
      ...prev,
      corporationNumber: formatCorporationNumber(e.target.value),
    }));

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, [e.target.name]: formatted }));
  };

  const handleFileChange = (e, fieldName, acceptImagesOnly = false) => {
    const file = e.target.files[0];
    handleFileSelect(file, fieldName, acceptImagesOnly);
    e.target.value = "";
  };

  const handleFileSelect = (file, fieldName, acceptImagesOnly = false) => {
    if (!file) return;
    const validation = acceptImagesOnly
      ? validateImageFile(file)
      : validateFile(file, { allowedTypes: ALLOWED_FILE_TYPES.all });
    if (!validation.valid) {
      setFileErrors((prev) => ({ ...prev, [fieldName]: validation.error }));
      return;
    }
    setFileErrors((prev) => {
      const n = { ...prev };
      delete n[fieldName];
      return n;
    });
    setFormData((prev) => ({ ...prev, [fieldName]: file }));
  };

  const removeFile = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: null }));
    setFileErrors((prev) => {
      const n = { ...prev };
      delete n[fieldName];
      return n;
    });
    const input = document.getElementById(fieldName);
    if (input) input.value = "";
  };

  const validateStep = (step) => {
    setError("");
    const checks = {
      1: () => {
        if (
          !formData.businessNumber ||
          formData.businessNumber.replace(/\D/g, "").length !== 10
        )
          return t("validation.required", { field: t("auth.businessLicense") });
        if (!formData.password || formData.password.length < 8)
          return t("validation.passwordMinLength");
        if (formData.password !== formData.passwordConfirm)
          return t("validation.passwordMismatch");
        if (!formData.companyName)
          return t("validation.required", { field: t("member.companyName") });
        if (!formData.region || formData.region === "")
          return t("validation.required", { field: t("member.region") });
        if (!formData.category || formData.category === "")
          return t("validation.required", { field: t("member.category") });
        return null;
      },
      2: () => {
        if (!formData.address)
          return t("validation.required", { field: t("member.address") });
        if (!formData.representative)
          return t("validation.required", {
            field: t("member.representative"),
          });
        return null;
      },
      3: () => {
        if (!formData.email)
          return t("validation.required", { field: t("auth.email") });
        if (!formData.phone)
          return t("validation.required", { field: t("member.phone") });
        const phoneRegex =
          /^(01[0-9]-\d{3,4}-\d{4}|02-\d{3,4}-\d{4}|0[3-9]\d-\d{3,4}-\d{4})$/;
        if (!phoneRegex.test(formData.phone))
          return t("validation.invalidPhoneFormat");
        if (
          formData.representativePhone &&
          !phoneRegex.test(formData.representativePhone)
        )
          return t("validation.invalidPhoneFormat");
        if (
          formData.contactPersonPhone &&
          !phoneRegex.test(formData.contactPersonPhone)
        )
          return t("validation.invalidPhoneFormat");
        return null;
      },
      4: () => null,
      5: () => {
        if (
          !formData.termsOfService ||
          !formData.privacyPolicy ||
          !formData.thirdPartySharing
        )
          return t("auth.termsRequired");
        return null;
      },
    };
    const err = checks[step]?.();
    if (err) {
      setError(err);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 1) {
      setIsValidating(true);
      try {
        const result = await authService.checkBusinessNumber(
          formData.businessNumber,
        );
        if (!result.available) {
          setError(t("auth.businessNumberAlreadyRegistered"));
          setIsValidating(false);
          return;
        }
      } catch (err) {
        // Continue despite error
      }
      setIsValidating(false);
    }

    if (currentStep === 3) {
      setIsValidating(true);
      try {
        const result = await authService.checkEmail(formData.email);
        if (!result.available) {
          setError(t("auth.emailAlreadyRegistered"));
          setIsValidating(false);
          return;
        }
      } catch (err) {
        // Continue
      }
      setIsValidating(false);
    }

    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handlePrevious = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    if (!validateStep(5)) return;

    setIsSubmitting(true);

    const excludeFields = [
      "passwordConfirm",
      "agreeAll",
      "termsOfService",
      "privacyPolicy",
      "thirdPartySharing",
      "marketingConsent",
    ];
    const submitData = new FormData();

    Object.keys(formData).forEach((key) => {
      if (excludeFields.includes(key)) return;

      if (key === "logo" || key === "businessLicenseFile") {
        if (formData[key]) submitData.append(key, formData[key]);
      } else if (key === "cooperationFields") {
        formData.cooperationFields.forEach((field) =>
          submitData.append("cooperationFields[]", field),
        );
      } else if (key === "sales" || key === "employeeCount") {
        submitData.append(key, parseFormattedNumber(formData[key]) || 0);
      } else {
        if (
          formData[key] !== "" &&
          formData[key] !== null &&
          formData[key] !== undefined
        ) {
          submitData.append(key, formData[key]);
        }
      }
    });
    submitData.set(
      "business_number",
      formData.businessNumber?.replace(/-/g, "") || "",
    );

    try {
      await register(submitData);
      clearSavedFormData();
      setIsSubmitting(false);
      setSuccess(true);
    } catch (err) {
      setIsSubmitting(false);
      let message = err?.message || t("auth.registerFailed");
      const backendError =
        err?.response?.data?.error?.message || err?.response?.data?.message;
      if (backendError) message = backendError;

      if (message.includes("Business number already registered")) {
        message = t("auth.businessNumberAlreadyRegistered");
        setCurrentStep(1);
      } else if (message.includes("Email already registered")) {
        message = t("auth.emailAlreadyRegistered");
        setCurrentStep(3);
      }

      setError(message);
    }
  };

  const handleSuccessClose = () => {
    setSuccess(false);
    navigate("/");
  };

  return {
    state: {
      currentStep,
      totalSteps: TOTAL_STEPS,
      formData,
      error,
      success,
      isSubmitting,
      isValidating,
      showPassword,
      showPasswordConfirm,
      fileErrors,
      termsModalOpen,
      currentTermType,
      showLoginModal,
    },
    actions: {
      setFormData,
      setShowPassword,
      setShowPasswordConfirm,
      setTermsModalOpen,
      setShowLoginModal,
      handleAddressSelect,
      handleViewTerms,
      handleCloseTermsModal,
      handleChange,
      handleBusinessNumberChange,
      handleCorporationNumberChange,
      handlePhoneChange,
      handleFileChange,
      handleFileSelect,
      removeFile,
      handleNext,
      handlePrevious,
      handleSubmit,
      handleSuccessClose,
    },
  };
};
