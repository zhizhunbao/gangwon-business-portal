/**
 * Home Page - Member Portal
 * 企业会员首页
 * 
 * 按照文档要求，首页包含：
 * 1. 主横幅(1) - 大尺寸图片（点击时如有URL则跳转）
 * 2. 公告事项 - 最近5条
 * 3. 新闻稿 - 最近1条缩略图（点击时跳转到相应公告板）
 * 4. 主横幅(2) - 小尺寸
 */

import { useTranslation } from 'react-i18next';
import { Banner } from '@shared/components';
import { BANNER_TYPES } from '@shared/utils/constants';
import { PageContainer } from '@member/layouts';
import NoticesPreview from './NoticesPreview';
import ProjectPreview from './ProjectPreview';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="home w-full flex flex-col">
      {/* 主横幅(1) - 大尺寸，全宽 */}
      <Banner
        bannerType={BANNER_TYPES.MAIN_PRIMARY}
        sectionClassName="mb-16"
        height="400px"
        fullWidth={true}
      />
      
      {/* 三列布局：公告事项、新闻稿、主横幅(2) */}
      <PageContainer className="pb-8" fullWidth={false}>
        <div className="grid grid-cols-1 md:grid-cols-[repeat(3,minmax(0,425px))] justify-center gap-6 lg:gap-8 auto-rows-[475px]">
          {/* 项目公告 */}
          <div className="flex h-full">
            <ProjectPreview />
          </div>
          
          {/* 公告事项 */}
          <div className="flex h-full">
            <NoticesPreview />
          </div>
          
          {/* 主横幅(2) - 小尺寸，不全宽 */}
          <div className="flex h-full">
            <Banner
              bannerType={BANNER_TYPES.MAIN_SECONDARY}
              sectionClassName="h-full w-full rounded-lg overflow-hidden"
              height="100%"
              fullWidth={false}
            />
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

