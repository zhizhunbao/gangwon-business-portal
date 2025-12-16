/**
 * Message Service
 * 站内信服务
 */

import apiService from './api.service';
import { autoLog } from './logger.service';
import { API_PREFIX } from '@shared/utils/constants';

const BASE_URL = `${API_PREFIX}/admin/messages`;
const MEMBER_BASE_URL = `${API_PREFIX}/member/messages`;

/**
 * Get messages list
 */
const getMessagesInternal = autoLog('get_messages', { 
  logResultCount: true, 
  serviceName: 'MessageService', 
  methodName: 'getMessages' 
})(async (params = {}) => {
  const { page = 1, pageSize = 20, isRead, isImportant } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  
  if (isRead !== undefined) {
    queryParams.append('is_read', isRead.toString());
  }
  if (isImportant !== undefined) {
    queryParams.append('is_important', isImportant.toString());
  }
  
  const response = await apiService.get(`${BASE_URL}?${queryParams.toString()}`);
  return response;
});

/**
 * Get member messages list
 */
const getMemberMessagesInternal = autoLog('get_member_messages', { 
  logResultCount: true, 
  serviceName: 'MessageService', 
  methodName: 'getMemberMessages' 
})(async (params = {}) => {
  const { page = 1, pageSize = 20, isRead, isImportant } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  
  if (isRead !== undefined) {
    queryParams.append('is_read', isRead.toString());
  }
  if (isImportant !== undefined) {
    queryParams.append('is_important', isImportant.toString());
  }
  
  const response = await apiService.get(`${MEMBER_BASE_URL}?${queryParams.toString()}`);
  return response;
});

/**
 * Get unread count
 */
const getUnreadCountInternal = autoLog('get_unread_count', { 
  serviceName: 'MessageService', 
  methodName: 'getUnreadCount' 
})(async () => {
  const response = await apiService.get(`${BASE_URL}/unread-count`);
  return response;
});

/**
 * Get member unread count
 */
const getMemberUnreadCountInternal = autoLog('get_member_unread_count', { 
  serviceName: 'MessageService', 
  methodName: 'getMemberUnreadCount' 
})(async () => {
  const response = await apiService.get(`${MEMBER_BASE_URL}/unread-count`);
  return response;
});

/**
 * Get message by ID
 */
const getMessageInternal = autoLog('get_message', { 
  serviceName: 'MessageService', 
  methodName: 'getMessage' 
})(async (messageId) => {
  const response = await apiService.get(`${BASE_URL}/${messageId}`);
  return response;
});

/**
 * Get member message by ID
 */
const getMemberMessageInternal = autoLog('get_member_message', { 
  serviceName: 'MessageService', 
  methodName: 'getMemberMessage' 
})(async (messageId) => {
  const response = await apiService.get(`${MEMBER_BASE_URL}/${messageId}`);
  return response;
});

/**
 * Create message
 */
const createMessageInternal = autoLog('create_message', { 
  serviceName: 'MessageService', 
  methodName: 'createMessage' 
})(async (data) => {
  const response = await apiService.post(BASE_URL, data);
  return response;
});

/**
 * Update message
 */
const updateMessageInternal = autoLog('update_message', { 
  serviceName: 'MessageService', 
  methodName: 'updateMessage' 
})(async (messageId, data) => {
  const response = await apiService.put(`${BASE_URL}/${messageId}`, data);
  return response;
});

/**
 * Update member message
 */
const updateMemberMessageInternal = autoLog('update_member_message', { 
  serviceName: 'MessageService', 
  methodName: 'updateMemberMessage' 
})(async (messageId, data) => {
  const response = await apiService.put(`${MEMBER_BASE_URL}/${messageId}`, data);
  return response;
});

/**
 * Delete message
 */
const deleteMessageInternal = autoLog('delete_message', { 
  serviceName: 'MessageService', 
  methodName: 'deleteMessage' 
})(async (messageId) => {
  await apiService.delete(`${BASE_URL}/${messageId}`);
});

/**
 * Delete member message
 */
const deleteMemberMessageInternal = autoLog('delete_member_message', { 
  serviceName: 'MessageService', 
  methodName: 'deleteMemberMessage' 
})(async (messageId) => {
  await apiService.delete(`${MEMBER_BASE_URL}/${messageId}`);
});

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  
  const camelObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = typeof value === 'object' && value !== null ? toCamelCase(value) : value;
  }
  return camelObj;
}

const messageService = {
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
};

export default messageService;

