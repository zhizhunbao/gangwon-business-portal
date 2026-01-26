import { useTranslation } from "react-i18next";

export const RegisterStep4Business = ({
  formData,
  handleChange,
  setFormData,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.startupType")}
        </label>
        <select
          name="startupType"
          value={formData.startupType}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        >
          <option value="">{t("member.selectStartupType")}</option>
          <option value="student_startup">
            {t("industryClassification.startupType.student_startup")}
          </option>
          <option value="faculty_startup">
            {t("industryClassification.startupType.faculty_startup")}
          </option>
          <option value="women_enterprise">
            {t("industryClassification.startupType.women_enterprise")}
          </option>
          <option value="research_institute">
            {t("industryClassification.startupType.research_institute")}
          </option>
          <option value="venture_company">
            {t("industryClassification.startupType.venture_company")}
          </option>
          <option value="non_venture">
            {t("industryClassification.startupType.non_venture")}
          </option>
          <option value="preliminary_social_enterprise">
            {t(
              "industryClassification.startupType.preliminary_social_enterprise",
            )}
          </option>
          <option value="social_enterprise">
            {t("industryClassification.startupType.social_enterprise")}
          </option>
          <option value="youth_enterprise">
            {t("industryClassification.startupType.youth_enterprise")}
          </option>
          <option value="cooperative">
            {t("industryClassification.startupType.cooperative")}
          </option>
          <option value="village_enterprise">
            {t("industryClassification.startupType.village_enterprise")}
          </option>
          <option value="other">
            {t("industryClassification.startupType.other")}
          </option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.ksicMajor")}
        </label>
        <select
          name="ksicMajor"
          value={formData.ksicMajor}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        >
          <option value="">{t("member.selectKsicMajor")}</option>
          {[
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
            "M",
            "N",
            "O",
            "P",
            "Q",
            "R",
            "S",
            "T",
            "U",
          ].map((code) => (
            <option key={code} value={code}>
              {t(`industryClassification.ksicMajor.${code}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.ksicSub")}
        </label>
        <select
          name="ksicSub"
          value={formData.ksicSub}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        >
          <option value="">{t("member.selectKsicSub")}</option>
          {[
            "13",
            "20",
            "21",
            "22",
            "23",
            "24",
            "25",
            "26",
            "27",
            "28",
            "29",
            "30",
            "31",
          ].map((code) => (
            <option key={code} value={code}>
              {t(`industryClassification.ksicSub.${code}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.businessField")}
        </label>
        <select
          name="businessField"
          value={formData.businessField}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        >
          <option value="">{t("member.selectBusinessField")}</option>
          <option value="software">{t("profile.industries.software")}</option>
          <option value="hardware">{t("profile.industries.hardware")}</option>
          <option value="biotechnology">
            {t("profile.industries.biotechnology")}
          </option>
          <option value="healthcare">
            {t("profile.industries.healthcare")}
          </option>
          <option value="education">{t("profile.industries.education")}</option>
          <option value="finance">{t("profile.industries.finance")}</option>
          <option value="other">{t("profile.industries.other")}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.sales")}
        </label>
        <input
          type="text"
          name="sales"
          value={formData.sales}
          onChange={handleChange}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.employeeCount")}
        </label>
        <input
          type="text"
          name="employeeCount"
          value={formData.employeeCount}
          onChange={handleChange}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.websiteUrl")}
        </label>
        <input
          type="url"
          name="websiteUrl"
          value={formData.websiteUrl}
          onChange={handleChange}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.mainBusiness")}
        </label>
        <textarea
          name="mainBusiness"
          value={formData.mainBusiness}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.cooperationFields")}
        </label>
        <input
          type="text"
          value={formData.cooperationFields.join(", ")}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              cooperationFields: e.target.value
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v),
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
        <p className="mt-1 text-xs text-gray-500">
          {t("common.commaSeparatedHint") || "多个值请用逗号分隔"}
        </p>
      </div>
    </div>
  );
};
