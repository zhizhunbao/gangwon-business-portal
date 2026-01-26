/**
 * Support 模块服务
 *
 * 遵循 dev-frontend_patterns skill 规范。
 * 整合了 FAQ、公告事项和咨询相关的 API 调用。
 */

import apiService from "@shared/services/api.service";
import { API_PREFIX } from "@shared/utils/constants";

const BASE_URL = `${API_PREFIX}/support`; // 假设后端有统一路径，或者直接使用现有路径
const MEMBER_MESSAGES_URL = `${API_PREFIX}/member/messages`;

class SupportService {
  // --- FAQ ---
  async listFAQs(params) {
    return await apiService.get(`${API_PREFIX}/faqs`, params);
  }

  // --- 公告事项 (Notices) ---
  // 注意：此处使用 homeService 对应的后端路径，但封装在 support feature 中
  async listNotices(params) {
    return await apiService.get(`${API_PREFIX}/notices`, params);
  }

  async getNotice(noticeId) {
    return await apiService.get(`${API_PREFIX}/notices/${noticeId}`);
  }

  // --- 咨询 (Inquiries/Threads) ---
  async getMemberThreads(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.status) queryParams.status = params.status;

    return await apiService.get(`${MEMBER_MESSAGES_URL}/threads`, queryParams);
  }

  async createThread(data) {
    const payload = {
      subject: data.subject,
      category: data.category,
      content: data.content,
      attachments: data.attachments,
    };
    return await apiService.post(`${MEMBER_MESSAGES_URL}/threads`, payload);
  }

  async getMemberThread(threadId) {
    return await apiService.get(`${MEMBER_MESSAGES_URL}/threads/${threadId}`);
  }

  async createMemberThreadMessage(threadId, data) {
    const payload = {
      content: data.content,
      is_important: data.isImportant,
      attachments: data.attachments,
    };
    return await apiService.post(
      `${MEMBER_MESSAGES_URL}/threads/${threadId}/messages`,
      payload,
    );
  }
}

export const supportService = new SupportService();
export default supportService;
