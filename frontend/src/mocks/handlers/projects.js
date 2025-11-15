/**
 * MSW Handlers for Projects API
 */

import { http, HttpResponse } from 'msw';
import { API_PREFIX, API_BASE_URL } from '@shared/utils/constants';
import { delay, loadMockData, shouldSimulateError, getErrorStatus } from '../config.js';

// Base URL for projects API (use absolute paths - MSW best practice)
const BASE_URL = `${API_BASE_URL}${API_PREFIX}/projects`;
const ADMIN_BASE_URL = `${API_BASE_URL}${API_PREFIX}/admin/projects`;

// In-memory storage for projects (simulates database)
let projectsData = null;
let applicationsData = null;

// Initialize data on first load
async function initializeData() {
  if (!projectsData) {
    const data = await loadMockData('projects');
    projectsData = [...data.projects];
    applicationsData = [...data.projectApplications];
  }
}

// Get all projects (admin - includes drafts)
async function getAllProjects(req) {
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
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('page_size') || '10', 10);
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  
  let filteredProjects = [...projectsData];
  
  // Apply filters
  if (status) {
    filteredProjects = filteredProjects.filter(p => p.status === status);
  }
  if (type) {
    filteredProjects = filteredProjects.filter(p => p.type === type);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProjects = filteredProjects.filter(p => 
      p.title.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by updatedAt descending (newest first)
  filteredProjects.sort((a, b) => 
    new Date(b.updatedAt) - new Date(a.updatedAt)
  );
  
  // Pagination
  const total = filteredProjects.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedProjects = filteredProjects.slice(start, end);
  
  return HttpResponse.json({
    projects: paginatedProjects,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  });
}

// Get published projects (member - only published and active)
async function getPublishedProjects(req) {
  await delay();
  
  if (shouldSimulateError(BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  await initializeData();
  
  // Parse query parameters
  const url = new URL(req.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('page_size') || '10', 10);
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  
  // Filter: only published projects with status 'recruiting' or 'ongoing'
  let filteredProjects = projectsData.filter(p => 
    p.isPublished === true
  ).filter(p =>
    (p.status === 'recruiting' || p.status === 'ongoing')
  );
  
  // Apply additional filters
  if (status) {
    filteredProjects = filteredProjects.filter(p => p.status === status);
  }
  if (type) {
    filteredProjects = filteredProjects.filter(p => p.type === type);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProjects = filteredProjects.filter(p => 
      p.title.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by publishedAt descending (newest first)
  filteredProjects.sort((a, b) => 
    new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)
  );
  
  // Pagination
  const total = filteredProjects.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedProjects = filteredProjects.slice(start, end);
  
  return HttpResponse.json({
    projects: paginatedProjects,
    totalCount: total,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  });
}

// Get project by ID
async function getProjectById(req) {
  await delay();
  
  await initializeData();
  
  const { id } = req.params;
  const project = projectsData.find(p => p.id === parseInt(id, 10));
  
  if (!project) {
    return HttpResponse.json(
      { message: 'Project not found', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }
  
  // Check if member can access (must be published)
  const url = new URL(req.request.url);
  const isAdmin = url.pathname.includes('/admin/');
  
  if (!isAdmin && project.isPublished !== true) {
    return HttpResponse.json(
      { message: 'Project not found', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }
  
  return HttpResponse.json({ project });
}

// Create project (admin only)
async function createProject(req) {
  await delay(500); // Simulate slower creation
  
  if (shouldSimulateError(ADMIN_BASE_URL)) {
    return HttpResponse.json(
      { message: 'Failed to create project', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  await initializeData();
  
  const body = await req.request.json();
  
  // Generate new ID
  const newId = Math.max(...projectsData.map(p => p.id), 0) + 1;
  
  const now = new Date().toISOString();
  const newProject = {
    id: newId,
    ...body,
    views: 0,
    applicationsCount: 0,
    isPublished: false,
    publishedAt: null,
    createdBy: 1, // Mock admin user ID
    createdAt: now,
    updatedAt: now
  };
  
  projectsData.push(newProject);
  
  return HttpResponse.json(
    { project: newProject },
    { status: 201 }
  );
}

// Update project (admin only)
async function updateProject(req) {
  await delay(400);
  
  if (shouldSimulateError(ADMIN_BASE_URL)) {
    return HttpResponse.json(
      { message: 'Failed to update project', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  await initializeData();
  
  const { id } = req.params;
  const body = await req.request.json();
  
  const index = projectsData.findIndex(p => p.id === parseInt(id, 10));
  
  if (index === -1) {
    return HttpResponse.json(
      { message: 'Project not found', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }
  
  const updatedProject = {
    ...projectsData[index],
    ...body,
    updatedAt: new Date().toISOString()
  };
  
  // If publishing for the first time, set publishedAt
  if (body.isPublished === true && !projectsData[index].isPublished) {
    updatedProject.publishedAt = new Date().toISOString();
  }
  
  projectsData[index] = updatedProject;
  
  return HttpResponse.json({ project: updatedProject });
}

// Delete project (admin only)
async function deleteProject(req) {
  await delay(300);
  
  if (shouldSimulateError(ADMIN_BASE_URL)) {
    return HttpResponse.json(
      { message: 'Failed to delete project', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  await initializeData();
  
  const { id } = req.params;
  const index = projectsData.findIndex(p => p.id === parseInt(id, 10));
  
  if (index === -1) {
    return HttpResponse.json(
      { message: 'Project not found', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }
  
  projectsData.splice(index, 1);
  
  // Also remove related applications
  applicationsData = applicationsData.filter(app => app.projectId !== parseInt(id, 10));
  
  return HttpResponse.json(
    { message: 'Project deleted successfully' },
    { status: 200 }
  );
}

// Get project applications (admin only)
async function getProjectApplications(req) {
  await delay();
  
  await initializeData();
  
  const { id } = req.params;
  const url = new URL(req.request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('page_size') || '10', 10);
  const status = url.searchParams.get('status');
  
  let filteredApplications = applicationsData.filter(
    app => app.projectId === parseInt(id, 10)
  );
  
  if (status) {
    filteredApplications = filteredApplications.filter(app => app.status === status);
  }
  
  // Sort by applicationDate descending
  filteredApplications.sort((a, b) => 
    new Date(b.applicationDate) - new Date(a.applicationDate)
  );
  
  const total = filteredApplications.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedApplications = filteredApplications.slice(start, end);
  
  return HttpResponse.json({
    applications: paginatedApplications,
    pagination: {
      page,
      pageSize,
      total,
      totalPages
    }
  });
}

// Submit project application (member)
async function submitProjectApplication(req) {
  await delay(500);
  
  if (shouldSimulateError(`${BASE_URL}/:id/applications`)) {
    return HttpResponse.json(
      { message: 'Failed to submit application', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  await initializeData();
  
  const { id } = req.params;
  
  // Check if project exists and is published
  const project = projectsData.find(p => p.id === parseInt(id, 10));
  
  if (!project) {
    return HttpResponse.json(
      { message: 'Project not found', code: 'NOT_FOUND_ERROR' },
      { status: 404 }
    );
  }
  
  if (!project.isPublished || (project.status !== 'recruiting' && project.status !== 'ongoing')) {
    return HttpResponse.json(
      { message: 'Project is not accepting applications', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  // Check if recruitment period is valid
  const now = new Date();
  const recruitmentStart = new Date(project.recruitmentStartDate);
  const recruitmentEnd = new Date(project.recruitmentEndDate);
  
  if (now < recruitmentStart || now > recruitmentEnd) {
    return HttpResponse.json(
      { message: 'Application period has ended', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  // Handle FormData (file uploads)
  let attachments = [];
  const contentType = req.request.headers.get('content-type') || '';
  
  if (contentType.includes('multipart/form-data')) {
    // In MSW, we can't directly parse FormData, but we can simulate it
    // In a real implementation, files would be uploaded and saved to /upload/企业ID/公告板/
    const formData = await req.request.formData();
    const files = formData.getAll('attachments');
    attachments = files.map((file, index) => ({
      id: index + 1,
      name: file.name,
      size: file.size,
      type: file.type,
      url: `/upload/mock/member_1/公告板/${Date.now()}_${file.name}` // Mock path
    }));
  } else {
    // Handle JSON body (for backward compatibility)
    const body = await req.request.json();
    attachments = body.attachments || [];
  }
  
  // Validate attachments (max 5)
  if (attachments.length === 0) {
    return HttpResponse.json(
      { message: 'At least one attachment is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  if (attachments.length > 5) {
    return HttpResponse.json(
      { message: 'Maximum 5 attachments allowed', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  
  // Generate new application ID
  const newAppId = Math.max(...applicationsData.map(a => a.id), 0) + 1;
  
  const newApplication = {
    id: newAppId,
    projectId: parseInt(id, 10),
    memberId: 1, // Mock member ID (should come from auth token)
    status: 'pending', // 受理状态：待审核
    applicationDate: new Date().toISOString(),
    attachments: attachments,
    reviewer: null,
    reviewedAt: null,
    reviewComment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  applicationsData.push(newApplication);
  
  // Update project applications count
  const projectIndex = projectsData.findIndex(p => p.id === parseInt(id, 10));
  if (projectIndex !== -1) {
    projectsData[projectIndex].applicationsCount += 1;
  }
  
  return HttpResponse.json(
    { 
      success: true,
      application: newApplication,
      message: 'Application submitted successfully'
    },
    { status: 201 }
  );
}

// Export handlers
// Use absolute paths (MSW best practice)
export const projectsHandlers = [
  // Admin: Get all projects (including drafts)
  http.get(`${ADMIN_BASE_URL}`, getAllProjects),
  
  // Admin: Get single project
  http.get(`${ADMIN_BASE_URL}/:id`, getProjectById),
  
  // Admin: Create project
  http.post(`${ADMIN_BASE_URL}`, createProject),
  
  // Admin: Update project
  http.put(`${ADMIN_BASE_URL}/:id`, updateProject),
  http.patch(`${ADMIN_BASE_URL}/:id`, updateProject),
  
  // Admin: Delete project
  http.delete(`${ADMIN_BASE_URL}/:id`, deleteProject),
  
  // Admin: Get project applications
  http.get(`${ADMIN_BASE_URL}/:id/applications`, getProjectApplications),
  
  // Member: Get published projects
  http.get(`${BASE_URL}`, getPublishedProjects),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/projects`, getPublishedProjects),
  
  // Member: Get single project (published only)
  http.get(`${BASE_URL}/:id`, getProjectById),
  http.get(`${API_BASE_URL}${API_PREFIX}/member/projects/:id`, getProjectById),
  
  // Member: Submit project application
  http.post(`${BASE_URL}/:id/applications`, submitProjectApplication),
  http.post(`${API_BASE_URL}${API_PREFIX}/member/projects/:id/applications`, submitProjectApplication)
];

