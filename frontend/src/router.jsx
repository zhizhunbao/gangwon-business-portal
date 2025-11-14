/**
 * Router Configuration
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '@shared/hooks';
import { Button, Loading } from '@shared/components';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    // Redirect to appropriate login page based on route
    const isAdminRoute = window.location.pathname.startsWith('/admin');
    const loginPath = isAdminRoute ? '/admin/login' : '/login';
    return <Navigate to={loginPath} replace />;
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto text-center">
        <div className="text-6xl font-bold text-primary-600 mb-4">403</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
        <p className="text-gray-600 mb-8">
          이 페이지에 접근할 수 있는 권한이 없습니다.
        </p>
        <Button onClick={() => window.location.href = '/'}>홈으로 돌아가기</Button>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto text-center">
        <div className="text-6xl font-bold text-primary-600 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">페이지를 찾을 수 없습니다</h1>
        <p className="text-gray-600 mb-8">
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
const MemberProjects = lazy(() => import('@member/modules/projects/ProjectList').then(m => ({ default: m.default })));
const MemberProjectDetail = lazy(() => import('@member/modules/projects/ProjectDetail').then(m => ({ default: m.default })));
const MemberProjectApplication = lazy(() => import('@member/modules/projects/ProjectApplication').then(m => ({ default: m.default })));
const MemberProfile = lazy(() => import('@member/modules/profile/Profile').then(m => ({ default: m.default })));
const MemberAbout = lazy(() => import('@member/modules/about/About').then(m => ({ default: m.default })));
const MemberPerformanceList = lazy(() => import('@member/modules/performance/PerformanceList').then(m => ({ default: m.default })));
const MemberPerformanceForm = lazy(() => import('@member/modules/performance/PerformanceForm').then(m => ({ default: m.default })));
const MemberPerformanceDetail = lazy(() => import('@member/modules/performance/PerformanceDetail').then(m => ({ default: m.default })));
const MemberSupport = lazy(() => import('@member/modules/support/Support').then(m => ({ default: m.default })));

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
      path: '/register',
      element: (
        <PublicRoute>
          <LazyRoute>
            <Register />
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
    // Member routes
    {
      path: '/member',
      element: (
        <ProtectedRoute allowedRoles={['member']}>
          <LazyRoute>
            <MemberLayout />
          </LazyRoute>
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: (
            <LazyRoute>
              <MemberHome />
            </LazyRoute>
          )
        },
        {
          path: 'home',
          element: <Navigate to="/member" replace />
        },
        {
          path: 'projects',
          element: (
            <LazyRoute>
              <MemberProjects />
            </LazyRoute>
          )
        },
        {
          path: 'projects/:id',
          element: (
            <LazyRoute>
              <MemberProjectDetail />
            </LazyRoute>
          )
        },
        {
          path: 'projects/:id/apply',
          element: (
            <LazyRoute>
              <MemberProjectApplication />
            </LazyRoute>
          )
        },
        {
          path: 'performance',
          element: (
            <LazyRoute>
              <MemberPerformanceList />
            </LazyRoute>
          )
        },
        {
          path: 'performance/new',
          element: (
            <LazyRoute>
              <MemberPerformanceForm />
            </LazyRoute>
          )
        },
        {
          path: 'performance/:id',
          element: (
            <LazyRoute>
              <MemberPerformanceDetail />
            </LazyRoute>
          )
        },
        {
          path: 'performance/:id/edit',
          element: (
            <LazyRoute>
              <MemberPerformanceForm />
            </LazyRoute>
          )
        },
        {
          path: 'profile',
          element: (
            <LazyRoute>
              <MemberProfile />
            </LazyRoute>
          )
        },
        {
          path: 'support',
          element: (
            <LazyRoute>
              <MemberSupport />
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

