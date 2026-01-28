/**
 * Select Component
 */

import { forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/utils/helpers";

export const Select = forwardRef(function Select(
  {
    label,
    error,
    help,
    required,
    options = [],
    placeholder,
    inline = false,
    className,
    containerClassName,
    ...props
  },
  ref,
) {
  const { t } = useTranslation();
  // 检查 options 的第一个选项是否已经是 value='' 的选项（表示"全部"类型的默认选项）
  const hasAllOption = options.length > 0 && options[0].value === "";
  const defaultPlaceholder =
    placeholder !== null
      ? placeholder || (hasAllOption ? null : t('common.all', '전체'))
      : null;
  const selectElement = (
    <>
      <select
        ref={ref}
        className={cn(
          "px-3 py-2 border rounded-md shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
          "transition-colors duration-200",
          inline ? "inline-block w-auto" : "w-full",
          error
            ? "border-red-500 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300",
          className,
        )}
        {...props}
      >
        {defaultPlaceholder !== null && (
          <option value="">{defaultPlaceholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      {help && !error && <p className="mt-1.5 text-sm text-gray-500">{help}</p>}
    </>
  );

  if (inline) {
    return selectElement;
  }

  return (
    <div className={containerClassName}>
      {label && (
        <label
          className={cn(
            "block text-sm font-medium text-gray-700 mb-1.5",
            required && 'after:content-["*"] after:text-red-500 after:ml-1',
          )}
        >
          {label}
        </label>
      )}
      {selectElement}
    </div>
  );
});

export default Select;
