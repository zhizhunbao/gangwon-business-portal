import { useTranslation } from "react-i18next";
import { TERM_TYPES } from "@shared/components";

export const RegisterStep5Terms = ({
  formData,
  handleChange,
  handleViewTerms,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition">
        <input
          type="checkbox"
          name="agreeAll"
          checked={formData.agreeAll}
          onChange={handleChange}
          className="w-5 h-5 text-blue-600 rounded"
        />
        <span className="font-medium text-gray-900">{t("auth.agreeAll")}</span>
      </label>

      <div className="border-t border-gray-200 pt-4 space-y-4">
        {[
          {
            name: "termsOfService",
            type: TERM_TYPES.TERMS_OF_SERVICE,
            required: true,
          },
          {
            name: "privacyPolicy",
            type: TERM_TYPES.PRIVACY_POLICY,
            required: true,
          },
          {
            name: "thirdPartySharing",
            type: TERM_TYPES.THIRD_PARTY_SHARING,
            required: true,
          },
          {
            name: "marketingConsent",
            type: TERM_TYPES.MARKETING_CONSENT,
            required: false,
          },
        ].map(({ name, type, required }) => (
          <div key={name} className="flex items-center justify-between py-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name={name}
                checked={formData[name]}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">
                <span className={required ? "text-red-500" : "text-gray-400"}>
                  {required
                    ? t("auth.termsRequiredLabel")
                    : t("auth.termsOptionalLabel")}
                </span>{" "}
                {t(`auth.${name}`)}
              </span>
            </label>
            <button
              type="button"
              onClick={() => handleViewTerms(type)}
              className="text-sm text-blue-600 hover:underline"
            >
              {t("auth.viewTerms")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
