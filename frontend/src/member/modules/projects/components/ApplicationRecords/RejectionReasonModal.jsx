import { useTranslation } from "react-i18next";
import { Modal, Button } from "@shared/components";

export default function RejectionReasonModal({ isOpen, onClose, reason }) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("projects.applicationRecords.rejectionReason.title", "拒绝原因")}
    >
      <div className="p-4">
        <p className="text-gray-700 mb-4">
          {reason ||
            t(
              "projects.applicationRecords.rejectionReason.noReason",
              "未提供拒绝原因。",
            )}
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t("projects.applicationRecords.rejectionReason.close", "关闭")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
