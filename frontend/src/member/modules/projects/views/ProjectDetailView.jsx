/**
 * 项目详情页面视图
 *
 * 作为 Orchestrator，组合业务逻辑和展示组件。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useProjectDetailView } from "../hooks/useProjectDetailView";
import { ProjectBanner } from "../components/ProjectBanner";
import { ProjectSubmenu } from "../components/ProjectSubmenu";
import { ProjectPageContainer } from "../components/ProjectPageContainer";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectDetailLoading } from "../components/ProjectDetail/ProjectDetailLoading";
import { ProjectDetailError } from "../components/ProjectDetail/ProjectDetailError";
import { ProjectDetailBackButton } from "../components/ProjectDetail/ProjectDetailBackButton";
import ProjectDetailContent from "../components/ProjectDetail/ProjectDetailContent";
import ProjectAttachments from "../components/ProjectDetail/ProjectAttachments";
import ProjectDetailActions from "../components/ProjectDetail/ProjectDetailActions";

export default function ProjectDetailView() {
  const { project, loading, error, handleBack, handleApply } =
    useProjectDetailView();

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <ProjectDetailLoading />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-4 md:p-6">
        <ProjectDetailError error={error} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="project-detail-view w-full flex flex-col">
      <ProjectBanner sectionClassName="member-banner-section" />
      <ProjectSubmenu />

      <ProjectPageContainer className="pb-8" fullWidth={false}>
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <div className="mb-6">
            <ProjectDetailBackButton onClick={handleBack} />
          </div>

          <ProjectCard className="p-6 md:p-8 shadow-sm">
            <ProjectDetailContent project={project} />
            <ProjectAttachments attachments={project.attachments} />
            <ProjectDetailActions project={project} onApply={handleApply} />
          </ProjectCard>
        </div>
      </ProjectPageContainer>
    </div>
  );
}
