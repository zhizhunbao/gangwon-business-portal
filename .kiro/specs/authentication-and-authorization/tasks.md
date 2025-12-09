# Implementation Plan - Authentication and Authorization

## Overview

This implementation plan breaks down the authentication and authorization refactoring into discrete, manageable tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout the migration process.

The plan follows a phased approach:
1. Database schema updates and new models
2. Backend service layer implementation
3. API endpoint updates
4. Frontend integration
5. Testing and validation
6. Cleanup and optimization

All tasks reference specific requirements from the requirements document and are designed to be executed by a coding agent.

---

## Phase 1: Database Schema and Models

- [ ] 1. Database schema migration
  - Create Alembic migration to add role field to members table
  - Add account security fields (failed_login_attempts, account_locked_until, last_login_at, last_login_ip)
  - Make business_number nullable for admin accounts
  - Update existing admin user (business_number = '000-00-00000') to have role = 'admin'
  - Set default role = 'member' for all other existing users
  - _Requirements: 1.1, 2.1_

- [ ] 2. Create token blacklist table
  - Create TokenBlacklist model with fields: id, token, user_id, reason, blacklisted_at, expires_at
  - Add indexes on token, expires_at, and user_id
  - Create Alembic migration for token_blacklist table
  - _Requirements: 3.1, 3.2_

- [ ] 3. Create password history table
  - Create PasswordHistory model with fields: id, member_id, password_hash, created_at
  - Add foreign key relationship to members table
  - Create Alembic migration for password_history table
  - _Requirements: 4.3_

- [ ] 4. Create login attempts table
  - Create LoginAttempt model with fields: id, member_id, identifier, ip_address, user_agent, success, failure_reason, attempted_at
  - Add indexes on identifier, ip_address, and attempted_at
  - Create Alembic migration for login_attempts table
  - _Requirements: 5.1, 5.2, 10.1_

- [ ] 5. Update Member model
  - Add role field with default value 'member'
  - Add account security fields
  - Add relationships to password_history and login_attempts
  - Update model validation to allow NULL business_number for admins
  - _Requirements: 1.1, 2.1_

---

## Phase 2: Backend Service Layer

- [ ] 6. Implement Token Blacklist Service
  - Create `backend/src/modules/user/token_blacklist.py`
  - Implement add_to_blacklist method
  - Implement is_blacklisted method
  - Implement cleanup_expired_tokens method
  - Implement invalidate_user_tokens method
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 6.1 Write property test for token blacklist
  - **Property 10: Logout Blacklists Token**
  - **Property 11: Blacklisted Token Rejection**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 6.2 Write property test for token cleanup
  - **Property 12: Expired Token Cleanup**
  - **Validates: Requirements 3.3**

- [ ] 7. Implement Password Policy Service
  - Create `backend/src/modules/user/password_policy.py`
  - Implement validate_password method (length, complexity checks)
  - Implement add_to_history method
  - Implement check_history method (check last 5 passwords)
  - Implement get_password_requirements method
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 7.1 Write property test for password validation
  - **Property 15: Minimum Password Length**
  - **Property 16: Password Complexity Requirements**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 7.2 Write property test for password history
  - **Property 17: Password History Check**
  - **Validates: Requirements 4.3**

- [ ] 8. Implement Login Attempt Tracker
  - Create `backend/src/modules/user/login_tracker.py`
  - Implement record_failed_attempt method
  - Implement record_successful_login method
  - Implement is_account_locked method (5 attempts in 15 min → 30 min lock)
  - Implement is_ip_blocked method
  - Implement unlock_account method
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ]* 8.1 Write property test for account lockout
  - **Property 20: Account Lockout After Failed Attempts**
  - **Property 24: Failed Attempt Counter Reset**
  - **Validates: Requirements 5.1, 5.5**

- [ ]* 8.2 Write property test for IP tracking
  - **Property 21: Separate Tracking by IP and Account**
  - **Validates: Requirements 5.2**

- [ ] 9. Update AuthService with role-based methods
  - Update is_admin method to check role field (with backward compatibility)
  - Update authenticate method to use role-based checks
  - Update authenticate_admin method to verify role = 'admin'
  - Add get_user_role method
  - Add change_user_role method
  - Integrate TokenBlacklistService for logout
  - Integrate PasswordPolicyService for password validation
  - Integrate LoginAttemptTracker for login attempts
  - _Requirements: 1.2, 1.3, 2.4, 3.1, 4.1, 4.2, 5.1_

- [ ]* 9.1 Write property test for role-based authentication
  - **Property 1: Role Storage and Retrieval**
  - **Property 2: JWT Token Contains Role**
  - **Property 3: Permission Checks Use Role Field**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* 9.2 Write property test for admin authentication
  - **Property 8: Admin Login Verifies Role**
  - **Property 9: Member Access Restriction**
  - **Validates: Requirements 2.4, 2.5**

- [ ] 10. Update AuthService password methods
  - Update get_password_hash to use bcrypt cost factor 12
  - Update change_password to validate new password and check history
  - Update reset_password_with_token to validate new password
  - Add password_history tracking on password changes
  - Invalidate all user tokens on password change
  - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.4_

- [ ]* 10.1 Write property test for password security
  - **Property 13: Password Change Invalidates Tokens**
  - **Property 18: Password Hashing with Bcrypt**
  - **Validates: Requirements 3.4, 4.4**

---

## Phase 3: Authorization and Permissions

- [ ] 11. Update authorization dependencies
  - Update get_current_user to check token blacklist
  - Update get_current_active_user to verify account not locked
  - Create require_admin dependency using role field
  - Create require_member dependency using role field
  - Create require_resource_owner dependency for resource-level permissions
  - _Requirements: 1.3, 2.5, 3.2, 7.1, 7.2, 7.5_

- [ ]* 11.1 Write property test for permission verification
  - **Property 29: Unified Permission Decorator**
  - **Property 30: Authentication and Authorization Verification**
  - **Property 31: Correct HTTP Status Codes**
  - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ]* 11.2 Write property test for resource permissions
  - **Property 33: Resource-Level Permissions**
  - **Validates: Requirements 7.5**

- [ ] 12. Update all protected endpoints to use new dependencies
  - Replace hardcoded admin checks with require_admin dependency
  - Add permission check logging for failures
  - Ensure consistent HTTP status codes (401 for auth, 403 for authz)
  - _Requirements: 7.1, 7.3, 7.4_

- [ ]* 12.1 Write property test for permission logging
  - **Property 32: Permission Failure Logging**
  - **Validates: Requirements 7.4**

---

## Phase 4: API Endpoints

- [ ] 13. Update login endpoint
  - Integrate LoginAttemptTracker to record attempts
  - Check account lockout status before authentication
  - Include role field in JWT token payload
  - Return role in user info response
  - Log successful login with IP and user agent
  - _Requirements: 1.2, 5.1, 10.1_

- [ ]* 13.1 Write property test for login flow
  - **Property 43: Comprehensive Login Logging**
  - **Validates: Requirements 10.1**

- [ ] 14. Update admin login endpoint
  - Verify user role = 'admin' before granting access
  - Include role = 'admin' in JWT token payload
  - Return role in user info response
  - Log admin login attempts
  - _Requirements: 2.4, 10.1_

- [ ]* 14.1 Write property test for admin login
  - **Property 8: Admin Login Verifies Role**
  - **Validates: Requirements 2.4**

- [ ] 15. Update logout endpoint
  - Add token to blacklist with reason 'logout'
  - Log logout event
  - Return success message
  - _Requirements: 3.1, 10.2_

- [ ]* 15.1 Write property test for logout
  - **Property 10: Logout Blacklists Token**
  - **Property 44: Logout Event Logging**
  - **Validates: Requirements 3.1, 10.2**

- [ ] 16. Update token refresh endpoint
  - Check token blacklist before refresh
  - Generate new token with same role
  - Support automatic refresh for tokens expiring within 5 minutes
  - _Requirements: 3.2, 3.5, 6.3_

- [ ]* 16.1 Write property test for token refresh
  - **Property 14: Token Refresh Without Re-authentication**
  - **Property 27: Automatic Token Refresh**
  - **Validates: Requirements 3.5, 6.3**

- [ ] 17. Update register endpoint
  - Validate business number format
  - Check for duplicate business number and email
  - Validate password strength using PasswordPolicyService
  - Set role = 'member' and status = 'pending'
  - Send confirmation email
  - Implement rate limiting (3 attempts per IP per hour)
  - _Requirements: 4.1, 4.2, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 17.1 Write property test for registration
  - **Property 34: Business Number Format Validation**
  - **Property 35: Duplicate Registration Prevention**
  - **Property 36: Pending Status on Registration**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ]* 17.2 Write property test for registration rate limiting
  - **Property 38: Registration Rate Limiting**
  - **Validates: Requirements 8.5**

- [ ] 18. Update password reset endpoints
  - Generate cryptographically secure reset token
  - Set token expiration to 1 hour
  - Send reset email only to verified addresses
  - Invalidate token after use
  - Return generic response regardless of email existence
  - Validate new password strength
  - _Requirements: 4.1, 4.2, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 18.1 Write property test for password reset
  - **Property 39: Secure Reset Token Generation**
  - **Property 40: Reset Token Expiration**
  - **Property 41: Reset Token Single Use**
  - **Property 42: Generic Reset Response**
  - **Validates: Requirements 9.1, 9.2, 9.4, 9.5**

- [ ] 19. Update change password endpoint
  - Verify current password
  - Validate new password strength
  - Check password history
  - Add new password to history
  - Invalidate all user tokens
  - Log password change event
  - _Requirements: 3.4, 4.1, 4.2, 4.3, 10.3_

- [ ]* 19.1 Write property test for password change
  - **Property 13: Password Change Invalidates Tokens**
  - **Property 45: Password Change Logging**
  - **Validates: Requirements 3.4, 10.3**

- [ ] 20. Create admin role management endpoint
  - Create POST /api/admin/users/{user_id}/role endpoint
  - Verify requester is admin
  - Update user role in database
  - Invalidate all user tokens on role change
  - Log role change event
  - _Requirements: 1.5, 10.4_

- [ ]* 20.1 Write property test for role change
  - **Property 4: Role Change Invalidates Tokens**
  - **Property 46: Role Change Logging**
  - **Validates: Requirements 1.5, 10.4**

- [ ] 21. Create admin account unlock endpoint
  - Create POST /api/admin/users/{user_id}/unlock endpoint
  - Verify requester is admin
  - Reset failed_login_attempts to 0
  - Clear account_locked_until
  - Log unlock event
  - _Requirements: 5.4_

- [ ]* 21.1 Write property test for account unlock
  - **Property 23: Admin Account Unlock**
  - **Validates: Requirements 5.4**

- [ ] 22. Create audit log query endpoint
  - Create GET /api/admin/audit-logs endpoint
  - Support filtering by user_id, action, date range
  - Support pagination
  - Return comprehensive log information
  - Require admin role
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]* 22.1 Write property test for audit logs
  - **Property 47: Audit Log Retention**
  - **Validates: Requirements 10.5**

---

## Phase 5: Frontend Integration

- [ ] 23. Update auth service to use role field
  - Update login method to store role from response
  - Update adminLogin method to ensure role = 'admin'
  - Update getCurrentUser to include role
  - Update isAdmin method to check role field instead of business number
  - Update isMember method to check role field
  - _Requirements: 1.2, 1.3, 2.4_

- [ ] 24. Update auth store to manage role
  - Add role field to user state
  - Update setUser action to include role
  - Update clearUser action to clear role
  - Ensure role persists in localStorage
  - _Requirements: 1.2_

- [ ] 25. Update route guards to use role
  - Update AdminRoute to check role = 'admin'
  - Update MemberRoute to check role = 'member'
  - Remove hardcoded business number checks
  - _Requirements: 1.3, 2.5_

- [ ] 26. Update login components
  - Update Login.jsx to handle role in response
  - Update AdminLogin.jsx to handle role in response
  - Display appropriate error messages for account lockout
  - Show generic error for authentication failures
  - _Requirements: 4.5, 5.1_

- [ ] 27. Update registration component
  - Add password strength indicator
  - Validate password complexity client-side
  - Display password requirements
  - Handle rate limiting errors
  - _Requirements: 4.1, 4.2, 8.5_

- [ ] 28. Update password change component
  - Add password strength validation
  - Display password requirements
  - Show password history error if applicable
  - Handle token invalidation (redirect to login)
  - _Requirements: 3.4, 4.1, 4.2, 4.3_

- [ ] 29. Update password reset components
  - Add password strength validation to reset form
  - Display password requirements
  - Handle token expiration errors
  - Show generic success message
  - _Requirements: 4.1, 4.2, 9.2, 9.5_

- [ ] 30. Implement automatic token refresh
  - Add token expiration check in API interceptor
  - Automatically refresh token if expiring within 5 minutes
  - Handle refresh failures (redirect to login)
  - _Requirements: 6.3_

---

## Phase 6: Testing and Validation

- [ ] 31. Run database migrations
  - Execute Alembic migrations in development environment
  - Verify all tables created successfully
  - Verify existing data migrated correctly
  - Verify indexes created
  - _Requirements: 1.1, 2.1, 3.1, 4.3, 5.1_

- [ ] 32. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 33. Run property-based tests
  - Execute all property tests with 100 iterations
  - Verify all 47 properties pass
  - Fix any failing properties
  - _Requirements: All_

- [ ]* 34. Run integration tests
  - Test complete registration → approval → login flow
  - Test password reset flow
  - Test account lockout and unlock flow
  - Test role change and token invalidation
  - Test admin vs member access control
  - _Requirements: All_

- [ ] 35. Manual testing of critical flows
  - Test existing admin login (business_number = '000-00-00000')
  - Test new admin login (with role field)
  - Test member login and access control
  - Test token blacklist functionality
  - Test password policy enforcement
  - Test account lockout and unlock
  - _Requirements: All_

- [ ] 36. Security testing
  - Test rate limiting enforcement
  - Test generic error messages
  - Test token blacklist bypass attempts
  - Test password history bypass attempts
  - Test permission escalation attempts
  - _Requirements: 4.5, 5.1, 8.5, 9.5_

- [ ] 37. Performance testing
  - Measure login response time (target < 500ms)
  - Measure token validation time (target < 50ms)
  - Measure permission check time (target < 10ms)
  - Verify database query performance
  - _Requirements: All_

- [ ] 38. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Cleanup and Optimization

- [ ] 39. Remove backward compatibility code
  - Remove hardcoded business number checks from AuthService
  - Remove hardcoded business number checks from dependencies
  - Remove hardcoded business number checks from frontend
  - Update documentation to reflect role-based system
  - _Requirements: 1.3, 1.4_

- [ ] 40. Implement token blacklist cleanup job
  - Create scheduled task to run cleanup_expired_tokens
  - Schedule to run daily at midnight
  - Log cleanup results
  - _Requirements: 3.3_

- [ ] 41. Optimize database queries
  - Add missing indexes if needed
  - Optimize frequently used queries
  - Implement query result caching
  - _Requirements: All_

- [ ] 42. Add monitoring and alerts
  - Set up metrics collection for authentication events
  - Configure alerts for suspicious activity
  - Set up performance monitoring
  - _Requirements: All_

- [ ] 43. Update documentation
  - Update API documentation with new endpoints
  - Update architecture documentation
  - Create migration guide for other developers
  - Document security best practices
  - _Requirements: All_

