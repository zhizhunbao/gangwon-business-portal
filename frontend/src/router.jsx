/**
 * Router Configuration
 */

import {
  createBrowserRouter,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import { useAuth } from "@shared/hooks";
import { Button, Loading, LoginModal, ErrorBoundary } from "@shared/components";

// Root Layout
function RootLayout() {
  return <Outlet />;
}

// Protected Route Component with Login Modal
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user, isLoading, getCurrentUser } = useAuth();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 页面刷新时，如果有 token 但没有 user 数据，需要获取用户信息
    const initAuth = async () => {
      if (isAuthenticated && !user) {
        try {
          await getCurrentUser();
        } catch {
          // getCurrentUser 内部会处理错误并清除认证状态
        }
      }
      setIsInitializing(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    // Show login modal if not authenticated (after initialization)
    if (!isInitializing && !isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated, isInitializing]);

  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // The route will automatically re-render after authentication state updates
  };

  // 初始化中或正在加载用户数据时显示 Loading
  if (isInitializing || (isAuthenticated && !user && isLoading)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <Loading />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Show login modal instead of redirecting
    const isAdminRoute = location.pathname.startsWith("/admin");

    // For admin routes, we still redirect to admin login page
    // For member routes, show login modal
    if (isAdminRoute) {
      return <Navigate to="/admin/login" replace />;
    }

    return (
      <>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => {
            // AOP 系统会自动记录路由事件
            // Only close the modal here; do not auto-redirect.
            setShowLoginModal(false);
          }}
          onSuccess={handleLoginSuccess}
        />
        {/* Show loading or placeholder while modal is open */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh",
          }}
        >
          <Loading />
        </div>
      </>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    const redirectUrl = `/unauthorized?from=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={redirectUrl} replace />;
  }

  return children;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    // When authenticated, always redirect to the dashboard that matches the current role
    // This prevents admin accounts from visiting the member login page (and vice versa) for "role switching"
    const redirectPath = user?.role === "admin" ? "/admin" : "/member";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

// Simple Error Page Components (inline, no separate pages directory)
function Unauthorized() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // 从 URL 参数或 state 中获取来源路径
  const searchParams = new URLSearchParams(location.search);
  const fromParam = searchParams.get("from") || location.state?.from || "";

  // 判断是否来自管理员路径
  const isFromAdmin = fromParam.startsWith("/admin");
  const isFromMember = fromParam.startsWith("/member");

  const getHomePath = () => {
    // 优先根据用户角色决定跳转路径
    if (user?.role === "admin") return "/admin";
    if (user?.role === "member") return "/member";
    // 未登录时根据来源路径决定
    if (isFromAdmin) return "/admin/login";
    return "/member";
  };

  const homePath = getHomePath();
  const isAdminPath = user?.role === "admin";

  const handleNavigate = (path) => {
    // 使用 window.location.href 确保跳转可靠
    window.location.href = path;
  };

  return (
    <div className="error-page">
      <div className="error-page-container">
        <div className="error-code">403</div>
        <h1 className="error-title">접근 권한이 없습니다</h1>
        <p className="error-message">
          이 페이지에 접근할 수 있는 권한이 없습니다.
        </p>
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {isAuthenticated ? (
            // 已登录：返回对应首页
            <Button onClick={() => handleNavigate(homePath)}>
              {isAdminPath ? "관리자 홈으로 돌아가기" : "홈으로 돌아가기"}
            </Button>
          ) : isFromAdmin ? (
            // 未登录 + 来自管理员路径：跳转管理员登录
            <Button onClick={() => handleNavigate("/admin/login")}>
              관리자 로그인
            </Button>
          ) : isFromMember ? (
            // 未登录 + 来自会员路径：跳转会员首页（会弹出登录模态框）
            <Button onClick={() => handleNavigate("/member/home")}>
              로그인
            </Button>
          ) : (
            // 来源不明确：显示两个选项
            <>
              <Button onClick={() => handleNavigate("/member/home")}>
                회원 로그인
              </Button>
              <Button
                onClick={() => handleNavigate("/admin/login")}
                style={{ backgroundColor: "#6b7280" }}
              >
                관리자 로그인
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  const location = useLocation();
  const { user } = useAuth();

  // 현재 경로를 기반으로 적절한 홈 페이지 결정
  const getHomePath = () => {
    const currentPath = location.pathname;

    // 首先检查用户角色
    if (user?.role === "admin") {
      return "/admin";
    }

    // 관리자 경로인 경우 관리자 홈으로
    if (currentPath.startsWith("/admin")) {
      return "/admin";
    }

    // 회원 경로인 경우 회원 홈으로
    if (currentPath.startsWith("/member")) {
      return "/member";
    }

    // 기본적으로 회원 홈으로 (일반 사용자)
    return "/member";
  };

  const homePath = getHomePath();
  const isAdminPath = homePath === "/admin";

  return (
    <div className="error-page">
      <div className="error-page-container">
        <div className="error-code">404</div>
        <h1 className="error-title">페이지를 찾을 수 없습니다</h1>
        <p className="error-message">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Button onClick={() => (window.location.href = homePath)}>
          {isAdminPath ? "관리자 홈으로 돌아가기" : "홈으로 돌아가기"}
        </Button>
      </div>
    </div>
  );
}

// Lazy load layouts
const AdminLayout = lazy(() =>
  import("@admin/layouts/AdminLayout").then((m) => ({ default: m.default })),
);
const MemberLayout = lazy(() =>
  import("@member/layouts/MemberLayout").then((m) => ({ default: m.default })),
);

// Lazy load auth modules
const Register = lazy(() =>
  import("@member/modules/auth").then((m) => ({ default: m.RegisterView })),
);
const ForgotPassword = lazy(() =>
  import("@member/modules/auth").then((m) => ({
    default: m.ForgotPasswordView,
  })),
);
const AdminLogin = lazy(() =>
  import("@admin/modules/auth/Login").then((m) => ({ default: m.default })),
);
const AdminForgotPassword = lazy(() =>
  import("@admin/modules/auth/ForgotPassword").then((m) => ({
    default: m.default,
  })),
);

// Lazy load member modules
const MemberHome = lazy(() =>
  import("@member/modules/home").then((m) => ({ default: m.HomeView })),
);
const MemberProjects = lazy(() =>
  import("@member/modules/projects").then((m) => ({
    default: m.ProjectListView,
  })),
);
const MemberProjectList = lazy(() =>
  import("@member/modules/projects").then((m) => ({
    default: m.ProjectListView,
  })),
);
const MemberApplicationRecords = lazy(() =>
  import("@member/modules/projects").then((m) => ({
    default: m.ApplicationRecordsView,
  })),
);
const MemberAbout = lazy(() =>
  import("@member/modules/about").then((m) => ({ default: m.AboutView })),
);
const MemberPerformance = lazy(() =>
  import("@member/modules/performance").then((m) => ({
    default: m.PerformanceView,
  })),
);
const MemberPerformanceCompanyInfo = lazy(() =>
  import("@member/modules/performance").then((m) => ({
    default: m.CompanyInfoView,
  })),
);
const MemberPerformanceList = lazy(() =>
  import("@member/modules/performance").then((m) => ({
    default: m.PerformanceListView,
  })),
);
const MemberPerformanceEdit = lazy(() =>
  import("@member/modules/performance").then((m) => ({
    default: m.PerformanceEditView,
  })),
);
const MemberPerformanceEditDetail = lazy(() =>
  import("@member/modules/performance").then((m) => ({
    default: m.PerformanceEditView,
  })),
);
const MemberSupport = lazy(() =>
  import("@member/modules/support").then((m) => ({
    default: m.SupportView,
  })),
);
const MemberSupportFAQ = lazy(() =>
  import("@member/modules/support").then((m) => ({
    default: m.FAQView,
  })),
);
const MemberSupportInquiry = lazy(() =>
  import("@member/modules/support").then((m) => ({
    default: m.InquiryView,
  })),
);
const MemberSupportInquiryHistory = lazy(() =>
  import("@member/modules/support").then((m) => ({
    default: m.InquiryHistoryView,
  })),
);
const NoticesList = lazy(() =>
  import("@member/modules/support").then((m) => ({
    default: m.NoticesView,
  })),
);
const NoticeDetail = lazy(() =>
  import("@member/modules/support").then((m) => ({
    default: m.NoticeDetailView,
  })),
);
const ProjectList = lazy(() =>
  import("@member/modules/projects").then((m) => ({
    default: m.ProjectListView,
  })),
);
const ProjectDetail = lazy(() =>
  import("@member/modules/projects").then((m) => ({
    default: m.ProjectDetailView,
  })),
);

// Lazy load admin modules
const AdminDashboard = lazy(() =>
  import("@admin/modules/dashboard").then((m) => ({ default: m.default })),
);
const AdminMemberList = lazy(() =>
  import("@admin/modules/members/MemberList").then((m) => ({
    default: m.default,
  })),
);
const AdminMemberDetail = lazy(() =>
  import("@admin/modules/members/MemberDetail").then((m) => ({
    default: m.default,
  })),
);
const AdminPerformanceList = lazy(() =>
  import("@admin/modules/performance/PerformanceList").then((m) => ({
    default: m.default,
  })),
);
const AdminPerformanceDetail = lazy(() =>
  import("@admin/modules/performance/PerformanceDetail").then((m) => ({
    default: m.default,
  })),
);
const AdminProjectList = lazy(() =>
  import("@admin/modules/projects/ProjectList").then((m) => ({
    default: m.default,
  })),
);
const AdminProjectForm = lazy(() =>
  import("@admin/modules/projects/ProjectForm").then((m) => ({
    default: m.default,
  })),
);
const AdminProjectDetail = lazy(() =>
  import("@admin/modules/projects/ProjectDetail").then((m) => ({
    default: m.default,
  })),
);
const AdminContentManagement = lazy(() =>
  import("@admin/modules/content/ContentManagement").then((m) => ({
    default: m.default,
  })),
);
const AdminMessages = lazy(() =>
  import("@admin/modules/messages/Messages").then((m) => ({
    default: m.default,
  })),
);

const AdminReports = lazy(() =>
  import("@admin/modules/reports").then((m) => ({ default: m.default })),
);

const AdminStatisticsReport = lazy(() =>
  import("@admin/modules/statistics").then((m) => ({
    default: m.StatisticsReport,
  })),
);

const AdminSystemLogs = lazy(() =>
  import("@admin/modules/system-logs/SystemLogsDashboard").then((m) => ({
    default: m.default,
  })),
);

// Lazy route wrapper - 使用最小化的 fallback 避免闪烁
function LazyRoute({ children }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>{children}</Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        {
          path: "/",
          element: <Navigate to="/member" replace />,
        },
        {
          path: "/admin/login",
          element: (
            <LazyRoute>
              <AdminLogin />
            </LazyRoute>
          ),
        },
        {
          path: "/admin/forgot-password",
          element: (
            <LazyRoute>
              <AdminForgotPassword />
            </LazyRoute>
          ),
        },
        // Note: member login page removed; login handled via modal on protected routes
        {
          path: "/forgot-password",
          element: (
            <LazyRoute>
              <ForgotPassword />
            </LazyRoute>
          ),
        },
        {
          path: "/unauthorized",
          element: <Unauthorized />,
        },
        {
          path: "/404",
          element: <NotFound />,
        },
        // Member routes with layout
        {
          path: "/member",
          element: (
            <LazyRoute>
              <MemberLayout />
            </LazyRoute>
          ),
          children: [
            {
              index: true,
              element: <Navigate to="/member/home" replace />,
            },
            {
              path: "home",
              element: (
                <LazyRoute>
                  <MemberHome />
                </LazyRoute>
              ),
            },
            {
              path: "about",
              element: (
                <LazyRoute>
                  <MemberAbout />
                </LazyRoute>
              ),
            },
            {
              path: "register",
              element: (
                <LazyRoute>
                  <Register />
                </LazyRoute>
              ),
            },
            // Protected routes - require authentication
            {
              path: "programs",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <MemberProjectList />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "programs/:id",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <ProjectDetail />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "programs/applications",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <MemberApplicationRecords />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "performance",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <MemberPerformance />
                  </LazyRoute>
                </ProtectedRoute>
              ),
              children: [
                {
                  index: true,
                  element: (
                    <Navigate to="/member/performance/company-info" replace />
                  ),
                },
                {
                  path: "company-info",
                  element: (
                    <LazyRoute>
                      <MemberPerformanceCompanyInfo />
                    </LazyRoute>
                  ),
                },
                {
                  path: "list",
                  element: (
                    <LazyRoute>
                      <MemberPerformanceList />
                    </LazyRoute>
                  ),
                },
                {
                  path: "edit",
                  element: (
                    <LazyRoute>
                      <MemberPerformanceEdit />
                    </LazyRoute>
                  ),
                },
                {
                  path: "edit/:id",
                  element: (
                    <LazyRoute>
                      <MemberPerformanceEdit />
                    </LazyRoute>
                  ),
                },
              ],
            },
            {
              path: "support",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <MemberSupport />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "support/faq",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <MemberSupportFAQ />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "support/inquiry",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <MemberSupportInquiry />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "support/inquiry-history",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <MemberSupportInquiryHistory />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "notices",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <NoticesList />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "notices/:id",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <NoticeDetail />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "project",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <ProjectList />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "project/:id",
              element: (
                <ProtectedRoute allowedRoles={["member"]}>
                  <LazyRoute>
                    <ProjectDetail />
                  </LazyRoute>
                </ProtectedRoute>
              ),
            },
            {
              path: "*",
              element: <Navigate to="/member" replace />,
            },
          ],
        },
        // Admin routes
        {
          path: "/admin",
          element: (
            <ProtectedRoute allowedRoles={["admin"]}>
              <LazyRoute>
                <AdminLayout />
              </LazyRoute>
            </ProtectedRoute>
          ),
          children: [
            {
              index: true,
              element: (
                <LazyRoute>
                  <AdminDashboard />
                </LazyRoute>
              ),
            },
            {
              path: "members",
              element: (
                <LazyRoute>
                  <AdminMemberList />
                </LazyRoute>
              ),
            },
            {
              path: "members/:id",
              element: (
                <LazyRoute>
                  <AdminMemberDetail />
                </LazyRoute>
              ),
            },
            {
              path: "performance",
              element: (
                <LazyRoute>
                  <AdminPerformanceList />
                </LazyRoute>
              ),
            },
            {
              path: "performance/:id",
              element: (
                <LazyRoute>
                  <AdminPerformanceDetail />
                </LazyRoute>
              ),
            },
            {
              path: "projects",
              element: (
                <LazyRoute>
                  <AdminProjectList />
                </LazyRoute>
              ),
            },
            {
              path: "projects/new",
              element: (
                <LazyRoute>
                  <AdminProjectForm />
                </LazyRoute>
              ),
            },
            {
              path: "projects/:id/edit",
              element: (
                <LazyRoute>
                  <AdminProjectForm />
                </LazyRoute>
              ),
            },
            {
              path: "projects/:id",
              element: (
                <LazyRoute>
                  <AdminProjectDetail />
                </LazyRoute>
              ),
            },
            {
              path: "content",
              element: (
                <LazyRoute>
                  <AdminContentManagement />
                </LazyRoute>
              ),
            },
            {
              path: "messages",
              element: (
                <LazyRoute>
                  <AdminMessages />
                </LazyRoute>
              ),
            },
            {
              path: "reports",
              element: (
                <LazyRoute>
                  <AdminReports />
                </LazyRoute>
              ),
            },
            {
              path: "statistics",
              element: (
                <LazyRoute>
                  <AdminStatisticsReport />
                </LazyRoute>
              ),
            },
            {
              path: "system-logs",
              element: (
                <LazyRoute>
                  <AdminSystemLogs />
                </LazyRoute>
              ),
            },
            {
              path: "*",
              element: <Navigate to="/admin" replace />,
            },
          ],
        },
        {
          path: "*",
          element: <Navigate to="/404" replace />,
        },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

export { ProtectedRoute, PublicRoute };
