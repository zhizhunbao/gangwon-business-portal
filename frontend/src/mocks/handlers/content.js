/**
 * MSW Handlers for Content API (Banners, Notices, News, etc.)
 */

import { http, HttpResponse } from 'msw';
import { API_PREFIX, API_BASE_URL } from '@shared/utils/constants';
import { delay, loadMockData, shouldSimulateError, getErrorStatus, getCurrentLanguage } from '../config.js';

// Base URL for content API (use absolute paths - MSW best practice)
const BASE_URL = `${API_BASE_URL}${API_PREFIX}/content`;
const ADMIN_BASE_URL = `${API_BASE_URL}${API_PREFIX}/admin/content`;

// Initialize data based on current language (no cache - always load fresh)
async function initializeData() {
  const data = await loadMockData('content');
  
  return {
    banners: [...(data.banners || [])],
    popups: [...(data.popups || [])],
    news: [...(data.news || [])],
    faqs: [...(data.faqs || [])],
    about: data.about || null
  };
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
  
  const contentData = await initializeData();
  
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

// Get latest notices/news (member)
async function getLatestNotices(req) {
  await delay();
  
  const contentData = await initializeData();
  
  const url = new URL(req.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '5', 10);
  
  console.log('[MSW Content] Loading notices, limit:', limit);
  console.log('[MSW Content] Total news:', contentData.news.length);
  
  // Get published news/notices
  const publishedNews = contentData.news
    .filter(n => n.isPublished)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);
  
  console.log('[MSW Content] Published news after filtering:', publishedNews.length);
  console.log('[MSW Content] Returning notices:', publishedNews.map(n => ({ id: n.id, title: n.title })));
  
  return HttpResponse.json({ notices: publishedNews });
}

// Get all banners (admin)
async function getAllBanners(req) {
  await delay();
  
  const contentData = await initializeData();
  
  return HttpResponse.json({ banners: contentData.banners });
}

// Get all news/notices (admin)
async function getAllNews(req) {
  await delay();
  
  const contentData = await initializeData();
  
  return HttpResponse.json({ news: contentData.news });
}

// Get single news/notice
async function getNewsById(req) {
  await delay();
  
  const contentData = await initializeData();
  
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

// Get about page content
async function getAboutContent(req) {
  await delay();
  
  const contentData = await initializeData();
  
  return HttpResponse.json({ about: contentData.about });
}

// Get FAQs
async function getFAQs(req) {
  await delay();
  
  const contentData = await initializeData();
  
  const url = new URL(req.request.url);
  const category = url.searchParams.get('category');
  
  let faqs = contentData.faqs.filter(f => f.isPublished);
  
  if (category) {
    faqs = faqs.filter(f => f.category === category);
  }
  
  // Sort by order
  faqs.sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return HttpResponse.json({ faqs });
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
  
  // Member: Get latest notices
  http.get(`${BASE_URL}/notices`, getLatestNotices),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/notices`, getLatestNotices),
  http.get(`${API_BASE_URL}${API_PREFIX}/content/notices`, getLatestNotices),
  
  // Member: Get single news/notice
  http.get(`${BASE_URL}/news/:id`, getNewsById),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/news/:id`, getNewsById),
  
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
  
  // Admin: Get all news
  http.get(`${ADMIN_BASE_URL}/news`, getAllNews)
];

