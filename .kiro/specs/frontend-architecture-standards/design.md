# Design Document - Frontend Architecture Standards

## Overview

This design document establishes the architectural patterns, technical standards, and implementation guidelines for the Gangwon Business Portal frontend application. The system is built as a Single Page Application (SPA) using React 18.3+, Vite 6.x, and follows a modular architecture pattern with clear separation between member portal, admin portal, and shared components.

### Goals

1. **Consistency**: Establish uniform patterns across all frontend code
2. **Maintainability**: Create a codebase that is easy to understand and modify
3. **Scalability**: Support growth in features and team size
4. **Quality**: Ensure high code quality through standards and best practices
5. **Developer Experience**: Provide clear guidelines and efficient workflows

### Scope

This specification covers:
- Project structure and file organization
- Component development patterns
- State management architecture
- API integration patterns
- Error handling and logging systems
- Routing and navigation
- Internationalization
- Styling and CSS conventions
- Form handling
- Performance optimization
- Testing strategies
- Code quality standards
- Security practices
- Accessibility requirements
- Development tooling

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (SPA)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐              ┌──────────────┐       │
│  │ Member Portal│              │ Admin Portal │       │
│  │              │              │              │       │
│  │  - Auth      │              │  - Dashboard │       │
│  │  - Home      │              │  - Members   │       │
│  │  - Profile   │              │  - Performance│      │
│  │  - Performance│             │  - Projects  │       │
│  │  - Projects  │              │  - Content   │       │
│  │  - Support   │              │  - Settings  │       │
│  └──────┬───────┘              └──────┬───────┘       │
│         │                             │               │
│         └──────────┬──────────────────┘               │
│                    │                                  │
│         ┌──────────▼──────────┐                      │
│         │   Shared Layer      │                      │
│         │                     │                      │
│         │  - Components       │                      │
│         │  - Hooks            │                      │
│         │  - Services         │                      │
│         │  - Stores           │                      │
│         │  - Utils            │                      │
│         │  - i18n             │                      │
│         └──────────┬──────────┘                      │
│                    │                                  │
└────────────────────┼──────────────────────────────────┘
                     │
                     │ HTTPS/REST
                     │
         ┌───────────▼───────────┐
         │   Backend API         │
         │   (FastAPI)           │
         └───────────────────────┘
```

### Layer Responsibilities

#### 1. Portal Layers (Member & Admin)

**Member Portal** (`frontend/src/member/`)
- Enterprise-facing features
- Performance data entry
- Project applications
- Support services
- Public content viewing

**Admin Portal** (`frontend/src/admin/`)
- Administrative dashboard
- Member approval and management
- Performance review and approval
- Content management (notices, banners, FAQs)
- Project management
- System configuration

**Common Characteristics:**
- Each portal has its own `layouts/`, `modules/`, and `routes.jsx`
- Modules are organized by feature (auth, performance, projects, etc.)
- Each module contains components, services, and locales

#### 2. Shared Layer (`frontend/src/shared/`)

**Components** (`shared/components/`)
- Reusable UI components (Button, Input, Table, Modal, etc.)
- Specialized components (ErrorBoundary, LanguageSwitcher, Charts)
- All components are portal-agnostic

**Hooks** (`shared/hooks/`)
- Custom React hooks for reusable logic
- Examples: useAuth, useDebounce, useErrorHandler, usePagination

**Services** (`shared/services/`)
- API client and service layer
- Logger service for centralized logging
- Exception service for error tracking
- Feature-specific services (auth, member, performance, etc.)

**Stores** (`shared/stores/`)
- Zustand stores for global state
- Examples: authStore, uiStore

**Utils** (`shared/utils/`)
- Utility functions and helpers
- Constants and configuration
- Validation and formatting functions

**i18n** (`shared/i18n/`)
- Internationalization configuration
- Language resources (Korean, Chinese)

#### 3. Mock Layer (`frontend/src/mocks/`)

- MSW (Mock Service Worker) configuration
- Mock data and API handlers
- Used for development when backend is unavailable
- Disabled by default (enable via VITE_USE_MOCK=true)

### Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Core** | React | 18.3+ | UI library |
| | Vite | 6.x | Build tool and dev server |
| **State** | Zustand | 5.x | Global state management |
| | TanStack Query | 5.x | Server state management |
| **Routing** | React Router DOM | 6.x | Client-side routing |
| **HTTP** | Axios | 1.x | HTTP client |
| **i18n** | react-i18next | 15.x | Internationalization |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **Charts** | ECharts | 5.x | Data visualization |
| **Forms** | react-hook-form | 7.x | Form state management |
| **Testing** | Vitest | 2.x | Unit testing |
| | Playwright | 1.x | E2E testing |
| | Testing Library | 16.x | Component testing |
| **Mocking** | MSW | 2.x | API mocking |

## Components and Interfaces

### Component Architecture

#### Component Types

**1. Presentational Components (Dumb Components)**
- Pure UI components with no business logic
- Receive data via props
- Emit events via callback props
- Examples: Button, Input, Card, Badge

```jsx
// Example: Button component
function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  onClick 
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;
```

**2. Container Components (Smart Components)**
- Manage state and business logic
- Fetch data from APIs
- Pass data to presentational components
- Examples: MemberList, PerformanceForm, ProjectDetail

```jsx
// Example: Container component
function MemberList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['members'],
    queryFn: memberService.getMembers
  });
  
  const handleError = useErrorHandler();
  
  if (isLoading) return <Loading />;
  if (error) {
    handleError(error, { component: 'MemberList' });
    return <Alert type="error" message={error.message} />;
  }
  
  return <MemberTable data={data} />;
}
```

**3. Layout Components**
- Define page structure and common UI elements
- Examples: Header, Footer, Sidebar, PageContainer

**4. Higher-Order Components (HOCs)**
- Wrap components to add functionality
- Examples: withAuth, withErrorBoundary

#### Component Structure

```
ComponentName/
├── ComponentName.jsx       # Component logic
├── ComponentName.css       # Component styles
├── ComponentName.test.js   # Component tests
└── index.js               # Re-export
```

### Service Layer Architecture

#### Service Pattern

All API interactions go through service files that encapsulate business logic:

```javascript
// Example: member.service.js
import apiService from './api.service';

class MemberService {
  async getMembers(params) {
    return apiService.get('/api/members', params);
  }
  
  async getMemberById(id) {
    return apiService.get(`/api/members/${id}`);
  }
  
  async updateMember(id, data) {
    return apiService.put(`/api/members/${id}`, data);
  }
  
  async approveMember(id, comment) {
    return apiService.post(`/api/admin/members/${id}/approve`, { comment });
  }
}

export default new MemberService();
```

#### API Client Configuration

The base API client (`api.service.js`) provides:
- Automatic token attachment
- Token refresh on 401
- Request/response interceptors
- Error handling
- Logging integration
- Data transformation (snake_case ↔ camelCase)

### State Management Architecture

#### Global State (Zustand)

Used for application-wide state that persists across routes:

```javascript
// Example: authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      
      getUser: () => get().user,
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
```

#### Server State (TanStack Query)

Used for data fetched from APIs:

```javascript
// Example: Using TanStack Query in a component
function PerformanceList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['performance', { year: 2024, quarter: 1 }],
    queryFn: () => performanceService.getRecords({ year: 2024, quarter: 1 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const mutation = useMutation({
    mutationFn: performanceService.createRecord,
    onSuccess: () => {
      refetch();
      // Show success message
    },
    onError: (error) => {
      // Handle error
    },
  });
  
  // Component logic...
}
```

#### Local State (useState/useReducer)

Used for component-specific state:

```javascript
function SearchForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all', year: 2024 });
  
  // Component logic...
}
```

### Routing Architecture

#### Route Configuration

```javascript
// Example: member/routes.jsx
import { lazy } from 'react';

const Home = lazy(() => import('./modules/home/Home'));
const Performance = lazy(() => import('./modules/performance/Performance'));

export const memberRoutes = [
  {
    path: '/',
    element: <MemberLayout />,
    children: [
      { path: '', element: <Home />, name: 'home' },
      { path: 'performance', element: <Performance />, name: 'performance' },
      // ... more routes
    ],
  },
];
```

#### Route Guards

```javascript
// Example: Protected route
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

// Example: Admin-only route
function AdminRoute({ children }) {
  const { isAdmin } = useAuthStore();
  
  if (!isAdmin()) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
}
```

## Data Models

### Frontend Data Models

Frontend data models are TypeScript-like interfaces (documented via JSDoc) that define the shape of data used in the application.

#### User Model

```javascript
/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} businessNumber - Business registration number
 * @property {string} email - User email
 * @property {string} companyName - Company name
 * @property {string} role - User role (member|admin)
 * @property {string} status - Account status (active|inactive|pending)
 * @property {string} approvalStatus - Approval status (pending|approved|rejected)
 * @property {Date} createdAt - Account creation date
 */
```

#### Performance Record Model

```javascript
/**
 * @typedef {Object} PerformanceRecord
 * @property {string} id - Record ID
 * @property {string} memberId - Member ID
 * @property {number} year - Year
 * @property {number} quarter - Quarter (1-4)
 * @property {string} type - Record type (sales|support|ip)
 * @property {Object} dataJson - Performance data
 * @property {string} status - Status (draft|submitted|need_fix|approved)
 * @property {string} adminComment - Admin review comment
 * @property {Date} submittedAt - Submission date
 * @property {Date} reviewedAt - Review date
 */
```

#### Project Model

```javascript
/**
 * @typedef {Object} Project
 * @property {string} id - Project ID
 * @property {string} title - Project title
 * @property {string} description - Project description
 * @property {string} target - Target audience
 * @property {Date} startDate - Start date
 * @property {Date} endDate - End date
 * @property {string} status - Status (draft|published|closed)
 * @property {Array<Attachment>} attachments - Project attachments
 * @property {Date} createdAt - Creation date
 */
```

### Data Transformation

#### API Response Transformation

Backend uses snake_case, frontend uses camelCase:

```javascript
// Backend response (snake_case)
{
  "business_number": "123-45-67890",
  "company_name": "Example Corp",
  "created_at": "2024-01-01T00:00:00Z"
}

// Frontend model (camelCase)
{
  businessNumber: "123-45-67890",
  companyName: "Example Corp",
  createdAt: new Date("2024-01-01T00:00:00Z")
}
```

Transformation happens automatically in the API service layer.

### Form Data Models

Form data uses react-hook-form with validation schemas:

```javascript
// Example: Registration form schema
const registrationSchema = {
  businessNumber: {
    required: 'Business number is required',
    pattern: {
      value: /^\d{3}-\d{2}-\d{5}$/,
      message: 'Invalid business number format'
    }
  },
  companyName: {
    required: 'Company name is required',
    minLength: {
      value: 2,
      message: 'Company name must be at least 2 characters'
    }
  },
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address'
    }
  }
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the acceptance criteria analysis, the following correctness properties must be upheld by the frontend architecture:

### Property 1: Module Structure Consistency
*For any* module in the member or admin portal, the module directory SHALL contain subdirectories for components, services, and locales following the pattern `modules/{module-name}/`.
**Validates: Requirements 1.2**

### Property 2: Path Alias Usage
*For any* import statement in the codebase, imports from shared, member, or admin directories SHALL use path aliases (`@shared`, `@member`, `@admin`) instead of relative paths.
**Validates: Requirements 1.3**

### Property 3: Component Naming Convention
*For any* component file, the filename SHALL use PascalCase naming (e.g., `UserProfile.jsx`, `MemberList.jsx`).
**Validates: Requirements 2.2**

### Property 4: Component Export Pattern
*For any* component file, the component SHALL be exported as the default export.
**Validates: Requirements 2.3**

### Property 5: Component Size Limit
*For any* component file, the file SHALL contain no more than 300 lines of code.
**Validates: Requirements 2.5**

### Property 6: Store Hook Naming
*For any* Zustand store, the exported hook SHALL be prefixed with `use` (e.g., `useAuthStore`, `useUIStore`).
**Validates: Requirements 3.5**

### Property 7: API Call Centralization
*For any* API call in the application, the call SHALL be made through a service file in `shared/services/` and not directly in components.
**Validates: Requirements 4.1**

### Property 8: Data Fetching Pattern
*For any* component that fetches data, the component SHALL use TanStack Query hooks (`useQuery`, `useMutation`) instead of direct service calls.
**Validates: Requirements 4.3**

### Property 9: Request Trace ID
*For any* API request, the request SHALL include an `X-Trace-Id` header for request correlation.
**Validates: Requirements 4.7**

### Property 10: Console Logging Prohibition
*For any* code file, the file SHALL NOT contain `console.log` statements; all logging SHALL use `loggerService`.
**Validates: Requirements 5.9**

### Property 11: Direct Console Error Prohibition
*For any* code file, the file SHALL NOT use `console.error` directly; errors SHALL be handled through `useErrorHandler` or `handleError` utilities.
**Validates: Requirements 5.10**

### Property 12: Route Path Naming
*For any* route definition, the route path SHALL use kebab-case (e.g., `/performance-management`, `/member-list`).
**Validates: Requirements 6.3**

### Property 13: Route Name Naming
*For any* route configuration object, the route name SHALL use camelCase (e.g., `performanceManagement`, `memberList`).
**Validates: Requirements 6.4**

### Property 14: Translation File Structure
*For any* module with translations, translation files SHALL be organized in `{module}/locales/{lang}.json` format.
**Validates: Requirements 7.2**

### Property 15: Translation Key Format
*For any* translation key, the key SHALL use dot notation (e.g., `auth.login.title`, `performance.form.submit`).
**Validates: Requirements 7.5**

### Property 16: BEM CSS Naming
*For any* custom CSS class, the class name SHALL follow BEM naming convention (block__element--modifier).
**Validates: Requirements 8.2**

### Property 17: 8-Point Grid Spacing
*For any* spacing value in CSS, the value SHALL be a multiple of 8px (8px, 16px, 24px, 32px, etc.).
**Validates: Requirements 8.6**

### Property 18: Touch Target Size
*For any* interactive element (button, link), the element SHALL have a minimum size of 44x44px for touch accessibility.
**Validates: Requirements 8.8**

### Property 19: Search Input Debouncing
*For any* search input component, the input SHALL use debouncing with a 300ms delay.
**Validates: Requirements 10.5**

### Property 20: Bundle Chunk Size Limit
*For any* build output chunk, the chunk size SHALL be under 1000KB.
**Validates: Requirements 10.9**

### Property 21: Variable Naming Convention
*For any* variable or function name, the name SHALL use camelCase (e.g., `userName`, `fetchData`).
**Validates: Requirements 12.1**

### Property 22: Component Class Naming Convention
*For any* component or class name, the name SHALL use PascalCase (e.g., `UserProfile`, `DataService`).
**Validates: Requirements 12.2**

### Property 23: Boolean Variable Naming
*For any* boolean variable, the name SHALL be prefixed with `is`, `has`, or `should` (e.g., `isLoading`, `hasError`, `shouldRender`).
**Validates: Requirements 12.4**

### Property 24: Custom Hook Naming
*For any* custom hook, the name SHALL be prefixed with `use` (e.g., `useAuth`, `useDebounce`, `useErrorHandler`).
**Validates: Requirements 12.5**

### Property 25: Function Length Limit
*For any* function, the function SHALL contain no more than 50 lines of code.
**Validates: Requirements 12.6**

### Property 26: File Upload Validation
*For any* file upload component, the component SHALL validate file type and size on the client side before sending to the server.
**Validates: Requirements 13.2**

### Property 27: Sensitive Data Sanitization
*For any* log entry or error message, sensitive data (passwords, tokens, API keys) SHALL be sanitized before logging.
**Validates: Requirements 13.6**

### Property 28: Semantic HTML Usage
*For any* component, the component SHALL use semantic HTML elements (header, nav, main, footer, article, section) instead of generic div elements where appropriate.
**Validates: Requirements 14.3**

### Property 29: Image Alt Text
*For any* image element, the element SHALL have an `alt` attribute with descriptive text.
**Validates: Requirements 14.4**

### Property 30: Form Input Labels
*For any* form input element, the input SHALL have an associated label element.
**Validates: Requirements 14.8**

### Property 31: Component Prop Documentation
*For any* shared component, the component SHALL have JSDoc comments or PropTypes documenting its props.
**Validates: Requirements 16.6**

### Property 32: Utility Function Documentation
*For any* utility function, the function SHALL have JSDoc comments documenting parameters and return type.
**Validates: Requirements 17.7**


## Error Handling

### Error Handling Architecture

The frontend implements a multi-layered error handling strategy:

```
┌─────────────────────────────────────────┐
│   Global Error Handlers                 │
│   - window.onerror                      │
│   - unhandledrejection                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   React Error Boundary                  │
│   - Catches component errors            │
│   - Displays fallback UI                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   useErrorHandler Hook                  │
│   - Component-level error handling      │
│   - Automatic severity detection        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   API Interceptor                       │
│   - HTTP error handling                 │
│   - Token refresh                       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Logger & Exception Services           │
│   - Centralized logging                 │
│   - Backend error reporting             │
└─────────────────────────────────────────┘
```

### Error Handling Patterns

#### 1. Global Error Handlers

Automatically registered in `exception.service.js`:

```javascript
// Catches uncaught JavaScript errors
window.addEventListener('error', (event) => {
  exceptionService.recordException(event.error, {
    request_path: window.location.pathname,
    error_code: 'GLOBAL_ERROR',
  });
});

// Catches unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  exceptionService.recordException(event.reason, {
    request_path: window.location.pathname,
    error_code: 'UNHANDLED_PROMISE_REJECTION',
  });
});
```

#### 2. React Error Boundary

Wraps the application root to catch component errors:

```jsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

#### 3. Component Error Handling

Using the `useErrorHandler` hook:

```javascript
function MyComponent() {
  const handleError = useErrorHandler();
  
  const loadData = async () => {
    try {
      const data = await apiService.get('/api/data');
      // Process data
    } catch (error) {
      handleError(error, {
        request_method: 'GET',
        request_path: '/api/data',
        context_data: { component: 'MyComponent' }
      });
    }
  };
}
```

#### 4. API Error Handling

Automatic handling in API interceptor:

```javascript
// 5xx errors → recorded as exceptions
// 4xx errors → logged as warnings
// 401 errors → automatic token refresh
```

### Error Severity Levels

| Status Code | Severity | Action |
|-------------|----------|--------|
| 5xx | EXCEPTION | Record to exception service + log error |
| 4xx | WARNING | Log warning |
| 401 | INFO | Attempt token refresh, then redirect to login |
| Network Error | ERROR | Log error + show user message |

### Error Messages

All error messages must be:
- User-friendly (no technical jargon)
- Internationalized (support Korean and Chinese)
- Actionable (tell user what to do next)
- Consistent in tone and format

Example:
```javascript
// Bad
"Error: 500 Internal Server Error"

// Good
t('errors.serverError') // "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
```

## Testing Strategy

### Testing Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  ← Playwright (Critical user flows)
        │   (10%)     │
        ├─────────────┤
        │ Integration │  ← Testing Library (Component integration)
        │   (30%)     │
        ├─────────────┤
        │ Unit Tests  │  ← Vitest (Functions, hooks, utilities)
        │   (60%)     │
        └─────────────┘
```

### Unit Testing

**Tools**: Vitest + Testing Library

**What to Test**:
- Utility functions
- Custom hooks
- Service layer methods
- Data transformations
- Validation logic

**Example**:
```javascript
// utils/format.test.js
import { formatCurrency, formatDate } from './format';

describe('formatCurrency', () => {
  it('should format number as Korean won', () => {
    expect(formatCurrency(1000000)).toBe('₩1,000,000');
  });
  
  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('₩0');
  });
});
```

### Component Testing

**Tools**: Testing Library + Vitest

**What to Test**:
- Component rendering
- User interactions
- Props handling
- State changes
- Event callbacks

**Example**:
```javascript
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Integration Testing

**Tools**: Testing Library + MSW

**What to Test**:
- API integration
- Data fetching and caching
- Form submission
- Multi-component workflows

**Example**:
```javascript
// MemberList.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@mocks/server';
import MemberList from './MemberList';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MemberList', () => {
  it('should display members after loading', async () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemberList />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Company A')).toBeInTheDocument();
      expect(screen.getByText('Company B')).toBeInTheDocument();
    });
  });
});
```

### End-to-End Testing

**Tools**: Playwright

**What to Test**:
- Critical user journeys
- Authentication flows
- Form submissions
- Multi-page workflows

**Example**:
```javascript
// e2e/auth/login.spec.js
import { test, expect } from '@playwright/test';

test('user can login successfully', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('[name="businessNumber"]', '123-45-67890');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/member');
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

### Testing Best Practices

1. **Test user behavior, not implementation**
   - Use Testing Library queries (getByRole, getByText)
   - Avoid testing internal state or methods

2. **Mock external dependencies**
   - Use MSW for API mocking
   - Mock third-party libraries when necessary

3. **Keep tests isolated**
   - Each test should be independent
   - Clean up after each test

4. **Use descriptive test names**
   - Follow pattern: "should [expected behavior] when [condition]"

5. **Test edge cases**
   - Empty states
   - Error states
   - Loading states
   - Boundary values

6. **Maintain test coverage**
   - Aim for 70%+ coverage for critical business logic
   - 100% coverage for utility functions

### Property-Based Testing

For architecture standards, we use static analysis and linting to verify properties:

**Tools**:
- ESLint for code style and patterns
- Custom scripts for file structure validation
- Build-time checks for bundle sizes

**Example Property Tests**:
```javascript
// scripts/validate-architecture.js

// Property 3: Component Naming Convention
function validateComponentNaming() {
  const components = glob.sync('src/**/*.jsx');
  const invalid = components.filter(file => {
    const filename = path.basename(file, '.jsx');
    return !/^[A-Z][a-zA-Z0-9]*$/.test(filename);
  });
  
  if (invalid.length > 0) {
    throw new Error(`Invalid component names: ${invalid.join(', ')}`);
  }
}

// Property 10: Console Logging Prohibition
function validateNoConsoleLogs() {
  const files = glob.sync('src/**/*.{js,jsx}');
  const violations = [];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('console.log')) {
      violations.push(file);
    }
  });
  
  if (violations.length > 0) {
    throw new Error(`console.log found in: ${violations.join(', ')}`);
  }
}
```


## Implementation Guidelines

### File Organization

#### Directory Structure

```
frontend/
├── src/
│   ├── member/                    # Member portal
│   │   ├── layouts/              # Layout components
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── MemberLayout.jsx
│   │   ├── modules/              # Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── components/
│   │   │   │   ├── services/
│   │   │   │   └── locales/
│   │   │   ├── home/
│   │   │   ├── performance/
│   │   │   └── projects/
│   │   └── routes.jsx            # Member routes
│   │
│   ├── admin/                     # Admin portal
│   │   ├── layouts/
│   │   ├── modules/
│   │   │   ├── dashboard/
│   │   │   ├── members/
│   │   │   ├── performance/
│   │   │   └── content/
│   │   └── routes.jsx
│   │
│   ├── shared/                    # Shared code
│   │   ├── components/           # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Table.jsx
│   │   │   └── index.js
│   │   ├── hooks/                # Custom hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useDebounce.js
│   │   │   └── index.js
│   │   ├── services/             # API services
│   │   │   ├── api.service.js
│   │   │   ├── auth.service.js
│   │   │   ├── logger.service.js
│   │   │   └── index.js
│   │   ├── stores/               # Zustand stores
│   │   │   ├── authStore.js
│   │   │   └── uiStore.js
│   │   ├── utils/                # Utility functions
│   │   │   ├── constants.js
│   │   │   ├── storage.js
│   │   │   ├── validation.js
│   │   │   └── format.js
│   │   ├── styles/               # Global styles
│   │   │   └── index.css
│   │   └── i18n/                 # Internationalization
│   │       ├── config.js
│   │       └── locales/
│   │
│   ├── mocks/                     # Mock data (MSW)
│   │   ├── data/
│   │   ├── handlers/
│   │   ├── browser.js
│   │   └── server.js
│   │
│   ├── App.jsx                    # Root component
│   ├── main.jsx                   # Entry point
│   └── router.jsx                 # Root router
│
├── public/                        # Static assets
├── e2e/                          # E2E tests
├── .env.example                  # Environment template
├── .env.local                    # Local environment
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
└── package.json                  # Dependencies
```

### Naming Conventions

#### Files and Directories

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserProfile.jsx`, `MemberList.jsx` |
| Hooks | camelCase with `use` prefix | `useAuth.js`, `useDebounce.js` |
| Services | camelCase with `.service` suffix | `auth.service.js`, `member.service.js` |
| Stores | camelCase with `Store` suffix | `authStore.js`, `uiStore.js` |
| Utils | camelCase | `validation.js`, `format.js` |
| Styles | Same as component | `UserProfile.css`, `Button.css` |
| Tests | Same as file + `.test` or `.spec` | `Button.test.jsx`, `login.spec.js` |
| Directories | kebab-case | `member-list/`, `performance-management/` |

#### Code Elements

| Type | Convention | Example |
|------|-----------|---------|
| Variables | camelCase | `userName`, `isLoading` |
| Functions | camelCase | `fetchData`, `handleSubmit` |
| Components | PascalCase | `UserProfile`, `MemberList` |
| Classes | PascalCase | `ApiService`, `DataTransformer` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_FILE_SIZE` |
| Boolean vars | `is/has/should` prefix | `isActive`, `hasError`, `shouldRender` |
| Event handlers | `handle` prefix | `handleClick`, `handleSubmit` |
| Hooks | `use` prefix | `useAuth`, `useDebounce` |
| Store hooks | `use` prefix + `Store` | `useAuthStore`, `useUIStore` |

### Code Style Guidelines

#### Import Order

```javascript
// 1. External dependencies
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal dependencies (path aliases)
import { Button, Input } from '@shared/components';
import { useAuth } from '@shared/hooks';
import memberService from '@shared/services/member.service';

// 3. Relative imports
import './MemberList.css';
```

#### Component Structure

```javascript
// 1. Imports
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// 2. Constants (if any)
const MAX_ITEMS = 10;

// 3. Component definition
function MemberList({ initialFilter }) {
  // 3.1. Hooks (in order: state, context, custom hooks)
  const { t } = useTranslation();
  const [filter, setFilter] = useState(initialFilter);
  const { data, isLoading } = useQuery(/* ... */);
  
  // 3.2. Event handlers
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };
  
  // 3.3. Effects
  useEffect(() => {
    // Effect logic
  }, [filter]);
  
  // 3.4. Render logic
  if (isLoading) return <Loading />;
  
  return (
    <div className="member-list">
      {/* JSX */}
    </div>
  );
}

// 4. PropTypes or JSDoc (optional)
/**
 * @param {Object} props
 * @param {string} props.initialFilter - Initial filter value
 */

// 5. Default export
export default MemberList;
```

#### Function Guidelines

```javascript
// Use arrow functions for simple functions
const add = (a, b) => a + b;

// Use function declarations for complex functions
function processData(data) {
  // Complex logic
  return result;
}

// Use async/await for asynchronous operations
async function fetchUserData(userId) {
  try {
    const response = await apiService.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
}

// Avoid nested ternaries
// Bad
const value = condition1 ? value1 : condition2 ? value2 : value3;

// Good
let value;
if (condition1) {
  value = value1;
} else if (condition2) {
  value = value2;
} else {
  value = value3;
}

// Or use early returns
function getValue() {
  if (condition1) return value1;
  if (condition2) return value2;
  return value3;
}
```

### Performance Best Practices

#### 1. Code Splitting

```javascript
// Route-level code splitting
const Home = lazy(() => import('./modules/home/Home'));
const Performance = lazy(() => import('./modules/performance/Performance'));

// Component-level code splitting (for large components)
const HeavyChart = lazy(() => import('./components/HeavyChart'));
```

#### 2. Memoization

```javascript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callback functions passed as props
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Memoize components (use sparingly)
const MemoizedComponent = React.memo(MyComponent);
```

#### 3. List Rendering

```javascript
// Always use keys for list items
{items.map(item => (
  <ListItem key={item.id} data={item} />
))}

// Use virtualization for long lists
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
>
  {({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  )}
</FixedSizeList>
```

#### 4. Image Optimization

```javascript
// Use lazy loading
<img src={imageUrl} alt="Description" loading="lazy" />

// Use LazyImage component for advanced features
<LazyImage
  src={imageUrl}
  alt="Description"
  placeholder={placeholderUrl}
/>
```

#### 5. Debouncing and Throttling

```javascript
// Debounce search inputs
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    performSearch(debouncedSearch);
  }
}, [debouncedSearch]);

// Throttle scroll handlers
const handleScroll = useThrottle(() => {
  // Scroll logic
}, 100);
```

### Security Best Practices

#### 1. Input Sanitization

```javascript
// Sanitize user input before rendering
import DOMPurify from 'dompurify';

function SafeHTML({ html }) {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

#### 2. XSS Prevention

```javascript
// Never use dangerouslySetInnerHTML with unsanitized user input
// Bad
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// Good
<div>{userInput}</div>

// Or sanitize first
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

#### 3. Sensitive Data Handling

```javascript
// Never log sensitive data
// Bad
console.log('User password:', password);

// Good
loggerService.info('User login attempt', {
  userId: user.id,
  // Password is NOT logged
});

// Sanitize before sending to backend
function sanitizeData(data) {
  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) sanitized[field] = '***REDACTED***';
  });
  return sanitized;
}
```

#### 4. File Upload Validation

```javascript
// Validate file type and size
function validateFile(file) {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
  
  return true;
}
```

### Accessibility Best Practices

#### 1. Semantic HTML

```jsx
// Use semantic elements
<header>
  <nav>
    <ul>
      <li><a href="/home">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Title</h1>
    <p>Content</p>
  </article>
</main>

<footer>
  <p>© 2024 Company</p>
</footer>
```

#### 2. ARIA Labels

```jsx
// Add ARIA labels for screen readers
<button aria-label="Close dialog" onClick={handleClose}>
  <CloseIcon />
</button>

<input
  type="search"
  aria-label="Search members"
  placeholder="Search..."
/>
```

#### 3. Keyboard Navigation

```jsx
// Ensure keyboard accessibility
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyPress={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

#### 4. Focus Management

```jsx
// Manage focus for modals
function Modal({ isOpen, onClose }) {
  const modalRef = useRef();
  
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);
  
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* Modal content */}
    </div>
  );
}
```

### Internationalization Best Practices

#### 1. Translation Keys

```javascript
// Use descriptive, hierarchical keys
t('auth.login.title')           // "로그인"
t('auth.login.emailLabel')      // "이메일"
t('auth.login.submitButton')    // "로그인"

t('performance.form.salesTitle')  // "매출 정보"
t('performance.form.saveButton')  // "저장"
```

#### 2. Pluralization

```javascript
// Handle plurals correctly
t('items.count', { count: 1 })   // "1 item"
t('items.count', { count: 5 })   // "5 items"

// In translation file
{
  "items": {
    "count_one": "{{count}} item",
    "count_other": "{{count}} items"
  }
}
```

#### 3. Date and Number Formatting

```javascript
// Use locale-aware formatting
import { format } from 'date-fns';
import { ko, zhCN } from 'date-fns/locale';

const locale = i18n.language === 'ko' ? ko : zhCN;
const formatted = format(date, 'PPP', { locale });

// Number formatting
const number = 1000000;
const formatted = new Intl.NumberFormat(i18n.language).format(number);
// ko: "1,000,000"
// zh: "1,000,000"
```

## Development Workflow

### Local Development Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

3. **Start development server**
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

4. **Enable MSW (optional)**
   ```bash
   # In .env.local
   VITE_USE_MOCK=true
   ```

### Build and Deployment

1. **Build for production**
   ```bash
   npm run build
   # Output in dist/
   ```

2. **Preview production build**
   ```bash
   npm run preview
   ```

3. **Run tests**
   ```bash
   # Unit tests
   npm run test

   # E2E tests
   npm run test:e2e

   # Coverage
   npm run test:coverage
   ```

### Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Components are properly structured
- [ ] Error handling is implemented
- [ ] Logging uses loggerService
- [ ] No console.log statements
- [ ] Translations are provided for all text
- [ ] Accessibility requirements are met
- [ ] Tests are written and passing
- [ ] No security vulnerabilities
- [ ] Performance is optimized
- [ ] Documentation is updated

