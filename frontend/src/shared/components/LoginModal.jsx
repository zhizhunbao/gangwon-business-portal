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
import { formatBusinessLicense, cn } from "@shared/utils";

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
      const businessNumberClean = formData.businessNumber.replace(/-/g, "");
      const response = await login({
        businessNumber: businessNumberClean,
        password: formData.password,
      });

      if (onSuccess) {
        onSuccess(response);
      }
      onClose();
    } catch (err) {
      // 根据错误码显示对应消息
      const errorCode = err.code || err.response?.data?.error?.code;
      let errorMessage = t("auth.loginFailed");

      if (errorCode >= 2000 && errorCode < 3000) {
        // 账户状态错误
        if (errorCode === 2001) {
          errorMessage = t("auth.approvalPending");
        } else if (errorCode === 2002) {
          errorMessage = t("auth.accountSuspended");
        } else {
          errorMessage = t("auth.accountSuspended");
        }
      } else if (errorCode >= 1000 && errorCode < 2000) {
        // 凭证错误
        errorMessage = t("auth.invalidCredentials");
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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
      disableBackdropClose={isLoading}
      showCloseButton={!isLoading}
    >
      <div className="p-0">
        {error && (
          <div className="px-4 py-3 mb-6 text-red-700 bg-red-50 border border-red-200 rounded-lg text-sm leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-0" autoComplete="on">
          <div className="mb-6 mt-0">
            <label
              htmlFor="modal-businessNumber"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {t("auth.businessLicense")}
            </label>
            <input
              id="modal-businessNumber"
              name="businessNumber"
              type="text"
              className="w-full py-3 text-base leading-relaxed text-gray-900 bg-transparent border-0 border-b border-gray-300 rounded-none outline-none box-border transition-colors duration-200 focus:border-gray-900 focus:outline-none"
              value={formData.businessNumber}
              onChange={handleBusinessNumberChange}
              required
              maxLength={12}
              placeholder={t("auth.businessLicensePlaceholder")}
              autoComplete="username"
            />
            <span className="block mt-1.5 text-xs text-gray-500">
              {t("auth.businessLicenseHelp")}
            </span>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2 text-sm">
              <label
                htmlFor="modal-password"
                className="block text-sm font-medium text-gray-700"
              >
                {t("auth.password")}
              </label>
              <div className="flex items-center gap-2">
                <Link
                  to="/find-id"
                  className="text-gray-900 no-underline text-base font-medium hover:underline"
                  onClick={handleClose}
                >
                  {t("auth.findId")}
                </Link>
                <span className="text-gray-400 text-xs">|</span>
                <Link
                  to="/forgot-password"
                  className="text-gray-900 no-underline text-base font-medium hover:underline"
                  onClick={handleClose}
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </div>
            <div className="relative flex items-center">
              <input
                id="modal-password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="w-full py-3 pr-10 text-base leading-relaxed text-gray-900 bg-transparent border-0 border-b border-gray-300 rounded-none outline-none box-border transition-colors duration-200 focus:border-gray-900 focus:outline-none"
                style={{ letterSpacing: showPassword ? "normal" : "-0.02em" }}
                value={formData.password}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
                data-form-type="password"
              />
              <button
                type="button"
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-none border-none cursor-pointer p-2 text-gray-500 flex items-center justify-center transition-colors duration-200 hover:text-gray-900 focus:outline-none focus:text-gray-900"
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

          <div className="flex items-center mb-6">
            <input
              id="modal-remember-me"
              name="remember-me"
              type="checkbox"
              className="mr-2 w-4 h-4 cursor-pointer accent-[#0052a4]"
            />
            <label
              htmlFor="modal-remember-me"
              className="text-sm text-gray-700 cursor-pointer m-0"
            >
              {t("auth.rememberMe")}
            </label>
          </div>

          <button
            type="submit"
            className={cn(
              "w-full px-6 py-3.5 min-h-[52px] text-base font-medium leading-relaxed text-center text-white",
              "bg-[#0052a4] border-none rounded-md cursor-pointer transition-all duration-200",
              "inline-flex items-center justify-center gap-2 box-border",
              "hover:bg-[#003d7a] active:bg-[#003d7a]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
            ) : (
              t("common.login")
            )}
          </button>
        </form>

        <div className="mt-6 pt-0 border-t-0 text-center text-base text-gray-500 leading-relaxed">
          {t("auth.noAccount")}{" "}
          <button
            type="button"
            className="bg-none border-none text-[#0052a4] cursor-pointer text-base font-medium font-inherit p-0 underline hover:text-[#003d7a]"
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
