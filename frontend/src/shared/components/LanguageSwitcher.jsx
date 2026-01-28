/**
 * Language Switcher Component
 * Only visible in development environment
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GlobeIcon } from "./Icons";
import { setStorage, cn } from "@shared/utils";

/**
 * @param {Object} props
 * @param {'light'|'dark'} props.variant - Style variant: 'light' for dark backgrounds, 'dark' for light backgrounds
 */
export default function LanguageSwitcher({ variant = "dark" }) {
  const { i18n, t } = useTranslation();

  // Only show in development environment
  const isDevelopment = import.meta.env.DEV;

  const languages = [
    { code: "ko", label: t('common.language.korean', '한국어') },
    { code: "zh", label: t('common.language.chinese', '중국어') },
  ];

  // Normalize current language: extract base language (e.g., 'ko-KR' -> 'ko')
  const currentLangCode = (i18n.language || "ko").split("-")[0];
  const currentLanguage =
    languages.find((lang) => lang.code === currentLangCode) || languages[0];
  const nextLanguage =
    languages.find((lang) => lang.code !== currentLangCode) || languages[1];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", currentLangCode);
    }
  }, [currentLangCode]);

  const persistLanguagePreference = (code) => {
    setStorage("language", code);
    try {
      localStorage.setItem("i18nextLng", code);
    } catch (error) {
      console.error("[LanguageSwitcher] Failed to persist language:", error);
    }
  };

  const toggleLanguage = () => {
    const targetCode = nextLanguage.code;
    persistLanguagePreference(targetCode);
    i18n.changeLanguage(targetCode).catch((error) => {
      console.error("[LanguageSwitcher] Failed to change language:", error);
    });
  };

  // Hide in production environment
  if (!isDevelopment) {
    return null;
  }

  return (
    <button
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === "light"
          ? "focus:ring-white text-white hover:text-yellow-100"
          : "focus:ring-primary-500 text-gray-700 dark:text-gray-300 hover:text-primary-600",
      )}
      onClick={toggleLanguage}
      title={`Switch to ${nextLanguage.label}`}
    >
      <GlobeIcon className="w-5 h-5" />
    </button>
  );
}
