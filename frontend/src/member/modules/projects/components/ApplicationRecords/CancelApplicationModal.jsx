import { useTranslation } from "react-i18next";
import { Modal, Button } from "@shared/components";

export default function CancelApplicationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
}) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("projects.applicationRecords.cancelConfirm.title", "取消申请")}
    >
      <div className="p-4">
        <p className="text-gray-700 mb-2">
          {t(
            "projects.applicationRecords.cancelConfirm.message",
            "确定要取消此申请吗？",
          )}
        </p>
        <p className="text-sm text-red-500 mb-4">
          {t(
            "projects.applicationRecords.cancelConfirm.warning",
            "取消后无法恢复。",
          )}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("projects.applicationRecords.cancelConfirm.cancel", "返回")}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading
              ? t("projects.applicationRecords.loading", "加载中...")
              : t(
                  "projects.applicationRecords.cancelConfirm.confirm",
                  "确认取消",
                )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
