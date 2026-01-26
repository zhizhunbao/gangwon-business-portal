import { useTranslation } from "react-i18next";

export const RegisterStepIndicator = ({ currentStep, totalSteps = 5 }) => {
  const { t } = useTranslation();
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  step < currentStep
                    ? "bg-[#0052a4] border-[#0052a4] text-white"
                    : step === currentStep
                      ? "bg-[#0052a4] border-[#0052a4] text-white"
                      : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {step < currentStep ? "✓" : step}
              </div>
              <span
                className={`mt-2 text-xs text-center whitespace-nowrap ${
                  step === currentStep
                    ? "text-[#0052a4] font-semibold"
                    : "text-gray-500"
                }`}
              >
                {t(`auth.registerStep${step}`)}
              </span>
            </div>
            {idx < totalSteps - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-20px] ${step < currentStep ? "bg-[#0052a4]" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
