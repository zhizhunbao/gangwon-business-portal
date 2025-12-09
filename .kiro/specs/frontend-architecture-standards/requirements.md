# Requirements Document - Frontend Architecture Standards

## Introduction

This specification defines the architectural standards, patterns, and best practices for the Gangwon Business Portal frontend application. The system is built with React 18.3+, Vite 6.x, and follows a modular architecture with separate member and admin portals sharing common components and utilities.

The purpose of this specification is to establish consistent development patterns across the codebase, ensure maintainability, and provide clear guidelines for current and future developers.

## Glossary

- **SPA (Single Page Application)**: A web application that loads a single HTML page and dynamically updates content without full page reloads
- **Component**: A reusable, self-contained piece of UI built with React
- **Hook**: A React function that lets you use state and other React features in function components
- **Service Layer**: A layer that encapsulates API calls and business logic, separating concerns from UI components
- **State Management**: The practice of managing application state using Zustand for global state and TanStack Query for server state
- **Module**: A self-contained feature area (e.g., auth, performance, projects) with its own components, services, and routes
- **Shared Layer**: Common code (components, hooks, services, utilities) used across both member and admin portals
- **Error Boundary**: A React component that catches JavaScript errors in child components and displays fallback UI
- **Internationalization (i18n)**: The process of designing software to support multiple languages and locales

## Requirements

### Requirement 1: Project Structure and Organization

**User Story:** As a developer, I want a clear and consistent project structure, so that I can easily locate files and understand the codebase organization.

#### Acceptance Criteria

1. THE system SHALL organize code into three main directories: `member/` (enterprise portal), `admin/` (administrative portal), and `shared/` (common code)
2. WHEN a developer creates a new module, THE system SHALL follow the structure: `modules/{module-name}/` containing components, services, and locales
3. THE system SHALL use path aliases (`@shared`, `@member`, `@admin`) for all imports to avoid relative path complexity
4. THE system SHALL organize shared code into subdirectories: `components/`, `hooks/`, `services/`, `stores/`, `styles/`, `utils/`, and `i18n/`
5. THE system SHALL place all mock data and handlers in the `mocks/` directory with clear separation between data and handlers

### Requirement 2: Component Development Standards

**User Story:** As a developer, I want consistent component development patterns, so that all components follow the same structure and are easy to understand.

#### Acceptance Criteria

1. THE system SHALL use function components with React Hooks for all new components
2. WHEN a component is created, THE system SHALL use PascalCase naming for component files (e.g., `UserProfile.jsx`)
3. THE system SHALL export components as default exports from their respective files
4. THE system SHALL co-locate component-specific styles in files named `{ComponentName}.css` in the same directory
5. THE system SHALL limit component file size to 300 lines; larger components SHALL be split into smaller sub-components
6. THE system SHALL use prop destructuring in component function parameters for clarity
7. THE system SHALL define PropTypes or JSDoc comments for component props documentation
8. THE system SHALL separate presentational components from container components (smart vs. dumb components)

### Requirement 3: State Management Patterns

**User Story:** As a developer, I want clear state management patterns, so that I can manage application state consistently and predictably.

#### Acceptance Criteria

1. THE system SHALL use Zustand for global application state (authentication, UI state, user preferences)
2. THE system SHALL use TanStack Query (React Query) for server state management (API data caching, synchronization)
3. THE system SHALL use React's useState and useReducer for local component state
4. WHEN creating a Zustand store, THE system SHALL define stores in `shared/stores/` with the naming pattern `{feature}Store.js`
5. THE system SHALL export store hooks with the `use` prefix (e.g., `useAuthStore`, `useUIStore`)
6. THE system SHALL configure TanStack Query with appropriate stale times and cache times for different data types
7. THE system SHALL NOT store server data in Zustand stores; server data SHALL be managed by TanStack Query

### Requirement 4: API Integration and Service Layer

**User Story:** As a developer, I want a consistent API integration pattern, so that all API calls follow the same structure and error handling.

#### Acceptance Criteria

1. THE system SHALL centralize all API calls in service files located in `shared/services/`
2. THE system SHALL use the `api.service.js` base service for all HTTP requests (GET, POST, PUT, PATCH, DELETE)
3. WHEN making API calls, THE system SHALL use TanStack Query hooks (`useQuery`, `useMutation`) in components
4. THE system SHALL automatically attach authentication tokens to all API requests via axios interceptors
5. THE system SHALL handle token refresh automatically when receiving 401 Unauthorized responses
6. THE system SHALL transform snake_case API responses to camelCase for frontend use and vice versa for requests
7. THE system SHALL include trace IDs in request headers for request correlation with backend logs
8. THE system SHALL sanitize sensitive data (passwords, tokens) before logging request/response data

### Requirement 5: Error Handling and Logging

**User Story:** As a developer, I want unified error handling and logging, so that errors are consistently captured, logged, and displayed to users.

#### Acceptance Criteria

1. THE system SHALL wrap the application root with an ErrorBoundary component to catch unhandled React errors
2. THE system SHALL use the `useErrorHandler` hook for handling errors in async operations
3. THE system SHALL use the `handleError` utility function for error handling in non-component code
4. WHEN an error occurs, THE system SHALL automatically determine error severity (5xx = exception, 4xx = warning)
5. THE system SHALL send error logs to the backend via `loggerService` for centralized logging
6. THE system SHALL send exceptions to the backend via `exceptionService` for tracking and resolution
7. THE system SHALL display user-friendly error messages using internationalized strings
8. THE system SHALL include context data (component name, operation, user info) in error logs
9. THE system SHALL NOT use `console.log` for logging; all logs SHALL use `loggerService`
10. THE system SHALL NOT use `console.error` directly; errors SHALL be handled through `useErrorHandler` or `handleError`

### Requirement 6: Routing and Navigation

**User Story:** As a developer, I want a clear routing structure, so that navigation is predictable and routes are easy to manage.

#### Acceptance Criteria

1. THE system SHALL use React Router DOM v6 for all routing
2. THE system SHALL define routes in `{portal}/routes.jsx` files for member and admin portals
3. THE system SHALL use kebab-case for route paths (e.g., `/performance-management`, `/member-list`)
4. THE system SHALL use camelCase for route names in route configuration objects
5. THE system SHALL implement route guards for protected routes requiring authentication
6. THE system SHALL implement role-based route guards to restrict admin routes to admin users only
7. THE system SHALL redirect unauthenticated users to the login page when accessing protected routes
8. THE system SHALL use lazy loading for route components to improve initial load performance

### Requirement 7: Internationalization (i18n)

**User Story:** As a developer, I want consistent internationalization patterns, so that the application supports multiple languages seamlessly.

#### Acceptance Criteria

1. THE system SHALL use react-i18next for all internationalization
2. THE system SHALL organize translation files by module in `{module}/locales/{lang}.json` format
3. THE system SHALL support Korean (ko) and Chinese (zh) languages
4. THE system SHALL use the `useTranslation` hook to access translations in components
5. THE system SHALL use dot notation for translation keys (e.g., `auth.login.title`)
6. THE system SHALL provide fallback text for missing translations
7. THE system SHALL format dates and numbers according to the selected locale
8. THE system SHALL persist language preference in localStorage

### Requirement 8: Styling and CSS Standards

**User Story:** As a developer, I want consistent styling patterns, so that the UI is cohesive and maintainable.

#### Acceptance Criteria

1. THE system SHALL use Tailwind CSS as the primary styling framework
2. THE system SHALL use BEM (Block Element Modifier) naming convention for custom CSS classes
3. THE system SHALL co-locate component-specific styles with components in `{ComponentName}.css` files
4. THE system SHALL place global styles in `shared/styles/index.css`
5. THE system SHALL use CSS variables for theme colors, spacing, and typography
6. THE system SHALL follow an 8-point grid system for spacing (multiples of 8px)
7. THE system SHALL ensure responsive design with mobile-first breakpoints (480px, 768px, 1024px, 1280px)
8. THE system SHALL maintain minimum touch target size of 44x44px for accessibility

### Requirement 9: Form Handling and Validation

**User Story:** As a developer, I want consistent form handling patterns, so that forms are validated uniformly and provide good user experience.

#### Acceptance Criteria

1. THE system SHALL use react-hook-form for form state management and validation
2. THE system SHALL validate form inputs on blur and on submit
3. THE system SHALL display validation errors inline below form fields
4. THE system SHALL disable submit buttons while form submission is in progress
5. THE system SHALL show loading indicators during form submission
6. THE system SHALL display success messages after successful form submission
7. THE system SHALL handle server-side validation errors and display them appropriately
8. THE system SHALL use internationalized error messages for validation feedback

### Requirement 10: Performance Optimization

**User Story:** As a developer, I want performance best practices enforced, so that the application loads quickly and runs smoothly.

#### Acceptance Criteria

1. THE system SHALL use React.lazy and Suspense for code splitting on route level
2. THE system SHALL implement manual chunks in Vite configuration to optimize bundle sizes
3. THE system SHALL use TanStack Query's caching to minimize redundant API calls
4. THE system SHALL implement pagination for large data lists (default page size: 20 items)
5. THE system SHALL use debouncing for search inputs (300ms delay)
6. THE system SHALL lazy load images using native loading="lazy" attribute
7. THE system SHALL memoize expensive computations using useMemo
8. THE system SHALL memoize callback functions using useCallback when passed as props
9. THE system SHALL keep bundle chunk sizes under 1000KB with warnings for larger chunks

### Requirement 11: Testing Standards

**User Story:** As a developer, I want clear testing guidelines, so that I can write effective tests for components and features.

#### Acceptance Criteria

1. THE system SHALL use Vitest for unit and integration testing
2. THE system SHALL use Playwright for end-to-end (E2E) testing
3. THE system SHALL organize E2E tests by module in `e2e/{module}/` directories
4. THE system SHALL use Testing Library for component testing with user-centric queries
5. THE system SHALL test user interactions rather than implementation details
6. THE system SHALL mock API calls using MSW (Mock Service Worker) in tests
7. THE system SHALL achieve minimum 70% code coverage for critical business logic
8. THE system SHALL name test files with `.spec.js` or `.test.js` suffix

### Requirement 12: Code Quality and Conventions

**User Story:** As a developer, I want code quality standards enforced, so that the codebase remains clean and maintainable.

#### Acceptance Criteria

1. THE system SHALL use camelCase for variable and function names
2. THE system SHALL use PascalCase for component names and class names
3. THE system SHALL use UPPER_SNAKE_CASE for constants
4. THE system SHALL prefix boolean variables with `is`, `has`, or `should`
5. THE system SHALL prefix custom hooks with `use` (e.g., `useAuth`, `useForm`)
6. THE system SHALL limit function length to 50 lines; longer functions SHALL be refactored
7. THE system SHALL use async/await for asynchronous operations instead of promise chains
8. THE system SHALL use optional chaining (`?.`) and nullish coalescing (`??`) for safe property access
9. THE system SHALL avoid nested ternary operators; use if-else or early returns instead
10. THE system SHALL add JSDoc comments for complex functions and utility methods

### Requirement 13: Security Best Practices

**User Story:** As a developer, I want security best practices enforced, so that the application is protected against common vulnerabilities.

#### Acceptance Criteria

1. THE system SHALL sanitize user input before rendering to prevent XSS attacks
2. THE system SHALL validate file uploads on client side (type, size) before sending to server
3. THE system SHALL store authentication tokens in memory or httpOnly cookies, NOT in localStorage
4. THE system SHALL implement CSRF protection for state-changing operations
5. THE system SHALL use HTTPS for all API communications in production
6. THE system SHALL NOT expose sensitive data (passwords, tokens, API keys) in logs or error messages
7. THE system SHALL implement rate limiting on client side for sensitive operations (login attempts)
8. THE system SHALL validate and sanitize data received from APIs before using in the application

### Requirement 14: Accessibility Standards

**User Story:** As a developer, I want accessibility standards enforced, so that the application is usable by people with disabilities.

#### Acceptance Criteria

1. THE system SHALL comply with WCAG 2.1 Level AA accessibility standards
2. THE system SHALL provide keyboard navigation for all interactive elements
3. THE system SHALL use semantic HTML elements (header, nav, main, footer, article, section)
4. THE system SHALL provide alt text for all images
5. THE system SHALL use ARIA labels for interactive elements without visible text
6. THE system SHALL maintain sufficient color contrast ratios (4.5:1 for normal text, 3:1 for large text)
7. THE system SHALL provide focus indicators for keyboard navigation
8. THE system SHALL ensure form inputs have associated labels

### Requirement 15: Custom Hooks and Reusable Logic

**User Story:** As a developer, I want reusable custom hooks, so that I can share common logic across components efficiently.

#### Acceptance Criteria

1. THE system SHALL create custom hooks in `shared/hooks/` directory for reusable logic
2. THE system SHALL prefix all custom hook names with `use` (e.g., `useAuth`, `useDebounce`)
3. THE system SHALL export custom hooks from `shared/hooks/index.js` for centralized imports
4. THE system SHALL provide the following standard hooks: `useAuth`, `useDebounce`, `useErrorHandler`, `useLocalStorage`, `usePagination`, `useToggle`
5. THE system SHALL document hook parameters and return values using JSDoc comments
6. THE system SHALL keep hooks focused on a single responsibility
7. THE system SHALL test custom hooks using Testing Library's `renderHook` utility
8. WHEN a hook manages side effects, THE system SHALL properly clean up in the return function

### Requirement 16: Shared Component Library

**User Story:** As a developer, I want a comprehensive shared component library, so that I can build UIs consistently without duplicating code.

#### Acceptance Criteria

1. THE system SHALL maintain a shared component library in `shared/components/` directory
2. THE system SHALL provide the following base components: Button, Input, Select, Textarea, Table, Modal, Card, Alert, Badge, Loading, Pagination, Tabs
3. THE system SHALL provide specialized components: ErrorBoundary, LanguageSwitcher, ThemeSwitcher, LazyImage, UploadProgress, AddressSearch, TermsModal
4. THE system SHALL provide chart components in `shared/components/Charts/` using ECharts
5. THE system SHALL export all shared components from `shared/components/index.js`
6. THE system SHALL document component props using JSDoc or PropTypes
7. THE system SHALL provide default props for optional component properties
8. THE system SHALL ensure all shared components are responsive and accessible
9. THE system SHALL co-locate component styles with component files

### Requirement 17: Utility Functions and Helpers

**User Story:** As a developer, I want well-organized utility functions, so that I can reuse common operations across the application.

#### Acceptance Criteria

1. THE system SHALL organize utility functions in `shared/utils/` directory by category
2. THE system SHALL provide the following utility modules: `constants.js`, `storage.js`, `validation.js`, `format.js`, `errorHandler.js`
3. THE system SHALL define all application constants in `constants.js` (API URLs, status codes, storage keys)
4. THE system SHALL provide storage utilities for localStorage and sessionStorage operations
5. THE system SHALL provide validation utilities for common input types (email, phone, business number)
6. THE system SHALL provide formatting utilities for dates, numbers, and currency
7. THE system SHALL document utility functions with JSDoc comments including parameters and return types
8. THE system SHALL write unit tests for all utility functions
9. THE system SHALL keep utility functions pure (no side effects) when possible

### Requirement 18: File Upload and Download Patterns

**User Story:** As a developer, I want standardized file upload and download patterns, so that file operations are consistent across the application.

#### Acceptance Criteria

1. THE system SHALL provide an `upload.service.js` for all file upload and download operations
2. THE system SHALL validate file types and sizes on client side before upload
3. THE system SHALL display upload progress using the UploadProgress component
4. THE system SHALL support single file and multiple file uploads
5. THE system SHALL handle file download with automatic filename extraction from Content-Disposition header
6. THE system SHALL provide fallback filenames with timestamps when header is missing
7. THE system SHALL show loading indicators during file operations
8. THE system SHALL handle upload/download errors gracefully with user-friendly messages
9. THE system SHALL limit file upload sizes (default: 10MB per file)

### Requirement 19: Global Error and Exception Handling

**User Story:** As a developer, I want comprehensive global error handling, so that no errors go unnoticed and all are properly logged.

#### Acceptance Criteria

1. THE system SHALL register global error handlers for uncaught JavaScript errors
2. THE system SHALL register global handlers for unhandled promise rejections
3. THE system SHALL automatically send all global errors to the backend via `exceptionService`
4. THE system SHALL automatically log all global errors via `loggerService`
5. THE system SHALL include context information (URL, user agent, screen size) in error reports
6. THE system SHALL sanitize sensitive data before sending error reports
7. THE system SHALL generate unique trace IDs for error correlation between frontend and backend
8. THE system SHALL display user-friendly error messages while logging technical details
9. THE system SHALL NOT expose stack traces or technical details to end users in production

### Requirement 20: Development Workflow and Tooling

**User Story:** As a developer, I want efficient development tools and workflows, so that I can develop and debug effectively.

#### Acceptance Criteria

1. THE system SHALL use Vite as the build tool and development server
2. THE system SHALL enable Hot Module Replacement (HMR) for fast development feedback
3. THE system SHALL proxy API requests to backend during development via Vite proxy configuration
4. THE system SHALL use environment variables for configuration (API URLs, feature flags)
5. THE system SHALL provide separate environment files for development (.env.local) and production
6. THE system SHALL disable MSW (Mock Service Worker) by default; enable via VITE_USE_MOCK=true
7. THE system SHALL generate source maps in development for debugging
8. THE system SHALL NOT generate source maps in production builds for security
9. THE system SHALL provide npm scripts for common tasks (dev, build, test, preview)
10. THE system SHALL configure Vite to split vendor chunks for optimal caching (react, query, state, i18n, charts)
