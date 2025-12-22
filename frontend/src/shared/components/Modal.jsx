/**
 * Modal Component
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@shared/utils/helpers";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  className,
  disableBackdropClose = false,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !disableBackdropClose) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, disableBackdropClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // 移除手动日志 - 使用 AOP 系统自动处理

  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    full: "sm:max-w-full",
  };

  if (!isOpen) {
    return null;
  }

  // 移除手动日志 - 使用 AOP 系统自动处理

  const modalContent = (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{
        zIndex: 99999,
        position: "fixed",
      }}
    >
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={() => {
          if (!disableBackdropClose) onClose();
        }}
      />

      {/* Modal content container */}
      <div
        className={cn(
          "flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0",
          size === "full" ? "p-0" : ""
        )}
      >
        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        {/* Modal content */}
        <div
          className={cn(
            "relative bg-white text-left shadow-xl transition-all",
            // Base styles for all modals (except full)
            size !== "full" && [
              "rounded-lg",
              "inline-block align-bottom sm:my-8 sm:align-middle",
              "w-full",
              sizeClasses[size],
            ],
            // Styles specific to full screen modal
            size === "full" && [
              "fixed inset-0 w-full h-full m-0 rounded-none",
              "flex flex-col",
            ],
            className
          )}
          style={{
            backgroundColor: "#ffffff",
            color: "#000000",
            // Ensure proper stacking context
            position: size === "full" ? "fixed" : "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              {title && (
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={onClose}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div
            className={cn(
              "px-6 py-4",
              size === "full" ? "flex-1 overflow-y-auto" : ""
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // Use Portal to render modal at body level to avoid z-index issues
  return createPortal(modalContent, document.body);
}

export function ModalFooter({ children, className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-100",
        className
      )}
    >
      {children}
    </div>
  );
}
