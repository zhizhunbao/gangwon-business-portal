# Requirements Document

## Introduction

This specification defines the requirements for upgrading a Korean business platform system to improve user experience, authentication flows, and administrative functionality. The upgrade focuses on login/registration processes, form validation, file handling, and administrative user management.

## Glossary

- **Platform**: The Korean business platform system consisting of frontend and backend components
- **Member**: Regular business users who register with business registration numbers
- **Admin**: Administrative users who manage the platform
- **Super_Admin**: Highest level administrative user who can approve other admin accounts
- **Business_Registration_Number**: Korean business registration number (사업자등록번호)
- **Authentication_Guard**: Frontend routing protection mechanism for login-required pages
- **Approval_Status**: Account status indicating whether an account is approved for use

## Requirements

### Requirement 1

**User Story:** As a platform visitor, I want clear authentication status indication, so that I understand whether I'm logged in and what actions are available to me.

#### Acceptance Criteria

1. WHEN a user is not logged in, THE Platform SHALL display header, menu, and profile UI in non-authenticated state
2. WHEN a user clicks login-required menu items while not authenticated, THE Platform SHALL redirect to login page or display login popup
3. WHEN a user accesses protected pages without authentication, THE Platform SHALL display login layer popup consistently
4. WHEN an admin accesses admin login page, THE Platform SHALL hide member registration links and display admin-specific guidance
5. THE Platform SHALL display "Need admin account? Contact system administrator" message on admin login page

### Requirement 2

**User Story:** As a business member, I want real-time validation during registration, so that I can correct errors immediately and complete registration successfully.

#### Acceptance Criteria

1. WHEN a user enters a business registration number, THE Platform SHALL check for duplicates in real-time and display status message
2. WHEN a user enters an email address, THE Platform SHALL validate format and check for duplicates in real-time
3. WHEN a user enters passwords, THE Platform SHALL validate password policy compliance and confirm password matching in real-time
4. WHEN validation fails for any field, THE Platform SHALL prevent form submission until all validations pass
5. THE Platform SHALL display validation messages using internationalized text constants

### Requirement 3

**User Story:** As a business member, I want intuitive form interactions during registration, so that I can complete the process efficiently without confusion.

#### Acceptance Criteria

1. WHEN a user selects an address from address search popup, THE Platform SHALL auto-populate address fields and close the popup automatically
2. WHEN a user clicks date input field or calendar icon, THE Platform SHALL open the same calendar interface consistently
3. WHEN a user inputs dates, THE Platform SHALL accept both manual typing and calendar selection with YYYY-MM-DD format validation
4. WHEN a user removes an uploaded file, THE Platform SHALL clear both file state and display text immediately
5. THE Platform SHALL allow re-uploading files with the same name after removal

### Requirement 4

**User Story:** As a business member, I want flexible phone number input, so that I can enter my contact information in my preferred format.

#### Acceptance Criteria

1. THE Platform SHALL accept phone numbers without automatic formatting
2. THE Platform SHALL allow numeric and special characters in phone number fields
3. THE Platform SHALL provide format examples as placeholder text or help text
4. WHEN a user enters phone numbers, THE Platform SHALL validate basic format rules without enforcing specific patterns

### Requirement 5

**User Story:** As a business member with pending approval, I want clear feedback about my account status, so that I understand why I cannot access the platform.

#### Acceptance Criteria

1. WHEN a user with pending approval attempts to login, THE Platform SHALL display clear warning message about approval requirement
2. WHEN registration is completed, THE Platform SHALL redirect to main page instead of login page
3. WHEN a pending user attempts login, THE Platform SHALL display modal with "Login available after admin approval" message
4. THE Platform SHALL differentiate between authentication failure and approval pending status in backend responses
5. THE Platform SHALL manage post-registration redirect paths and messages through configuration constants

### Requirement 6

**User Story:** As a platform user, I want consistent authentication protection across all restricted areas, so that I have a uniform experience when accessing protected content.

#### Acceptance Criteria

1. WHEN a user accesses login-required menus while unauthenticated, THE Platform SHALL apply common login guard with popup layer
2. THE Platform SHALL implement authentication guard at router level or server response level consistently
3. WHEN server returns 401 or 403 responses, THE Platform SHALL handle them uniformly across all protected pages
4. THE Platform SHALL apply the same authentication flow to all protected routes and components

### Requirement 7

**User Story:** As a super admin, I want to manage admin accounts through a registration and approval process, so that I can control platform administrative access.

#### Acceptance Criteria

1. WHEN an admin registers, THE Platform SHALL create account with pending approval status
2. WHEN admin registration is submitted, THE Platform SHALL validate email uniqueness across both admin and member accounts
3. WHEN admin enters password, THE Platform SHALL validate against policy requirements in real-time
4. WHEN super admin approves admin account, THE Platform SHALL change status to active and enable login
5. THE Platform SHALL record all account status changes in audit logs

### Requirement 8

**User Story:** As a developer, I want consistent data validation and error handling, so that the platform provides reliable and predictable responses.

#### Acceptance Criteria

1. THE Platform SHALL validate all API request data using Pydantic schemas
2. WHEN validation fails, THE Platform SHALL return standardized error response format with field-specific messages
3. THE Platform SHALL validate business registration numbers and emails using regular expressions
4. THE Platform SHALL map HTTP status codes to appropriate error codes consistently
5. THE Platform SHALL define error code constants for frontend error handling

### Requirement 9

**User Story:** As a platform user, I want consistent date and file handling, so that I can input information reliably across all forms.

#### Acceptance Criteria

1. THE Platform SHALL accept and display all dates in YYYY-MM-DD format consistently
2. WHEN invalid dates are entered, THE Platform SHALL return clear validation error messages
3. WHEN files are uploaded, THE Platform SHALL validate size, extension, and MIME type according to configurable rules
4. THE Platform SHALL support separate size limits for image files and document files through environment configuration
5. THE Platform SHALL validate file extensions case-insensitively and prevent extension spoofing through MIME type checking

### Requirement 10

**User Story:** As a system administrator, I want configurable file upload restrictions, so that I can manage platform resources and security according to organizational policies.

#### Acceptance Criteria

1. THE Platform SHALL read file size limits from environment configuration for both frontend and backend
2. THE Platform SHALL support separate configuration for image file extensions and document file extensions
3. WHEN file upload limits are exceeded, THE Platform SHALL display clear error messages with specific limits
4. THE Platform SHALL validate file extensions against configured allow-lists on both frontend and backend
5. THE Platform SHALL display file size limits to users in MB units while storing them as bytes internally