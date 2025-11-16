/**
 * Projects Page - Member Portal
 * 项目列表主页面
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Banner, Submenu } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import './Projects.css';

export default function Projects() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 获取 submenu 配置
  const getSubmenuItems = () => {
    return [
      {
        key: 'projects-list',
        path: '/member/projects',
        label: t('projects.title', '项目管理'),
        exact: true,
        onNavigate: (item) => {
          navigate(item.path);
        }
      }
    ];
  };

  return (
    <div className="projects">
      <Banner
        bannerType={BANNER_TYPES.PROJECTS}
        sectionClassName="member-banner-section"
      />
      <Submenu
        items={getSubmenuItems()}
        className="projects-submenu"
        headerSelector=".member-header"
      />
      <p>Projects page</p>
    </div>
  );
}

