/**
 * MSW Handlers for Content API (Banners, Notices, News, etc.)
 */

import { http, HttpResponse } from 'msw';
import { API_PREFIX, API_BASE_URL } from '@shared/utils/constants';
import { delay, loadMockData, shouldSimulateError, getErrorStatus, getCurrentLanguage } from '../config.js';

// Base URL for content API (use absolute paths - MSW best practice)
const BASE_URL = `${API_BASE_URL}${API_PREFIX}/content`;
const ADMIN_BASE_URL = `${API_BASE_URL}${API_PREFIX}/admin/content`;

let cachedContentData = null;
let cachedContentLanguage = null;

async function ensureContentData() {
  const language = getCurrentLanguage();
  if (!cachedContentData || cachedContentLanguage !== language) {
    const data = await loadMockData('content');
    cachedContentData = {
      banners: [...(data.banners || [])],
      popups: [...(data.popups || [])],
      news: [...(data.news || [])],
      faqs: [...(data.faqs || [])],
      about: data.about || null
    };
    cachedContentLanguage = language;
  }
  return cachedContentData;
}

// Get active banners (member)
async function getActiveBanners(req) {
  await delay();
  
  if (shouldSimulateError(BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  const contentData = await ensureContentData();
  
  console.log('[MSW Content] Loading banners, total:', contentData.banners.length);
  
  const now = new Date();
  const activeBanners = contentData.banners.filter(banner => {
    if (!banner.isActive) {
      console.log('[MSW Content] Banner', banner.id, 'is not active');
      return false;
    }
    
    // In development/mock environment, skip date filtering for easier testing
    // Uncomment the following lines if you want to enable date filtering
    /*
    const startDate = new Date(banner.startDate);
    const endDate = new Date(banner.endDate);
    
    if (now < startDate || now > endDate) {
      console.log('[MSW Content] Banner', banner.id, 'is outside date range:', startDate, 'to', endDate);
      return false;
    }
    */
    
    return true;
  });
  
  console.log('[MSW Content] Active banners after filtering:', activeBanners.length);
  
  // Sort by order
  activeBanners.sort((a, b) => (a.order || 0) - (b.order || 0));
  
  console.log('[MSW Content] Returning banners:', activeBanners.map(b => ({ id: b.id, type: b.type, title: b.title })));
  
  return HttpResponse.json({ banners: activeBanners });
}

// Get active popups (member)
async function getActivePopups(req) {
  await delay();
  
  const contentData = await ensureContentData();
  const now = new Date();
  
  const activePopups = contentData.popups.filter((popup) => {
    if (!popup.isActive) return false;
    if (popup.startDate && now < new Date(popup.startDate)) return false;
    if (popup.endDate && now > new Date(popup.endDate)) return false;
    return true;
  });
  
  return HttpResponse.json({ popups: activePopups });
}

// Get latest notices/news (member)
async function getLatestNotices(req) {
  await delay();
  
  const contentData = await ensureContentData();
  
  const url = new URL(req.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '5', 10);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('page_size') || limit.toString(), 10);
  const category = url.searchParams.get('category'); // 'announcement' or 'news' or null
  
  console.log('[MSW Content] Loading notices, page:', page, 'pageSize:', pageSize, 'category:', category);
  console.log('[MSW Content] Total news:', contentData.news.length);
  
  // Get published news/notices
  let publishedNews = contentData.news.filter(n => n.isPublished);
  
  // Filter by category if provided
  if (category) {
    publishedNews = publishedNews.filter(n => n.category === category);
    console.log('[MSW Content] After category filter:', publishedNews.length);
  }
  
  // Sort by published date (newest first)
  publishedNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Calculate pagination
  const totalCount = publishedNews.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedNews = publishedNews.slice(startIndex, endIndex);
  
  console.log('[MSW Content] Published news after filtering:', paginatedNews.length, 'of', totalCount);
  console.log('[MSW Content] Returning notices:', paginatedNews.map(n => ({ id: n.id, title: n.title, category: n.category })));
  
  return HttpResponse.json({ 
    notices: paginatedNews,
    totalCount: totalCount,
    pagination: {
      page: page,
      pageSize: pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  });
}

// Get all banners (admin)
async function getAllBanners(req) {
  await delay();
  
  const contentData = await ensureContentData();
  
  return HttpResponse.json({ banners: contentData.banners });
}

// Admin: Get all popups
async function getAllPopups(req) {
  await delay();
  
  const contentData = await ensureContentData();
  return HttpResponse.json({ popups: contentData.popups });
}

async function createPopup(req) {
  await delay(200);
  
  const contentData = await ensureContentData();
  const body = await req.request.json();
  
  const now = new Date().toISOString();
  const nextId = contentData.popups.length > 0
    ? Math.max(...contentData.popups.map(p => p.id)) + 1
    : 1;
  
  const newPopup = {
    id: nextId,
    title: body.title,
    content: body.content,
    imageUrl: body.imageUrl || null,
    linkUrl: body.linkUrl || null,
    width: body.width || 600,
    height: body.height || 400,
    position: body.position || 'center',
    isActive: body.isActive ?? true,
    startDate: body.startDate || new Date().toISOString(),
    endDate: body.endDate || null,
    createdAt: now,
    updatedAt: now
  };
  
  contentData.popups.push(newPopup);
  return HttpResponse.json({ popup: newPopup }, { status: 201 });
}

async function updatePopup(req) {
  await delay(200);
  
  const contentData = await ensureContentData();
  const { id } = req.params;
  const body = await req.request.json();
  
  const index = contentData.popups.findIndex(p => p.id === parseInt(id, 10));
  if (index === -1) {
    return HttpResponse.json(
      { message: 'Popup not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
  
  const updatedPopup = {
    ...contentData.popups[index],
    ...body,
    updatedAt: new Date().toISOString()
  };
  
  contentData.popups[index] = updatedPopup;
  return HttpResponse.json({ popup: updatedPopup });
}

async function deletePopup(req) {
  await delay(150);
  
  const contentData = await ensureContentData();
  const { id } = req.params;
  const index = contentData.popups.findIndex(p => p.id === parseInt(id, 10));
  
  if (index === -1) {
    return HttpResponse.json(
      { message: 'Popup not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
  
  const [removed] = contentData.popups.splice(index, 1);
  return HttpResponse.json({ success: true, popup: removed });
}

// Get all news/notices (admin)
async function getAllNews(req) {
  await delay();
  
  const contentData = await ensureContentData();
  
  return HttpResponse.json({ news: contentData.news });
}

// Get single news/notice
async function getNewsById(req) {
  await delay();
  
  const contentData = await ensureContentData();
  
  const { id } = req.params;
  const news = contentData.news.find(n => n.id === parseInt(id, 10));
  
  if (!news) {
    return HttpResponse.json(
      { message: 'News not found', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }
  
  return HttpResponse.json({ news });
}

// Get single notice by ID (alias for getNewsById)
async function getNoticeById(req) {
  return getNewsById(req);
}

// Get about page content
async function getAboutContent(req) {
  await delay();
  
  const contentData = await ensureContentData();
  
  return HttpResponse.json({ about: contentData.about });
}

// Get FAQs
async function getFAQs(req) {
  await delay();
  
  const contentData = await ensureContentData();
  
  const url = new URL(req.request.url);
  const category = url.searchParams.get('category');
  
  let faqs = contentData.faqs.filter(f => f.isPublished);
  
  if (category) {
    faqs = faqs.filter(f => f.category === category);
  }
  
  // Sort by order
  faqs.sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return HttpResponse.json({ 
    records: faqs,
    faqs: faqs 
  });
}

// Initialize settings data based on current language
async function initializeSettingsData() {
  const settingsData = await loadMockData('settings');
  
  return {
    terms: [...(settingsData.terms || [])]
  };
}

// Get terms by type (terms_of_service or privacy_policy)
async function getTermByType(req) {
  await delay();
  
  const settingsData = await initializeSettingsData();
  
  const url = new URL(req.request.url);
  const type = url.searchParams.get('type');
  
  if (!type) {
    return HttpResponse.json(
      { message: 'Type parameter is required', code: 'INVALID_PARAMETER' },
      { status: 400 }
    );
  }
  
  const term = settingsData.terms.find(t => t.type === type && t.isActive);
  
  if (!term) {
    return HttpResponse.json(
      { message: 'Term not found', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }
  
  return HttpResponse.json({ term });
}

// Export handlers
// Use absolute paths (MSW best practice)
export const contentHandlers = [
  // Member: Get active banners
  http.get(`${BASE_URL}/banners`, getActiveBanners),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/banners`, getActiveBanners),
  http.get(`${API_BASE_URL}${API_PREFIX}/content/banners`, getActiveBanners),
  
  // Member: Get active popups
  http.get(`${BASE_URL}/popups`, getActivePopups),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/popups`, getActivePopups),
  
  // Member: Get latest notices
  http.get(`${BASE_URL}/notices`, getLatestNotices),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/notices`, getLatestNotices),
  http.get(`${API_BASE_URL}${API_PREFIX}/content/notices`, getLatestNotices),
  
  // Member: Get single news/notice
  http.get(`${BASE_URL}/news/:id`, getNewsById),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/news/:id`, getNewsById),
  http.get(`${API_BASE_URL}${API_PREFIX}/content/news/:id`, getNewsById),
  
  // Member: Get single notice by ID
  http.get(`${BASE_URL}/notices/:id`, getNoticeById),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/notices/:id`, getNoticeById),
  http.get(`${API_BASE_URL}${API_PREFIX}/content/notices/:id`, getNoticeById),
  
  // Member: Get about content
  http.get(`${BASE_URL}/about`, getAboutContent),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/about`, getAboutContent),
  
  // Member: Get FAQs
  http.get(`${BASE_URL}/faqs`, getFAQs),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/faqs`, getFAQs),
  
  // Member: Get terms by type (terms_of_service or privacy_policy)
  http.get(`${BASE_URL}/terms`, getTermByType),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/terms`, getTermByType),
  
  // Admin: Get all banners
  http.get(`${ADMIN_BASE_URL}/banners`, getAllBanners),
  
  // Admin: Manage popups
  http.get(`${ADMIN_BASE_URL}/popups`, getAllPopups),
  http.post(`${ADMIN_BASE_URL}/popups`, createPopup),
  http.put(`${ADMIN_BASE_URL}/popups/:id`, updatePopup),
  http.patch(`${ADMIN_BASE_URL}/popups/:id`, updatePopup),
  http.delete(`${ADMIN_BASE_URL}/popups/:id`, deletePopup),
  
  // Admin: Get all news
  http.get(`${ADMIN_BASE_URL}/news`, getAllNews)
];

