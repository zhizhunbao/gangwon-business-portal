/**
 * 项目相关枚举定义
 *
 * 定义项目状态和申请状态的常量。
 * 遵循 dev-frontend_patterns skill 规范。
 */

export const ProjectStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
  // Legacy statuses
  RECRUITING: "recruiting",
  ONGOING: "ongoing",
  CLOSED: "closed",
};

export const ApplicationStatus = {
  PENDING: "pending",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  REVIEWING: "reviewing",
  NEEDS_SUPPLEMENT: "needs_supplement",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};
