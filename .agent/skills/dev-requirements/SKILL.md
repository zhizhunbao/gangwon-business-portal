---
name: dev-requirements
description: 需求编写专家。Use when (1) writing functional requirements, (2) documenting system requirements, (3) defining acceptance criteria, (4) specifying API contracts, (5) documenting business rules, (6) writing technical specifications.
---

# Requirements Writing Skill

## Objective

Master the art of writing clear, testable, and comprehensive software requirements that bridge the gap between business needs and technical implementation.

## Use Cases

- Writing functional requirements
- Documenting system requirements
- Creating user requirements
- Defining acceptance criteria
- Specifying API contracts
- Documenting business rules
- Writing technical specifications

## Types of Requirements

### 1. Business Requirements
High-level business goals and objectives.

**Example**:
```
BR-001: The system shall reduce customer support ticket volume by 30% 
        within 6 months of launch by providing self-service capabilities.
```

### 2. User Requirements
What users need to accomplish their goals.

**Example**:
```
UR-001: Users shall be able to reset their password without contacting support.
UR-002: Users shall receive email confirmation within 5 minutes of registration.
```

### 3. Functional Requirements
Specific behaviors and functions the system must perform.

**Example**:
```
FR-001: The system shall validate email format before accepting registration.
FR-002: The system shall lock user accounts after 5 failed login attempts.
FR-003: The system shall display search results within 2 seconds.
```

### 4. Non-Functional Requirements
Quality attributes and constraints.

**Categories**:
- **Performance**: Response time, throughput, resource usage
- **Security**: Authentication, authorization, encryption, data protection
- **Scalability**: Concurrent users, data volume, growth capacity
- **Reliability**: Uptime, error rate, recovery time
- **Usability**: Accessibility, learnability, user satisfaction
- **Maintainability**: Code quality, documentation, testability
- **Compatibility**: Browsers, devices, operating systems

**Example**:
```
NFR-001: The system shall support 10,000 concurrent users with < 200ms response time.
NFR-002: The system shall achieve 99.9% uptime (excluding planned maintenance).
NFR-003: The system shall comply with WCAG 2.1 Level AA accessibility standards.
```

### 5. Technical Requirements
Implementation-specific constraints and specifications.

**Example**:
```
TR-001: The backend shall be implemented using Python 3.11+ and FastAPI.
TR-002: The system shall use PostgreSQL 15+ for data persistence.
TR-003: All API endpoints shall follow RESTful conventions.
```

## Writing Guidelines

### The SMART Criteria

Requirements should be:
- **Specific**: Clearly defined, no ambiguity
- **Measurable**: Can be tested and verified
- **Achievable**: Technically feasible
- **Relevant**: Tied to business goals
- **Time-bound**: Has a deadline or priority

### The "Shall" Language

Use precise modal verbs:
- **Shall**: Mandatory requirement (must be implemented)
- **Should**: Recommended but not mandatory
- **May**: Optional, at implementer's discretion
- **Will**: Statement of fact (not a requirement)

**Examples**:
```
✅ The system shall encrypt all passwords using bcrypt.
✅ The system should provide autocomplete suggestions.
✅ Users may customize their dashboard layout.
❌ The system will be fast. (vague, not testable)
```

### Atomic Requirements

One requirement = one testable statement.

**Bad** (multiple requirements):
```
❌ The system shall validate user input and display error messages 
   and log validation failures.
```

**Good** (atomic):
```
✅ FR-001: The system shall validate all user input against defined rules.
✅ FR-002: The system shall display error messages for invalid input.
✅ FR-003: The system shall log all validation failures with timestamp and user ID.
```

### Avoid Implementation Details

Focus on WHAT, not HOW (unless it's a technical requirement).

**Bad**:
```
❌ The system shall use Redis to cache user sessions.
```

**Good**:
```
✅ The system shall maintain user session state across requests.
✅ The system shall retrieve user session data within 50ms.
```

**Exception** (when technology is a constraint):
```
✅ TR-001: The system shall use Redis 7+ for session caching (client requirement).
```

### Testable & Verifiable

Every requirement must be testable.

**Bad**:
```
❌ The system shall be user-friendly.
❌ The system shall be fast.
❌ The system shall be secure.
```

**Good**:
```
✅ The system shall achieve a System Usability Scale (SUS) score > 80.
✅ The system shall load the dashboard within 2 seconds on 4G connection.
✅ The system shall enforce password complexity (min 8 chars, 1 uppercase, 1 number).
```

### Positive Statements

Write what the system SHALL do, not what it SHALL NOT do (when possible).

**Prefer**:
```
✅ The system shall require authentication for all API endpoints except /health.
```

**Over**:
```
❌ The system shall not allow unauthenticated access to API endpoints.
```

## Requirements Template

### Standard Format

```markdown
## [REQ-ID]: [Requirement Title]

**Type**: Functional / Non-Functional / Technical / Business / User

**Priority**: Critical / High / Medium / Low

**Description**:
[Clear, concise statement of what is required]

**Rationale**:
[Why this requirement exists, business justification]

**Acceptance Criteria**:
1. Given [precondition], when [action], then [expected result]
2. Given [precondition], when [action], then [expected result]

**Dependencies**:
- [Other requirements this depends on]

**Assumptions**:
- [Any assumptions made]

**Constraints**:
- [Technical or business constraints]

**Verification Method**:
- [ ] Unit Test
- [ ] Integration Test
- [ ] Manual Test
- [ ] Code Review
- [ ] Performance Test

**Notes**:
[Additional context, edge cases, or clarifications]
```

### Example: Complete Requirement

```markdown
## FR-AUTH-001: User Login

**Type**: Functional Requirement

**Priority**: Critical

**Description**:
The system shall authenticate users via email and password, issuing a JWT token 
upon successful authentication.

**Rationale**:
Users need secure access to their accounts. JWT tokens enable stateless 
authentication for API requests.

**Acceptance Criteria**:
1. Given valid credentials, when user submits login form, then system returns 
   JWT token with 24-hour expiry
2. Given invalid credentials, when user submits login form, then system returns 
   401 error with message "Invalid email or password"
3. Given locked account, when user attempts login, then system returns 403 error 
   with message "Account locked. Contact support."
4. Given successful login, when user accesses protected endpoint with token, 
   then system grants access

**Dependencies**:
- FR-AUTH-002: User Registration
- NFR-SEC-001: Password Encryption

**Assumptions**:
- Email addresses are unique per user
- Users have verified their email before login

**Constraints**:
- JWT tokens must use RS256 algorithm
- Token payload must not exceed 1KB

**Verification Method**:
- [x] Unit Test (authentication logic)
- [x] Integration Test (API endpoint)
- [x] Security Test (token validation)

**Notes**:
- Consider implementing rate limiting (see NFR-SEC-003)
- Future: Add OAuth2 support (see FR-AUTH-010)
```

## Requirements Organization

### Hierarchical Structure

```
Business Requirements (BR)
├── User Requirements (UR)
│   ├── Functional Requirements (FR)
│   │   ├── Feature A
│   │   │   ├── FR-A-001
│   │   │   ├── FR-A-002
│   │   │   └── FR-A-003
│   │   └── Feature B
│   │       ├── FR-B-001
│   │       └── FR-B-002
│   └── Non-Functional Requirements (NFR)
│       ├── Performance (NFR-PERF)
│       ├── Security (NFR-SEC)
│       └── Usability (NFR-USE)
└── Technical Requirements (TR)
    ├── Architecture (TR-ARCH)
    ├── Infrastructure (TR-INFRA)
    └── Integration (TR-INT)
```

### Naming Convention

```
[TYPE]-[CATEGORY]-[NUMBER]

Examples:
- FR-AUTH-001: Functional Requirement, Authentication, #1
- NFR-PERF-005: Non-Functional Requirement, Performance, #5
- TR-API-012: Technical Requirement, API, #12
```

## Common Patterns

### CRUD Operations

```markdown
## FR-USER-001: Create User
The system shall allow administrators to create new user accounts with email, 
name, and role.

## FR-USER-002: Read User
The system shall allow users to view their own profile information.

## FR-USER-003: Update User
The system shall allow users to update their name and profile picture.

## FR-USER-004: Delete User
The system shall allow administrators to deactivate user accounts (soft delete).
```

### Error Handling

```markdown
## FR-ERR-001: Input Validation Errors
When user input fails validation, the system shall return a 400 status code 
with a JSON response containing field-specific error messages.

## FR-ERR-002: Authentication Errors
When authentication fails, the system shall return a 401 status code with 
message "Invalid credentials" (no details about which field is wrong).

## FR-ERR-003: Authorization Errors
When user lacks permission, the system shall return a 403 status code with 
message "Insufficient permissions".

## FR-ERR-004: Resource Not Found
When requested resource doesn't exist, the system shall return a 404 status 
code with message "Resource not found".

## FR-ERR-005: Server Errors
When an unexpected error occurs, the system shall return a 500 status code, 
log the error with stack trace, and display a generic error message to the user.
```

### API Requirements

```markdown
## FR-API-001: RESTful Conventions
The system shall follow RESTful API conventions:
- GET for retrieval
- POST for creation
- PUT/PATCH for updates
- DELETE for deletion

## FR-API-002: Response Format
The system shall return all API responses in JSON format with consistent structure:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2024-01-23T10:30:00Z"
}
```

## FR-API-003: Pagination
The system shall paginate list endpoints with query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- Response includes `total`, `page`, `limit`, `pages`
```

## Checklist

Before finalizing requirements, verify:

- [ ] Each requirement has a unique ID
- [ ] Each requirement uses "shall" language
- [ ] Each requirement is atomic (one testable statement)
- [ ] Each requirement is testable/verifiable
- [ ] Each requirement has acceptance criteria
- [ ] Each requirement has a priority
- [ ] Requirements are organized logically
- [ ] Dependencies are documented
- [ ] Assumptions are stated
- [ ] Edge cases are covered
- [ ] Error scenarios are defined
- [ ] No implementation details (unless technical requirement)
- [ ] No ambiguous terms ("fast", "user-friendly", "secure")
- [ ] Stakeholders have reviewed and approved

## Anti-Patterns to Avoid

### 1. Vague Requirements
```
❌ The system shall be intuitive.
✅ The system shall allow users to complete checkout in ≤ 3 clicks.
```

### 2. Compound Requirements
```
❌ The system shall validate input and send notifications.
✅ FR-001: The system shall validate all user input.
✅ FR-002: The system shall send email notifications for validation errors.
```

### 3. Implementation Prescription
```
❌ The system shall use MongoDB for data storage.
✅ The system shall persist user data with < 100ms write latency.
```

### 4. Unmeasurable Requirements
```
❌ The system shall be highly available.
✅ The system shall achieve 99.9% uptime (43 minutes downtime/month max).
```

### 5. Negative Requirements
```
❌ The system shall not allow SQL injection.
✅ The system shall sanitize all user input using parameterized queries.
```

## Tools & Techniques

### Requirements Traceability Matrix (RTM)

Track requirements from business goals to test cases:

| Req ID | Business Goal | User Story | Test Case | Status |
|--------|--------------|------------|-----------|--------|
| FR-001 | Reduce support tickets | US-005 | TC-012 | ✅ Implemented |
| FR-002 | Improve UX | US-008 | TC-015 | 🚧 In Progress |

### MoSCoW Prioritization

- **Must have**: Critical for launch
- **Should have**: Important but not critical
- **Could have**: Nice to have
- **Won't have**: Out of scope

### Acceptance Criteria Format (Gherkin)

```gherkin
Feature: User Login

Scenario: Successful login with valid credentials
  Given the user is on the login page
  And the user has a registered account
  When the user enters valid email and password
  And clicks the "Login" button
  Then the user is redirected to the dashboard
  And a JWT token is stored in localStorage

Scenario: Failed login with invalid password
  Given the user is on the login page
  When the user enters valid email and invalid password
  And clicks the "Login" button
  Then an error message "Invalid email or password" is displayed
  And the user remains on the login page
```

## Best Practices Summary

1. **Start with user needs**, not technical solutions
2. **Use consistent terminology** throughout the document
3. **Number and track** all requirements
4. **Prioritize ruthlessly** - not everything is critical
5. **Review with stakeholders** early and often
6. **Keep requirements separate** from design and implementation
7. **Version control** your requirements documents
8. **Link requirements** to user stories, test cases, and code
9. **Update requirements** as the project evolves
10. **Archive old requirements** instead of deleting them

## Output Format

Recommended structure for requirements documents:

```markdown
# Requirements Specification: [Project Name]

## 1. Introduction
- Purpose
- Scope
- Definitions and Acronyms
- References

## 2. Business Requirements
[BR-001, BR-002, ...]

## 3. User Requirements
[UR-001, UR-002, ...]

## 4. Functional Requirements
### 4.1 Authentication
[FR-AUTH-001, FR-AUTH-002, ...]

### 4.2 User Management
[FR-USER-001, FR-USER-002, ...]

## 5. Non-Functional Requirements
### 5.1 Performance
[NFR-PERF-001, ...]

### 5.2 Security
[NFR-SEC-001, ...]

## 6. Technical Requirements
[TR-001, TR-002, ...]

## 7. Constraints and Assumptions

## 8. Appendix
- Glossary
- Requirements Traceability Matrix
```

Use **Markdown** for version control and collaboration, or **Confluence/Notion** for team wikis.
