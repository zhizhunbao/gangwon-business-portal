import { useTranslation } from "react-i18next";

export const RegisterStep3Contact = ({
  formData,
  handleChange,
  handlePhoneChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("auth.email")} <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder={t("auth.emailPlaceholder")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.phone")} <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handlePhoneChange}
          autoComplete="tel"
          placeholder="010-1234-5678"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
        <p className="mt-1 text-xs text-gray-500">{t("member.phoneHelp")}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.representativePhone")}
        </label>
        <input
          type="tel"
          name="representativePhone"
          value={formData.representativePhone}
          onChange={handlePhoneChange}
          autoComplete="tel"
          placeholder="010-1234-5678"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.contactPersonName")}
        </label>
        <input
          type="text"
          name="contactPersonName"
          value={formData.contactPersonName}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.contactPersonPhone")}
        </label>
        <input
          type="tel"
          name="contactPersonPhone"
          value={formData.contactPersonPhone}
          onChange={handlePhoneChange}
          autoComplete="tel"
          placeholder="010-1234-5678"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.contactPersonDepartment")}
        </label>
        <input
          type="text"
          name="contactPersonDepartment"
          value={formData.contactPersonDepartment}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.contactPersonPosition")}
        </label>
        <input
          type="text"
          name="contactPersonPosition"
          value={formData.contactPersonPosition}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>
    </div>
  );
};
