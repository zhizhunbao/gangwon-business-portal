import { useTranslation } from "react-i18next";
import { AddressSearch, FileUploadButton } from "@shared/components";

export const RegisterStep2Info = ({
  formData,
  handleCorporationNumberChange,
  handleAddressSelect,
  isSubmitting,
  handleChange,
  fileErrors,
  handleFileSelect,
  removeFile,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.corporationNumber")}
        </label>
        <input
          type="text"
          value={formData.corporationNumber}
          onChange={handleCorporationNumberChange}
          maxLength={14}
          placeholder="000000-0000000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.address")} <span className="text-red-500">*</span>
        </label>
        <AddressSearch
          value={formData.address}
          onSelect={handleAddressSelect}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.addressDetail")}
        </label>
        <input
          type="text"
          name="addressDetail"
          value={formData.addressDetail}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.representative")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="representative"
          value={formData.representative}
          onChange={handleChange}
          autoComplete="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.establishedDate")}
        </label>
        <input
          type="date"
          name="establishedDate"
          value={formData.establishedDate}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
        />
        <p className="mt-1 text-xs text-gray-500">
          {t("member.establishedDateHelp")}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.logoUpload")}
        </label>
        <div className="flex items-center gap-3">
          <FileUploadButton
            accept="image/*"
            label={t("common.selectFile", "파일 선택")}
            onFilesSelected={(files) =>
              handleFileSelect(files[0], "logo", true)
            }
          />
          {formData.logo && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{formData.logo.name}</span>
              <button
                type="button"
                onClick={() => removeFile("logo")}
                className="text-red-500 hover:text-red-700"
              >
                {t("auth.removeFile")}
              </button>
            </div>
          )}
        </div>
        {fileErrors.logo && (
          <p className="mt-1 text-xs text-red-500">{fileErrors.logo}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("member.businessLicenseFile")}
        </label>
        <div className="flex items-center gap-3">
          <FileUploadButton
            label={t("common.selectFile", "파일 선택")}
            onFilesSelected={(files) =>
              handleFileSelect(files[0], "businessLicenseFile", false)
            }
          />
          {formData.businessLicenseFile && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">
                {formData.businessLicenseFile.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile("businessLicenseFile")}
                className="text-red-500 hover:text-red-700"
              >
                {t("auth.removeFile")}
              </button>
            </div>
          )}
        </div>
        {fileErrors.businessLicenseFile && (
          <p className="mt-1 text-xs text-red-500">
            {fileErrors.businessLicenseFile}
          </p>
        )}
      </div>
    </div>
  );
};
