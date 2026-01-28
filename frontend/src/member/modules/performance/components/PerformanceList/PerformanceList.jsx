/**
 * Performance List Component
 *
 * 成果查询列表页面。
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { usePerformanceList } from "../../hooks/usePerformanceList";
import {
  Card,
  CardHeader,
  CardBody,
  Alert,
  Modal,
  ModalFooter,
  Pagination,
  Select,
  Button,
} from "@shared/components";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@shared/components/Table";
import { useDateFormatter } from "@shared/hooks";

const PerformanceList = () => {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormatter();

  const {
    performances,
    loading,
    message,
    setMessage,
    messageVariant,
    deleteConfirm,
    setDeleteConfirm,
    filters,
    setFilterField,
    commentModal,
    setCommentModal,
    pagination,
    handlePageChange,
    confirmDelete,
    showComments,
    navigate,
  } = usePerformanceList();

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      revision_requested: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels = {
      draft: t('performance.status.draft', '임시저장'),
      submitted: t('performance.status.submitted', '심사중'),
      revision_requested: t('performance.status.revisionRequested', '수정 필요'),
      approved: t('performance.status.approved', '승인 완료'),
      rejected: t('performance.status.rejected', '거부됨'),
    };
    return (
      <span
        className={`inline-block px-1.5 py-0.5 rounded text-xs sm:text-sm font-medium ${styles[status] || styles.draft}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const quarterLabels = {
    1: t("performance.quarterLabels.first"),
    2: t("performance.quarterLabels.second"),
    3: t("performance.quarterLabels.third"),
    4: t("performance.quarterLabels.fourth"),
  };

  const yearOptions = [
    { value: "", label: t('common.all', '전체') },
    ...Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() - i;
      return {
        value: year.toString(),
        label: `${year}${t('common.year', '년')}`,
      };
    }),
  ];

  const quarterOptions = [
    { value: "", label: t('common.all', '전체') },
    { value: "1", label: quarterLabels[1] },
    { value: "2", label: quarterLabels[2] },
    { value: "3", label: quarterLabels[3] },
    { value: "4", label: quarterLabels[4] },
  ];

  const statusOptions = [
    { value: "", label: t('common.all', '전체') },
    { value: "draft", label: t('performance.status.draft', '임시저장') },
    { value: "submitted", label: t('performance.status.submitted', '심사중') },
    {
      value: "revision_requested",
      label: t('performance.status.revisionRequested', '수정 필요'),
    },
    { value: "approved", label: t('performance.status.approved', '승인 완료') },
    { value: "rejected", label: t('performance.status.rejected', '거부됨') },
  ];

  return (
    <div className="performance-list w-full max-w-full pb-20">
      {message && (
        <div className="mb-4">
          <Alert variant={messageVariant} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        </div>
      )}

      <div className="mb-6 sm:mb-8 lg:mb-10 min-h-[48px] flex items-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 m-0">
          {t('performance.query', '성과 조회')}
        </h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">
            {t('common.filter', '필터')}
          </h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label={t('performance.year', '연도')}
              value={filters.year}
              onChange={(e) => setFilterField("year", e.target.value)}
              options={yearOptions}
            />
            <Select
              label={t('performance.quarter', '분기')}
              value={filters.quarter}
              onChange={(e) => setFilterField("quarter", e.target.value)}
              options={quarterOptions}
            />
            <Select
              label={t('performance.documentStatus', '문서 상태')}
              value={filters.status}
              onChange={(e) => setFilterField("status", e.target.value)}
              options={statusOptions}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-sm text-gray-600 mb-4">
            {t("performance.resultsCount", "총 {{count}}건", {
              count: pagination.total,
            })}
          </p>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              {t('common.loading', '로딩 중...')}
            </div>
          ) : performances.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {t('common.noData', '데이터가 없습니다')}
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t('performance.period', '기간')}</TableHeader>
                    <TableHeader>
                      {t('performance.documentStatus', '문서 상태')}
                    </TableHeader>
                    <TableHeader>
                      {t('performance.submittedAt', '제출시간')}
                    </TableHeader>
                    <TableHeader>
                      {t('performance.updatedAt', '수정시간')}
                    </TableHeader>
                    <TableHeader>{t('common.actions', '작업')}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performances.map((perf) => (
                    <TableRow key={perf.id}>
                      <TableCell>
                        <span className="font-medium">
                          {perf.year}
                          {t('common.year', '년')} {" "}
                          {perf.quarter
                            ? quarterLabels[perf.quarter]
                            : t('performance.annual', '연간')}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(perf.status)}</TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDateTime(perf.submittedAt)}
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">
                        {formatDateTime(perf.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {(perf.status === "revision_requested" ||
                            perf.status === "rejected") && (
                            <>
                              <button
                                onClick={() => showComments(perf)}
                                className="text-yellow-600 hover:text-yellow-900 font-medium text-sm"
                              >
                                {t('performance.viewComments', '검토 의견 보기')}
                              </button>
                              <span className="text-gray-300">|</span>
                            </>
                          )}
                          {(perf.status === "draft" ||
                            perf.status === "revision_requested") && (
                            <>
                              <button
                                onClick={() =>
                                  navigate(
                                    `/member/performance/edit/${perf.id}`,
                                  )
                                }
                                className="text-primary-600 hover:text-primary-900 font-medium text-sm"
                              >
                                {t('common.edit', '수정')}
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() =>
                                  setDeleteConfirm({ open: true, id: perf.id })
                                }
                                className="text-red-600 hover:text-red-900 font-medium text-sm"
                              >
                                {t('common.delete', '삭제')}
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Modals */}
      <Modal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        title={t('common.confirmDeleteTitle', '삭제 확인')}
        size="sm"
      >
        <p className="py-4 text-gray-700">
          {t('common.confirmDelete', '이 기록을 삭제하시겠습니까?')}
        </p>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteConfirm({ open: false, id: null })}
          >
            {t('common.cancel', '취소')}
          </Button>
          <Button variant="primary" onClick={confirmDelete}>
            {t('common.delete', '삭제')}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={commentModal.open}
        onClose={() =>
          setCommentModal({ open: false, comments: [], status: "" })
        }
        title={t('performance.reviewComments', '검토 의견')}
        size="md"
      >
        <div className="py-4">
          {commentModal.comments.length > 0 ? (
            <div className="space-y-4">
              {commentModal.comments.map((review, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {review.comments}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatDateTime(review.reviewedAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              {t('performance.noComments', '검토 의견이 없습니다')}
            </p>
          )}
        </div>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() =>
              setCommentModal({ open: false, comments: [], status: "" })
            }
          >
            {t('common.close', '닫기')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default PerformanceList;
