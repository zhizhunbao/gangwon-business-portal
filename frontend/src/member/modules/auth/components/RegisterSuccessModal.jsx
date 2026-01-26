import { useTranslation } from "react-i18next";

export const RegisterSuccessModal = ({ success, handleSuccessClose }) => {
  const { t } = useTranslation();

  if (!success) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in duration-200">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t("auth.registerSuccess")}
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          {t("auth.registerPendingApproval")}
        </p>
        <button
          onClick={handleSuccessClose}
          className="w-full px-6 py-3 bg-[#0052a4] text-white rounded font-medium hover:bg-[#003d7a] transition"
        >
          {t("common.confirm")}
        </button>
      </div>
    </div>
  );
};
