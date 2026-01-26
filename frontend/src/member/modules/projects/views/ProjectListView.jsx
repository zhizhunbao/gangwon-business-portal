/**
 * 项目列表页面视图
 *
 * 作为 Orchestrator，组合业务逻辑和展示组件。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useProjectList } from "../hooks/useProjectList";
import { ProjectBanner } from "../components/ProjectBanner";
import { ProjectSubmenu } from "../components/ProjectSubmenu";
import { ProjectPageContainer } from "../components/ProjectPageContainer";
import { ProjectListHeader } from "../components/ProjectList/ProjectListHeader";
import { ProjectListFilter } from "../components/ProjectList/ProjectListFilter";
import { ProjectList } from "../components/ProjectList/ProjectList";
import ApplicationModal from "../components/ApplicationModal/index.jsx";

export default function ProjectListView() {
  const {
    allProjects,
    filteredProjects,
    loading,
    showApplicationModal,
    selectedProject,
    columns,
    handleFilterChange,
    handleApply,
    handleDetail,
    handleApplicationSuccess,
    handleCloseModal,
  } = useProjectList();

  return (
    <div className="projects-list-view w-full flex flex-col">
      <ProjectBanner sectionClassName="member-banner-section" />
      <ProjectSubmenu />

      <ProjectPageContainer>
        <div className="flex flex-col min-h-[calc(100vh-280px)]">
          <ProjectListHeader />

          <ProjectListFilter
            allProjects={allProjects}
            columns={columns}
            onFilterChange={handleFilterChange}
            resultsCount={filteredProjects.length}
          />

          <ProjectList
            projects={filteredProjects}
            loading={loading}
            hasProjects={allProjects.length > 0}
            onApply={handleApply}
            onDetail={handleDetail}
          />

          {/* 程序申请弹窗 */}
          <ApplicationModal
            isOpen={showApplicationModal}
            onClose={handleCloseModal}
            project={selectedProject}
            onSuccess={handleApplicationSuccess}
          />
        </div>
      </ProjectPageContainer>
    </div>
  );
}
