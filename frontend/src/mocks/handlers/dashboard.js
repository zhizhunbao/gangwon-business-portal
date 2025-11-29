/**
 * MSW Handlers for Dashboard API
 */

import { http, HttpResponse } from 'msw';
import { API_PREFIX, API_BASE_URL } from '@shared/utils/constants';
import { delay, loadMockData, shouldSimulateError, getErrorStatus } from '../config.js';

// Base URL for dashboard API (use absolute paths - MSW best practice)
const ADMIN_BASE_URL = `${API_BASE_URL}${API_PREFIX}/admin/dashboard`;
const MEMBER_BASE_URL = `${API_BASE_URL}${API_PREFIX}/member/dashboard`;

// Initialize data on first load
let membersData = null;
let performanceData = null;

async function initializeData() {
  if (!membersData) {
    const members = await loadMockData('members');
    membersData = members.members || [];
  }
  if (!performanceData) {
    const performance = await loadMockData('performance');
    performanceData = performance.performanceRecords || [];
  }
}

// Get admin dashboard stats
async function getAdminDashboardStats(req) {
  await delay();
  
  if (shouldSimulateError(ADMIN_BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  await initializeData();
  
  // Parse query parameters
  const url = new URL(req.request.url);
  const yearParam = url.searchParams.get('year');
  const year = yearParam === 'all' ? 'all' : (yearParam ? parseInt(yearParam, 10) : new Date().getFullYear());
  const quarterParam = url.searchParams.get('quarter');
  const quarter = quarterParam || 'all';
  const businessLicense = url.searchParams.get('businessLicense');
  
  // Calculate stats - only count approved members
  const totalMembers = membersData.filter(m => m.approvalStatus === 'approved').length;
  
  // Filter performance records by year and quarter, and optionally by business license
  let filteredPerformance = performanceData.filter(p => {
    // If year is 'all', don't filter by year
    if (year === 'all') {
      return p.status === 'approved';
    }
    return p.year === year && p.status === 'approved';
  });
  
  // Filter by business license if provided
  if (businessLicense) {
    const member = membersData.find(m => m.businessLicense === businessLicense);
    if (member) {
      filteredPerformance = filteredPerformance.filter(p => p.memberId === member.id);
    } else {
      filteredPerformance = [];
    }
  }
  
  if (quarter !== 'all') {
    if (quarter === 'annual') {
      filteredPerformance = filteredPerformance.filter(p => p.quarter === null || p.quarter === undefined);
    } else if (quarter.startsWith('Q')) {
      const quarterNum = parseInt(quarter.replace('Q', ''), 10);
      filteredPerformance = filteredPerformance.filter(p => p.quarter === quarterNum);
    }
  }
  
  // Calculate stats
  const totalSales = filteredPerformance.reduce((sum, p) => sum + (p.salesRevenue || 0), 0);
  // 雇佣合计使用新雇佣基准 (newHires)
  const totalEmployment = filteredPerformance.reduce((sum, p) => sum + (p.newHires || 0), 0);
  const totalIntellectualProperty = filteredPerformance.reduce((sum, p) => {
    return sum + (p.intellectualProperty?.length || 0);
  }, 0);
  
  // Generate chart data (time series by year and quarter)
  const chartData = generateChartData(performanceData, membersData, year, quarter, businessLicense);
  
  const stats = {
    totalMembers,
    totalSales,
    totalEmployment,
    totalIntellectualProperty
  };
  
  return HttpResponse.json({
    stats,
    chartData,
    year,
    quarter
  });
}

// Generate chart data for dashboard
function generateChartData(performanceData, membersData, selectedYear, selectedQuarter, businessLicense) {
  // Filter approved performance records
  let filteredData = performanceData.filter(p => p.status === 'approved');
  
  // Filter by year if specified
  if (selectedYear !== 'all' && selectedYear !== null && selectedYear !== undefined) {
    filteredData = filteredData.filter(p => p.year === selectedYear);
  }
  
  // Filter by quarter if specified
  if (selectedQuarter !== 'all' && selectedQuarter !== null && selectedQuarter !== undefined) {
    if (selectedQuarter === 'annual') {
      filteredData = filteredData.filter(p => p.quarter === null || p.quarter === undefined);
    } else if (selectedQuarter.startsWith('Q')) {
      const quarterNum = parseInt(selectedQuarter.replace('Q', ''), 10);
      filteredData = filteredData.filter(p => p.quarter === quarterNum);
    }
  }
  
  // Filter by business license if provided
  if (businessLicense) {
    const member = membersData.find(m => m.businessLicense === businessLicense);
    if (member) {
      filteredData = filteredData.filter(p => p.memberId === member.id);
    } else {
      filteredData = [];
    }
  }
  
  // Group by year and quarter
  const dataByPeriod = {};
  filteredData.forEach(p => {
    const key = `${p.year}-Q${p.quarter || 'A'}`;
    if (!dataByPeriod[key]) {
      dataByPeriod[key] = {
        year: p.year,
        quarter: p.quarter,
        sales: 0,
        employment: 0,
        members: new Set(),
        ip: 0
      };
    }
    dataByPeriod[key].sales += p.salesRevenue || 0;
    dataByPeriod[key].employment += p.newHires || 0; // 新雇佣基准
    dataByPeriod[key].members.add(p.memberId);
    dataByPeriod[key].ip += p.intellectualProperty?.length || 0;
  });
  
  // Convert to arrays and sort by year and quarter
  let chartData = Object.values(dataByPeriod)
    .map(item => ({
      period: item.quarter ? `${item.year} Q${item.quarter}` : `${item.year} Annual`,
      year: item.year,
      quarter: item.quarter,
      sales: item.sales,
      employment: item.employment,
      members: item.members.size,
      ip: item.ip
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.quarter === null) return 1;
      if (b.quarter === null) return -1;
      return a.quarter - b.quarter;
    });
  
  // If specific year and quarter are selected, only show that period
  // Otherwise, show all periods that match the filters
  // (This allows showing trends when filtering by year but not quarter)
  
  return {
    members: chartData.map(d => ({ period: d.period, value: d.members })),
    sales: chartData.map(d => ({ period: d.period, value: d.sales })),
    employment: chartData.map(d => ({ period: d.period, value: d.employment })),
    ip: chartData.map(d => ({ period: d.period, value: d.ip })),
    salesEmployment: chartData.map(d => ({
      period: d.period,
      sales: d.sales,
      employment: d.employment
    }))
  };
}

// Get member dashboard stats
async function getMemberDashboardStats(req) {
  await delay();
  
  if (shouldSimulateError(MEMBER_BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  await initializeData();
  
  const memberId = 1; // Mock: current user ID
  
  // Get member's performance records
  const memberPerformance = performanceData.filter(p => p.memberId === memberId);
  
  // Calculate stats
  const projectsParticipated = 3; // Mock: would come from project applications
  const performanceSubmitted = memberPerformance.filter(p => p.status !== 'draft').length;
  const pendingReview = memberPerformance.filter(p => p.status === 'pending' || p.status === 'revision_required').length;
  const documentsUploaded = 15; // Mock: would come from attachments
  
  return HttpResponse.json({
    stats: {
      projectsParticipated,
      performanceSubmitted,
      pendingReview,
      documentsUploaded
    }
  });
}

// Get admin banners (for banner management)
async function getAdminBanners(req) {
  await delay();
  
  const BANNERS_BASE_URL = `${API_BASE_URL}${API_PREFIX}/admin/banners`;
  
  if (shouldSimulateError(BANNERS_BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  // Return banners in the format expected by BannerManagement component
  // Format: { banners: { main: {...}, systemIntro: {...}, ... } }
  const banners = {
    main: {
      image: null,
      url: ''
    },
    systemIntro: {
      image: null,
      url: ''
    },
    projects: {
      image: null,
      url: ''
    },
    performance: {
      image: null,
      url: ''
    },
    support: {
      image: null,
      url: ''
    }
  };
  
  return HttpResponse.json({ banners });
}

// Update admin banner
async function updateAdminBanner(req) {
  await delay();
  
  const BANNERS_BASE_URL = `${API_BASE_URL}${API_PREFIX}/admin/banners`;
  
  if (shouldSimulateError(BANNERS_BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  const { bannerKey } = req.params;
  
  // 从 FormData 中提取数据
  const formData = await req.request.formData();
  const imageFile = formData.get('image');
  const url = formData.get('url') || '';
  
  // 图片验证配置（模拟真实环境）
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  // 如果有图片文件，进行验证和处理
  let imageUrl = null;
  if (imageFile && imageFile instanceof File) {
    // 验证图片类型
    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
      return HttpResponse.json(
        { 
          message: `不支持的图片格式。支持的格式: ${ALLOWED_IMAGE_TYPES.join(', ')}`, 
          code: 'INVALID_IMAGE_TYPE' 
        },
        { status: 400 }
      );
    }
    
    // 验证图片大小
    if (imageFile.size > MAX_IMAGE_SIZE) {
      return HttpResponse.json(
        { 
          message: `图片大小超过限制。最大允许: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`, 
          code: 'IMAGE_TOO_LARGE' 
        },
        { status: 400 }
      );
    }
    
    // 在真实环境中，这里应该上传到存储服务并返回 URL
    // 在 mock 环境中，我们读取为 base64 data URL
    try {
      // 使用更可靠的方法转换 base64（支持大文件）
      const arrayBuffer = await imageFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 分块处理，避免大文件导致的问题
      let binaryString = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, chunk);
      }
      
      const base64 = btoa(binaryString);
      imageUrl = `data:${imageFile.type};base64,${base64}`;
      
    } catch (error) {
      console.error('[MSW] Failed to convert image to base64:', error);
      return HttpResponse.json(
        { 
          message: '图片处理失败，请重试', 
          code: 'IMAGE_PROCESSING_ERROR' 
        },
        { status: 500 }
      );
    }
  }
  
  // In a real implementation, this would save to the database
  // For now, return the updated banner data
  // 注意：如果没有新图片，imageUrl 为 null，前端会保留原有图片
  return HttpResponse.json({
    success: true,
    message: 'Banner updated successfully',
    banner: {
      key: bannerKey,
      image: imageUrl, // 如果有新图片返回新 URL，否则为 null（前端会保留原有图片）
      url: url
    }
  });
}

// Export dashboard metrics (CSV)
async function exportAdminDashboard(req) {
  await delay();
  await initializeData();
  
  const totalMembers = membersData.filter(m => m.approvalStatus === 'approved').length;
  const approvedPerformance = performanceData.filter(p => p.status === 'approved');
  const totalSales = approvedPerformance.reduce((sum, p) => sum + (p.salesRevenue || 0), 0);
  const totalEmployment = approvedPerformance.reduce((sum, p) => sum + (p.newHires || 0), 0);
  const totalIp = approvedPerformance.reduce((sum, p) => sum + (p.intellectualProperty?.length || 0), 0);
  
  const csvRows = [
    'metric,value',
    `total_members,${totalMembers}`,
    `total_sales,${totalSales}`,
    `total_employment,${totalEmployment}`,
    `total_ip,${totalIp}`
  ];
  
  const csvContent = csvRows.join('\n');
  
  return new HttpResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="dashboard_metrics.csv"'
    }
  });
}

// Export handlers
// Use absolute paths (MSW best practice)
export const dashboardHandlers = [
  // Admin: Get dashboard stats
  http.get(`${ADMIN_BASE_URL}`, getAdminDashboardStats),
  http.get(`${ADMIN_BASE_URL}/stats`, getAdminDashboardStats),
  http.get(`${API_BASE_URL}${API_PREFIX}/admin/dashboard`, getAdminDashboardStats),
  http.get(`${ADMIN_BASE_URL}/export`, exportAdminDashboard),
  http.get(`${API_BASE_URL}${API_PREFIX}/admin/dashboard/export`, exportAdminDashboard),
  
  // Admin: Get banners (for banner management)
  http.get(`${API_BASE_URL}${API_PREFIX}/admin/banners`, getAdminBanners),
  
  // Admin: Update banner
  http.post(`${API_BASE_URL}${API_PREFIX}/admin/banners/:bannerKey`, updateAdminBanner),
  http.put(`${API_BASE_URL}${API_PREFIX}/admin/banners/:bannerKey`, updateAdminBanner),
  
  // Member: Get dashboard stats
  http.get(`${MEMBER_BASE_URL}`, getMemberDashboardStats),
  http.get(`${MEMBER_BASE_URL}/stats`, getMemberDashboardStats),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/home/stats`, getMemberDashboardStats),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/dashboard/stats`, getMemberDashboardStats)
];

