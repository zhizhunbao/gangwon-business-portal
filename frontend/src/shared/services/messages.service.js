/**
 * Messages Service
 * 站内信服务
 */

import apiService from "./api.service";

import { API_PREFIX } from "@shared/utils/constants";

const BASE_URL = `${API_PREFIX}/admin/messages`;
const MEMBER_BASE_URL = `${API_PREFIX}/member/messages`;

/**
 * Get messages list
 */
const getMessagesInternal = async (params = {}) => {
  const { page = 1, pageSize = 20, isRead, isImportant } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (isRead !== undefined) {
    queryParams.append("is_read", isRead.toString());
  }
  if (isImportant !== undefined) {
    queryParams.append("is_important", isImportant.toString());
  }

  const response = await apiService.get(
    `${BASE_URL}?${queryParams.toString()}`
  );
  return response;
};

/**
 * Get member messages list
 */
const getMemberMessagesInternal = async (params = {}) => {
  const { page = 1, pageSize = 20, isRead, isImportant } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  if (isRead !== undefined) {
    queryParams.append("is_read", isRead.toString());
  }
  if (isImportant !== undefined) {
    queryParams.append("is_important", isImportant.toString());
  }

  const response = await apiService.get(
    `${MEMBER_BASE_URL}?${queryParams.toString()}`
  );
  return response;
};

/**
 * Get unread count
 */
const getUnreadCountInternal = async () => {
  const response = await apiService.get(`${BASE_URL}/unread-count`);
  return response;
};

/**
 * Get member unread count
 */
const getMemberUnreadCountInternal = async () => {
  const response = await apiService.get(`${MEMBER_BASE_URL}/unread-count`);
  return response;
};

/**
 * Get message by ID
 */
const getMessageInternal = async (messageId) => {
  const response = await apiService.get(`${BASE_URL}/${messageId}`);
  return response;
};

/**
 * Get member message by ID
 */
const getMemberMessageInternal = async (messageId) => {
  const response = await apiService.get(`${MEMBER_BASE_URL}/${messageId}`);
  return response;
};

/**
 * Create message
 */
const createMessageInternal = async (data) => {
  const response = await apiService.post(BASE_URL, data);
  return response;
};

/**
 * Update message
 */
const updateMessageInternal = async (messageId, data) => {
  const response = await apiService.put(`${BASE_URL}/${messageId}`, data);
  return response;
};

/**
 * Update member message
 */
const updateMemberMessageInternal = async (messageId, data) => {
  const response = await apiService.put(
    `${MEMBER_BASE_URL}/${messageId}`,
    data
  );
  return response;
};

/**
 * Delete message
 */
const deleteMessageInternal = async (messageId) => {
  await apiService.delete(`${BASE_URL}/${messageId}`);
};

/**
 * Delete member message
 */
const deleteMemberMessageInternal = async (messageId) => {
  await apiService.delete(`${MEMBER_BASE_URL}/${messageId}`);
};

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    camelObj[camelKey] =
      typeof value === "object" && value !== null ? toCamelCase(value) : value;
  }
  return camelObj;
}

const messagesService = {
  /**
   * Get messages list (admin)
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.pageSize - Page size
   * @param {boolean} params.isRead - Filter by read status
   * @param {boolean} params.isImportant - Filter by important status
   * @returns {Promise<Object>} Messages list response
   */
  async getMessages(params = {}) {
    const response = await getMessagesInternal(params);
    return {
      ...response,
      items: (response.items || []).map(toCamelCase),
    };
  },

  /**
   * Get messages list (member)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Messages list response
   */
  async getMemberMessages(params = {}) {
    const response = await getMemberMessagesInternal(params);
    return {
      ...response,
      items: (response.items || []).map(toCamelCase),
    };
  },

  /**
   * Get unread count (admin)
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount() {
    const response = await getUnreadCountInternal();
    return response.unreadCount || 0;
  },

  /**
   * Get unread count (member)
   * @returns {Promise<number>} Unread count
   */
  async getMemberUnreadCount() {
    const response = await getMemberUnreadCountInternal();
    return response.unreadCount || 0;
  },

  /**
   * Get message by ID (admin)
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Message object
   */
  async getMessage(messageId) {
    const response = await getMessageInternal(messageId);
    return toCamelCase(response);
  },

  /**
   * Get message by ID (member)
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Message object
   */
  async getMemberMessage(messageId) {
    const response = await getMemberMessageInternal(messageId);
    return toCamelCase(response);
  },

  /**
   * Create message (admin to member)
   * @param {Object} data - Message data
   * @param {string} data.recipientId - Recipient member ID
   * @param {string} data.subject - Message subject
   * @param {string} data.content - Message content
   * @param {boolean} data.isImportant - Whether message is important
   * @returns {Promise<Object>} Created message
   */
  async createMessage(data) {
    const payload = {
      recipient_id: data.recipientId,
      subject: data.subject,
      content: data.content,
      is_important: data.isImportant || false,
    };
    const response = await createMessageInternal(payload);
    return toCamelCase(response);
  },

  /**
   * Update message
   * @param {string} messageId - Message ID
   * @param {Object} data - Update data
   * @param {boolean} data.isRead - Mark as read/unread
   * @param {boolean} data.isImportant - Mark as important
   * @returns {Promise<Object>} Updated message
   */
  async updateMessage(messageId, data) {
    const payload = {};
    if (data.isRead !== undefined) {
      payload.is_read = data.isRead;
    }
    if (data.isImportant !== undefined) {
      payload.is_important = data.isImportant;
    }
    const response = await updateMessageInternal(messageId, payload);
    return toCamelCase(response);
  },

  /**
   * Update member message
   * @param {string} messageId - Message ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated message
   */
  async updateMemberMessage(messageId, data) {
    const payload = {};
    if (data.isRead !== undefined) {
      payload.is_read = data.isRead;
    }
    if (data.isImportant !== undefined) {
      payload.is_important = data.isImportant;
    }
    const response = await updateMemberMessageInternal(messageId, payload);
    return toCamelCase(response);
  },

  /**
   * Delete message (admin)
   * @param {string} messageId - Message ID
   */
  async deleteMessage(messageId) {
    await deleteMessageInternal(messageId);
  },

  /**
   * Delete message (member)
   * @param {string} messageId - Message ID
   */
  async deleteMemberMessage(messageId) {
    await deleteMemberMessageInternal(messageId);
  },

  /**
   * Get member threads list
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.pageSize - Page size
   * @param {string} params.status - Filter by status (open, resolved, closed)
   * @returns {Promise<Object>} Threads list response
   */
  async getMemberThreads(params = {}) {
    const queryParams = new URLSearchParams({
      page: (params.page || 1).toString(),
      page_size: (params.pageSize || 20).toString(),
    });

    if (params.status) {
      queryParams.append('status', params.status);
    }

    const response = await apiService.get(`${MEMBER_BASE_URL}/threads?${queryParams.toString()}`);
    return {
      ...response,
      items: (response.items || []).map(toCamelCase),
    };
  },

  /**
   * Create thread (member)
   * @param {Object} data - Thread data
   * @param {string} data.subject - Thread subject
   * @param {string} data.category - Thread category
   * @param {string} data.content - Initial message content
   * @param {Array} data.attachments - Attachments
   * @returns {Promise<Object>} Created thread
   */
  async createThread(data) {
    const payload = {
      subject: data.subject,
      category: data.category || 'general',
      content: data.content,
      attachments: data.attachments || []
    };
    const response = await apiService.post(`${MEMBER_BASE_URL}/threads`, payload);
    return toCamelCase(response);
  },

  /**
   * Get thread with messages (admin)
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Thread with messages
   */
  async getThread(threadId) {
    const response = await apiService.get(`${BASE_URL}/threads/${threadId}`);
    return {
      thread: toCamelCase(response.thread),
      messages: (response.messages || []).map(toCamelCase)
    };
  },

  /**
   * Get thread with messages (member)
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Thread with messages
   */
  async getMemberThread(threadId) {
    const response = await apiService.get(`${MEMBER_BASE_URL}/threads/${threadId}`);
    return {
      thread: toCamelCase(response.thread),
      messages: (response.messages || []).map(toCamelCase)
    };
  },

  /**
   * Update thread (admin)
   * @param {string} threadId - Thread ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated thread
   */
  async updateThread(threadId, data) {
    const payload = {};
    if (data.status !== undefined) {
      payload.status = data.status;
    }
    const response = await apiService.put(`${BASE_URL}/threads/${threadId}`, payload);
    return toCamelCase(response);
  },

  /**
   * Create message in thread (admin)
   * @param {string} threadId - Thread ID
   * @param {Object} data - Message data
   * @returns {Promise<Object>} Created message
   */
  async createThreadMessage(threadId, data) {
    const payload = {
      content: data.content,
      is_important: data.isImportant || false,
      attachments: data.attachments || []
    };
    const response = await apiService.post(`${BASE_URL}/threads/${threadId}/messages`, payload);
    return toCamelCase(response);
  },

  /**
   * Create message in thread (member)
   * @param {string} threadId - Thread ID
   * @param {Object} data - Message data
   * @returns {Promise<Object>} Created message
   */
  async createMemberThreadMessage(threadId, data) {
    const payload = {
      content: data.content,
      is_important: data.isImportant || false,
      attachments: data.attachments || []
    };
    const response = await apiService.post(`${MEMBER_BASE_URL}/threads/${threadId}/messages`, payload);
    return toCamelCase(response);
  },

  /**
   * Create broadcast message
   * @param {Object} data - Broadcast data
   * @returns {Promise<Object>} Broadcast result
   */
  async createBroadcast(data) {
    const payload = {
      subject: data.subject,
      content: data.content,
      is_important: data.isImportant || false,
      category: data.category || 'general',
      send_to_all: data.sendToAll,
      recipient_ids: data.recipientIds || [],
      attachments: data.attachments || []
    };
    const response = await apiService.post(`${BASE_URL}/broadcast`, payload);
    return toCamelCase(response);
  },

  /**
   * Get message analytics
   * @param {Object} params - Analytics parameters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.timeRange) {
      queryParams.append('time_range', params.timeRange);
    }
    
    const response = await apiService.get(`${BASE_URL}/analytics?${queryParams.toString()}`);
    return toCamelCase(response);
  },
};

export default messagesService;

