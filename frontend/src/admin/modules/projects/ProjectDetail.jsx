/**
 * Project Detail Component - Admin Portal
 * 项目详情页面
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Button,
  Badge,
  Loading,
  Table,
  Pagination,
  Modal,
  Alert,
  ConfirmModal,
} from "@shared/components";
import projectsService from "./services/projects.service";
import { uploadService, apiService } from "@shared/services";
import { formatDate } from "@shared/utils";
import { API_PREFIX } from "@shared/utils/constants";

// 如果正文里已经包含同一张封面图，则隐藏单独的代表图片，避免重复展示。
// Hide the standalone cover preview when the rich content already renders the same image.
const hasDuplicatedCoverImage = (contentHtml, coverImageUrl) => {
  if (!contentHtml || !coverImageUrl || !/<img\b/i.test(contentHtml)) {
    return false;
  }

  const normalizeUrl = (value) => {
    try {
      return decodeURIComponent(value).trim().toLowerCase();
    } catch {
      return value.trim().toLowerCase();
    }
  };

  const normalizedCoverImageUrl = normalizeUrl(coverImageUrl);
  if (contentHtml.toLowerCase().includes(normalizedCoverImageUrl)) {
    return true;
  }

  const coverImageName = normalizedCoverImageUrl.split("/").pop();
  return coverImageName ? contentHtml.toLowerCase().includes(coverImageName) : false;
};

export default function ProjectDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const currentLanguage = i18n.language === "zh" ? "zh" : "ko";

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsPageSize, setApplicationsPageSize] = useState(10);
  const [applicationsTotal, setApplicationsTotal] = useState(0);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingApplicationId, setRejectingApplicationId] = useState(null);
  const [showSupplementRequestModal, setShowSupplementRequestModal] =
    useState(false);
  const [supplementRequestMessage, setSupplementRequestMessage] = useState("");
  const [
    supplementRequestingApplicationId,
    setSupplementRequestingApplicationId,
  ] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageVariant, setMessageVariant] = useState("success");

  useEffect(() => {
    loadProjectDetail();
  }, [id]);

  useEffect(() => {
    loadApplications();
  }, [id, applicationsPage, applicationsPageSize]);

  const loadProjectDetail = async () => {
    setLoading(true);
    const projectData = await projectsService.getProject(id);
    if (projectData) {
      setProject(projectData);
    }
    setLoading(false);
  };

  const loadApplications = async () => {
    setApplicationsLoading(true);
    const params = {
      page: applicationsPage,
      pageSize: applicationsPageSize,
    };
    const response = await projectsService.getProjectApplications(id, params);
    if (response && response.items) {
      setApplications(response.items);
      setApplicationsTotal(response.total || response.items.length);
    } else if (response && Array.isArray(response)) {
      setApplications(response);
      setApplicationsTotal(response.length);
    } else {
      setApplications([]);
      setApplicationsTotal(0);
    }
    setApplicationsLoading(false);
  };

  const handleDownload = async (fileId, filename = null) => {
    if (!fileId) return;
    await uploadService.downloadFile(fileId, filename);
  };

  const handleDownloadByUrl = async (fileUrl, filename = null) => {
    if (!fileUrl) return;
    await uploadService.downloadFileByUrl(fileUrl, filename);
  };

  const getStatusVariant = (status) => {
    const variantMap = {
      active: "success",
      inactive: "secondary",
      draft: "warning",
      cancelled: "error",
    };
    return variantMap[status] || "default";
  };

  const getStatusLabel = (status) => {
    const statusLabelMap = {
      active: t("admin.projects.status.active", "진행중"),
      inactive: t("admin.projects.status.inactive", "종료됨"),
      draft: t("admin.projects.status.draft", "초안"),
      cancelled: t("admin.projects.status.cancelled", "취소됨"),
    };
    return statusLabelMap[status] || status;
  };

  // Extract attachments from project
  const getAttachments = () => {
    const attachments = [];

    if (project && project.attachments && Array.isArray(project.attachments)) {
      project.attachments.forEach((att) => {
        attachments.push({
          id: att.id,
          url: att.fileUrl,
          name:
            att.originalName ||
            att.storedName ||
            att.fileName ||
            t("common.attachment", "첨부파일"),
          type: "attachment",
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          uploadedAt: att.uploadedAt,
        });
      });
    }

    return attachments;
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    if (newStatus === "rejected") {
      setRejectingApplicationId(applicationId);
      setRejectReason("");
      setShowRejectModal(true);
      return;
    }

    if (newStatus === "needs_supplement") {
      setSupplementRequestingApplicationId(applicationId);
      setSupplementRequestMessage("");
      setShowSupplementRequestModal(true);
      return;
    }

    try {
      await apiService.put(
        `${API_PREFIX}/admin/applications/${applicationId}/status`,
        {
          status: newStatus,
          reviewNotes: null,
        },
      );
      loadApplications();
      setShowApplicationModal(false);
    } catch (error) {
      console.error("Failed to update application status:", error);
      setMessageVariant("error");
      setMessage(
        t("admin.applications.updateStatusFailed", "상태 업데이트 실패"),
      );
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      setMessageVariant("warning");
      setMessage(
        t("admin.applications.rejectReasonRequired", "거부 사유를 입력하세요"),
      );
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      await apiService.put(
        `${API_PREFIX}/admin/applications/${rejectingApplicationId}/status`,
        {
          status: "rejected",
          reviewNotes: rejectReason,
        },
      );
      loadApplications();
      setShowApplicationModal(false);
      setShowRejectModal(false);
      setRejectReason("");
      setRejectingApplicationId(null);
      setMessageVariant("success");
      setMessage(t("admin.applications.rejectSuccess", "거부 성공"));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to reject application:", error);
      setMessageVariant("error");
      setMessage(
        t("admin.applications.updateStatusFailed", "상태 업데이트 실패"),
      );
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancelReject = () => {
    setShowRejectModal(false);
    setRejectReason("");
    setRejectingApplicationId(null);
  };

  const handleConfirmSupplementRequest = async () => {
    if (!supplementRequestMessage.trim()) {
      setMessageVariant("warning");
      setMessage(
        t(
          "admin.applications.supplementMessageRequired",
          "보완 요청 내용을 입력하세요",
        ),
      );
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      await apiService.put(
        `${API_PREFIX}/admin/applications/${supplementRequestingApplicationId}/status`,
        {
          status: "needs_supplement",
          reviewNotes: supplementRequestMessage,
        },
      );
      loadApplications();
      setShowApplicationModal(false);
      setShowSupplementRequestModal(false);
      setSupplementRequestMessage("");
      setSupplementRequestingApplicationId(null);
      setMessageVariant("success");
      setMessage(
        t("admin.applications.supplementRequestSuccess", "보완 요청 성공"),
      );
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to request supplement:", error);
      setMessageVariant("error");
      setMessage(
        t("admin.applications.updateStatusFailed", "상태 업데이트 실패"),
      );
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancelSupplementRequest = () => {
    setShowSupplementRequestModal(false);
    setSupplementRequestMessage("");
    setSupplementRequestingApplicationId(null);
  };

  const [clearHistoryConfirm, setClearHistoryConfirm] = useState({ isOpen: false, applicationId: null });

  const handleClearSupplementHistory = (applicationId) => {
    setClearHistoryConfirm({ isOpen: true, applicationId });
  };

  const confirmClearSupplementHistory = async () => {
    const { applicationId } = clearHistoryConfirm;
    try {
      await apiService.delete(
        `${API_PREFIX}/admin/applications/${applicationId}/supplement-history`,
      );
      setClearHistoryConfirm({ isOpen: false, applicationId: null });
      loadApplications();
      setShowApplicationModal(false);
      setMessageVariant("success");
      setMessage(t("admin.applications.clearHistorySuccess", "보완 이력이 삭제되었습니다"));
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Failed to clear supplement history:", error);
      setClearHistoryConfirm({ isOpen: false, applicationId: null });
      setMessageVariant("error");
      setMessage(t("admin.applications.clearHistoryFailed", "보완 이력 삭제 실패"));
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleViewApplication = (application) => {
    setSelectedApplication(application);
    setShowApplicationModal(true);
  };

  const handleViewMember = (memberId) => {
    navigate(`/admin/members/${memberId}`);
  };

  // Applications table columns
  const applicationColumns = [
    {
      key: "companyName",
      label: t("admin.applications.table.company", "기업명"),
      width: "150px",
      render: (value) => value || "-",
    },
    {
      key: "applicationReason",
      label: t("admin.applications.table.applicationReason", "신청 사유"),
      width: "250px",
      render: (value) => (
        <div className="max-w-xs truncate" title={value}>
          {value || "-"}
        </div>
      ),
    },
    {
      key: "submittedAt",
      label: t("admin.applications.table.submittedAt", "신청일"),
      width: "150px",
      render: (value) =>
        value ? formatDate(value, "yyyy-MM-dd HH:mm", currentLanguage) : "-",
    },
    {
      key: "reviewedAt",
      label: t("admin.applications.table.reviewedAt", "심사일"),
      width: "150px",
      render: (value) =>
        value ? formatDate(value, "yyyy-MM-dd HH:mm", currentLanguage) : "-",
    },
    {
      key: "status",
      label: t("admin.applications.table.status", "상태"),
      width: "120px",
      render: (value) => {
        const getApplicationStatusVariant = (status) => {
          const variantMap = {
            approved: "success",
            rejected: "danger",
            cancelled: "error",
            submitted: "warning",
            under_review: "warning",
            pending: "warning",
            needs_supplement: "warning",
            supplement_submitted: "info",
          };
          return variantMap[status] || "warning";
        };

        return (
          <Badge variant={getApplicationStatusVariant(value)}>
            {t(`admin.applications.status.${value}`, value)}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      label: "",
      width: "200px",
      render: (_, row) => {
        const canOperate =
          row.status === "submitted" ||
          row.status === "under_review" ||
          row.status === "supplement_submitted";

        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewApplication(row);
              }}
              className="text-blue-600 hover:text-blue-900 font-medium text-sm"
            >
              {t("common.view", "보기")}
            </button>
            {row.memberId && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewMember(row.memberId);
                  }}
                  className="text-primary-600 hover:text-primary-900 font-medium text-sm"
                >
                  {t("admin.applications.viewMember", "기업")}
                </button>
              </>
            )}
            {canOperate && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(row.id, "approved");
                  }}
                  className="text-green-600 hover:text-green-900 font-medium text-sm"
                >
                  {t("common.approve", "승인")}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(row.id, "rejected");
                  }}
                  className="text-red-600 hover:text-red-900 font-medium text-sm"
                >
                  {t("common.reject", "거절")}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(row.id, "needs_supplement");
                  }}
                  className="text-amber-600 hover:text-amber-900 font-medium text-sm"
                >
                  {t("admin.applications.requestSupplement", "보완요청")}
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  if (loading) {
    return <Loading />;
  }

  if (!project) {
    return (
      <div className="p-12 text-center text-red-600">
        <p className="mb-6">
          {t("admin.projects.detail.notFound", "지원사업을 찾을 수 없습니다")}
        </p>
        <Button onClick={() => navigate("/admin/projects")}>
          {t("common.backToList", "목록으로")}
        </Button>
      </div>
    );
  }

  const attachments = getAttachments();
  const projectContentHtml = project.description || project.content || "";
  const coverImageUrl = project.imageUrl || project.image || "";
  const shouldShowCoverImage = !hasDuplicatedCoverImage(
    projectContentHtml,
    coverImageUrl,
  );

  return (
    <div className="w-full">
      {message && (
        <Alert
          variant={messageVariant}
          className="mb-4"
          onClose={() => setMessage(null)}
        >
          {message}
        </Alert>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/admin/projects")}>
            {t("common.backToList", "목록으로")}
          </Button>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/projects/${id}/edit`)}
          >
            {t("common.edit", "수정")}
          </Button>
        </div>
      </div>

      {/* 基本信息和封面图片 - 左右布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 左侧：基本信息 */}
        <Card className={shouldShowCoverImage ? "lg:col-span-2 p-6" : "lg:col-span-3 p-6"}>
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 m-0">
              {t("admin.projects.detail.basicInfo", "기본 정보")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm text-gray-600 font-medium">
                {t("admin.projects.detail.title", "지원사업")}
              </label>
              <span className="text-base text-gray-900">
                {project.title || "-"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t("admin.projects.detail.status", "상태")}
              </label>
              <div>
                <Badge variant={getStatusVariant(project.status)}>
                  {getStatusLabel(project.status)}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t("admin.projects.detail.createdAt", "생성일")}
              </label>
              <span className="text-base text-gray-900">
                {formatDate(project.createdAt, "yyyy-MM-dd", currentLanguage)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t("admin.projects.detail.startDate", "시작일")}
              </label>
              <span className="text-base text-gray-900">
                {formatDate(project.startDate, "yyyy-MM-dd", currentLanguage)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-600 font-medium">
                {t("admin.projects.detail.endDate", "종료일")}
              </label>
              <span className="text-base text-gray-900">
                {formatDate(project.endDate, "yyyy-MM-dd", currentLanguage)}
              </span>
            </div>
          </div>
        </Card>

        {/* 右侧：封面图片 */}
        {shouldShowCoverImage && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 m-0">
                {t("admin.projects.detail.image", "대표 이미지")}
              </h2>
            </div>
            <div className="flex justify-center items-center h-48">
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt={project.title}
                  className="max-w-full max-h-48 object-contain rounded-lg border border-gray-200"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm">
                    {t("admin.projects.detail.noImage", "표지 이미지가 없습니다")}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* 项目详情卡片 */}
      {projectContentHtml && (
        <Card className="mb-6 p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 m-0">
              {t("admin.projects.detail.content", "지원사업")}
            </h2>
          </div>
          <div className="prose max-w-none">
            <div
              style={{
                whiteSpace: "pre-line",
                wordBreak: "keep-all",
                overflowWrap: "break-word",
              }}
              dangerouslySetInnerHTML={{
                __html: projectContentHtml,
              }}
            />
          </div>
        </Card>
      )}

      {/* 附件列表卡片 */}
      {attachments.length > 0 && (
        <Card className="mb-6 p-6">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 m-0">
              {t("admin.projects.detail.attachments", "첨부파일 목록")}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({attachments.length}{" "}
                {t("admin.projects.detail.attachmentCount", "개 첨부파일")})
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {attachments.map((attachment, index) => (
              <div
                key={attachment.id || index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <svg
                    className="w-5 h-5 text-gray-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 block truncate">
                      {attachment.name ||
                        `${t("common.attachment", "첨부파일")} ${index + 1}`}
                    </span>
                    {attachment.fileSize && (
                      <span className="text-xs text-gray-500">
                        {(attachment.fileSize / 1024 / 1024).toFixed(1)} MB
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (attachment.id) {
                      if (attachment.url) {
                        await handleDownloadByUrl(
                          attachment.url,
                          attachment.name,
                        );
                      } else {
                        await handleDownload(attachment.id, attachment.name);
                      }
                    } else if (attachment.url) {
                      await handleDownloadByUrl(
                        attachment.url,
                        attachment.name,
                      );
                    }
                  }}
                >
                  {t("common.download", "다운로드")}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 申请统计卡片 */}
      <Card className="mb-6 p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 m-0">
            {t("admin.projects.detail.applications", "신청 현황")}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({applicationsTotal}{" "}
              {t("admin.projects.detail.applicationCount", "개 신청")})
            </span>
          </h2>
        </div>

        {applicationsLoading ? (
          <div className="py-8 text-center text-gray-500">
            <p>{t("common.loading", "로딩 중...")}</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>
              {t("admin.projects.detail.noApplications", "신청이 없습니다")}
            </p>
          </div>
        ) : (
          <>
            {/* 申请统计 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t("admin.projects.detail.totalApplications", "총 신청수")}
                </label>
                <span className="text-2xl font-bold text-blue-600">
                  {applicationsTotal}
                </span>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t("admin.projects.detail.approvedApplications", "승인됨")}
                </label>
                <span className="text-2xl font-bold text-green-600">
                  {
                    applications.filter((app) => app.status === "approved")
                      .length
                  }
                </span>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <label className="text-sm text-gray-600 font-medium block mb-2">
                  {t("admin.projects.detail.pendingApplications", "대기중")}
                </label>
                <span className="text-2xl font-bold text-yellow-600">
                  {
                    applications.filter((app) => app.status === "pending")
                      .length
                  }
                </span>
              </div>
            </div>

            {/* 신청 목록 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t("admin.projects.detail.applicationList", "신청 목록")}
              </h3>
              <Table columns={applicationColumns} data={applications} />
              {applicationsTotal > applicationsPageSize && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    current={applicationsPage}
                    total={applicationsTotal}
                    pageSize={applicationsPageSize}
                    onChange={setApplicationsPage}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* 申请详情模态框 */}
      {showApplicationModal && selectedApplication && (
        <Modal
          isOpen={showApplicationModal}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedApplication(null);
          }}
          title={t("admin.applications.detail", "신청 상세")}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("admin.applications.table.company", "기업명")}
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedApplication.companyName || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("admin.applications.table.status", "상태")}
                </label>
                <div className="mt-1">
                  <Badge
                    variant={
                      selectedApplication.status === "approved"
                        ? "success"
                        : selectedApplication.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {t(
                      `admin.applications.status.${selectedApplication.status}`,
                      selectedApplication.status,
                    )}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("admin.applications.contactPersonName", "담당자 이름")}
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedApplication.applicantName || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("admin.applications.contactPhone", "전화번호")}
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedApplication.applicantPhone || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("admin.applications.table.submittedAt", "신청일")}
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedApplication.submittedAt
                    ? formatDate(
                        selectedApplication.submittedAt,
                        "yyyy-MM-dd HH:mm",
                        currentLanguage,
                      )
                    : "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {t("admin.applications.table.reviewedAt", "심사일")}
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedApplication.reviewedAt
                    ? formatDate(
                        selectedApplication.reviewedAt,
                        "yyyy-MM-dd HH:mm",
                        currentLanguage,
                      )
                    : "-"}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">
                {t("admin.applications.table.applicationReason", "신청 사유")}
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedApplication.applicationReason || "-"}
                </p>
              </div>
            </div>
            {selectedApplication.attachments &&
              selectedApplication.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    {t("admin.applications.attachments", "첨부파일")}
                  </label>
                  <div className="mt-2 space-y-2">
                    {selectedApplication.attachments.map(
                      (attachment, index) => (
                        <div
                          key={attachment.fileId || index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <svg
                              className="w-4 h-4 text-gray-500 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="text-sm text-gray-900 truncate">
                              {attachment.originalName ||
                                attachment.fileName ||
                                `${t("common.attachment", "첨부파일")} ${index + 1}`}
                            </span>
                            {attachment.fileSize && (
                              <span className="text-xs text-gray-500">
                                (
                                {(attachment.fileSize / 1024 / 1024).toFixed(1)}{" "}
                                MB)
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (attachment.fileUrl) {
                                await handleDownloadByUrl(
                                  attachment.fileUrl,
                                  attachment.originalName ||
                                    attachment.fileName,
                                );
                              } else if (attachment.fileId) {
                                await handleDownload(
                                  attachment.fileId,
                                  attachment.originalName ||
                                    attachment.fileName,
                                );
                              }
                            }}
                          >
                            {t("common.download", "다운로드")}
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            {/* 보완 이력 (Supplement History - combined request & response timeline) */}
            {(selectedApplication.materialRequest ||
              selectedApplication.materialResponse ||
              (selectedApplication.status === "rejected" && selectedApplication.reviewNote)) &&
              (() => {
                // Parse supplement rounds (responses)
                let supplementRounds = [];
                try {
                  const parsed =
                    typeof selectedApplication.materialResponse === "string"
                      ? JSON.parse(selectedApplication.materialResponse)
                      : selectedApplication.materialResponse;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    if (parsed[0] && typeof parsed[0] === "object" && "round" in parsed[0]) {
                      supplementRounds = parsed;
                    } else {
                      supplementRounds = [{ round: 1, submittedAt: null, files: parsed }];
                    }
                  }
                } catch {
                  supplementRounds = [];
                }

                // Parse supplement requests (admin messages) - round-based
                let requestRounds = [];
                try {
                  const rawRequest = selectedApplication.materialRequest;
                  if (rawRequest) {
                    const parsedReq = typeof rawRequest === "string" ? JSON.parse(rawRequest) : rawRequest;
                    if (Array.isArray(parsedReq) && parsedReq.length > 0 && parsedReq[0] && typeof parsedReq[0] === "object" && "round" in parsedReq[0]) {
                      requestRounds = parsedReq;
                    } else {
                      // Legacy: plain string
                      requestRounds = [{ round: 1, message: rawRequest, requestedAt: null }];
                    }
                  }
                } catch {
                  // Legacy: plain string that's not valid JSON
                  if (selectedApplication.materialRequest) {
                    requestRounds = [{ round: 1, message: selectedApplication.materialRequest, requestedAt: null }];
                  }
                }

                const hasSupplementHistory = supplementRounds.length > 0 || requestRounds.length > 0;
                const isRejected = selectedApplication.status === "rejected";

                // Show rejection reason separately if no supplement history
                if (isRejected && selectedApplication.reviewNote && !hasSupplementHistory) {
                  return (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <h4 className="text-sm font-medium text-red-800 mb-1">
                        {t("admin.applications.rejectionReason", "거절 사유")}
                      </h4>
                      <p className="text-sm text-red-700 whitespace-pre-line">
                        {selectedApplication.reviewNote}
                      </p>
                    </div>
                  );
                }

                if (!hasSupplementHistory) return null;

                const totalFiles = supplementRounds.reduce((sum, r) => sum + (r.files?.length || 0), 0);

                // Build interleaved timeline: request1 → response1 → request2 → response2 → ...
                const maxRound = Math.max(
                  requestRounds.length,
                  supplementRounds.length,
                );

                return (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        {t("admin.applications.supplementHistory", "보완 이력")}
                        {totalFiles > 0 && (
                          <span className="text-xs font-normal text-gray-400">
                            ({t("admin.applications.supplementFileCount", "파일 {{count}}개", { count: totalFiles })})
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleClearSupplementHistory(selectedApplication.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        {t("admin.applications.clearHistory", "이력 삭제")}
                      </button>
                    </div>
                    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                      {/* Timeline entries */}
                      <div className="divide-y divide-gray-100">
                        {Array.from({ length: maxRound }, (_, i) => i + 1).map((roundNum) => {
                          const request = requestRounds.find((r) => r.round === roundNum);
                          const submission = supplementRounds.find((r) => r.round === roundNum);
                          return (
                            <div key={`round-${roundNum}`}>
                              {/* Admin request */}
                              {request && (
                                <div className="flex gap-3 p-3 bg-amber-50">
                                  <div className="flex-shrink-0 mt-0.5">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-700">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                      </svg>
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-xs font-medium text-amber-800">
                                        {t("admin.applications.supplementRequestMessage", "보완 요청 내용")}
                                        {requestRounds.length > 1 && (
                                          <span className="ml-1 font-normal text-amber-600">({roundNum}{t("admin.applications.supplementRoundSuffix", "차")})</span>
                                        )}
                                      </p>
                                      {request.requestedAt && (
                                        <span className="text-xs text-amber-500">
                                          {formatDate(request.requestedAt, "yyyy-MM-dd HH:mm", currentLanguage)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-amber-700 whitespace-pre-line">
                                      {request.message}
                                    </p>
                                  </div>
                                </div>
                              )}
                              {/* Member submission */}
                              {submission && (
                                <div className="flex gap-3 p-3 bg-white">
                                  <div className="flex-shrink-0 mt-0.5">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs font-medium text-blue-700">
                                        {t("admin.applications.supplementRound", "제출 {{round}}차", { round: submission.round })}
                                        <span className="ml-1 font-normal text-gray-400">({(submission.files || []).length})</span>
                                      </p>
                                      {submission.submittedAt && (
                                        <span className="text-xs text-gray-400">
                                          {formatDate(submission.submittedAt, "yyyy-MM-dd HH:mm", currentLanguage)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      {(submission.files || []).map((file, idx) => (
                                        <div
                                          key={file.fileId || file.file_id || idx}
                                          className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm text-gray-900 truncate">
                                              {file.originalName || file.original_name || file.fileName || file.file_name || `${t("common.attachment", "첨부파일")} ${idx + 1}`}
                                            </span>
                                            {(file.fileSize || file.file_size) && (
                                              <span className="text-xs text-gray-500">
                                                ({((file.fileSize || file.file_size) / 1024 / 1024).toFixed(1)} MB)
                                              </span>
                                            )}
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                              const url = file.fileUrl || file.file_url;
                                              const name = file.originalName || file.original_name || file.fileName || file.file_name;
                                              if (url) {
                                                await handleDownloadByUrl(url, name);
                                              } else if (file.fileId || file.file_id) {
                                                await handleDownload(file.fileId || file.file_id, name);
                                              }
                                            }}
                                          >
                                            {t("common.download", "다운로드")}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Rejection reason if rejected after supplement */}
                        {isRejected && selectedApplication.reviewNote && (
                          <div className="flex gap-3 p-3 bg-red-50">
                            <div className="flex-shrink-0 mt-0.5">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-200 text-red-700">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-red-800 mb-1">
                                {t("admin.applications.rejectionReason", "거절 사유")}
                              </p>
                              <p className="text-sm text-red-700 whitespace-pre-line">
                                {selectedApplication.reviewNote}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            {selectedApplication.memberId && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleViewMember(selectedApplication.memberId)}
                >
                  {t("admin.applications.viewMemberDetail", "기업 상세 보기")}
                </Button>
                {(selectedApplication.status === "submitted" ||
                  selectedApplication.status === "under_review" ||
                  selectedApplication.status === "supplement_submitted") && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleStatusChange(selectedApplication.id, "approved")
                      }
                    >
                      {t("common.approve", "승인")}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() =>
                        handleStatusChange(selectedApplication.id, "rejected")
                      }
                    >
                      {t("common.reject", "거절")}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                      onClick={() =>
                        handleStatusChange(
                          selectedApplication.id,
                          "needs_supplement",
                        )
                      }
                    >
                      {t("admin.applications.requestSupplement", "보완요청")}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <Modal
          isOpen={showRejectModal}
          onClose={handleCancelReject}
          title={t("admin.applications.rejectReasonTitle", "거부 사유 입력")}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("admin.applications.rejectReasonLabel", "거부 사유")}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t(
                  "admin.applications.rejectReasonPlaceholder",
                  "거부 사유를 입력하세요...",
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleCancelReject}>
                {t("common.cancel", "취소")}
              </Button>
              <Button variant="danger" onClick={handleConfirmReject}>
                {t("common.confirm", "확인")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Supplement Request Modal */}
      {showSupplementRequestModal && (
        <Modal
          isOpen={showSupplementRequestModal}
          onClose={handleCancelSupplementRequest}
          title={t("admin.applications.supplementRequestTitle", "보완 요청")}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t(
                  "admin.applications.supplementRequestLabel",
                  "보완 요청 내용",
                )}
              </label>
              <textarea
                value={supplementRequestMessage}
                onChange={(e) => setSupplementRequestMessage(e.target.value)}
                placeholder={t(
                  "admin.applications.supplementRequestPlaceholder",
                  "보완이 필요한 서류나 내용을 입력하세요...",
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleCancelSupplementRequest}>
                {t("common.cancel", "취소")}
              </Button>
              <Button
                variant="warning"
                onClick={handleConfirmSupplementRequest}
              >
                {t(
                  "admin.applications.sendSupplementRequest",
                  "보완 요청 보내기",
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={clearHistoryConfirm.isOpen}
        onClose={() => setClearHistoryConfirm({ isOpen: false, applicationId: null })}
        onConfirm={confirmClearSupplementHistory}
        title={t("admin.applications.clearHistory", "이력 삭제")}
        message={t("admin.applications.confirmClearHistory", "보완 이력을 삭제하시겠습니까?")}
      />
    </div>
  );
}
