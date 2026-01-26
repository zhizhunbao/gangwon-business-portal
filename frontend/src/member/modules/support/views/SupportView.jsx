/**
 * Support 模块入口视图 (重定向)
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@shared/utils/constants";

export default function SupportView() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[SupportView] Redirecting to:", ROUTES.MEMBER_NOTICES);
    // 默认重定向到公告事项页面
    if (ROUTES.MEMBER_NOTICES) {
      navigate(ROUTES.MEMBER_NOTICES, { replace: true });
    } else {
      console.error("[SupportView] ROUTES.MEMBER_NOTICES is undefined!");
    }
  }, [navigate]);

  return null;
}
