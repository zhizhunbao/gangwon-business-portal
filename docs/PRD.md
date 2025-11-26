# Product Requirements Document (PRD)

# Gangwon Business Portal - 江原创业门户

**Version:** 1.0.0  
**Last Updated:** 2025-11-25  
**Document Owner:** Development Team  
**Project Type:** B2B Performance Management Portal

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Stakeholders and Users](#stakeholders-and-users)
4. [System Architecture](#system-architecture)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [User Interface Requirements](#user-interface-requirements)
8. [Data Management](#data-management)
9. [Integration Requirements](#integration-requirements)
10. [Security and Compliance](#security-and-compliance)
11. [Deployment and Operations](#deployment-and-operations)
12. [Success Metrics](#success-metrics)
13. [Appendix](#appendix)

---

## Executive Summary

### Project Vision

The Gangwon Business Portal (江原创业门户) is a comprehensive B2B performance management system designed for enterprises in Gangwon Special Self-Governing Province. The platform serves as a one-stop solution for business performance data collection, project application management, and administrative oversight.

### Key Objectives

1. **Streamline Performance Reporting**: Enable enterprises to submit quarterly/annual performance data efficiently
2. **Centralize Project Management**: Provide a unified platform for program announcements and applications
3. **Enhance Data Governance**: Establish traceable, auditable data assets for decision-making
4. **Improve Administrative Efficiency**: Deliver real-time monitoring and approval workflows for administrators
5. **Support Regional Development**: Facilitate government support programs and enterprise growth tracking

### Project Scope

- **Member Portal**: Enterprise-facing web application for data entry and inquiry
- **Admin Portal**: Administrative dashboard for approval, content management, and analytics
- **Backend API**: RESTful services with PostgreSQL database
- **Support Tools**: Python utilities for document processing and image generation

---

## Product Overview

### System Description

The Gangwon Business Portal is a responsive web-based B2B performance management system designed for enterprises operating in Gangwon Special Self-Governing Province. The platform enables enterprises to register, submit performance data, apply for government programs, and access support services through a unified interface.

### Core Features

1. **Enterprise Registration & Management**
   - Multi-step registration process with admin approval workflow
   - Company profile management with business license verification
   - Integration with Nice D&B API for company information validation

2. **Performance Data Management**
   - Quarterly and annual performance data submission
   - Three data categories: Sales & Employment, Government Support History, Intellectual Property
   - Draft saving and submission workflow with approval status tracking
   - Performance data query and export functionality

3. **Program Management**
   - Program announcement publishing and management
   - Online application submission with file attachments
   - Application status tracking

4. **Content Management**
   - Notice board with WYSIWYG editor support
   - Press release management
   - Banner and popup management
   - System introduction page content management

5. **Support Services**
   - FAQ management and display
   - 1:1 consultation system with inquiry history
   - Notification center

6. **Administrative Dashboard**
   - Real-time enterprise status monitoring
   - Performance data approval workflow
   - Analytics and reporting with Excel export
   - Company search and verification

### Technology Stack

- **Frontend**: React 18.3+, Vite 6.x, Tailwind CSS 3.x, Zustand 5.x, TanStack Query 5.x
- **Backend**: FastAPI 0.115+, Python 3.11+, SQLAlchemy 2.0+ (async)
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage for file attachments
- **Authentication**: JWT/OAuth2 with role-based access control

---

## Stakeholders and Users

### Primary Users

#### 1. Enterprise Users (Member Portal)
- **Company Staff**: Regular employees responsible for data entry and submission
- **Company Owners**: Business representatives who need to review and approve submissions
- **Use Cases**:
  - Register company account and complete profile
  - Submit quarterly/annual performance data
  - Apply for government support programs
  - View notices, press releases, and announcements
  - Access FAQ and submit 1:1 inquiries
  - Track application and approval status

#### 2. Administrators (Admin Portal)
- **System Administrators**: Platform operators managing content and approvals
- **Use Cases**:
  - Approve/reject enterprise registrations
  - Review and approve performance data submissions
  - Manage content (notices, press releases, banners, FAQs)
  - Publish program announcements
  - Monitor enterprise status and generate reports
  - Search and verify company information via Nice D&B API

#### 3. Visitors (Public Access)
- **General Public**: Unauthenticated users browsing public content
- **Use Cases**:
  - View public notices and announcements
  - Access system introduction page
  - Browse program listings (limited information)

### Stakeholder Roles

| Role | Responsibilities | Access Level |
|------|-----------------|--------------|
| Enterprise User | Data entry, application submission | Member Portal (authenticated) |
| System Admin | Content management, approvals, analytics | Admin Portal (authenticated) |
| Visitor | Public content browsing | Public pages (unauthenticated) |

---

## System Architecture

### High-Level Architecture

The system follows a three-tier architecture:

```
┌─────────────────┐      ┌─────────────────┐
│  Member Portal  │      │   Admin Portal   │
│   (React SPA)   │      │   (React SPA)    │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └──────────┬─────────────┘
                    │ HTTPS/REST
         ┌──────────▼──────────┐
         │   FastAPI Backend   │
         │   (API Gateway)     │
         └──────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼───┐    ┌──────▼──────┐  ┌─────▼─────┐
│PostgreSQL│  │   Storage   │  │Nice D&B API│
│(Supabase)│  │ (Supabase)  │  │  (External)│
└─────────┘  └─────────────┘  └───────────┘
```

### Frontend Architecture

- **Single Vite Project**: Unified codebase with separate `member/` and `admin/` modules
- **Shared Components**: Reusable UI components, hooks, services, and utilities
- **State Management**: Zustand for global state, TanStack Query for server state
- **Routing**: React Router DOM with role-based route guards
- **Internationalization**: react-i18next supporting Korean and Chinese

### Backend Architecture

- **Framework**: FastAPI with async/await support
- **ORM**: SQLAlchemy 2.0+ with asyncpg driver
- **API Style**: RESTful API with OpenAPI documentation
- **Authentication**: JWT tokens with role-based permissions
- **File Storage**: Supabase Storage with organized directory structure

### Database Design

- **Primary Database**: PostgreSQL (Supabase)
- **Core Tables**: 
  - `members`, `member_profiles` (enterprise information)
  - `performance_records`, `performance_reviews` (performance data)
  - `projects`, `project_applications` (program management)
  - `notices`, `faqs`, `inquiries` (content and support)
  - `attachments` (polymorphic file storage)
  - `audit_logs` (operation tracking)

### File Storage Structure

```
/upload
  /{businessId}
    /notice          # Notice attachments and inline images
    /press           # Press release images
    /program         # Program attachments
    /performance     # Performance data attachments
  /common
    /system-info     # System introduction images
    /banners         # Banner images
```

---

## Functional Requirements

### FR1: Authentication & Authorization

#### FR1.1: Enterprise Registration
- **Description**: Multi-step registration process with admin approval
- **Steps**:
  1. Account information (business registration number, company name, password)
  2. Company information (location, corporate number, address, contact person)
  3. Business and industry information (business field, revenue, employees, establishment date)
  4. File upload (company logo, business license)
  5. Terms agreement (required and optional terms)
- **Business Rules**:
  - Business registration number must be unique and validated
  - Registration requires admin approval before account activation
  - Password must meet security requirements (minimum length, complexity)

#### FR1.2: Login & Session Management
- **Description**: Secure authentication with JWT tokens
- **Requirements**:
  - Login using business registration number and password
  - Session management with token refresh
  - Role-based access control (enterprise user, admin)
  - Password reset functionality via email

#### FR1.3: Password Management
- **Description**: Password reset and recovery workflow
- **Requirements**:
  - Password reset request via business registration number and email
  - Secure token-based password reset link
  - Password change functionality for authenticated users

### FR2: Enterprise Portal Features

#### FR2.1: Home Dashboard
- **Description**: Personalized home page with key information
- **Components**:
  - Latest 5 notices (title list)
  - Latest 1 press release (image card)
  - Rolling banner carousel (right side)
  - Main banner slider (full width)
- **Requirements**:
  - Real-time data from content management system
  - Responsive layout for mobile and desktop

#### FR2.2: Company Profile Management
- **Description**: View and update company information
- **Requirements**:
  - Display all company registration data
  - Allow editing of editable fields (business registration number read-only)
  - File upload for company logo and documents
  - Validation and error handling

#### FR2.3: Performance Data Management

**FR2.3.1: Performance Data Entry**
- **Description**: Submit quarterly/annual performance data
- **Data Categories**:
  1. Sales & Employment (매출고용)
  2. Government Support History (정부지원 기수혜이력)
  3. Intellectual Property (지식재산권)
- **Workflow**:
  - Select year and quarter
  - Enter data in respective tabs
  - Save as draft (internal use only)
  - Submit for approval (visible to admin)
- **Business Rules**:
  - Draft status: Only visible to enterprise, not to admin
  - Submitted status: Visible to admin for review
  - Need fix status: Admin requests corrections with comments
  - Approved status: Data included in statistics and reports

**FR2.3.2: Performance Data Query**
- **Description**: View submitted performance data and status
- **Requirements**:
  - Filter by year, quarter, and status
  - Display document type, file name, status
  - Download approved documents
  - View admin comments for rejected/correction requests

#### FR2.4: Program Management

**FR2.4.1: Program List**
- **Description**: Browse available government support programs
- **Requirements**:
  - Search functionality
  - Pagination (10, 20, 30, 50 items per page)
  - Display: title, registration date, status
  - Program application button

**FR2.4.2: Program Detail & Application**
- **Description**: View program details and submit application
- **Requirements**:
  - Display program information, attachments
  - Application modal with:
    - Company information (auto-filled)
    - Contact person details
    - File attachments (up to 5 files)
  - Application status tracking

#### FR2.5: Support Services

**FR2.5.1: FAQ**
- **Description**: Frequently asked questions with accordion interface
- **Requirements**:
  - Question list with expandable answers
  - Search functionality
  - Category filtering

**FR2.5.2: 1:1 Consultation**
- **Description**: Submit inquiries and track responses
- **Requirements**:
  - Inquiry form: name, email, phone, title, content, attachments (up to 3)
  - Inquiry history with status tracking
  - Admin response viewing
  - Email notification on response

### FR3: Admin Portal Features

#### FR3.1: Dashboard
- **Description**: Enterprise status overview and key metrics
- **Components**:
  - Summary cards: total enterprises, total revenue, total employment, IP count
  - Trend charts: revenue, employment, IP trends by year
  - Company-specific trend graphs
  - Excel export functionality
- **Data Source**: Only approved performance data
- **Filters**: Year, quarter selection

#### FR3.2: Enterprise Management

**FR3.2.1: Enterprise Approval**
- **Description**: Review and approve enterprise registrations
- **Requirements**:
  - List pending registrations
  - View complete registration data
  - Approve/reject with comments
  - Search by company name, representative, business field

**FR3.2.2: Enterprise Search**
- **Description**: Search and verify company information via Nice D&B API
- **Requirements**:
  - Search by business registration number, representative name, region
  - Display company overview and financial data
  - Excel export of search results
  - Integration with Nice D&B Open API

#### FR3.3: Performance Approval

**FR3.3.1: Performance Review**
- **Description**: Review submitted performance data
- **Requirements**:
  - Filter by company, year, quarter, status
  - View submitted data and attachments
  - Approve or request corrections
  - Add admin comments (required for correction requests)
  - Status workflow: submitted → need_fix/approved

**FR3.3.2: Performance Data Management**
- **Description**: Edit and manage performance records
- **Requirements**:
  - Edit performance data (admin override)
  - Bulk operations
  - Export to Excel/CSV

#### FR3.4: Content Management

**FR3.4.1: Notice Management**
- **Description**: Create and manage notice board posts
- **Requirements**:
  - WYSIWYG editor with image upload
  - File attachments (up to 3 files)
  - Inline images in content
  - Search and filter functionality
  - Latest 5 notices API for home page

**FR3.4.2: Press Release Management**
- **Description**: Manage press release posts
- **Requirements**:
  - Title and image upload
  - Thumbnail generation
  - Latest 1 press release API for home page
  - List view with preview

**FR3.4.3: Banner Management**
- **Description**: Manage main banners and rolling banners
- **Requirements**:
  - Banner type selection (MAIN, INTRO, PROGRAM, PERFORMANCE, SUPPORT)
  - Image upload and link URL
  - Active/inactive status
  - Auto-rotation settings for rolling banners

**FR3.4.4: Popup Management**
- **Description**: Manage popup notifications
- **Requirements**:
  - Start/end date selection
  - Image upload and optional link
  - Active/inactive status
  - "Don't show today" functionality for users

**FR3.4.5: System Introduction Management**
- **Description**: Manage system introduction page content
- **Requirements**:
  - WYSIWYG editor for HTML content
  - Image upload (single image)
  - Single record management (update only)

#### FR3.5: Program Management (Admin)

**FR3.5.1: Program Creation**
- **Description**: Create and publish program announcements
- **Requirements**:
  - Program title, target, start/end dates
  - Representative image upload
  - File attachments (up to 2 files)
  - Publish/unpublish status

**FR3.5.2: Application Management**
- **Description**: View and manage program applications
- **Requirements**:
  - List all applications by program
  - View application details and attachments
  - Status management

#### FR3.6: Support Management

**FR3.6.1: FAQ Management**
- **Description**: Create and manage FAQ entries
- **Requirements**:
  - Question and answer fields
  - Category assignment
  - Display order management

**FR3.6.2: Inquiry Management**
- **Description**: Respond to enterprise inquiries
- **Requirements**:
  - List all inquiries with status
  - View inquiry details and attachments
  - Submit responses
  - Email notification to enterprise

#### FR3.7: Reports & Analytics
- **Description**: Generate reports and export data
- **Requirements**:
  - Dashboard statistics export
  - Performance data export (Excel/CSV)
  - Enterprise list export
  - Custom date range selection

---

## Non-Functional Requirements

### NFR1: Performance

- **Response Time**: 
  - Page load time < 3 seconds
  - API response time < 1 second (95th percentile)
  - File upload processing < 5 seconds for files < 10MB
- **Throughput**: 
  - Support 100 concurrent users
  - Handle 1000 API requests per minute
- **Scalability**: 
  - Horizontal scaling capability
  - Database connection pooling
  - CDN for static assets

### NFR2: Availability

- **Uptime**: ≥ 99% during business hours (9 AM - 6 PM KST)
- **Downtime**: Maximum 4 hours per month for maintenance
- **Recovery**: 
  - Automatic failover for critical services
  - Database backup and recovery procedures
  - Health check endpoints for monitoring

### NFR3: Security

- **Authentication**: 
  - JWT token-based authentication
  - Password hashing using PBKDF2/SHA256
  - Session timeout after 30 minutes of inactivity
- **Authorization**: 
  - Role-based access control (RBAC)
  - Route guards for protected pages
  - API endpoint authorization checks
- **Data Protection**: 
  - HTTPS for all communications
  - Encrypted database storage (Supabase encryption)
  - SQL injection prevention (parameterized queries)
  - XSS prevention (input sanitization)
  - File upload validation (MIME type, extension, size limits)
- **Audit**: 
  - Comprehensive audit logging for sensitive operations
  - Login/logout tracking
  - Data modification history

### NFR4: Usability

- **Accessibility**: 
  - WCAG 2.1 Level AA compliance
  - Keyboard navigation support
  - Screen reader compatibility
  - Minimum touch target size: 44x44px
- **Responsive Design**: 
  - Mobile: ≥ 360px width
  - Tablet: ≥ 768px width
  - Desktop: ≥ 1280px width
- **Internationalization**: 
  - Korean and Chinese language support
  - Date and number formatting per locale
  - Right-to-left text support (if needed)

### NFR5: Maintainability

- **Code Quality**: 
  - Modular architecture
  - Consistent naming conventions
  - Comprehensive code comments
  - Type hints (Python) and JSDoc (JavaScript)
- **Documentation**: 
  - API documentation (OpenAPI/Swagger)
  - Architecture documentation
  - User guides and admin manuals
- **Testing**: 
  - Manual testing procedures
  - Integration test coverage for critical paths

### NFR6: Compatibility

- **Browsers**: 
  - Chrome (latest 2 versions)
  - Firefox (latest 2 versions)
  - Safari (latest 2 versions)
  - Edge (latest 2 versions)
- **Operating Systems**: 
  - Windows 10+
  - macOS 10.15+
  - iOS 13+
  - Android 8+

---

## User Interface Requirements

### UI1: Design System

#### UI1.1: Design Principles
- **Formal & Professional**: Government portal aesthetic with conservative color scheme
- **Accessibility First**: High contrast, clear typography, sufficient spacing
- **8-Point Grid System**: All spacing based on 8px multiples
- **Responsive Layout**: Mobile-first approach with breakpoints

#### UI1.2: Color Palette
- **Primary**: Dark navy blue (header, footer, primary actions)
- **Secondary**: Accent color for highlights
- **Background**: White or light gray for content areas
- **Text**: Dark gray/black for main text, medium gray for secondary
- **Status Colors**: 
  - Success: Green
  - Warning: Orange
  - Error: Red
  - Info: Blue

#### UI1.3: Typography
- **Font Family**: System font stack (Noto Sans KR for Korean, Noto Sans SC for Chinese)
- **Font Sizes**: Based on 8px multiples (xs to 6xl scale)
- **Line Height**: 1.6 for body text, 1.3 for headings
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

#### UI1.4: Spacing System
- **Base Unit**: 8px
- **Spacing Levels**: none, tight, small, default, large, xlarge
- **Screen Margins**: 
  - Desktop: minimum 24px
  - Mobile: minimum 16px
- **Content Max Width**: 1200-1280px (centered)

### UI2: Layout Structure

#### UI2.1: Member Portal Layout
- **Header**: Full width, dark navy background, logo and navigation
- **Main Banner**: Full width slider below header
- **Submenu Bar**: Conditional display (performance management, support pages only)
- **Main Content**: Max width 1200-1280px, centered
- **Footer**: Full width, dark navy background, organization info

#### UI2.2: Admin Portal Layout
- **Header**: Top bar with admin name and logout
- **Sidebar**: Left navigation menu
- **Main Content**: Dashboard, tables, forms, charts

### UI3: Component Requirements

#### UI3.1: Form Components
- **Input Fields**: 
  - Label, placeholder, help text
  - Validation feedback (error, success, warning)
  - Auto-formatting for business numbers, phone numbers
- **Select Dropdowns**: Consistent styling, searchable options
- **File Upload**: 
  - Drag and drop support
  - Progress indicator
  - File type and size validation
- **Date Pickers**: Calendar widget with date selection

#### UI3.2: Navigation Components
- **Main Navigation**: Horizontal menu with active state indication
- **Submenu**: Tab-style navigation for sub-sections
- **Breadcrumbs**: Current location indicator
- **Pagination**: Page numbers with prev/next buttons

#### UI3.3: Data Display Components
- **Tables**: 
  - Sortable columns
  - Pagination
  - Row selection
  - Responsive design
- **Cards**: 
  - Clear borders or shadows
  - Consistent padding
  - Hover effects
- **Charts**: 
  - ECharts integration
  - Responsive sizing
  - Color consistency

#### UI3.4: Feedback Components
- **Alerts**: Success, error, warning, info messages
- **Loading Indicators**: Spinner, skeleton screens
- **Modals**: Confirmation dialogs, information displays
- **Tooltips**: Contextual help information

### UI4: Responsive Design

#### UI4.1: Breakpoints
- **Mobile**: < 640px
- **Small**: 640px+
- **Medium**: 768px+
- **Large**: 1024px+
- **XLarge**: 1280px+

#### UI4.2: Responsive Behavior
- **Navigation**: Collapsible menu on mobile
- **Tables**: Horizontal scroll or card layout on mobile
- **Forms**: Stack vertically on mobile, horizontal on desktop
- **Images**: Responsive sizing with lazy loading

### UI5: Interaction Design

#### UI5.1: Interaction States
- **Default**: Initial appearance
- **Hover**: Visual feedback on mouse over
- **Active**: Click/selection state
- **Focus**: Keyboard navigation indicator
- **Disabled**: Non-interactive state
- **Loading**: Async operation feedback

#### UI5.2: Animation & Transitions
- **Principles**: Smooth, conservative animations
- **Duration**: 200-300ms for transitions
- **Easing**: Ease-in-out for natural feel
- **Avoid**: Excessive or distracting animations

---

## Data Management

### DM1: Data Models

#### DM1.1: Enterprise Data
- **Members Table**: Account information, authentication data
- **Member Profiles**: Company details, business information, contact persons
- **Relationships**: One-to-many with performance records, applications

#### DM1.2: Performance Data
- **Performance Records**: Sales, employment, government support, IP data
- **Performance Reviews**: Approval workflow, admin comments, status history
- **Status Values**: draft, submitted, need_fix, approved

#### DM1.3: Content Data
- **Notices**: Title, content (HTML), attachments, inline images
- **Press Releases**: Title, image, publication date
- **Banners**: Type, image, link URL, active status
- **FAQs**: Question, answer, category

#### DM1.4: Program Data
- **Projects**: Program announcements with details
- **Project Applications**: Enterprise applications with attachments

#### DM1.5: Support Data
- **Inquiries**: 1:1 consultation requests and responses
- **Attachments**: Polymorphic file storage (notices, programs, performance, inquiries)

### DM2: Data Validation

#### DM2.1: Input Validation
- **Business Rules**: 
  - Business registration number: 10 digits, unique
  - Email: Valid format, domain validation
  - Phone: Format validation
  - File uploads: Type, size, MIME validation
- **Server-Side Validation**: All inputs validated on backend
- **Client-Side Validation**: Immediate feedback for better UX

#### DM2.2: Data Integrity
- **Referential Integrity**: Foreign key constraints
- **Unique Constraints**: Business registration numbers, email addresses
- **Cascade Rules**: Delete related records appropriately
- **Soft Deletes**: Mark as inactive instead of hard delete where applicable

### DM3: Data Storage

#### DM3.1: Database Storage
- **Primary Storage**: PostgreSQL (Supabase)
- **Backup Strategy**: Daily automated backups
- **Retention Policy**: 7 years for performance data (regulatory requirement)

#### DM3.2: File Storage
- **Storage Service**: Supabase Storage
- **Organization**: By business ID and content type
- **Naming**: Unique server filenames, original filenames in database
- **Lifecycle**: Cleanup of orphaned files

### DM4: Data Export

#### DM4.1: Export Formats
- **Excel**: .xlsx format with formatting
- **CSV**: Comma-separated values for data import
- **PDF**: Reports and documents (future enhancement)

#### DM4.2: Export Functionality
- **Dashboard Data**: Summary statistics export
- **Performance Data**: Filtered performance records export
- **Enterprise List**: Company information export
- **Custom Reports**: Date range and filter-based exports

---

## Integration Requirements

### INT1: External APIs

#### INT1.1: Nice D&B API
- **Purpose**: Company information verification
- **Integration Points**: 
  - Enterprise registration verification
  - Admin company search
- **Caching**: 24-hour cache for API responses
- **Fallback**: Manual input if API unavailable
- **Authentication**: API key-based

#### INT1.2: Email Service
- **Purpose**: Notifications and password reset
- **Use Cases**: 
  - Registration approval notifications
  - Password reset links
  - Performance correction requests
  - Inquiry responses
- **Service Options**: AWS SES, SendGrid, or local SMTP

#### INT1.3: SMS Service (Optional)
- **Purpose**: Critical notifications
- **Use Cases**: 
  - Registration approval
  - Important announcements
- **Service Options**: AWS SNS, Twilio, or local SMS gateway

### INT2: Internal Integrations

#### INT2.1: Authentication Integration
- **JWT Token Management**: Token generation, validation, refresh
- **Session Management**: Server-side session tracking
- **Role-Based Access**: Integration with route guards and API middleware

#### INT2.2: File Storage Integration
- **Upload Service**: Multipart file upload handling
- **Storage Service**: Supabase Storage API integration
- **CDN Integration**: Asset delivery optimization (future)

### INT3: API Design

#### INT3.1: RESTful API Standards
- **Base URL**: `/api/v1`
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Response Format**: JSON with consistent structure
- **Error Handling**: Standardized error codes and messages
- **Pagination**: Cursor-based or offset-based pagination

#### INT3.2: API Endpoints

**Authentication**:
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/password-reset-request`
- `POST /api/v1/auth/password-reset`

**Enterprise**:
- `GET /api/v1/members/me`
- `PUT /api/v1/members/me`
- `GET /api/v1/members/{id}`

**Performance**:
- `GET /api/v1/performance`
- `POST /api/v1/performance`
- `PUT /api/v1/performance/{id}`
- `GET /api/v1/performance/{id}`

**Content**:
- `GET /api/v1/notices`
- `GET /api/v1/notices/latest5`
- `GET /api/v1/press/latest1`
- `GET /api/v1/faqs`

**Admin**:
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/members`
- `POST /api/v1/admin/members/{id}/approve`
- `GET /api/v1/admin/performance`
- `POST /api/v1/admin/performance/{id}/approve`

---

## Security and Compliance

### SEC1: Authentication & Authorization

#### SEC1.1: Authentication Security
- **Password Policy**: 
  - Minimum 8 characters
  - Combination of letters, numbers, special characters
  - Password history (prevent reuse)
  - Account lockout after 5 failed attempts
- **Token Security**: 
  - JWT with short expiration (15 minutes)
  - Refresh tokens with longer expiration (7 days)
  - Secure token storage (httpOnly cookies recommended)
- **Session Management**: 
  - Automatic timeout after 30 minutes inactivity
  - Concurrent session limits

#### SEC1.2: Authorization
- **Role-Based Access Control (RBAC)**:
  - Enterprise User: Access to own data only
  - Admin: Full system access
  - Visitor: Public content only
- **Data Isolation**: 
  - Enterprise users can only access their own data
  - Admin can access all data with audit logging
- **API Authorization**: 
  - All protected endpoints require valid JWT
  - Role-based endpoint access control

### SEC2: Data Security

#### SEC2.1: Data Encryption
- **In Transit**: HTTPS/TLS 1.2+ for all communications
- **At Rest**: Database encryption (Supabase managed)
- **Sensitive Data**: 
  - Passwords: Hashed with PBKDF2/SHA256
  - Personal information: Encrypted fields where required

#### SEC2.2: Input Security
- **SQL Injection Prevention**: 
  - Parameterized queries
  - ORM usage (SQLAlchemy)
  - Input sanitization
- **XSS Prevention**: 
  - Output encoding
  - Content Security Policy (CSP)
  - Sanitize user-generated HTML content
- **CSRF Protection**: 
  - CSRF tokens for state-changing operations
  - SameSite cookie attributes

#### SEC2.3: File Upload Security
- **File Type Validation**: 
  - Whitelist of allowed extensions
  - MIME type verification
  - File signature validation
- **File Size Limits**: 
  - Images: 5MB maximum
  - Documents: 10MB maximum
- **Virus Scanning**: 
  - Server-side scanning (recommended)
  - Quarantine suspicious files

### SEC3: Audit & Compliance

#### SEC3.1: Audit Logging
- **Logged Events**: 
  - Login/logout
  - Data modifications
  - Approval actions
  - File uploads/downloads
  - Admin actions
- **Log Data**: 
  - User ID
  - Timestamp
  - Action type
  - Resource affected
  - IP address
  - User agent
- **Log Retention**: 7 years minimum

#### SEC3.2: Compliance
- **Data Privacy**: 
  - Personal Information Protection Act (Korea) compliance
  - Data minimization principles
  - User consent for data collection
- **Data Retention**: 
  - Performance data: 7 years
  - Audit logs: 7 years
  - User accounts: Until deletion request
- **Right to Deletion**: 
  - User data deletion upon request
  - Anonymization of historical data

### SEC4: Infrastructure Security

#### SEC4.1: Network Security
- **Firewall Rules**: 
  - Restrict database access
  - Allow only necessary ports
- **DDoS Protection**: 
  - Rate limiting on API endpoints
  - CDN-based protection
- **VPN Access**: For admin operations (if required)

#### SEC4.2: Monitoring & Alerting
- **Security Monitoring**: 
  - Failed login attempts
  - Unusual access patterns
  - File upload anomalies
- **Alerting**: 
  - Real-time alerts for security events
  - Daily security reports
  - Incident response procedures

---

## Deployment and Operations

### DEP1: Deployment Architecture

#### DEP1.1: Frontend Deployment
- **Hosting**: CDN-based static hosting (Vercel, Netlify, or S3 + CloudFront)
- **Build Process**: 
  - Vite production build
  - Asset optimization and minification
  - Environment variable injection
- **Deployment Strategy**: 
  - Automated deployment on git push
  - Blue-green deployment for zero downtime
  - Rollback capability

#### DEP1.2: Backend Deployment
- **Hosting**: Cloud platform (AWS, GCP, or Azure)
- **Application Server**: 
  - Uvicorn ASGI server
  - Gunicorn with multiple workers
  - Load balancer for high availability
- **Database**: 
  - Supabase managed PostgreSQL
  - Automated backups
  - Read replicas for scaling (if needed)

#### DEP1.3: Storage Deployment
- **File Storage**: Supabase Storage
- **CDN**: CloudFront or similar for asset delivery
- **Backup Strategy**: Regular backups of file storage

### DEP2: Environment Configuration

#### DEP2.1: Environment Variables

**Frontend**:
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_WS_URL`: WebSocket URL (if used)
- `VITE_USE_MOCK`: Mock data flag (development)

**Backend**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_ALGORITHM`: JWT algorithm (HS256)
- `CORS_ORIGINS`: Allowed CORS origins
- `NICE_DNB_API_KEY`: Nice D&B API key
- `EMAIL_SMTP_HOST`: SMTP server host
- `EMAIL_SMTP_USER`: SMTP username
- `EMAIL_SMTP_PASSWORD`: SMTP password

#### DEP2.2: Configuration Management
- **Development**: Local `.env` files
- **Staging**: Environment-specific configuration
- **Production**: Secure secret management (AWS Secrets Manager, etc.)

### DEP3: CI/CD Pipeline

#### DEP3.1: Continuous Integration
- **Source Control**: Git (GitHub/GitLab)
- **Branch Strategy**: 
  - `main`: Production
  - `develop`: Development
  - Feature branches for new features
- **Automated Tests**: 
  - Linting and code quality checks
  - Integration tests (if implemented)

#### DEP3.2: Continuous Deployment
- **Automated Deployment**: 
  - Push to `main` triggers production deployment
  - Push to `develop` triggers staging deployment
- **Deployment Steps**: 
  1. Run tests
  2. Build application
  3. Deploy to staging
  4. Run smoke tests
  5. Deploy to production
  6. Post-deployment verification

### DEP4: Monitoring & Operations

#### DEP4.1: Application Monitoring
- **Health Checks**: 
  - `/healthz` endpoint for liveness
  - `/ready` endpoint for readiness
- **Metrics**: 
  - Response times
  - Error rates
  - Request counts
  - Database connection pool status
- **Tools**: Prometheus, Grafana, or cloud-native monitoring

#### DEP4.2: Error Tracking
- **Error Logging**: 
  - Structured logging (JSON format)
  - Error aggregation and alerting
  - Stack trace capture
- **Tools**: Sentry, LogRocket, or similar

#### DEP4.3: Performance Monitoring
- **APM Tools**: 
  - Application performance monitoring
  - Database query performance
  - API endpoint performance
- **Alerts**: 
  - High error rates
  - Slow response times
  - Resource exhaustion

### DEP5: Backup & Recovery

#### DEP5.1: Backup Strategy
- **Database Backups**: 
  - Daily automated backups
  - 30-day retention
  - Point-in-time recovery capability
- **File Storage Backups**: 
  - Regular snapshots
  - Cross-region replication (if required)

#### DEP5.2: Disaster Recovery
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 24 hours
- **Recovery Procedures**: 
  - Documented recovery steps
  - Regular disaster recovery drills
  - Backup verification

---

## Success Metrics

### MET1: User Adoption Metrics

- **Enterprise Registration**: 
  - Target: 100+ registered enterprises in first 6 months
  - Monthly registration growth rate
- **Active Users**: 
  - Monthly active users (MAU)
  - Daily active users (DAU)
  - User retention rate (30-day, 90-day)

### MET2: Performance Metrics

- **System Performance**: 
  - Average page load time < 3 seconds
  - API response time < 1 second (95th percentile)
  - Uptime ≥ 99% during business hours
- **User Experience**: 
  - Task completion rate
  - Error rate < 1%
  - User satisfaction score (survey-based)

### MET3: Business Metrics

- **Data Collection**: 
  - Number of performance submissions per quarter
  - Data completeness rate
  - Approval turnaround time
- **Content Engagement**: 
  - Notice view counts
  - Program application rate
  - FAQ usage rate

### MET4: Operational Metrics

- **System Reliability**: 
  - Mean time between failures (MTBF)
  - Mean time to recovery (MTTR)
  - Incident count and severity
- **Support Metrics**: 
  - Average inquiry response time
  - Inquiry resolution rate
  - User support ticket volume

---

## Appendix

### APP1: Glossary

| Term | Definition |
|------|------------|
| Enterprise User | Registered company representative using the member portal |
| Admin | System administrator with full access to admin portal |
| Performance Data | Quarterly/annual business performance metrics (sales, employment, IP, etc.) |
| Program | Government support program announcement |
| Notice | Public announcement posted by administrators |
| Press Release | News/press release with image content |
| Draft | Performance data saved but not submitted for approval |
| Submitted | Performance data submitted and awaiting admin review |
| Need Fix | Performance data requiring corrections based on admin feedback |
| Approved | Performance data approved and included in statistics |
| Nice D&B | External API service for company information verification |
| WYSIWYG | What You See Is What You Get (rich text editor) |

### APP2: Reference Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture documentation
- [GangwonUniv_Description_admin_Korean.md](./GangwonUniv_Description_admin_Korean.md) - Admin portal requirements (Korean)
- [GangwonUniv_Description_company_Korean.md](./GangwonUniv_Description_company_Korean.md) - Member portal requirements (Korean)
- [frontend_member_modules.md](./frontend_member_modules.md) - Frontend module dependencies
- [KOREAN_GOV_UI_UX_GUIDE.md](./KOREAN_GOV_UI_UX_GUIDE.md) - UI/UX design guidelines

### APP3: Status Values

#### Performance Status
- `draft`: 임시저장 (Temporary save, not visible to admin)
- `submitted`: 제출완료 (Submitted, awaiting review)
- `need_fix`: 보완요청 (Correction requested)
- `approved`: 승인완료 (Approved, included in statistics)

#### Enterprise Status
- `pending`: 대기 (Awaiting approval)
- `approved`: 승인 (Approved, active)
- `rejected`: 거부 (Rejected)
- `inactive`: 비활성 (Inactive)

#### Application Status
- `submitted`: 제출완료 (Submitted)
- `under_review`: 검토중 (Under review)
- `approved`: 승인 (Approved)
- `rejected`: 거부 (Rejected)

### APP4: API Response Format

#### Success Response
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    // Response data
  }
}
```

#### Error Response
```json
{
  "code": 400,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Field-specific error message"
    }
  ]
}
```

### APP5: File Upload Limits

| File Type | Max Size | Allowed Extensions |
|-----------|----------|-------------------|
| Images | 5 MB | jpg, jpeg, png, gif, webp |
| Documents | 10 MB | pdf, doc, docx, hwp, xls, xlsx |
| Company Logo | 2 MB | jpg, jpeg, png |
| Business License | 10 MB | pdf, jpg, jpeg, png |

### APP6: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-25 | Development Team | Initial PRD document creation |

---

**End of Document**

