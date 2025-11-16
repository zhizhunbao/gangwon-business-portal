/**
 * Member Portal Routes
 * 企业会员端路由配置
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MemberLayout from './layouts/MemberLayout';
import { Loading } from '@shared/components';

// Lazy load modules for code splitting
const Home = lazy(() => import('./modules/home/Home'));
const Projects = lazy(() => import('./modules/projects/Projects'));
const Profile = lazy(() => import('./modules/profile/Profile'));
const About = lazy(() => import('./modules/about/About'));
const Performance = lazy(() => import('./modules/performance'));
const Support = lazy(() => import('./modules/support/Support'));
const NoticesList = lazy(() => import('./modules/home/NoticesList'));
const NewsList = lazy(() => import('./modules/home/NewsList'));
const QuickLinks = lazy(() => import('./modules/home/QuickLinks'));
const Stats = lazy(() => import('./modules/home/Stats'));

// Wrapper component for lazy-loaded routes with Suspense
function LazyRoute({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  );
}

export default function MemberRoutes() {
  return (
    <Routes>
      <Route element={<MemberLayout />}>
        {/* 首页 - 默认重定向到 home */}
        <Route 
          index 
          element={<Navigate to="/member/home" replace />}
        />
        <Route 
          path="home" 
          element={
            <LazyRoute>
              <Home />
            </LazyRoute>
          } 
        />
        
        {/* 公告列表 */}
        <Route 
          path="notices" 
          element={
            <LazyRoute>
              <NoticesList />
            </LazyRoute>
          } 
        />
        
        {/* 新闻资料列表 */}
        <Route 
          path="news" 
          element={
            <LazyRoute>
              <NewsList />
            </LazyRoute>
          } 
        />
        
        {/* 快捷入口 */}
        <Route 
          path="quick-links" 
          element={
            <LazyRoute>
              <QuickLinks />
            </LazyRoute>
          } 
        />
        
        {/* 我的概览 */}
        <Route 
          path="stats" 
          element={
            <LazyRoute>
              <Stats />
            </LazyRoute>
          } 
        />
        
        {/* 项目相关 */}
        <Route 
          path="projects" 
          element={
            <LazyRoute>
              <Projects />
            </LazyRoute>
          } 
        />
        
        {/* 绩效数据 */}
        <Route 
          path="performance" 
          element={
            <LazyRoute>
              <Performance />
            </LazyRoute>
          } 
        />
        
        {/* 企业资料 */}
        <Route 
          path="profile" 
          element={
            <LazyRoute>
              <Profile />
            </LazyRoute>
          } 
        />
        
        {/* 支持中心 */}
        <Route 
          path="support" 
          element={
            <LazyRoute>
              <Support />
            </LazyRoute>
          } 
        />
        
        {/* 关于 */}
        <Route 
          path="about" 
          element={
            <LazyRoute>
              <About />
            </LazyRoute>
          } 
        />
        
        {/* 默认重定向到首页 */}
        <Route path="*" element={<Navigate to="/member" replace />} />
      </Route>
    </Routes>
  );
}

