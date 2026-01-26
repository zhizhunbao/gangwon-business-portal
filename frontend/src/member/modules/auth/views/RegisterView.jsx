/**
 * Register View - Member Portal
 * Orchestrates the registration process using components and hooks.
 * Follows dev-frontend_patterns skill.
 */
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TermsModal, LoginModal } from "@shared/components";
import { useRegister } from "../hooks/useRegister";
import {
  RegisterStepIndicator,
  RegisterStep1Basic,
  RegisterStep2Info,
  RegisterStep3Contact,
  RegisterStep4Business,
  RegisterStep5Terms,
  RegisterSuccessModal,
} from "../components";

export default function RegisterView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, actions } = useRegister();

  const {
    currentStep,
    totalSteps,
    formData,
    error,
    success,
    isSubmitting,
    isValidating,
    showPassword,
    showPasswordConfirm,
    fileErrors,
    termsModalOpen,
    currentTermType,
    showLoginModal,
  } = state;

  return (
    <div className="min-h-screen bg-[#f5f6f7] py-12 px-4 sm:px-6">
      <div className="max-w-[640px] w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("common.register")}
          </h1>
        </div>

        {/* Progress */}
        <RegisterStepIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
        />

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={
              currentStep === 5
                ? actions.handleSubmit
                : async (e) => {
                    e.preventDefault();
                    await actions.handleNext();
                  }
            }
          >
            {/* Steps */}
            {currentStep === 1 && (
              <RegisterStep1Basic
                formData={formData}
                handleChange={actions.handleChange}
                handleBusinessNumberChange={actions.handleBusinessNumberChange}
                showPassword={showPassword}
                setShowPassword={actions.setShowPassword}
                showPasswordConfirm={showPasswordConfirm}
                setShowPasswordConfirm={actions.setShowPasswordConfirm}
              />
            )}

            {currentStep === 2 && (
              <RegisterStep2Info
                formData={formData}
                handleCorporationNumberChange={
                  actions.handleCorporationNumberChange
                }
                handleAddressSelect={actions.handleAddressSelect}
                isSubmitting={isSubmitting}
                handleChange={actions.handleChange}
                fileErrors={fileErrors}
                handleFileSelect={actions.handleFileSelect}
                removeFile={actions.removeFile}
              />
            )}

            {currentStep === 3 && (
              <RegisterStep3Contact
                formData={formData}
                handleChange={actions.handleChange}
                handlePhoneChange={actions.handlePhoneChange}
              />
            )}

            {currentStep === 4 && (
              <RegisterStep4Business
                formData={formData}
                handleChange={actions.handleChange}
                setFormData={actions.setFormData}
              />
            )}

            {currentStep === 5 && (
              <RegisterStep5Terms
                formData={formData}
                handleChange={actions.handleChange}
                handleViewTerms={actions.handleViewTerms}
              />
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={actions.handlePrevious}
                  disabled={isSubmitting || isValidating}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {t("auth.previousStep")}
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || isValidating}
                className={`flex-1 px-6 py-3 text-white bg-[#0052a4] rounded font-medium hover:bg-[#003d7a] active:bg-[#003366] transition disabled:opacity-50 ${currentStep === 1 ? "w-full" : ""}`}
              >
                {isSubmitting || isValidating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  </span>
                ) : currentStep < totalSteps ? (
                  t("auth.nextStep")
                ) : (
                  t("common.register")
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {t("auth.hasAccount")}{" "}
            <button
              type="button"
              onClick={() => actions.setShowLoginModal(true)}
              className="text-blue-600 hover:underline font-medium"
            >
              {t("common.login")}
            </button>
          </p>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => actions.setShowLoginModal(false)}
        onLoginSuccess={() => {
          actions.setShowLoginModal(false);
          navigate("/member/home");
        }}
      />

      <TermsModal
        isOpen={termsModalOpen}
        termType={currentTermType}
        onClose={actions.handleCloseTermsModal}
      />

      <RegisterSuccessModal
        success={success}
        handleSuccessClose={actions.handleSuccessClose}
      />
    </div>
  );
}
