/**
 * Dashboard Component - Admin Portal
 * 管理员仪表盘 - 企业现状管理
 * 注意：横幅管理和弹窗管理已移至内容管理模块
 */

import CompanyStatus from './CompanyStatus';

export default function Dashboard() {
  return (
    <div className="w-full max-w-full">
      <div className="w-full max-w-full">
        <CompanyStatus />
      </div>
    </div>
  );
}

