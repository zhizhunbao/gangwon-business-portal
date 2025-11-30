/**
 * Authentication Service
 */

import apiService from './api.service';
import { API_PREFIX, ACCESS_TOKEN_KEY, USER_ROLES } from '@shared/utils/constants';
import { setStorage, getStorage, removeStorage } from '@shared/utils/storage';

class AuthService {
  /**
   * Login
   * 
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.businessNumber - Business number (will be converted to business_number for API)
   * @param {string} credentials.password - Password
   */
  async login(credentials) {
    // Convert businessNumber (camelCase) to business_number (snake_case) for backend API
    const requestData = {
      business_number: credentials.businessNumber || credentials.business_number,
      password: credentials.password
    };
    
    const response = await apiService.post(`${API_PREFIX}/auth/login`, requestData);
    
    if (response.access_token) {
      setStorage(ACCESS_TOKEN_KEY, response.access_token);
      // Backend doesn't return refresh_token or expires_at yet
      // Store user info with role from response
      const userInfo = {
        ...response.user,
        role: response.user.role || 'member' // Default to member if not provided
      };
      setStorage('user_info', userInfo);
    }
    
    return response;
  }
  
  /**
   * Admin Login
   * 
   * @param {Object} credentials - Admin login credentials
   * @param {string} credentials.username - Admin username (business_number)
   * @param {string} credentials.password - Password
   */
  async adminLogin(credentials) {
    const requestData = {
      username: credentials.username || credentials.email, // Support both username and email
      password: credentials.password
    };
    
    const response = await apiService.post(`${API_PREFIX}/auth/admin-login`, requestData);
    
    if (response.access_token) {
      setStorage(ACCESS_TOKEN_KEY, response.access_token);
      const userInfo = {
        ...response.user,
        role: 'admin' // Ensure role is set to admin
      };
      setStorage('user_info', userInfo);
      
      // Return response with updated user info that includes role
      return {
        ...response,
        user: userInfo
      };
    }
    
    return response;
  }

  /**
   * Register
   * 
   * @param {FormData|Object} userData - Registration data (FormData or plain object)
   * @returns {Promise<Object>} Registration response
   */
  async register(userData) {
    // If userData is FormData, we need to extract and process it
    // Otherwise, assume it's already processed
    let registrationData;
    
    if (userData instanceof FormData) {
      // Extract data from FormData
      const data = {};
      const files = {};
      
      for (const [key, value] of userData.entries()) {
        // Check if value is a File object
        if (value instanceof File) {
          files[key] = value;
        } else if (key.endsWith('[]')) {
          // Handle array fields like cooperationFields[]
          const fieldName = key.replace('[]', '');
          if (!data[fieldName]) {
            data[fieldName] = [];
          }
          data[fieldName].push(value);
        } else {
          data[key] = value;
        }
      }
      
      // Upload files first if they exist
      // Note: Currently, file upload requires authentication, so we skip file uploads during registration
      // Backend needs to support file upload during registration (either by creating
      // a special registration upload endpoint or making the upload endpoint support optional auth)
      // For now, files can be uploaded later after user logs in and updates their profile
      let logoFileId = null;
      let certificateFileId = null;
      
      // Skip file uploads during registration (requires authentication)
      // Users can upload files after registration when they log in
      if (files.logo || files.businessLicenseFile) {
        console.info('File uploads will be skipped during registration. Users can upload files after login.');
      }
      
      // Map frontend fields to backend fields
      registrationData = {
        // Step 1: Account information
        business_number: data.businessNumber?.replace(/-/g, '') || data.business_number,
        company_name: data.companyName,
        password: data.password,
        email: data.email,
        
        // Step 2: Company information
        region: data.region || null,
        company_type: data.category || null,
        corporate_number: data.corporationNumber?.replace(/-/g, '') || null,
        address: data.address || null,
        contact_person: data.representativeName || data.contactPersonName || null,
        
        // Step 3: Business information
        industry: data.businessField || null,
        revenue: data.sales ? parseFloat(data.sales.replace(/,/g, '')) : null,
        employee_count: data.employeeCount ? parseInt(data.employeeCount.replace(/,/g, ''), 10) : null,
        founding_date: data.establishedDate || null,
        website: data.websiteUrl || null,
        main_business: data.mainBusiness || null,
        
        // Step 4: File uploads (file IDs from upload endpoint)
        logo_file_id: logoFileId,
        certificate_file_id: certificateFileId,
        
        // Step 5: Terms agreement
        terms_agreed: !!(data.termsOfService && data.privacyPolicy && data.thirdPartySharing)
      };
    } else {
      // Already processed data
      registrationData = userData;
    }
    
    // Send registration request as JSON
    const response = await apiService.post(`${API_PREFIX}/auth/register`, registrationData);
    return response;
  }
  
  /**
   * Logout
   */
  async logout() {
    try {
      await apiService.post(`${API_PREFIX}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }
  
  /**
   * Refresh token
   */
  async refreshToken() {
    const refreshToken = getStorage('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await apiService.post(`${API_PREFIX}/auth/refresh`, {
      refresh_token: refreshToken
    });
    
    if (response.access_token) {
      setStorage(ACCESS_TOKEN_KEY, response.access_token);
      setStorage('token_expiry', response.expires_at);
    }
    
    return response;
  }
  
  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await apiService.get(`${API_PREFIX}/auth/me`);
    setStorage('user_info', response);
    return response;
  }
  
  /**
   * Update profile
   */
  async updateProfile(userData) {
    const response = await apiService.put(`${API_PREFIX}/auth/profile`, userData);
    setStorage('user_info', response);
    return response;
  }
  
  /**
   * Change password
   */
  async changePassword(passwordData) {
    return await apiService.post(`${API_PREFIX}/auth/change-password`, passwordData);
  }
  
  /**
   * Forgot password (Request password reset)
   * 
   * @param {Object} data - Password reset request data
   * @param {string} data.businessNumber - Business number (will be converted to business_number for API)
   * @param {string} data.email - Email address
   */
  async forgotPassword(data) {
    // Convert businessNumber (camelCase) to business_number (snake_case) for backend API
    const requestData = {
      business_number: data.businessNumber?.replace(/-/g, '') || data.business_number,
      email: data.email
    };
    
    return await apiService.post(`${API_PREFIX}/auth/password-reset-request`, requestData);
  }
  
  /**
   * Reset password (Complete password reset with token)
   * 
   * @param {string} token - Reset token from email
   * @param {string} newPassword - New password
   */
  async resetPassword(token, newPassword) {
    return await apiService.post(`${API_PREFIX}/auth/password-reset`, {
      token,
      new_password: newPassword
    });
  }
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = getStorage(ACCESS_TOKEN_KEY);
    const expiry = getStorage('token_expiry');
    
    if (!token) return false;
    if (!expiry) return true; // If no expiry, assume token is valid
    
    const expiryDate = new Date(expiry);
    return expiryDate > new Date();
  }
  
  /**
   * Get current user from storage
   */
  getCurrentUserFromStorage() {
    return getStorage('user_info');
  }
  
  /**
   * Check if user has role
   */
  hasRole(role) {
    const user = this.getCurrentUserFromStorage();
    return user?.role === role;
  }
  
  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.hasRole(USER_ROLES.ADMIN);
  }
  
  /**
   * Check if user is member
   */
  isMember() {
    return this.hasRole(USER_ROLES.MEMBER);
  }
  
  /**
   * Clear authentication data
   */
  clearAuth() {
    removeStorage(ACCESS_TOKEN_KEY);
    removeStorage('refresh_token');
    removeStorage('user_info');
    removeStorage('token_expiry');
  }
}

export default new AuthService();

