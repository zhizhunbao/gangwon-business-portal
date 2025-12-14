/**
 * Projects Page - Member Portal
 * 项目页面 - 显示项目列表
 */

import { Banner } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import ProjectList from './ProjectList';

export default function Projects() {
  return (
    <div className="projects w-full max-w-full flex flex-col p-0 m-0 overflow-x-hidden relative">
      <Banner
        bannerType={BANNER_TYPES.PROJECTS}
        sectionClassName="member-banner-section -mt-[70px]"
      />
      <div className="w-full max-w-[1200px] mx-auto py-6 sm:py-8 lg:py-10 px-4 sm:px-6 lg:px-8">
        <ProjectList />
      </div>
    </div>
  );
}
