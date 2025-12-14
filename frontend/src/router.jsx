/**
 * Router Configuration
 */

import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useAuth } from '@shared/hooks';
import { Button, Loading, LoginModal } from '@shared/components';
import '@shared/styles/ErrorPages.css';

// Protected Route Component with Login Modal
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  useEffect(() => {
    // Show login modal if not authenticated
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, [isAuthenticated]);
  
  // Handle login success
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // The route will automatically re-render after authentication state updates
  };
  
  if (!isAuthenticated) {
    // Show login modal instead of redirecting
    const isAdminRoute = location.pathname.startsWith('/admin');
    
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
            setShowLoginModal(false);
            // Redirect to home if user closes modal
            window.location.href = '/member';
          }}
          onSuccess={handleLoginSuccess}
        />
        {/* Show loading or placeholder while modal is open */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}>
          <Loading />
        </div>
      </>
    );
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  
  if (isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = user?.role === 'admin' ? '/admin' : '/member';
    return <Navigate to={redirectPath} replace />;
  }
  
  return children;
}

// Simple Error Page Components (inline, no separate pages directory)
function Unauthorized() {
  return (
    <div className="error-page">
      <div className="error-page-container">
        <div className="error-code">403</div>
        <h1 className="error-title">접근 권한이 없습니다</h1>
        <p className="error-message">
          이 페이지에 접근할 수 있는 권한이 없습니다.
        </p>
        <Button onClick={() => window.location.href = '/'}>홈으로 돌아가기</Button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="error-page">
      <div className="error-page-container">
        <div className="error-code">404</div>
        <h1 className="error-title">페이지를 찾을 수 없습니다</h1>
        <p className="error-message">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Button onClick={() => window.location.href = '/'}>홈으로 돌아가기</Button>
      </div>
    </div>
  );
}

// Lazy load layouts
const AdminLayout = lazy(() => import('@admin/layouts/AdminLayout').then(m => ({ default: m.default })));
const MemberLayout = lazy(() => import('@member/layouts/MemberLayout').then(m => ({ default: m.default })));

// Lazy load auth modules
const Login = lazy(() => import('@member/modules/auth/Login').then(m => ({ default: m.default })));
const Register = lazy(() => import('@member/modules/auth/Register').then(m => ({ default: m.default })));
const AdminLogin = lazy(() => import('@admin/modules/auth/Login').then(m => ({ default: m.default })));

// Lazy load member modules
const MemberHome = lazy(() => import('@member/modules/home/Home').then(m => ({ default: m.default })));
const MemberProjects = lazy(() => import('@member/modules/projects/Projects').then(m => ({ default: m.default })));
const MemberProjectDetail = lazy(() => import('@member/modules/projects/ProjectDetail').then(m => ({ default: m.default })));
const MemberAbout = lazy(() => import('@member/modules/about/About').then(m => ({ default: m.default })));
const MemberPerformance = lazy(() => import('@member/modules/performance/Performance').then(m => ({ default: m.default })));
const MemberPerformanceCompanyInfo = lazy(() => import('@member/modules/performance/PerformanceCompanyInfo').then(m => ({ default: m.default })));
const MemberPerformanceList = lazy(() => import('@member/modules/performance/PerformanceListContent').then(m => ({ default: m.default })));
const MemberPerformanceEdit = lazy(() => import('@member/modules/performance/PerformanceFormContent').then(m => ({ default: m.default })));
const MemberSupport = lazy(() => import('@member/modules/support/Support').then(m => ({ default: m.default })));
const MemberSupportFAQ = lazy(() => import('@member/modules/support/FAQPage').then(m => ({ default: m.default })));
const MemberSupportInquiry = lazy(() => import('@member/modules/support/InquiryPage').then(m => ({ default: m.default })));
const MemberSupportInquiryHistory = lazy(() => import('@member/modules/support/InquiryHistoryPage').then(m => ({ default: m.default })));
const MemberSupportConsultationDetail = lazy(() => import('@member/modules/support/ConsultationDetail').then(m => ({ default: m.default })));
const NoticesList = lazy(() => import('@member/modules/home/NoticesList').then(m => ({ default: m.default })));
const PressList = lazy(() => import('@member/modules/home/PressList').then(m => ({ default: m.default })));

// Lazy load admin modules
const AdminDashboard = lazy(() => import('@admin/modules/dashboard').then(m => ({ default: m.default })));
const AdminMemberList = lazy(() => import('@admin/modules/members/MemberList').then(m => ({ default: m.default })));
const AdminMemberDetail = lazy(() => import('@admin/modules/members/MemberDetail').then(m => ({ default: m.default })));
const AdminPerformanceList = lazy(() => import('@admin/modules/performance/PerformanceList').then(m => ({ default: m.default })));
const AdminProjectList = lazy(() => import('@admin/modules/projects/ProjectList').then(m => ({ default: m.default })));
const AdminContentManagement = lazy(() => import('@admin/modules/content/ContentManagement').then(m => ({ default: m.default })));
const AdminSettings = lazy(() => import('@admin/modules/settings').then(m => ({ default: m.default })));
const AdminReports = lazy(() => import('@admin/modules/reports').then(m => ({ default: m.default })));

// Lazy route wrapper
function LazyRoute({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Navigate to="/member" replace />
    },
    {
      path: '/login',
      element: (
        <PublicRoute>
          <LazyRoute>
            <Login />
          </LazyRoute>
        </PublicRoute>
      )
    },

    {
      path: '/admin/login',
      element: (
        <PublicRoute>
          <LazyRoute>
            <AdminLogin />
          </LazyRoute>
        </PublicRoute>
      )
    },
    {
      path: '/unauthorized',
      element: <Unauthorized />
    },
    {
      path: '/404',
      element: <NotFound />
    },
    // Member routes with layout
    {
      path: '/member',
      element: (
        <LazyRoute>
          <MemberLayout />
        </LazyRoute>
      ),
      children: [
        {
          index: true,
          element: <Navigate to="/member/home" replace />
        },
        {
          path: 'home',
          element: (
            <LazyRoute>
              <MemberHome />
            </LazyRoute>
          )
        },
        {
          path: 'about',
          element: (
            <LazyRoute>
              <MemberAbout />
            </LazyRoute>
          )
        },
        {
          path: 'register',
          element: (
            <LazyRoute>
              <Register />
            </LazyRoute>
          )
        },
        // Protected routes - require authentication
        {
          path: 'programs',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberProjects />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'programs/:id',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberProjectDetail />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'performance',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberPerformance />
              </LazyRoute>
            </ProtectedRoute>
          ),
          children: [
            {
              index: true,
              element: <Navigate to="/member/performance/company-info" replace />
            },
            {
              path: 'company-info',
              element: (
                <LazyRoute>
                  <MemberPerformanceCompanyInfo />
                </LazyRoute>
              )
            },
            {
              path: 'list',
              element: (
                <LazyRoute>
                  <MemberPerformanceList />
                </LazyRoute>
              )
            },
            {
              path: 'edit',
              element: (
                <LazyRoute>
                  <MemberPerformanceEdit />
                </LazyRoute>
              )
            },
            {
              path: 'edit/:id',
              element: (
                <LazyRoute>
                  <MemberPerformanceEdit />
                </LazyRoute>
              )
            }
          ]
        },
        {
          path: 'support',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberSupport />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'support/faq',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberSupportFAQ />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'support/inquiry',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberSupportInquiry />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'support/inquiry-history',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberSupportInquiryHistory />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'support/consultation/:id',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <MemberSupportConsultationDetail />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'notices',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <NoticesList />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: 'press',
          element: (
            <ProtectedRoute allowedRoles={['member']}>
              <LazyRoute>
                <PressList />
              </LazyRoute>
            </ProtectedRoute>
          )
        },
        {
          path: '*',
          element: <Navigate to="/member" replace />
        }
      ]
    },
    // Admin routes
    {
      path: '/admin',
      element: (
        <ProtectedRoute allowedRoles={['admin']}>
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
          )
        },
        {
          path: 'members',
          element: (
            <LazyRoute>
              <AdminMemberList />
            </LazyRoute>
          )
        },
        {
          path: 'members/:id',
          element: (
            <LazyRoute>
              <AdminMemberDetail />
            </LazyRoute>
          )
        },
        {
          path: 'performance',
          element: (
            <LazyRoute>
              <AdminPerformanceList />
            </LazyRoute>
          )
        },
        {
          path: 'projects',
          element: (
            <LazyRoute>
              <AdminProjectList />
            </LazyRoute>
          )
        },
        {
          path: 'content',
          element: (
            <LazyRoute>
              <AdminContentManagement />
            </LazyRoute>
          )
        },
        {
          path: 'settings',
          element: (
            <LazyRoute>
              <AdminSettings />
            </LazyRoute>
          )
        },
        {
          path: 'reports',
          element: (
            <LazyRoute>
              <AdminReports />
            </LazyRoute>
          )
        },
        {
          path: '*',
          element: <Navigate to="/admin" replace />
        }
      ]
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />
    }
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true
    }
  }
);

export { ProtectedRoute, PublicRoute };

