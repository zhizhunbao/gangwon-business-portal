/**
 * Application Constants
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// Note: Backend API doesn't use version prefix, using /api directly
export const API_PREFIX = `/api`;

// WebSocket Configuration
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

// Mock Configuration
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// Authentication
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_INFO_KEY = 'user_info';
export const TOKEN_EXPIRY_KEY = 'token_expiry';

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest'
};

// Approval Status
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUPPLEMENT: 'supplement' // 补正
};

// Performance Record Status
export const PERFORMANCE_STATUS = {
  DRAFT: 'draft',         // 临时保存
  SUBMITTED: 'submitted', // 已提交
  SUPPLEMENT: 'supplement', // 需补正
  APPROVED: 'approved'    // 已批准
};

// Performance Record Types
export const PERFORMANCE_TYPES = {
  SALES_EMPLOYMENT: 'sales_employment',
  GOVERNMENT_SUPPORT: 'government_support',
  INTELLECTUAL_PROPERTY: 'ip'
};

// File Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

// Date Formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const DISPLAY_DATE_FORMAT = 'yyyy년 MM월 dd일';
export const DISPLAY_DATETIME_FORMAT = 'yyyy년 MM월 dd일 HH:mm';

// Regions (所在地区)
export const REGIONS = [
  { value: 'gangwon', labelKo: '강원특별자치도', labelZh: '江原特别自治道' },
  { value: 'other', labelKo: '강원 이외', labelZh: '江原以外' }
];

// Startup Categories (创业分类)
export const STARTUP_CATEGORIES = [
  { value: 'preliminary', labelKo: '예비', labelZh: '预备' },
  { value: 'startup', labelKo: '창업', labelZh: '创业' }
];

// Content Types (for attachments)
export const RESOURCE_TYPES = {
  MEMBER_LOGO: 'member_logo',
  MEMBER_LICENSE: 'member_license',
  PROJECT_IMAGE: 'project_image',
  PROJECT_ATTACHMENT: 'project_attachment',
  PROJECT_APPLICATION: 'project_application',
  PERFORMANCE_PROOF: 'performance_proof',
  NEWS_IMAGE: 'news_image',
  BANNER_IMAGE: 'banner_image',
  POPUP_IMAGE: 'popup_image'
};

// Quarter Options
export const QUARTERS = [
  { value: 'Q1', labelKo: '1분기', labelZh: '第1季度' },
  { value: 'Q2', labelKo: '2분기', labelZh: '第2季度' },
  { value: 'Q3', labelKo: '3분기', labelZh: '第3季度' },
  { value: 'Q4', labelKo: '4분기', labelZh: '第4季度' }
];

// Banner Types
export const BANNER_TYPES = {
  MAIN_PRIMARY: 'main_primary',       // 主页主横幅
  MAIN_SECONDARY: 'main_secondary',   // 主页次横幅（小尺寸）
  ABOUT: 'about',                     // 系统介绍页横幅
  PROJECTS: 'projects',               // 项目页横幅
  PERFORMANCE: 'performance',         // 业绩管理页横幅
  SUPPORT: 'support',                 // 一站式支持页横幅
  PROFILE: 'profile',                 // 企业资料页横幅
  NOTICES: 'notices',                 // 公告列表页横幅
  NEWS: 'news',                       // 新闻资料页横幅
  SCROLL: 'scroll'                    // 滚动横幅
};

// Popup Display Status
export const POPUP_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SCHEDULED: 'scheduled'
};

// Language Options
export const LANGUAGES = {
  KO: 'ko',
  ZH: 'zh'
};

// Default Language
export const DEFAULT_LANGUAGE = LANGUAGES.KO;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// Error Codes (matches backend ErrorCode enum)
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // ============================================================
  // 后端错误码 - 与 backend/src/common/modules/exception/_08_utils/code_error.py 保持一致
  // ============================================================
  
  // --- 1000 - 1999: Authentication ---
  INVALID_CREDENTIALS: 1001,
  INVALID_ADMIN_CREDENTIALS: 1002,
  TOKEN_EXPIRED: 1003,
  INVALID_TOKEN: 1004,
  INVALID_TOKEN_PAYLOAD: 1005,
  CREDENTIALS_VALIDATION_FAILED: 1006,
  NOT_AUTHENTICATED: 1007,
  INVALID_USER_ID_FORMAT: 1008,
  INACTIVE_USER: 1009,

  // --- 2000 - 2999: Account Status ---
  ACCOUNT_PENDING_APPROVAL: 2001,
  ACCOUNT_SUSPENDED: 2002,
  ACCOUNT_DELETED: 2003,
  CURRENT_PASSWORD_INCORRECT: 2004,
  RESET_TOKEN_INVALID: 2005,
  RESET_TOKEN_EXPIRED: 2006,

  // --- 3000 - 3999: Authorization ---
  ADMIN_REQUIRED: 3001,
  MEMBER_REQUIRED: 3002,
  OWNERSHIP_REQUIRED: 3003,
  PERMISSION_DENIED: 3004,
  DELETE_PERMISSION_DENIED: 3005,

  // --- 4000 - 4999: Validation ---
  VALIDATION_FAILED: 4001,
  DUPLICATE_RESOURCE: 4002,
  INVALID_EMAIL_FORMAT: 4003,
  RECORD_CREATE_FAILED: 4004,
  RECORD_UPDATE_FAILED: 4005,
  RECORD_DELETE_FAILED: 4006,

  // --- 5000 - 5999: Resource Not Found ---
  RESOURCE_NOT_FOUND: 5001,

  // --- 6000 - 6999: System ---
  SYSTEM_ERROR: 6001,
  DATABASE_ERROR: 6002,
  EXTERNAL_SERVICE_ERROR: 6003,

  // --- 10000 - 10999: User Module ---
  USER_NOT_FOUND: 10001,
  USER_ALREADY_EXISTS: 10002,
  BUSINESS_NUMBER_ALREADY_REGISTERED: 10003,
  EMAIL_ALREADY_REGISTERED: 10004,

  // --- 11000 - 11999: Member Module ---
  MEMBER_NOT_FOUND: 11001,
  MEMBER_EMAIL_NOT_FOUND: 11002,
  MEMBER_ALREADY_EXISTS: 11003,
  MEMBER_PROFILE_INCOMPLETE: 11004,

  // --- 12000 - 12999: Project Module ---
  PROJECT_NOT_FOUND: 12001,
  PROJECT_ALREADY_APPLIED: 12002,
  APPLICATION_NOT_FOUND: 12003,
  PROJECT_CLOSED: 12004,
  PROJECT_DEADLINE_PASSED: 12005,

  // --- 13000 - 13999: Upload Module ---
  FILE_NOT_FOUND: 13001,
  FILE_DELETED: 13002,
  FILE_SIZE_EXCEEDED: 13003,
  FILE_EXTENSION_NOT_ALLOWED: 13004,
  FILE_TYPE_NOT_ALLOWED: 13005,
  FILE_UPLOAD_FAILED: 13006,

  // --- 14000 - 14999: Content Module ---
  CONTENT_NOT_FOUND: 14001,
  BANNER_NOT_FOUND: 14002,
  INVALID_CONTENT_TYPE: 14003,

  // --- 15000 - 15999: Messages Module ---
  MESSAGE_NOT_FOUND: 15001,
  MESSAGE_ALREADY_READ: 15002,
  RECIPIENT_NOT_FOUND: 15003,

  // --- 16000 - 16999: Performance Module ---
  PERFORMANCE_RECORD_NOT_FOUND: 16001,
  INVALID_PERFORMANCE_DATA: 16002,

  // --- 17000 - 17999: Support Module ---
  FAQ_NOT_FOUND: 17001,
  INQUIRY_NOT_FOUND: 17002,

  // --- 18000 - 18999: Dashboard Module ---
  DASHBOARD_DATA_UNAVAILABLE: 18001,

  // --- 19000 - 19999: Admin Module ---
  ADMIN_NOT_FOUND: 19001,
  ADMIN_ALREADY_EXISTS: 19002,
};

// Error code to i18n key mapping
export const ERROR_CODE_I18N_MAP = {
  // Authentication
  [ERROR_CODES.INVALID_CREDENTIALS]: 'errors.invalidCredentials',
  [ERROR_CODES.INVALID_ADMIN_CREDENTIALS]: 'errors.invalidAdminCredentials',
  [ERROR_CODES.TOKEN_EXPIRED]: 'errors.tokenExpired',
  [ERROR_CODES.INVALID_TOKEN]: 'errors.invalidToken',
  
  // Account Status
  [ERROR_CODES.ACCOUNT_PENDING_APPROVAL]: 'errors.accountPendingApproval',
  [ERROR_CODES.ACCOUNT_SUSPENDED]: 'errors.accountSuspended',
  [ERROR_CODES.ACCOUNT_DELETED]: 'errors.accountDeleted',
  
  // Authorization
  [ERROR_CODES.ADMIN_REQUIRED]: 'errors.adminRequired',
  [ERROR_CODES.MEMBER_REQUIRED]: 'errors.memberRequired',
  [ERROR_CODES.PERMISSION_DENIED]: 'errors.permissionDenied',
  
  // Project Module
  [ERROR_CODES.PROJECT_NOT_FOUND]: 'projects.notFound',
  [ERROR_CODES.PROJECT_ALREADY_APPLIED]: 'projects.alreadyApplied',
  [ERROR_CODES.APPLICATION_NOT_FOUND]: 'projects.applicationNotFound',
  [ERROR_CODES.PROJECT_CLOSED]: 'projects.closed',
  [ERROR_CODES.PROJECT_DEADLINE_PASSED]: 'projects.deadlinePassed',
  
  // Upload Module
  [ERROR_CODES.FILE_SIZE_EXCEEDED]: 'errors.fileSizeExceeded',
  [ERROR_CODES.FILE_EXTENSION_NOT_ALLOWED]: 'errors.fileExtensionNotAllowed',
  [ERROR_CODES.FILE_UPLOAD_FAILED]: 'errors.fileUploadFailed',
};

// Regex Patterns
export const PATTERNS = {
  // 营业执照号码: 000-00-00000
  BUSINESS_LICENSE: /^\d{3}-\d{2}-\d{5}$/,
  // 法人号码: 000000-0000000
  CORPORATION_NUMBER: /^\d{6}-\d{7}$/,
  // 手机号码: 010-0000-0000
  PHONE: /^\d{2,3}-\d{3,4}-\d{4}$/,
  // 邮箱
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  // URL
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
};

// Local Storage Keys
export const STORAGE_KEYS = {
  LANGUAGE: 'language',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  POPUP_CLOSED_TODAY: 'popup_closed_today',
  DRAFT_PREFIX: 'draft_'
};

// Route Paths
export const ROUTES = {
  // Public
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Member
  MEMBER_HOME: '/member',
  MEMBER_PROFILE: '/member/profile',
  MEMBER_ABOUT: '/member/about',
  MEMBER_PROJECTS: '/member/programs',
  MEMBER_PERFORMANCE: '/member/performance',
  MEMBER_SUPPORT: '/member/support',
  MEMBER_NOTICES: '/member/notices',
  MEMBER_NEWS: '/member/news',
  MEMBER_PROJECT: '/member/project',
  
  // Admin
  ADMIN_HOME: '/admin',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_MEMBERS: '/admin/members',
  ADMIN_PERFORMANCE: '/admin/performance',
  ADMIN_PROJECTS: '/admin/projects',
  ADMIN_CONTENT: '/admin/content',
  ADMIN_REPORTS: '/admin/reports'
};

