/**
 * MSW Handlers for Auth API
 */

import { http, HttpResponse } from 'msw';
import { API_PREFIX, API_BASE_URL } from '@shared/utils/constants';
import { delay, shouldSimulateError, getErrorStatus, loadMockData } from '../config.js';

const BASE_URL = `${API_PREFIX}/auth`;
const FULL_BASE_URL = `${API_BASE_URL}${API_PREFIX}/auth`;

// Mock users database (loaded from data file, can be modified at runtime)
let mockUsers = [];
let usersInitialized = false;

// Initialize users from data file
async function initializeUsers() {
  if (usersInitialized) {
    return mockUsers;
  }
  
  try {
    const data = await loadMockData('auth');
    mockUsers = [...(data.users || [])];
    usersInitialized = true;
  } catch (error) {
    console.error('Failed to load auth users data:', error);
    // Fallback to empty array if data file not found
    mockUsers = [];
    usersInitialized = true;
  }
  
  return mockUsers;
}

// Get users (lazy initialization)
async function getUsers() {
  if (!usersInitialized) {
    await initializeUsers();
  }
  return mockUsers;
}

// Generate JWT-like token (simplified)
function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };
  return btoa(JSON.stringify(payload));
}

// Login handler
async function login(req) {
  await delay();
  
  if (shouldSimulateError(BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  const users = await getUsers();
  const body = await req.request.json();
  const { email, businessLicense, password } = body;
  
  // Find user: admin by email, member by businessLicense
  let user = null;
  
  if (email) {
    // Try to find admin by email
    user = users.find(u => u.email === email && u.password === password);
  } else if (businessLicense) {
    // Try to find member by businessLicense (support both with and without dashes)
    const businessLicenseClean = businessLicense.replace(/-/g, '');
    user = users.find(u => {
      if (!u.businessLicense) return false;
      const userLicense = u.businessLicense.replace(/-/g, '');
      return userLicense === businessLicenseClean && u.password === password;
    });
  }
  
  if (!user) {
    return HttpResponse.json(
      { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' },
      { status: 401 }
    );
  }
  
  // Generate tokens
  const accessToken = generateToken(user);
  const refreshToken = generateToken({ ...user, exp: Math.floor(Date.now() / 1000) + 86400 * 7 }); // 7 days
  
  const userInfo = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    companyName: user.companyName,
    memberId: user.memberId
  };
  
  return HttpResponse.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    user: userInfo
  });
}

// Register handler
async function register(req) {
  await delay();
  
  if (shouldSimulateError(BASE_URL)) {
    return HttpResponse.json(
      { message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: getErrorStatus() }
    );
  }
  
  const users = await getUsers();
  const body = await req.request.json();
  const { email, password, companyName, businessLicense } = body;
  
  // Remove dashes from business license for storage
  const businessLicenseClean = businessLicense ? businessLicense.replace(/-/g, '') : '';
  
  // Check if business license already exists
  if (businessLicenseClean && users.find(u => {
    const userLicense = u.businessLicense ? u.businessLicense.replace(/-/g, '') : '';
    return userLicense === businessLicenseClean;
  })) {
    return HttpResponse.json(
      { message: 'Business license already registered', code: 'BUSINESS_LICENSE_EXISTS' },
      { status: 400 }
    );
  }
  
  // Check if email already exists (if provided)
  if (email && users.find(u => u.email === email)) {
    return HttpResponse.json(
      { message: 'Email already registered', code: 'EMAIL_EXISTS' },
      { status: 400 }
    );
  }
  
  // Create new user
  const newUser = {
    id: users.length + 1,
    email: email || null,
    businessLicense: businessLicenseClean,
    password,
    role: 'member',
    name: body.representativeName || '新用户',
    companyName,
    memberId: users.length
  };
  
  users.push(newUser);
  
  // Generate tokens
  const accessToken = generateToken(newUser);
  const refreshToken = generateToken({ ...newUser, exp: Math.floor(Date.now() / 1000) + 86400 * 7 });
  
  const userInfo = {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name,
    companyName: newUser.companyName,
    memberId: newUser.memberId
  };
  
  return HttpResponse.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    user: userInfo
  }, { status: 201 });
}

// Get current user handler
async function getCurrentUser(req) {
  await delay();
  
  // Extract token from Authorization header
  const authHeader = req.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return HttpResponse.json(
      { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  
  const token = authHeader.replace('Bearer ', '');
  try {
    const users = await getUsers();
    const payload = JSON.parse(atob(token));
    const user = users.find(u => u.id === payload.sub);
    
    if (!user) {
      return HttpResponse.json(
        { message: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      companyName: user.companyName,
      memberId: user.memberId
    });
  } catch (error) {
    return HttpResponse.json(
      { message: 'Invalid token', code: 'INVALID_TOKEN' },
      { status: 401 }
    );
  }
}

// Logout handler
async function logout(req) {
  await delay();
  return HttpResponse.json({ message: 'Logged out successfully' });
}

// Refresh token handler
async function refreshToken(req) {
  await delay();
  
  const body = await req.request.json();
  const { refresh_token } = body;
  
  try {
    const users = await getUsers();
    const payload = JSON.parse(atob(refresh_token));
    const user = users.find(u => u.id === payload.sub);
    
    if (!user) {
      return HttpResponse.json(
        { message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 }
      );
    }
    
    const accessToken = generateToken(user);
    
    return HttpResponse.json({
      access_token: accessToken,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
    });
  } catch (error) {
    return HttpResponse.json(
      { message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' },
      { status: 401 }
    );
  }
}

// Export handlers
// Use absolute paths (MSW best practice)
export const authHandlers = [
  http.post(`${FULL_BASE_URL}/login`, login),
  http.post(`${FULL_BASE_URL}/register`, register),
  http.get(`${FULL_BASE_URL}/me`, getCurrentUser),
  http.post(`${FULL_BASE_URL}/logout`, logout),
  http.post(`${FULL_BASE_URL}/refresh`, refreshToken)
];

