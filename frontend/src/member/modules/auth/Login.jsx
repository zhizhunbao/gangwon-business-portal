/**
 * Login Page - Member Portal
 * Minimalist Style
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@shared/hooks";
import { LanguageSwitcher } from "@shared/components";
import { EyeIcon, EyeOffIcon } from "@shared/components/Icons";
import { formatBusinessLicense } from "@shared/utils/format";
// Auth styles converted to Tailwind classes

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

    // Remove dashes from business number for API call
    const businessNumberClean = formData.businessNumber.replace(/-/g, "");

    try {
      const response = await login({
        businessNumber: businessNumberClean,
        password: formData.password,
      });

      if (!response || !response.user) {
        throw new Error(t("auth.loginFailed", "登录失败，请检查账号和密码"));
      }

      // Redirect based on role
      const redirectPath =
        response.user.role === "admin" ? "/admin" : "/member";
      navigate(redirectPath);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t("auth.loginFailed", "登录失败，请检查账号和密码");
      setError(message);
    }
  };

  const handleBusinessNumberChange = (e) => {
    const value = e.target.value;
    const formatted = formatBusinessLicense(value);
    setFormData((prev) => ({
      ...prev,
      businessNumber: formatted,
    }));
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      password: e.target.value,
    }));
    if (error) setError("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 px-5 bg-white relative">
      <div className="absolute top-5 right-5">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md px-10 py-12 bg-white rounded-lg shadow-sm">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 m-0 tracking-tight">{t("common.appName")}</h2>
        </div>

        {error && <div className="px-4 py-3 mb-6 text-red-700 bg-red-100 border-none rounded-md text-sm leading-relaxed">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-8" autoComplete="on">
          <div className="mb-6">
            <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700 mb-2">{t("auth.businessLicense")}</label>
            <input
              id="businessNumber"
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t("auth.password")}</label>
              <div className="flex items-center gap-2">
                <Link to="/find-id" className="text-gray-900 no-underline text-base font-medium hover:underline">
                  {t("auth.findId")}
                </Link>
                <span className="text-gray-400 text-xs">|</span>
                <Link to="/forgot-password" className="text-gray-900 no-underline text-base font-medium hover:underline">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </div>
            <div className="relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="w-full py-3 pr-10 text-base leading-relaxed text-gray-900 bg-transparent border-0 border-b border-gray-300 rounded-none outline-none box-border transition-colors duration-200 focus:border-gray-900 focus:outline-none"
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
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="mr-2 w-4 h-4 cursor-pointer accent-gray-900"
            />
            <label htmlFor="remember-me" className="text-sm text-gray-700 cursor-pointer m-0">
              {t("auth.rememberMe")}
            </label>
          </div>

          <button
            type="submit"
            className={`w-full px-6 py-3.5 text-base font-medium leading-relaxed text-center text-white bg-gray-900 border-none rounded-md cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2 box-border hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
              isLoading ? "relative text-transparent" : ""
            }`}
            disabled={isLoading}
          >
            {isLoading && (
              <div className="absolute w-4.5 h-4.5 top-1/2 left-1/2 -ml-2.25 -mt-2.25 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
            )}
            {!isLoading && t("common.login")}
          </button>
        </form>

        <div className="mt-8 pt-0 border-t-0 text-center text-base text-gray-500 leading-relaxed">
          {t("auth.noAccount")}{" "}
          <Link to="/member/register" className="text-gray-900 no-underline font-medium hover:underline">
            {t("common.register")}
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
