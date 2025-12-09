# Requirements Document - Backend Architecture Standards

## Introduction

This specification defines the architectural standards, patterns, and best practices for the Gangwon Business Portal backend application. The system is built with FastAPI 0.115+, Python 3.11+, SQLAlchemy 2.0+ (async), and follows a modular architecture with clear separation between common infrastructure and business modules.

The purpose of this specification is to establish consistent development patterns across the backend codebase, ensure maintainability, scalability, and provide clear guidelines for current and future developers.

## Glossary

- **FastAPI**: Modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints
- **SQLAlchemy**: Python SQL toolkit and Object-Relational Mapping (ORM) library
- **Async/Await**: Python's asynchronous programming pattern for non-blocking I/O operations
- **Pydantic**: Data validation library using Python type annotations
- **Schema**: Pydantic model that defines the structure of request/response data
- **Model**: SQLAlchemy model that represents a database table
- **Service Layer**: Business logic layer that sits between routers and data access
- **Repository Pattern**: Data access pattern that abstracts database operations
- **Dependency Injection**: Design pattern where dependencies are provided to a function/class rather than created internally
- **Middleware**: Software that sits between the request and response, processing requests before they reach route handlers
- **Router**: FastAPI component that groups related API endpoints
- **Alembic**: Database migration tool for SQLAlchemy

## Requirements

### Requirement 1: Project Structure and Organization

**User Story:** As a developer, I want a clear and consistent project structure, so that I can easily locate files and understand the codebase organization.

#### Acceptance Criteria

1. THE system SHALL organize code into two main directories: `common/modules/` (infrastructure) and `modules/` (business logic)
2. THE system SHALL place shared infrastructure in `common/modules/` including: config, db, logger, exception, audit, email, storage, export, integrations
3. THE system SHALL organize business modules in `modules/` including: user, member, performance, project, content, support, upload, dashboard
4. WHEN a developer creates a new business module, THE system SHALL follow the structure: `modules/{module-name}/` containing router.py, service.py, schemas.py, models.py
5. THE system SHALL use absolute imports from `src` package root for all imports

### Requirement 2: Module Development Standards

**User Story:** As a developer, I want consistent module development patterns, so that all modules follow the same structure and are easy to understand.

#### Acceptance Criteria

1. THE system SHALL use snake_case naming for all Python files, functions, variables, and module names
2. THE system SHALL use PascalCase naming for all class names (models, schemas, services)
3. WHEN a module is created, THE system SHALL include router.py (API endpoints), service.py (business logic), schemas.py (Pydantic models), and models.py (SQLAlchemy models)
4. THE system SHALL define API routes in router.py using FastAPI decorators
5. THE system SHALL implement business logic in service.py, keeping routers thin
6. THE system SHALL define request/response schemas in schemas.py using Pydantic
7. THE system SHALL define database models in models.py using SQLAlchemy
8. THE system SHALL limit file size to 500 lines; larger files SHALL be split into multiple files

### Requirement 3: Database and ORM Standards

**User Story:** As a developer, I want consistent database access patterns, so that all database operations are predictable and maintainable.

#### Acceptance Criteria

1. THE system SHALL use SQLAlchemy 2.0+ with async/await for all database operations
2. THE system SHALL use asyncpg as the PostgreSQL driver
3. THE system SHALL define all database models using SQLAlchemy declarative base
4. THE system SHALL use snake_case for all database table names and column names
5. THE system SHALL use Alembic for database migrations
6. THE system SHALL use async session management with dependency injection
7. THE system SHALL implement proper transaction management with automatic rollback on errors
8. THE system SHALL use type hints for all model fields and relationships

### Requirement 4: API Design and Routing

**User Story:** As a developer, I want consistent API design patterns, so that all endpoints follow the same conventions.

#### Acceptance Criteria

1. THE system SHALL use RESTful API design principles for all endpoints
2. THE system SHALL prefix all API routes with `/api/v1/` for versioning
3. THE system SHALL use appropriate HTTP methods: GET (read), POST (create), PUT (update), PATCH (partial update), DELETE (delete)
4. THE system SHALL use plural nouns for resource names (e.g., `/members`, `/projects`)
5. THE system SHALL use path parameters for resource IDs (e.g., `/members/{member_id}`)
6. THE system SHALL use query parameters for filtering, sorting, and pagination
7. THE system SHALL return consistent response formats with status, message, and data fields
8. THE system SHALL use appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500, etc.)

### Requirement 5: Request/Response Validation

**User Story:** As a developer, I want automatic request/response validation, so that invalid data is caught early.

#### Acceptance Criteria

1. THE system SHALL use Pydantic schemas for all request and response validation
2. THE system SHALL define separate schemas for create, update, and response operations
3. THE system SHALL use type hints for all schema fields
4. THE system SHALL provide field validation using Pydantic validators
5. THE system SHALL return detailed validation errors with field names and error messages
6. THE system SHALL use snake_case for all schema field names (matching database columns)
7. THE system SHALL document all schema fields using docstrings or Field descriptions

### Requirement 6: Error Handling and Exceptions

**User Story:** As a developer, I want unified error handling, so that errors are consistently captured, logged, and returned to clients.

#### Acceptance Criteria

1. THE system SHALL define custom exception classes inheriting from AppException base class
2. THE system SHALL provide specific exception types: NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError
3. THE system SHALL register global exception handlers for all exception types
4. WHEN an exception occurs, THE system SHALL log the error with full context (trace_id, user_id, request info)
5. THE system SHALL return consistent error responses with error_code, message, and details
6. THE system SHALL record 5xx errors to the exception tracking system
7. THE system SHALL include trace_id in all error responses for debugging
8. THE system SHALL NOT expose sensitive information (stack traces, internal details) in production error responses

### Requirement 7: Logging and Monitoring

**User Story:** As a developer, I want comprehensive logging, so that I can debug issues and monitor system health.

#### Acceptance Criteria

1. THE system SHALL use Python's logging module with structured logging (JSON format)
2. THE system SHALL log all HTTP requests with method, path, status code, and duration
3. THE system SHALL generate unique trace_id for each request for correlation
4. THE system SHALL log at appropriate levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
5. THE system SHALL include context in logs: trace_id, user_id, module, function, line_number
6. THE system SHALL log to both console (development) and file (production)
7. THE system SHALL record application logs to database for centralized monitoring
8. THE system SHALL use different log levels based on HTTP status codes (5xx=ERROR, 4xx=WARNING, 2xx/3xx=INFO)
9. THE system SHALL NOT log sensitive data (passwords, tokens, API keys)

### Requirement 8: Authentication and Authorization

**User Story:** As a developer, I want secure authentication and authorization, so that only authorized users can access protected resources.

#### Acceptance Criteria

1. THE system SHALL use JWT (JSON Web Tokens) for authentication
2. THE system SHALL hash passwords using PBKDF2/SHA256 with bcrypt
3. THE system SHALL implement token-based authentication with access and refresh tokens
4. THE system SHALL use dependency injection for authentication checks (get_current_user)
5. THE system SHALL implement role-based access control (RBAC) for admin vs member users
6. THE system SHALL validate tokens on every protected endpoint
7. THE system SHALL return 401 Unauthorized for invalid/expired tokens
8. THE system SHALL return 403 Forbidden for insufficient permissions

### Requirement 9: Service Layer Pattern

**User Story:** As a developer, I want a clear service layer, so that business logic is separated from API routing.

#### Acceptance Criteria

1. THE system SHALL implement all business logic in service classes
2. THE system SHALL keep router functions thin, delegating to service layer
3. THE system SHALL use dependency injection for service dependencies (database session, other services)
4. THE system SHALL make service methods async for non-blocking I/O
5. THE system SHALL use type hints for all service method parameters and return values
6. THE system SHALL handle exceptions in service layer and raise appropriate custom exceptions
7. THE system SHALL log important business operations in service methods
8. THE system SHALL write unit tests for all service methods

### Requirement 10: Dependency Injection

**User Story:** As a developer, I want consistent dependency injection, so that dependencies are managed centrally.

#### Acceptance Criteria

1. THE system SHALL use FastAPI's Depends for dependency injection
2. THE system SHALL inject database sessions using get_db dependency
3. THE system SHALL inject current user using get_current_user dependency
4. THE system SHALL inject configuration using settings dependency
5. THE system SHALL create reusable dependencies for common operations
6. THE system SHALL use async dependencies for async operations
7. THE system SHALL properly close/cleanup resources in dependencies

### Requirement 11: Database Migrations

**User Story:** As a developer, I want version-controlled database migrations, so that schema changes are tracked and reproducible.

#### Acceptance Criteria

1. THE system SHALL use Alembic for all database schema changes
2. THE system SHALL create migration files for every schema change
3. THE system SHALL use descriptive names for migration files
4. THE system SHALL test migrations in development before applying to production
5. THE system SHALL support both upgrade and downgrade operations
6. THE system SHALL NOT modify existing migration files after they are committed
7. THE system SHALL document complex migrations with comments

### Requirement 12: Async Programming Standards

**User Story:** As a developer, I want consistent async/await usage, so that the application is non-blocking and performant.

#### Acceptance Criteria

1. THE system SHALL use async/await for all I/O operations (database, HTTP, file)
2. THE system SHALL use async database sessions (AsyncSession)
3. THE system SHALL use async route handlers in FastAPI
4. THE system SHALL use async service methods
5. THE system SHALL use asyncio-compatible libraries (aiosmtplib for email, httpx for HTTP)
6. THE system SHALL NOT mix sync and async code without proper handling
7. THE system SHALL use asyncio.gather for concurrent operations when appropriate

### Requirement 13: Data Export Standards

**User Story:** As a developer, I want consistent data export functionality, so that users can download data in standard formats.

#### Acceptance Criteria

1. THE system SHALL provide export functionality for Excel (.xlsx) and CSV formats
2. THE system SHALL use openpyxl for Excel generation
3. THE system SHALL include headers and proper formatting in exports
4. THE system SHALL support filtering and pagination for exports
5. THE system SHALL set appropriate Content-Disposition headers for file downloads
6. THE system SHALL include timestamps in export filenames
7. THE system SHALL log export operations to audit log

### Requirement 14: File Upload and Storage

**User Story:** As a developer, I want consistent file upload and storage patterns, so that files are handled securely and efficiently.

#### Acceptance Criteria

1. THE system SHALL use Supabase Storage for file storage
2. THE system SHALL validate file types and sizes before upload
3. THE system SHALL organize files by business_id and resource type
4. THE system SHALL generate unique server filenames while preserving original filenames in database
5. THE system SHALL implement file cleanup for orphaned files
6. THE system SHALL support both public and private file access
7. THE system SHALL log file upload operations to audit log

### Requirement 15: Email Service Integration

**User Story:** As a developer, I want consistent email sending, so that notifications are delivered reliably.

#### Acceptance Criteria

1. THE system SHALL use aiosmtplib for async email sending
2. THE system SHALL support HTML and plain text email templates
3. THE system SHALL use Jinja2 for email template rendering
4. THE system SHALL handle email sending errors gracefully
5. THE system SHALL log email sending operations
6. THE system SHALL support multiple SMTP providers (Gmail, Outlook, SendGrid, AWS SES)
7. THE system SHALL NOT block request processing while sending emails

### Requirement 16: Audit Logging

**User Story:** As a developer, I want comprehensive audit logging, so that all important operations are tracked.

#### Acceptance Criteria

1. THE system SHALL record audit logs for all sensitive operations (create, update, delete, approve, reject)
2. THE system SHALL include in audit logs: user_id, action, resource_type, resource_id, ip_address, user_agent
3. THE system SHALL provide audit log query API with filtering by user, action, resource, date range
4. THE system SHALL retain audit logs for 7 years (regulatory requirement)
5. THE system SHALL use async operations for audit logging to avoid blocking requests
6. THE system SHALL provide audit log export functionality

### Requirement 17: Configuration Management

**User Story:** As a developer, I want centralized configuration, so that settings are managed consistently.

#### Acceptance Criteria

1. THE system SHALL use pydantic-settings for configuration management
2. THE system SHALL load configuration from environment variables
3. THE system SHALL provide default values for optional settings
4. THE system SHALL validate configuration on application startup
5. THE system SHALL use different configurations for development, testing, and production
6. THE system SHALL NOT commit sensitive configuration (passwords, API keys) to version control
7. THE system SHALL document all configuration options

### Requirement 18: Testing Standards

**User Story:** As a developer, I want clear testing guidelines, so that I can write effective tests for backend code.

#### Acceptance Criteria

1. THE system SHALL use pytest for all testing
2. THE system SHALL use pytest-asyncio for async test support
3. THE system SHALL achieve minimum 70% code coverage for business logic
4. THE system SHALL write unit tests for service layer methods
5. THE system SHALL write integration tests for API endpoints
6. THE system SHALL use test fixtures for common test data
7. THE system SHALL mock external dependencies (database, email, storage) in unit tests
8. THE system SHALL use test database for integration tests

### Requirement 19: Code Quality Standards

**User Story:** As a developer, I want code quality standards enforced, so that the codebase remains clean and maintainable.

#### Acceptance Criteria

1. THE system SHALL use snake_case for variables, functions, and module names
2. THE system SHALL use PascalCase for class names
3. THE system SHALL use UPPER_SNAKE_CASE for constants
4. THE system SHALL use type hints for all function parameters and return values
5. THE system SHALL write docstrings for all public functions, classes, and modules
6. THE system SHALL limit function length to 50 lines; longer functions SHALL be refactored
7. THE system SHALL limit file length to 500 lines; longer files SHALL be split
8. THE system SHALL use meaningful variable and function names
9. THE system SHALL avoid nested loops and conditionals deeper than 3 levels

### Requirement 20: Security Best Practices

**User Story:** As a developer, I want security best practices enforced, so that the application is protected against common vulnerabilities.

#### Acceptance Criteria

1. THE system SHALL validate and sanitize all user input
2. THE system SHALL use parameterized queries to prevent SQL injection
3. THE system SHALL hash passwords before storing in database
4. THE system SHALL use HTTPS for all communications in production
5. THE system SHALL implement rate limiting for sensitive endpoints (login, registration)
6. THE system SHALL validate file uploads (type, size, content)
7. THE system SHALL NOT expose sensitive data in logs or error messages
8. THE system SHALL implement CORS with specific allowed origins
9. THE system SHALL use secure session management with httpOnly cookies or JWT tokens
