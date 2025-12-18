/**
 * Content Service
 * 内容管理服务 - 封装公告、新闻稿、横幅、系统信息等 API
 */

import apiService from "./api.service";
import { API_PREFIX } from "@shared/utils/constants";

/**
 * 转换后端 snake_case 到前端 camelCase
 */
function toCamelCase(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    result[camelKey] = toCamelCase(value);
  }
  return result;
}

/**
 * 转换前端 camelCase 到后端 snake_case
 */
function toSnakeCase(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );
    result[snakeKey] = toSnakeCase(value);
  }
  return result;
}

const contentService = {
  // ========== 公告 (Notices) ==========

  /**
   * 获取公告列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码（默认：1）
   * @param {number} params.pageSize - 每页数量（默认：20）
   * @param {string} params.search - 搜索关键词（可选）
   * @returns {Promise<Object>} 公告列表响应
   */
  async listNotices(params = {}) {
    const { page = 1, pageSize = 20, search } = params;
    const queryParams = {
      page,
      page_size: pageSize,
      ...(search && { search }),
    };

    const response = await listNoticesInternal(queryParams);

    // 转换响应格式
    const result = {
      items: (response.items || []).map(toCamelCase),
      total: response.total || 0,
      page: response.page || page,
      pageSize: response.page_size || response.pageSize || pageSize,
      totalPages: response.total_pages || response.totalPages || 0,
    };

    return result;
  },

  /**
   * 获取最新5条公告（用于首页）
   * @returns {Promise<Array>} 公告列表
   */
  async getLatestNotices() {
    const response = await getLatestNoticesInternal();
    return (response || []).map(toCamelCase);
  },

  /**
   * 获取公告详情
   * @param {string} noticeId - 公告ID
   * @returns {Promise<Object>} 公告详情
   */
  async getNotice(noticeId) {
    const response = await getNoticeInternal(noticeId);
    return toCamelCase(response);
  },

  /**
   * 创建公告（管理员）
   * @param {Object} data - 公告数据
   * @param {string} data.title - 标题
   * @param {string} data.contentHtml - HTML 内容
   * @param {string} data.boardType - 公告类型（可选，默认：'notice'）
   * @returns {Promise<Object>} 创建的公告
   */
  async createNotice(data) {
    const payload = toSnakeCase({
      title: data.title,
      contentHtml: data.contentHtml,
      boardType: data.boardType || "notice",
    });

    const response = await createNoticeInternal(payload);
    return toCamelCase(response);
  },

  /**
   * 更新公告（管理员）
   * @param {string} noticeId - 公告ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新后的公告
   */
  async updateNotice(noticeId, data) {
    const payload = toSnakeCase(data);
    const response = await updateNoticeInternal(noticeId, payload);
    return toCamelCase(response);
  },

  /**
   * 删除公告（管理员）
   * @param {string} noticeId - 公告ID
   * @returns {Promise<void>}
   */
  async deleteNotice(noticeId) {
    await deleteNoticeInternal(noticeId);
  },

  // ========== 新闻稿 (Press Releases) ==========

  /**
   * 获取新闻稿列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码（默认：1）
   * @param {number} params.pageSize - 每页数量（默认：20）
   * @returns {Promise<Object>} 新闻稿列表响应
   */
  async listPressReleases(params = {}) {
    const { page = 1, pageSize = 20 } = params;
    const queryParams = {
      page,
      page_size: pageSize,
    };

    const response = await listPressReleasesInternal(queryParams);

    // 转换响应格式
    const result = {
      items: (response.items || []).map(toCamelCase),
      total: response.total || 0,
      page: response.page || page,
      pageSize: response.page_size || response.pageSize || pageSize,
      totalPages: response.total_pages || response.totalPages || 0,
    };

    return result;
  },

  /**
   * 获取最新1条新闻稿（用于首页）
   * @returns {Promise<Object|null>} 新闻稿详情或 null
   */
  async getLatestPressRelease() {
    const response = await getLatestPressReleaseInternal();
    return response ? toCamelCase(response) : null;
  },

  /**
   * 获取新闻稿详情
   * @param {string} pressId - 新闻稿ID
   * @returns {Promise<Object>} 新闻稿详情
   */
  async getPressRelease(pressId) {
    const response = await getPressReleaseInternal(pressId);
    return toCamelCase(response);
  },

  /**
   * 创建新闻稿（管理员）
   * @param {Object} data - 新闻稿数据
   * @param {string} data.title - 标题
   * @param {string} data.imageUrl - 图片URL
   * @returns {Promise<Object>} 创建的新闻稿
   */
  async createPressRelease(data) {
    const payload = toSnakeCase({
      title: data.title,
      imageUrl: data.imageUrl,
    });

    const response = await createPressReleaseInternal(payload);
    return toCamelCase(response);
  },

  /**
   * 更新新闻稿（管理员）
   * @param {string} pressId - 新闻稿ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新后的新闻稿
   */
  async updatePressRelease(pressId, data) {
    const payload = toSnakeCase(data);
    const response = await updatePressReleaseInternal(pressId, payload);
    return toCamelCase(response);
  },

  /**
   * 删除新闻稿（管理员）
   * @param {string} pressId - 新闻稿ID
   * @returns {Promise<void>}
   */
  async deletePressRelease(pressId) {
    await deletePressReleaseInternal(pressId);
  },

  // ========== 横幅 (Banners) ==========

  /**
   * 获取活跃横幅（公开）
   * @param {Object} params - 查询参数
   * @param {string} params.bannerType - 横幅类型（main_primary, about, projects, performance, support）
   * @returns {Promise<Array>} 横幅列表
   */
  async getBanners(params = {}) {
    const { bannerType } = params;
    const queryParams = bannerType ? { banner_type: bannerType } : {};

    const response = await getBannersInternal(queryParams);
    return (response.items || []).map(toCamelCase);
  },

  /**
   * 获取所有横幅（管理员）
   * @returns {Promise<Array>} 横幅列表
   */
  async getAllBanners() {
    const response = await getAllBannersInternal();
    return (response.items || []).map(toCamelCase);
  },

  /**
   * 创建横幅（管理员）
   * @param {Object} data - 横幅数据
   * @param {string} data.bannerType - 横幅类型
   * @param {string} data.imageUrl - 图片URL
   * @param {string} data.linkUrl - 链接URL（可选）
   * @param {boolean} data.isActive - 是否活跃（默认：true）
   * @param {number} data.displayOrder - 显示顺序（默认：0）
   * @returns {Promise<Object>} 创建的横幅
   */
  async createBanner(data) {
    const payload = toSnakeCase({
      bannerType: data.bannerType,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      isActive: data.isActive !== undefined ? data.isActive : true,
      displayOrder: data.displayOrder || 0,
    });

    const response = await createBannerInternal(payload);
    return toCamelCase(response);
  },

  /**
   * 更新横幅（管理员）
   * @param {string} bannerId - 横幅ID (UUID, corresponds to backend banner_id)
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新后的横幅
   */
  async updateBanner(bannerId, data) {
    const payload = toSnakeCase(data);
    const response = await updateBannerInternal(bannerId, payload);
    return toCamelCase(response);
  },

  /**
   * 删除横幅（管理员）
   * @param {string} bannerId - 横幅ID (UUID, corresponds to backend banner_id)
   * @returns {Promise<void>}
   */
  async deleteBanner(bannerId) {
    await deleteBannerInternal(bannerId);
  },

  // ========== 系统信息 (System Info) ==========

  /**
   * 获取系统信息（公开）
   * @returns {Promise<Object|null>} 系统信息或 null
   */
  async getSystemInfo() {
    const response = await getSystemInfoInternal();
    return response ? toCamelCase(response) : null;
  },

  /**
   * 更新系统信息（管理员，upsert 模式）
   * @param {Object} data - 系统信息数据
   * @param {string} data.contentHtml - HTML 内容
   * @param {string} data.imageUrl - 图片URL（可选）
   * @returns {Promise<Object>} 更新后的系统信息
   */
  async updateSystemInfo(data) {
    const payload = toSnakeCase({
      contentHtml: data.contentHtml,
      imageUrl: data.imageUrl,
    });

    const response = await updateSystemInfoInternal(payload);
    return toCamelCase(response);
  },

  // ========== 弹窗 (Popups) ==========

  /**
   * 获取活跃弹窗（公开）
   * @returns {Promise<Object|null>} 弹窗详情或 null
   */
  async getActivePopup() {
    const response = await getActivePopupInternal();
    return response ? toCamelCase(response) : null;
  },

  /**
   * 获取所有弹窗（管理员）
   * @returns {Promise<Array>} 弹窗列表
   */
  async getAllPopups() {
    const response = await getAllPopupsInternal();
    return (response.popups || []).map(toCamelCase);
  },

  /**
   * 获取弹窗详情（管理员）
   * @param {string} popupId - 弹窗ID
   * @returns {Promise<Object>} 弹窗详情
   */
  async getPopup(popupId) {
    const response = await getPopupInternal(popupId);
    return toCamelCase(response);
  },

  /**
   * 创建弹窗（管理员）
   * @param {Object} data - 弹窗数据
   * @param {string} data.title - 标题
   * @param {string} data.content - 内容
   * @param {string} data.imageUrl - 图片URL（可选）
   * @param {string} data.linkUrl - 链接URL（可选）
   * @param {number} data.width - 宽度（默认：600）
   * @param {number} data.height - 高度（默认：400）
   * @param {string} data.position - 位置（center, left, right，默认：center）
   * @param {boolean} data.isActive - 是否活跃（默认：true）
   * @param {string} data.startDate - 开始日期（可选）
   * @param {string} data.endDate - 结束日期（可选）
   * @returns {Promise<Object>} 创建的弹窗
   */
  async createPopup(data) {
    const payload = toSnakeCase({
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      width: data.width || 600,
      height: data.height || 400,
      position: data.position || "center",
      isActive: data.isActive !== undefined ? data.isActive : true,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
    });

    const response = await createPopupInternal(payload);
    return toCamelCase(response);
  },

  /**
   * 更新弹窗（管理员）
   * @param {string} popupId - 弹窗ID
   * @param {Object} data - 更新数据
   * @returns {Promise<Object>} 更新后的弹窗
   */
  async updatePopup(popupId, data) {
    const payload = toSnakeCase(data);
    const response = await updatePopupInternal(popupId, payload);
    return toCamelCase(response);
  },

  /**
   * 删除弹窗（管理员）
   * @param {string} popupId - 弹窗ID
   * @returns {Promise<void>}
   */
  async deletePopup(popupId) {
    await deletePopupInternal(popupId);
  },
};

// 内部辅助函数（使用装饰器）
const listNoticesInternal = async (queryParams) => {
  return await apiService.get(`${API_PREFIX}/notices`, queryParams);
};

const getLatestNoticesInternal = async () => {
  return await apiService.get(`${API_PREFIX}/notices/latest5`);
};

const getNoticeInternal = async (noticeId) => {
  return await apiService.get(`${API_PREFIX}/notices/${noticeId}`);
};

const createNoticeInternal = async (data) => {
  return await apiService.post(`${API_PREFIX}/admin/content/notices`, data);
};

const updateNoticeInternal = async (noticeId, data) => {
  return await apiService.put(
    `${API_PREFIX}/admin/content/notices/${noticeId}`,
    data
  );
};

const deleteNoticeInternal = async (noticeId) => {
  return await apiService.delete(
    `${API_PREFIX}/admin/content/notices/${noticeId}`
  );
};

const listPressReleasesInternal = async (queryParams) => {
  return await apiService.get(`${API_PREFIX}/press`, queryParams);
};

const getLatestPressReleaseInternal = async () => {
  return await apiService.get(`${API_PREFIX}/press/latest1`);
};

const getPressReleaseInternal = async (pressId) => {
  return await apiService.get(`${API_PREFIX}/press/${pressId}`);
};

const createPressReleaseInternal = async (data) => {
  return await apiService.post(`${API_PREFIX}/admin/content/press`, data);
};

const updatePressReleaseInternal = async (pressId, data) => {
  return await apiService.put(
    `${API_PREFIX}/admin/content/press/${pressId}`,
    data
  );
};

const deletePressReleaseInternal = async (pressId) => {
  return await apiService.delete(
    `${API_PREFIX}/admin/content/press/${pressId}`
  );
};

const getBannersInternal = async (queryParams) => {
  return await apiService.get(`${API_PREFIX}/banners`, queryParams);
};

const getAllBannersInternal = async () => {
  return await apiService.get(`${API_PREFIX}/admin/content/banners`);
};

const createBannerInternal = async (data) => {
  return await apiService.post(`${API_PREFIX}/admin/content/banners`, data);
};

const updateBannerInternal = async (bannerId, data) => {
  return await apiService.put(
    `${API_PREFIX}/admin/content/banners/${bannerId}`,
    data
  );
};

const deleteBannerInternal = async (bannerId) => {
  return await apiService.delete(
    `${API_PREFIX}/admin/content/banners/${bannerId}`
  );
};

const getSystemInfoInternal = async () => {
  return await apiService.get(`${API_PREFIX}/system-info`);
};

const updateSystemInfoInternal = async (data) => {
  return await apiService.put(`${API_PREFIX}/admin/content/system-info`, data);
};

const getActivePopupInternal = async () => {
  return apiService.get(`${API_PREFIX}/popup`);
};

const getAllPopupsInternal = async () => {
  return await apiService.get(`${API_PREFIX}/admin/content/popups`);
};

const getPopupInternal = async (popupId) => {
  return await apiService.get(`${API_PREFIX}/admin/content/popups/${popupId}`);
};

const createPopupInternal = async (data) => {
  return apiService.post(`${API_PREFIX}/admin/content/popups`, data);
};

const updatePopupInternal = async (popupId, data) => {
  return await apiService.put(
    `${API_PREFIX}/admin/content/popups/${popupId}`,
    data
  );
};

const deletePopupInternal = async (popupId) => {
  return await apiService.delete(
    `${API_PREFIX}/admin/content/popups/${popupId}`
  );
};

export default contentService;
