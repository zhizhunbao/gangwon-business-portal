/**
 * Input Component
 */

import { forwardRef, useRef, useEffect } from "react";
import { cn } from "@shared/utils/helpers";

export const Input = forwardRef(function Input(
  {
    label,
    error,
    help,
    required,
    inline = false,
    className,
    containerClassName,
    type,
    ...props
  },
  ref,
) {
  const inputRef = useRef(null);
  const actualRef = ref || inputRef;

  const handleClick = (e) => {
    if (type === "date" && actualRef?.current) {
      // 确保输入框获得焦点
      actualRef.current.focus();
      // 如果浏览器支持 showPicker API，则调用它
      if (
        actualRef.current.showPicker &&
        typeof actualRef.current.showPicker === "function"
      ) {
        try {
          actualRef.current.showPicker();
        } catch (err) {
          // 如果 showPicker 失败（例如某些浏览器限制），则只聚焦
          // 浏览器会自动显示日期选择器
        }
      }
    }
  };

  const inputEl = (
    <input
      ref={actualRef}
      type={type}
      className={cn(
        "px-3 py-2 border rounded-md shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
        "transition-colors duration-200",
        inline ? "inline-block w-auto" : "w-full",
        type === "date" && "cursor-pointer",
        error
          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300",
        className,
      )}
      onClick={handleClick}
      {...props}
    />
  );

  if (inline) {
    return (
      <>
        {inputEl}
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {help && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{help}</p>
        )}
      </>
    );
  }

  return (
    <div className={cn("mb-4", containerClassName)}>
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
      {inputEl}
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      {help && !error && <p className="mt-1.5 text-sm text-gray-500">{help}</p>}
    </div>
  );
});

export default Input;
