/**
 * 申请记录页面视图
 *
 * 作为 Orchestrator，组合业务逻辑和展示组件。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import { useCallback } from "react";
import { useApplicationRecords } from "../hooks/useApplicationRecords";
import { ProjectBanner } from "../components/ProjectBanner";
import { ProjectSubmenu } from "../components/ProjectSubmenu";
import { ProjectPageContainer } from "../components/ProjectPageContainer";
import { ApplicationRecordsHeader } from "../components/ApplicationRecords/ApplicationRecordsHeader";
import { ApplicationRecordsFilter } from "../components/ApplicationRecords/ApplicationRecordsFilter";
import { ApplicationRecordsList } from "../components/ApplicationRecords/ApplicationRecordsList";
import ApplicationActionButtons from "../components/ApplicationRecords/ApplicationActionButtons";
import CancelApplicationModal from "../components/ApplicationRecords/CancelApplicationModal";
import RejectionReasonModal from "../components/ApplicationRecords/RejectionReasonModal";
import SupplementMaterialsModal from "../components/ApplicationRecords/SupplementMaterialsModal";

export default function ApplicationRecordsView() {
  const {
    allApplications,
    filteredApplications,
    loading,
    selectedApplication,
    showCancelModal,
    showRejectionModal,
    showSupplementModal,
    cancelLoading,
    supplementFiles,
    supplementLoading,
    columns,
    getStatusInfo,
    handleFilterChange,
    handleCancelClick,
    handleConfirmCancel,
    handleViewRejectionReason,
    handleSupplement,
    handleFileSelect,
    handleRemoveFile,
    handleSubmitSupplement,
    setShowCancelModal,
    setShowRejectionModal,
    setShowSupplementModal,
  } = useApplicationRecords();

  const renderActionButtons = useCallback(
    (application) => (
      <ApplicationActionButtons
        application={application}
        onCancel={handleCancelClick}
        onViewReason={handleViewRejectionReason}
        onSupplement={handleSupplement}
      />
    ),
    [handleCancelClick, handleViewRejectionReason, handleSupplement],
  );

  return (
    <div className="application-records-view w-full flex flex-col">
      <ProjectBanner sectionClassName="member-banner-section" />
      <ProjectSubmenu />

      <ProjectPageContainer>
        <div className="flex flex-col min-h-[calc(100vh-280px)]">
          <ApplicationRecordsHeader />

          <ApplicationRecordsFilter
            allApplications={allApplications}
            columns={columns}
            onFilterChange={handleFilterChange}
            resultsCount={filteredApplications.length}
          />

          <ApplicationRecordsList
            applications={filteredApplications}
            loading={loading}
            hasApplications={allApplications.length > 0}
            getStatusInfo={getStatusInfo}
            renderActionButtons={renderActionButtons}
          />
        </div>
      </ProjectPageContainer>

      <CancelApplicationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        loading={cancelLoading}
      />

      <RejectionReasonModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        reason={selectedApplication?.rejectionReason}
      />

      <SupplementMaterialsModal
        isOpen={showSupplementModal}
        onClose={() => {
          setShowSupplementModal(false);
          // TODO: Files in hook state might need manual reset if not handled by useEffect or onClose
        }}
        onSubmit={handleSubmitSupplement}
        supplementMessage={selectedApplication?.supplementMessage}
        files={supplementFiles}
        onFilesSelected={handleFileSelect}
        onFileRemove={handleRemoveFile}
        loading={supplementLoading}
      />
    </div>
  );
}
