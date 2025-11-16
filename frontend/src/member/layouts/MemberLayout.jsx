/**
 * Member Portal Layout
 * 企业会员端主布局
 */

import { Outlet } from 'react-router-dom';
import { memo } from 'react';
import Header from './Header';
import Footer from './Footer';
import './MemberLayout.css';

function MemberLayout() {
  return (
    <div className="member-layout">
      <Header />
      
      <div className="layout-body">
        <main className="main-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

// 使用 memo 包装，避免不必要的重渲染
export default memo(MemberLayout);

