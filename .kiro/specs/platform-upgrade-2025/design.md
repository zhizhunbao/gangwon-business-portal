# Design Document

## Overview

This design document outlines the comprehensive upgrade of the Korean business platform system to improve user experience, authentication flows, and administrative functionality. The upgrade focuses on enhancing login/registration processes, implementing real-time form validation, improving file handling, and establishing robust administrative user management.

The platform serves two primary user types: business members who register with Korean business registration numbers and administrative users who manage the platform. The upgrade will ensure consistent authentication flows, improve form usability, and provide better feedback mechanisms throughout the user journey.

## Architecture

### Frontend Architecture Updates

The frontend architecture will be enhanced to support:

1. **Authentication State Management**: Enhanced Zustand store to handle complex authentication states including pending approval, admin vs member roles, and authentication guards
2. **Real-time Validation System**: Debounced validation hooks that communicate with backend APIs for duplicate checking and format validation
3. **Form Enhancement Layer**: Improved form components with consistent validation feedback, file upload handling, and date input management
4. **Route Protection Enhancement**: Upgraded authentication guards with popup-based login prompts instead of redirects

### Backend Architecture Updates

The backend will be enhanced with:

1. **Enhanced Authentication Service**: Extended authentication logic to handle admin registration, approval workflows, and differentiated error responses
2. **Real-time Validation APIs**: New endpoints for real-time duplicate checking and format validation
3. **Configuration Management**: Environment-based configuration for file upload limits, validation rules, and business logic parameters
4. **Audit Enhancement**: Extended audit logging for account status changes and administrative actions

## Components and Interfaces

### Frontend Components

#### Authentication Components
- **LoginGuard**: Enhanced route protection with popup-based authentication prompts
- **LoginPopup**: Modal component for inline authentication without page redirects
- **AdminLogin**: Specialized admin login component with admin-specific messaging
- **MemberLogin**: Enhanced member login with improved error handling for pending accounts

#### Form Components
- **RealTimeValidator**: Hook for debounced real-time validation
- **BusinessNumberInput**: Enhanced business number input with real-time duplicate checking
- **EmailInput**: Email input with format and duplicate validation
- **PasswordInput**: Password input with policy validation and strength indicators
- **DateInput**: Unified date input component supporting both manual and calendar input
- **FileUpload**: Enhanced file upload with configurable validation and better state management
- **PhoneInput**: Flexible phone number input without automatic formatting

#### Validation Components
- **ValidationMessage**: Standardized validation message display component
- **ValidationIndicator**: Real-time validation status indicators
- **PolicyChecker**: Password policy compliance checker with visual feedback

### Backend Interfaces

#### Authentication APIs
```python
# Enhanced authentication endpoints
POST /api/v1/auth/login
POST /api/v1/auth/admin/login
POST /api/v1/auth/admin/register
POST /api/v1/auth/check-business-number
POST /api/v1/auth/check-email
POST /api/v1/auth/approve-admin/{admin_id}
```

#### Validation APIs
```python
# Real-time validation endpoints
GET /api/v1/validation/business-number/{number}
GET /api/v1/validation/email/{email}
POST /api/v1/validation/password-policy
```

#### Configuration APIs
```python
# Configuration management
GET /api/v1/config/file-upload-limits
GET /api/v1/config/validation-rules
PUT /api/v1/config/file-upload-limits
```

## Data Models

### Enhanced User Models

```python
# Enhanced Member model
class Member(Base):
    id: UUID
    business_number: str
    company_name: str
    email: str
    password_hash: str
    status: str  # active, suspended, pending
    approval_status: str  # pending, approved, rejected
    created_at: datetime
    updated_at: datetime
    reset_token: Optional[str]
    reset_token_expires: Optional[datetime]

# New Admin model
class Admin(Base):
    id: UUID
    email: str
    password_hash: str
    name: str
    phone: str
    role: str  # admin, super_admin
    status: str  # pending, active, suspended
    created_at: datetime
    updated_at: datetime
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]

# Enhanced audit logging
class AuditLog(Base):
    id: UUID
    user_id: Optional[UUID]
    user_type: str  # member, admin
    action: str
    resource_type: str
    resource_id: Optional[str]
    old_values: Optional[dict]
    new_values: Optional[dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
```

### Configuration Models

```python
# File upload configuration
class FileUploadConfig(Base):
    id: UUID
    file_type: str  # image, document
    max_size_bytes: int
    allowed_extensions: List[str]
    mime_types: List[str]
    created_at: datetime
    updated_at: datetime

# Validation rules configuration
class ValidationConfig(Base):
    id: UUID
    rule_type: str  # business_number, email, password
    rule_pattern: str
    error_message: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all properties identified in the prework, several redundancies were identified and consolidated:

- Properties 1.2, 1.3, and 6.1 all relate to authentication guard behavior and were consolidated into Property 1
- Properties 2.1, 2.2, and 2.3 all relate to real-time validation and were consolidated into Property 2  
- Properties 3.1, 3.4, and 3.5 all relate to form interaction consistency and were consolidated into Property 3
- Properties 9.3, 9.4, 9.5, 10.1, 10.2, 10.4, and 10.5 all relate to file upload validation and were consolidated into Property 8
- Properties 8.2, 8.3, and 8.4 all relate to API validation consistency and were consolidated into Property 7

Property 1: Authentication guard consistency
*For any* unauthenticated user accessing protected content, the platform should apply consistent authentication guard behavior with popup-based login prompts across all protected routes and menu items
**Validates: Requirements 1.2, 1.3, 6.1, 6.3, 6.4**

Property 2: Real-time validation consistency  
*For any* form input requiring validation (business numbers, emails, passwords), the platform should perform real-time validation with appropriate status messages and prevent submission until all validations pass
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 3: Form interaction consistency
*For any* form interaction (address selection, file upload/removal, date input), the platform should provide consistent behavior including automatic popup closure, state clearing, and unified interface access
**Validates: Requirements 3.1, 3.2, 3.4, 3.5**

Property 4: Phone number input flexibility
*For any* phone number input, the platform should accept various formats without automatic formatting while providing format guidance through placeholder text
**Validates: Requirements 4.1, 4.2, 4.4**

Property 5: Account status differentiation
*For any* login attempt, the platform should differentiate between authentication failure and approval pending status, providing appropriate messages and redirect behavior
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

Property 6: Admin account management workflow
*For any* admin account operation (registration, approval, login), the platform should enforce proper workflow including pending status creation, email uniqueness validation, and audit logging
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

Property 7: API validation consistency
*For any* API request with invalid data, the platform should return standardized error responses with consistent status code mapping and field-specific messages
**Validates: Requirements 8.2, 8.3, 8.4**

Property 8: File upload validation consistency
*For any* file upload operation, the platform should validate size, extension, and MIME type according to configurable rules with clear error messages and proper unit display
**Validates: Requirements 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5**

Property 9: Date format consistency
*For any* date input or display, the platform should consistently use YYYY-MM-DD format with proper validation and clear error messages for invalid dates
**Validates: Requirements 9.1, 9.2**

## Error Handling

### Frontend Error Handling

1. **Authentication Errors**: Differentiated error messages for invalid credentials vs pending approval
2. **Validation Errors**: Real-time validation feedback with internationalized messages
3. **File Upload Errors**: Specific error messages for size, format, and configuration violations
4. **Network Errors**: Graceful handling of network failures with retry mechanisms

### Backend Error Handling

1. **Standardized Error Responses**: Consistent error response format across all APIs
2. **Error Code Mapping**: Systematic mapping of business errors to HTTP status codes
3. **Validation Error Details**: Field-specific validation error messages
4. **Audit Error Logging**: Comprehensive error logging for debugging and monitoring

### Error Response Format

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "field_errors": {
      "business_number": ["Business number already exists"],
      "email": ["Invalid email format"]
    }
  },
  "trace_id": "uuid-trace-id"
}
```

## Testing Strategy

### Unit Testing Approach

Unit tests will focus on:
- Individual component validation logic
- Form state management
- Authentication service methods
- Configuration loading and validation
- Error handling edge cases

### Property-Based Testing Approach

Property-based testing will be implemented using **Hypothesis** for Python backend and **fast-check** for JavaScript frontend. Each property-based test will run a minimum of 100 iterations to ensure comprehensive coverage.

Property-based tests will verify:
- Authentication guard behavior across various user states and routes
- Real-time validation with generated test data for business numbers, emails, and passwords
- Form interaction consistency with various input combinations
- File upload validation with generated files of different sizes and types
- API error response consistency with various invalid input combinations

Each property-based test will be tagged with comments explicitly referencing the correctness property from this design document using the format: **Feature: platform-upgrade-2025, Property {number}: {property_text}**

### Integration Testing

Integration tests will cover:
- End-to-end authentication flows
- Real-time validation API integration
- File upload workflows
- Admin approval processes
- Cross-browser compatibility for form interactions

### Testing Configuration

- **Backend**: Hypothesis with pytest, minimum 100 iterations per property test
- **Frontend**: fast-check with Jest, minimum 100 iterations per property test  
- **Database**: Test database with isolated transactions
- **File Storage**: Mock file storage for upload testing
- **External APIs**: Mocked external services for consistent testing