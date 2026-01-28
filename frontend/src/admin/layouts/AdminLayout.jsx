/**
 * Admin Portal Layout
 * 管理员端主布局
 */

import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const SIDEBAR_STORAGE_KEY = 'admin_sidebar_collapsed';

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved !== null ? saved === 'true' : false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className={`flex flex-col min-h-screen bg-gray-50 ${mobileMenuOpen ? 'overflow-hidden' : ''}`}>
      <Header onToggleSidebar={toggleMobileMenu} onToggleDesktopSidebar={toggleSidebar} />
      
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[998] md:hidden animate-[fadeIn_0.2s_ease-out]" onClick={closeMobileMenu} />
      )}
      
      <div className="flex flex-1 flex-col pt-16">
        <div className="flex flex-1">
          <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileMenuOpen} onClose={closeMobileMenu} />
          
          <main className={`flex-1 flex flex-col bg-gray-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ml-0 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
            <div className="flex-1 p-6 max-w-full w-full mx-auto md:p-4">
              <Outlet />
            </div>
          </main>
        </div>
        <div className="relative z-[1000]">
          <Footer />
        </div>
      </div>
    </div>
  );
}

