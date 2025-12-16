/**
 * Content Management Utilities
 * 内容管理工具函数
 */


/**
 * Create empty banner form
 */
export function createEmptyBannerForm() {
  return {
    id: null,
    bannerType: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
    displayOrder: 0
  };
}

/**
 * Validate banner form
 */
export function validateBannerForm(form, t) {
  const errors = {};
  if (!form.bannerType?.trim()) {
    errors.bannerType = t('validation.required', { field: t('admin.content.banners.form.fields.bannerType', '横幅类型') });
  }
  if (!form.imageUrl?.trim()) {
    errors.imageUrl = t('validation.required', { field: t('admin.content.banners.form.fields.imageUrl', '图片URL') });
  }
  return errors;
}

/**
 * Create empty notice form
 */
export function createEmptyNoticeForm() {
  return {
    id: null,
    title: '',
    contentHtml: '',
    boardType: 'notice'
  };
}

/**
 * Validate notice form
 */
export function validateNoticeForm(form, t) {
  const errors = {};
  if (!form.title?.trim()) {
    errors.title = t('validation.required', { field: t('admin.content.notices.form.fields.title', '标题') });
  }
  if (!form.contentHtml?.trim()) {
    errors.contentHtml = t('validation.required', { field: t('admin.content.notices.form.fields.contentHtml', '内容') });
  }
  return errors;
}

/**
 * Create empty news form
 */
export function createEmptyNewsForm() {
  return {
    id: null,
    title: '',
    imageUrl: ''
  };
}

/**
 * Validate news form
 */
export function validateNewsForm(form, t) {
  const errors = {};
  if (!form.title?.trim()) {
    errors.title = t('validation.required', { field: t('admin.content.news.form.fields.title', '标题') });
  }
  if (!form.imageUrl?.trim()) {
    errors.imageUrl = t('validation.required', { field: t('admin.content.news.form.fields.imageUrl', '图片URL') });
  }
  return errors;
}

