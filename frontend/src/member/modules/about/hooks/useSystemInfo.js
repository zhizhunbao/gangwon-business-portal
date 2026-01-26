/**
 * 系统介绍 Hook
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { portalService } from "@shared/services";

/**
 * 获取系统介绍信息的 Hook
 */
export function useSystemInfo() {
  const { t, i18n } = useTranslation();
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAboutContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await portalService.getSystemInfo();

        if (isMounted) {
          if (data && data.contentHtml) {
            setHtmlContent(data.contentHtml);
          } else {
            setHtmlContent("");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch system info:", err);
          setError(t("about.fetchError", "Failed to fetch content"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAboutContent();

    return () => {
      isMounted = false;
    };
  }, [i18n.language, t]);

  return { htmlContent, loading, error };
}
