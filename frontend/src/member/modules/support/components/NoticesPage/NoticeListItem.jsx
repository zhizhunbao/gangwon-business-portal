/**
 * 公告列表项组件
 *
 * 遵循 dev-frontend_patterns skill 规范。
 */

import React from "react";
import { Card, Badge } from "@shared/components";
import { PaperclipIcon } from "@shared/components/Icons";

export default function NoticeListItem({
  notice,
  getBadgeInfo,
  handleNoticeClick,
}) {
  const badgeInfo = getBadgeInfo(notice);

  return (
    <Card
      key={notice.id}
      className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-200"
      onClick={() => handleNoticeClick(notice.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={badgeInfo.variant}>{badgeInfo.text}</Badge>
            {notice.attachments && notice.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <PaperclipIcon className="w-3 h-3" />
                {notice.attachments.length}
              </span>
            )}
          </div>
          <h3 className="text-base font-medium text-gray-900 m-0 truncate">
            {notice.title}
          </h3>
        </div>
        <div className="flex-shrink-0 text-sm text-gray-500">{notice.date}</div>
      </div>
    </Card>
  );
}
