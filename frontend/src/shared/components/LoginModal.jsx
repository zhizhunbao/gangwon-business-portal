/**
 * Login Modal Component
 * 登录弹窗组件
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@shared/hooks";
import { Modal } from "./Modal";
import { EyeIcon, EyeOffIcon } from "./Icons";
import { formatBusinessLicense } from "@shared/utils/format";
import { loggerService, exceptionService } from "@shared/services";
import { API_PREFIX } from "@shared/utils/constants";
import "@member/modules/auth/Auth.css";
import "./LoginModal.css";

export function LoginModal({ isOpen, onClose, onSuccess, onSwitchToRegister }) {
  const { t } = useTranslation();
  const { login, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    businessNumber: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Remove dashes from business number for API call
      const businessNumberClean = formData.businessNumber.replace(/-/g, "");
      const response = await login({
        businessNumber: businessNumberClean,
        password: formData.password,
      });

      // Log successful login
      const maskedBusinessNumber =
        businessNumberClean.length > 3
          ? `${businessNumberClean.substring(
              0,
              3
            )}-${businessNumberClean.substring(3, 5)}-*****`
          : "***-***-*****";
      loggerService.info("Member login successful (modal)", {
        request_method: "POST",
        request_path: `${API_PREFIX}/auth/login`,
        response_status: 200,
        extra_data: {
          component: "LoginModal",
          action: "handleSubmit",
          user_role: response.user?.role,
          business_number_masked: maskedBusinessNumber,
        },
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response);
      }

      // Close modal
      onClose();
    } catch (err) {
      // Extract error message properly
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        (typeof err === "string" ? err : JSON.stringify(err)) ||
        t("auth.loginFailed");
      setError(errorMessage);

      // Log login failure
      const businessNumberClean = formData.businessNumber.replace(/-/g, "");
      const maskedBusinessNumber =
        businessNumberClean.length > 3
          ? `${businessNumberClean.substring(
              0,
              3
            )}-${businessNumberClean.substring(3, 5)}-*****`
          : "***-***-*****";

      const errorObj =
        err instanceof Error ? err : new Error(errorMessage || "Login failed");

      if (!errorObj.message || errorObj.message === "[object Object]") {
        errorObj.message = errorMessage;
      }

      exceptionService.recordException(errorObj, {
        request_method: "POST",
        request_path: `${API_PREFIX}/auth/login`,
        error_code: err.response?.data?.code || err.code || "LOGIN_FAILED",
        status_code: err.response?.status || err.status,
        context_data: {
          component: "LoginModal",
          action: "handleSubmit",
          business_number_masked: maskedBusinessNumber,
        },
      });

      loggerService.warn("Member login failed (modal)", {
        request_method: "POST",
        request_path: `${API_PREFIX}/auth/login`,
        response_status: err.response?.status || err.status,
        error_code: err.response?.data?.code || err.code || "LOGIN_FAILED",
        error_message: errorMessage,
        extra_data: {
          component: "LoginModal",
          action: "handleSubmit",
          business_number_masked: maskedBusinessNumber,
        },
      });
    }
  };

  const handleBusinessNumberChange = (e) => {
    const value = e.target.value;
    const formatted = formatBusinessLicense(value);
    setFormData((prev) => ({
      ...prev,
      businessNumber: formatted,
    }));
  };

  const handlePasswordChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      password: e.target.value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Reset form when modal closes
  const handleClose = () => {
    setFormData({ businessNumber: "", password: "" });
    setError("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("auth.login")}
      size="sm"
    >
      <div className="login-modal-content">
        {error && <div className="auth-alert auth-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
          <div className="auth-form-group">
            <label htmlFor="modal-businessNumber">
              {t("auth.businessLicense")}
            </label>
            <input
              id="modal-businessNumber"
              name="businessNumber"
              type="text"
              className="auth-input"
              value={formData.businessNumber}
              onChange={handleBusinessNumberChange}
              required
              maxLength={12}
              placeholder={t("auth.businessLicensePlaceholder")}
              autoComplete="username"
            />
            <span className="auth-help-text">
              {t("auth.businessLicenseHelp")}
            </span>
          </div>

          <div className="auth-form-group">
            <div className="auth-links">
              <label htmlFor="modal-password">{t("auth.password")}</label>
              <div className="auth-link-group">
                <Link to="/find-id" className="auth-link" onClick={handleClose}>
                  {t("auth.findId")}
                </Link>
                <span className="auth-link-separator">|</span>
                <Link
                  to="/forgot-password"
                  className="auth-link"
                  onClick={handleClose}
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </div>
            <div className="auth-password-input-wrapper">
              <input
                id="modal-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                value={formData.password}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
                data-form-type="password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={
                  showPassword ? t("auth.hidePassword") : t("auth.showPassword")
                }
              >
                {showPassword ? (
                  <EyeOffIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="auth-checkbox-group">
            <input
              id="modal-remember-me"
              name="remember-me"
              type="checkbox"
              className="auth-checkbox"
            />
            <label htmlFor="modal-remember-me" className="auth-checkbox-label">
              {t("auth.rememberMe")}
            </label>
          </div>

          <button
            type="submit"
            className={`auth-button auth-button-primary ${
              isLoading ? "auth-button-loading" : ""
            }`}
            disabled={isLoading}
          >
            {!isLoading && t("common.login")}
          </button>
        </form>

        <div className="auth-footer">
          {t("auth.noAccount")}{" "}
          <button
            type="button"
            className="auth-link-button"
            onClick={() => {
              handleClose();
              if (onSwitchToRegister) onSwitchToRegister();
            }}
          >
            {t("common.register")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default LoginModal;
