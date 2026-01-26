import { useState } from "react";
import { useTranslation } from "react-i18next";
import authService from "../services/auth.service";

export const useForgotPassword = () => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    businessNumber: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await authService.forgotPassword(formData);
      setSuccess(true);
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.detail;
      if (message?.includes("do not match") || message?.includes("不匹配")) {
        setError(t("auth.businessEmailMismatch"));
      } else {
        setError(message || t("auth.forgotPasswordError"));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return {
    state: {
      formData,
      isLoading,
      error,
      success,
    },
    actions: {
      handleChange,
      handleSubmit,
      setError, // Optional if view wants to clear error manually
    },
  };
};
