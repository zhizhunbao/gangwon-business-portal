import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { info, LOG_LAYERS } from "@shared/utils/logger";

/**
 * Component to log route changes automatically
 * 路由变更日志记录器
 * 
 * Requirements: 3.4
 */
export function RouteLogger() {
  const location = useLocation();
  const action = useNavigationType();

  useEffect(() => {
    // Log the route change using new logger core - Requirements 3.4
    try {
      info(
        LOG_LAYERS.ROUTER,
        `Route Change: ${action} ${location.pathname}`,
        {
          navigation_action: action, // PUSH, POP, REPLACE
          route_path: location.pathname,
          search: location.search,
          hash: location.hash,
          state: location.state,
          full_url: `${location.pathname}${location.search}${location.hash}`
        }
      );
    } catch (error) {
      // Fallback logging in case of errors - 保留基本的路由日志
      // AOP 系统会自动记录错误
    }
  }, [location, action]);

  return null;
}
