// Messages Service - 站内信服务

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";
import { createService } from "@shared/utils/helpers";

const BASE_URL = `${API_PREFIX}/admin/messages`;
const MEMBER_BASE_URL = `${API_PREFIX}/member/messages`;

class MessagesService {
  // 获取消息列表（管理员）
  async getMessages(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.isRead !== undefined) queryParams.is_read = params.isRead;
    if (params.isImportant !== undefined) queryParams.is_important = params.isImportant;

    const response = await apiService.get(BASE_URL, queryParams);

    if (response && response.items) {
      return {
        items: response.items, // API interceptor已经转换为camelCase
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 获取消息列表（会员）
  async getMemberMessages(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.isRead !== undefined) queryParams.is_read = params.isRead;
    if (params.isImportant !== undefined) queryParams.is_important = params.isImportant;

    const response = await apiService.get(MEMBER_BASE_URL, queryParams);

    if (response && response.items) {
      return {
        items: response.items, // API interceptor已经转换为camelCase
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 获取未读数量（管理员）
  async getUnreadCount() {
    const response = await apiService.get(`${BASE_URL}/unread-count`);
    return response.unreadCount;
  }

  // 获取未读数量（会员）
  async getMemberUnreadCount() {
    const response = await apiService.get(`${MEMBER_BASE_URL}/unread-count`);
    return response.unreadCount;
  }

  // 标记消息为已读（会员）
  async markAsRead(messageId) {
    const response = await apiService.put(`${MEMBER_BASE_URL}/${messageId}`, { is_read: true });
    return response; // API interceptor已经转换为camelCase
  }

  // 获取消息详情（管理员）
  async getMessage(messageId) {
    const response = await apiService.get(`${BASE_URL}/${messageId}`);
    return response; // API interceptor已经转换为camelCase
  }

  // 标记消息为已读（管理员）
  async markMessageAsRead(messageId) {
    const response = await apiService.put(`${BASE_URL}/${messageId}`, { is_read: true });
    return response; // API interceptor已经转换为camelCase
  }

  // 获取消息详情（会员）
  async getMemberMessage(messageId) {
    const response = await apiService.get(`${MEMBER_BASE_URL}/${messageId}`);
    return response; // API interceptor已经转换为camelCase
  }


  // 创建消息（管理员发送给会员）
  async createMessage(data) {
    const payload = {
      recipient_id: data.recipientId,
      subject: data.subject,
      content: data.content,
      is_important: data.isImportant,
    };
    const response = await apiService.post(BASE_URL, payload);
    return response; // API interceptor已经转换为camelCase
  }

  // 更新消息（管理员）
  async updateMessage(messageId, data) {
    const payload = {};
    if (data.isRead !== undefined) payload.is_read = data.isRead;
    if (data.isImportant !== undefined) payload.is_important = data.isImportant;

    const response = await apiService.put(`${BASE_URL}/${messageId}`, payload);
    return response; // API interceptor已经转换为camelCase
  }

  // 更新消息（会员）
  async updateMemberMessage(messageId, data) {
    const payload = {};
    if (data.isRead !== undefined) payload.is_read = data.isRead;
    if (data.isImportant !== undefined) payload.is_important = data.isImportant;

    const response = await apiService.put(`${MEMBER_BASE_URL}/${messageId}`, payload);
    return response; // API interceptor已经转换为camelCase
  }

  // 删除消息（管理员）
  async deleteMessage(messageId) {
    return await apiService.delete(`${BASE_URL}/${messageId}`);
  }

  // 删除消息（会员）
  async deleteMemberMessage(messageId) {
    return await apiService.delete(`${MEMBER_BASE_URL}/${messageId}`);
  }

  // 获取会话列表（会员）
  async getMemberThreads(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.status) queryParams.status = params.status;

    const response = await apiService.get(`${MEMBER_BASE_URL}/threads`, queryParams);

    if (response && response.items) {
      return {
        items: response.items, // API interceptor已经转换为camelCase
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 获取会话列表（管理员）
  async getAdminThreads(params) {
    const queryParams = {
      page: params.page,
      page_size: params.pageSize,
    };
    if (params.status) queryParams.status = params.status;
    if (params.hasUnread !== undefined) queryParams.has_unread = params.hasUnread;

    const response = await apiService.get(`${BASE_URL}/threads`, queryParams);

    if (response && response.items) {
      return {
        items: response.items, // API interceptor已经转换为camelCase
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
      };
    }

    throw new Error("Invalid response format");
  }

  // 创建会话（会员）
  async createThread(data) {
    const payload = {
      subject: data.subject,
      category: data.category,
      content: data.content,
      attachments: data.attachments,
    };
    const response = await apiService.post(`${MEMBER_BASE_URL}/threads`, payload);
    return response; // API interceptor已经转换为camelCase
  }


  // 获取会话详情（管理员）
  async getThread(threadId) {
    const response = await apiService.get(`${BASE_URL}/threads/${threadId}`);
    return response; // API interceptor已经转换为camelCase
  }

  // 获取会话详情（会员）
  async getMemberThread(threadId) {
    const response = await apiService.get(`${MEMBER_BASE_URL}/threads/${threadId}`);
    return response; // API interceptor已经转换为camelCase
  }

  // 更新会话（管理员）
  async updateThread(threadId, data) {
    const payload = {};
    if (data.status !== undefined) payload.status = data.status;

    const response = await apiService.put(`${BASE_URL}/threads/${threadId}`, payload);
    return response; // API interceptor已经转换为camelCase
  }

  // 在会话中创建消息（管理员）
  async createThreadMessage(threadId, data) {
    const payload = {
      content: data.content,
      is_important: data.isImportant,
      attachments: data.attachments,
    };
    const response = await apiService.post(`${BASE_URL}/threads/${threadId}/messages`, payload);
    return response; // API interceptor已经转换为camelCase
  }

  // 在会话中创建消息（会员）
  async createMemberThreadMessage(threadId, data) {
    const payload = {
      content: data.content,
      is_important: data.isImportant,
      attachments: data.attachments,
    };
    const response = await apiService.post(`${MEMBER_BASE_URL}/threads/${threadId}/messages`, payload);
    return response; // API interceptor已经转换为camelCase
  }

  // 创建广播消息
  async createBroadcast(data) {
    const payload = {
      subject: data.subject,
      content: data.content,
      is_important: data.isImportant,
      category: data.category,
      send_to_all: data.sendToAll,
      recipient_ids: data.recipientIds,
      attachments: data.attachments,
    };
    const response = await apiService.post(`${BASE_URL}/broadcast`, payload);
    return response; // API interceptor已经转换为camelCase
  }

  // 获取消息分析数据
  async getAnalytics(params) {
    const queryParams = {};
    if (params?.timeRange) queryParams.time_range = params.timeRange;

    const response = await apiService.get(`${BASE_URL}/analytics`, queryParams);
    return response; // API interceptor已经转换为camelCase
  }
}

export default createService(MessagesService);
