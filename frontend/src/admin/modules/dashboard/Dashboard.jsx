/**
 * Dashboard Component - Admin Portal
 * 管理员仪表盘 - 企业现状管理
 * 注意：横幅管理和弹窗管理已移至内容管理模块
 */

import CompanyStatus from './CompanyStatus';

export default function Dashboard() {
  return (
    <div className="w-full max-w-full animate-[fadeIn_0.3s_ease-in]">
      <div className="w-full max-w-full animate-[fadeIn_0.4s_ease-in]">
        <CompanyStatus />
      </div>
    </div>
  );
}

